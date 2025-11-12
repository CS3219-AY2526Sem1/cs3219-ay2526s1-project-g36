/*
AI Assistance Disclosure:
Tool: GitHub Copilot Chat (OpenAI), date: 2025-11-10
Scope: Implemented Socket.IO matching gateway with in-memory queues per difficulty, topic-aware and points-tolerant matching, immediate per-user matching, periodic batch matching, optional Supabase lookups, queue snapshot, and cancel handling.
Author review: Verified event contracts ("joined-queue", "matched", "queue-snapshot") for backward compatibility, added concurrency guards when removing from queues, tuned tolerances/timeouts, and added logging and error handling.
*/
import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type Difficulty = 'easy' | 'medium' | 'hard';

interface QueueUser {
  userId: string;
  topics: string[];
  socketId: string;
  enqueuedAt: number;
  totalPoints?: number; // fetched from supabase on enqueue
  difficulty: Difficulty;
  questionId?: number | string; // optional: selected question id by the user
}

@WebSocketGateway({ namespace: '/matching', cors: { origin: '*' } })
export class MatchingGateway implements OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MatchingGateway.name);

  // queues keyed by difficulty
  private queues: Record<Difficulty, QueueUser[]> = {
    easy: [],
    medium: [],
    hard: [],
  };

  private batchIntervalId: NodeJS.Timeout | null = null;
  private isBatchRunning = false;

  private difficultyIndex: Record<Difficulty, number> = {
    easy: 0,
    medium: 1,
    hard: 2,
  };

  // Supabase client (may be null in non-supabase environments)
  private supabase: SupabaseClient | null = null;

  // Tweakable constants (declared in-file; no env overrides):
  private POINTS_TOLERANCE = 10; // +/- points tolerance for points-based matching
  // Time-gated stages so you can observe priority order in action:
  private STAGE1_DELAY_MS = 3_000;  // enable: same difficulty + shared topic after 3s
  private STAGE2_DELAY_MS = 6_000;  // enable: same difficulty (ignore topics) after 6s
  private STAGE3_DELAY_MS = 9_000;  // enable: similar points (± tolerance) after 9s
  private BRUTE_FORCE_AFTER_MS = 19_000; // enable: brute force ~10s after stage 3
  private POINTS_MATCH_PRIORITY_WINDOW_MS = 30_000; // unused; kept for future tuning

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;
    if (url && key) {
      this.supabase = createClient(url, key);
    } else {
      this.supabase = null;
      this.logger.warn('Supabase not configured (SUPABASE_URL/SUPABASE_KEY missing). Profile point lookups will be skipped.');
    }

    // Matching tolerances are fixed in-file for this demo; no env overrides.
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const removed = this.removeFromQueueBySocketId(client.id);
    if (removed) {
      this.logger.log(`Socket ${client.id} disconnected and was removed from queue`);
    } else {
      this.logger.log(`Socket ${client.id} disconnected`);
    }
  }

  @SubscribeMessage('join-queue')
  async handleJoinQueue(
    client: Socket,
    payload: { userId: string; difficulty: Difficulty; topics: string[]; questionId?: number | string },
  ) {
    const { userId, difficulty, topics } = payload;
    if (!userId || !difficulty || !Array.isArray(topics)) {
      client.emit('joined-queue', { ok: false });
      return;
    }

    // Fetch points from Supabase if configured (non-blocking, falls back to 0)
    let totalPoints: number | undefined = undefined;
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('profiles')
          .select('total_points')
          .eq('id', userId)
          .maybeSingle();
        if (error) {
          this.logger.warn(`Supabase fetch error for user ${userId}: ${error.message}`);
          totalPoints = 0;
        } else if (data && typeof (data as any).total_points !== 'undefined') {
          totalPoints = Number((data as any).total_points) || 0;
        } else {
          totalPoints = 0;
        }
      } catch (err) {
        this.logger.warn(`Supabase fetch exception for user ${userId}: ${(err as Error).message}`);
        totalPoints = 0;
      }
    } else {
      // Supabase not configured — default to 0 so matching still works
      totalPoints = 0;
    }

    this.enqueue(userId, difficulty, topics, client.id, totalPoints, payload.questionId);
  }

  @SubscribeMessage('match:cancel')
  handleCancelMatch(client: Socket) {
    const removed = this.removeFromQueueBySocketId(client.id);
    client.emit('left-queue', { ok: removed });
    this.logger.log(`Socket ${client.id} requested cancel => removed=${removed}`);
  }

  private enqueue(
    userId: string,
    difficulty: Difficulty,
    topics: string[],
    socketId: string,
    totalPoints?: number,
    questionId?: number | string,
  ): void {
    const now = Date.now();
    const user: QueueUser = { userId, topics, socketId, enqueuedAt: now, totalPoints, difficulty, questionId };
    this.queues[difficulty].push(user);

    // Emit joined-queue exactly as before (frontend compatibility)
    const position = this.queues[difficulty].findIndex((u) => u.socketId === socketId) + 1;
    try {
      this.server.to(socketId).emit('joined-queue', { ok: true, difficulty, position });
    } catch (err) {
      this.logger.warn(`Failed to emit joined-queue to ${socketId}: ${err}`);
    }

    // Immediately try to match this user
    this.tryMatchForUser(user);
  }

  private countCommonTopics(topics1: string[], topics2: string[]) {
    const set2 = new Set(topics2);
    let count = 0;
    for (const t of topics1) if (set2.has(t)) count++;
    return count;
  }

  /**
   * Primary per-user matching routine. Follows priority:
   * 1) same difficulty + common topics
   * 2) same difficulty (ignore topics)
   * 3) similar points (± POINTS_TOLERANCE) across queues (prefer same difficulty but allow others)
   * 4) brute force after BRUTE_FORCE_AFTER_MS
   */
  private tryMatchForUser(user: QueueUser) {
    // If user already removed from queue (race), bail
    const stillHere = this.queues[user.difficulty].some((u) => u.socketId === user.socketId);
    if (!stillHere) return;

    const now = Date.now();
    const waitingMs = now - user.enqueuedAt;

    // helper to gather candidates excluding the user itself
    const gatherCandidates = () => {
      const cands: { candidate: QueueUser; diff: Difficulty }[] = [];
      for (const d of Object.keys(this.queues) as Difficulty[]) {
        for (const u of this.queues[d]) {
          if (u.socketId === user.socketId) continue;
          cands.push({ candidate: u, diff: d });
        }
      }
      return cands;
    };

    const candidates = gatherCandidates();
    if (candidates.length === 0) return;

    // Comparator: the lower the tuple, the better
    const scoreTuple = (a: QueueUser, aDiff: Difficulty, b: QueueUser, bDiff: Difficulty) => {
      const difficultyDistance = Math.abs(this.difficultyIndex[aDiff] - this.difficultyIndex[bDiff]);
      const numCommonTopics = this.countCommonTopics(a.topics, b.topics);
      const waitingSeconds = ((now - a.enqueuedAt) + (now - b.enqueuedAt)) / 1000;
      // ordering: prefer smaller difficultyDistance, more common topics (so negative), larger waiting (so negative)
      return [difficultyDistance, -numCommonTopics, -waitingSeconds] as const;
    };

    // Time-gated staged matching
    // 1) Try same difficulty + at least one common topic (only after STAGE1_DELAY_MS)
    if (waitingMs < this.STAGE1_DELAY_MS) {
      return; // too early to attempt any matching
    }
    let best: { cand: QueueUser; candDiff: Difficulty } | null = null;
    let bestScore: readonly [number, number, number] | null = null;

    for (const { candidate: cand, diff: candDiff } of candidates) {
      if (candDiff !== user.difficulty) continue;
      const common = this.countCommonTopics(user.topics, cand.topics);
      if (common <= 0) continue;
      const sc = scoreTuple(user, user.difficulty, cand, candDiff);
      if (!bestScore || this.tupleIsBetter(sc, bestScore)) {
        best = { cand, candDiff };
        bestScore = sc;
      }
    }

    // 2) If none, try same difficulty regardless of topics
    if (!best) {
      if (waitingMs < this.STAGE2_DELAY_MS) {
        return; // do not relax to stage 2 until the delay passes
      }
      for (const { candidate: cand, diff: candDiff } of candidates) {
        if (candDiff !== user.difficulty) continue;
        const sc = scoreTuple(user, user.difficulty, cand, candDiff);
        if (!bestScore || this.tupleIsBetter(sc, bestScore)) {
          best = { cand, candDiff };
          bestScore = sc;
        }
      }
    }

    // 3) If still none, try points-based: find candidate(s) with roughly same totalPoints (± tolerance)
    if (!best) {
      if (waitingMs < this.STAGE3_DELAY_MS) {
        return; // do not consider points-based until stage 3 delay
      }
      const userPoints = typeof user.totalPoints === 'number' ? user.totalPoints : undefined;
      if (typeof userPoints === 'number') {
        // attempt to prefer same difficulty first, then others
        let candidatesByPoints: { cand: QueueUser; candDiff: Difficulty }[] = [];
        for (const { candidate: cand, diff: candDiff } of candidates) {
          if (typeof cand.totalPoints !== 'number') continue;
          if (Math.abs((cand.totalPoints ?? 0) - userPoints) <= this.POINTS_TOLERANCE) {
            candidatesByPoints.push({ cand, candDiff });
          }
        }

        // prefer same difficulty among point-matches
        const sameDiff = candidatesByPoints.filter((c) => c.candDiff === user.difficulty);
        const useList = sameDiff.length > 0 ? sameDiff : candidatesByPoints;

        if (useList.length > 0) {
          for (const { cand, candDiff } of useList) {
            const sc = scoreTuple(user, user.difficulty, cand, candDiff);
            if (!bestScore || this.tupleIsBetter(sc, bestScore)) {
              best = { cand, candDiff };
              bestScore = sc;
            }
          }
        }
      }
    }

    // 4) If still none and past BRUTE_FORCE_AFTER_MS, do brute force across all candidates
    if (!best && waitingMs >= this.BRUTE_FORCE_AFTER_MS) {
      for (const { candidate: cand, diff: candDiff } of candidates) {
        const sc = scoreTuple(user, user.difficulty, cand, candDiff);
        if (!bestScore || this.tupleIsBetter(sc, bestScore)) {
          best = { cand, candDiff };
          bestScore = sc;
        }
      }
    }

    if (!best) {
      // nothing suitable found now
      return;
    }

  const partner = best.cand;

  // Determine canonical questionId: pick the earlier enqueued user's question if provided, else fallback
  const first = user.enqueuedAt <= partner.enqueuedAt ? user : partner;
  const second = first === user ? partner : user;
  const canonicalQuestionId = first.questionId ?? second.questionId ?? undefined;

    // Remove both (check return values) - if removal fails, another thread matched them
    const removedUser = this.removeFromQueueBySocketId(user.socketId);
    const removedPartner = this.removeFromQueueBySocketId(partner.socketId);

    if (!removedUser || !removedPartner) {
      // somebody matched concurrently
      this.logger.log(`Concurrent match conflict for ${user.userId} or ${partner.userId}, skipping`);
      return;
    }

    const roomId = uuidv4();

    // Emit matched - keep existing keys to avoid breaking frontend
    // Add optional fields matchedUserPoints and yourPoints (frontend will ignore if not used)
    try {
      this.server.to(user.socketId).emit('matched', {
        roomId,
        matchedUserId: partner.userId,
        matchedUserPoints: partner.totalPoints,
        yourPoints: user.totalPoints,
        questionId: canonicalQuestionId,
      });
      this.server.to(partner.socketId).emit('matched', {
        roomId,
        matchedUserId: user.userId,
        matchedUserPoints: user.totalPoints,
        yourPoints: partner.totalPoints,
        questionId: canonicalQuestionId,
      });
    } catch (err) {
      this.logger.warn(`Failed to emit matched event: ${err}`);
    }

    this.logger.log(
      `Matched users: ${user.userId} ↔ ${partner.userId} in room ${roomId} (score: ${JSON.stringify(bestScore)})`,
    );
  }

  // utility comparator for tuple [a,b,c] where smaller is better, lexicographic
  private tupleIsBetter(
    a: readonly [number, number, number],
    b: readonly [number, number, number],
  ): boolean {
    if (a[0] < b[0]) return true;
    if (a[0] > b[0]) return false;
    if (a[1] < b[1]) return true;
    if (a[1] > b[1]) return false;
    if (a[2] < b[2]) return true;
    return false;
  }

  private removeFromQueueBySocketId(socketId: string): boolean {
    for (const d of Object.keys(this.queues) as Difficulty[]) {
      const idx = this.queues[d].findIndex((u) => u.socketId === socketId);
      if (idx !== -1) {
        this.queues[d].splice(idx, 1);
        return true;
      }
    }
    return false;
  }

  /**
   * Periodic batch matching preserved but emits same 'matched' event payload
   * Uses simpler score but could be swapped to the same strategy above if you want.
   */
  public runBatchMatching() {
    // Use the same staged matching logic as per-user matching to ensure consistent priority ordering.
    // Iterate over a snapshot of the queues to avoid mutation issues while matching.
    const snapshot: QueueUser[] = [];
    for (const d of Object.keys(this.queues) as Difficulty[]) {
      for (const u of this.queues[d]) snapshot.push(u);
    }

    for (const u of snapshot) {
      // tryMatchForUser internally checks if the user is still in the queue and will no-op otherwise.
      this.tryMatchForUser(u);
    }
  }

  onModuleInit(): void {
    const intervalMs = Number(process.env.BATCH_INTERVAL_MS) || 5000;
    this.logger.log(`[BatchMatching] interval configured: ${intervalMs}ms`);
    this.batchIntervalId = setInterval(() => {
      if (this.isBatchRunning) {
        this.logger.log('[BatchMatching] previous run still active, skipping this interval');
        return;
      }
      this.isBatchRunning = true;
      try {
        this.logger.log(`[BatchMatching] running periodic batch matching at ${new Date().toISOString()}`);
        this.runBatchMatching();
      } catch (err) {
        this.logger.error('Error during batch matching:', err as Error);
      } finally {
        this.isBatchRunning = false;
      }
    }, intervalMs);
    this.logger.log('Batch matching interval started');
  }

  onModuleDestroy(): void {
    if (this.batchIntervalId) {
      clearInterval(this.batchIntervalId);
      this.batchIntervalId = null;
      this.logger.log('Batch matching interval stopped');
    }
  }

  @SubscribeMessage('get-queue')
  handleGetQueue(client: Socket) {
    const snapshot = {
      easy: this.queues.easy.map((u) => ({
        userId: u.userId,
        topics: u.topics,
        socketId: u.socketId,
        enqueuedAt: u.enqueuedAt,
        totalPoints: u.totalPoints,
      })),
      medium: this.queues.medium.map((u) => ({
        userId: u.userId,
        topics: u.topics,
        socketId: u.socketId,
        enqueuedAt: u.enqueuedAt,
        totalPoints: u.totalPoints,
      })),
      hard: this.queues.hard.map((u) => ({
        userId: u.userId,
        topics: u.topics,
        socketId: u.socketId,
        enqueuedAt: u.enqueuedAt,
        totalPoints: u.totalPoints,
      })),
    };
    // keep same event name 'queue-snapshot' so frontend remains compatible
    client.emit('queue-snapshot', snapshot);
  }
}
