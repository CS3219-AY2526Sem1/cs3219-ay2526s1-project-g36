/*
AI Assistance Disclosure:
Tool: ChatGPT (GPT-5)
Scope: Generated Yjs integration boilerplate, wrote implementation of LevelDB persistence, and snapshot/update management logic.
Author review: Reviewed document state handling, customized history tracking and pruning logic, and implemented revert functionality with change detection.
*/

import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { Injectable, Logger } from '@nestjs/common';
import { ClassicLevel } from 'classic-level';
import { Change, EditHistoryRecord, SessionState } from './types';
import {
  HISTORY_PREFIX,
  MAX_SNIPPET_LENGTH,
  OPERATIONS_THRESHOLD,
  PRUNE_THRESHOLD_MS,
  SNAPSHOT_INTERVAL_MS,
  SNAPSHOT_PREFIX,
  SNAPSHOT_META_PREFIX,
  UPDATE_PREFIX,
} from './helpers';
import {
  updateKey,
  updateRange,
  historyRange,
  findSnippetLocation,
} from './helpers';
import { mergeAdjacent } from './history-combiner';

@Injectable()
export class CollabService {
  private readonly log = new Logger('CollabService');

  private sessions = new Map<string, SessionState>();
  private db: ClassicLevel<string, Uint8Array>;
  private revertingSessions = new Set<string>();

  constructor() {
    const path = process.env.COLLAB_SERVICE_PATH;
    // store uint8array values
    this.db = new ClassicLevel<string, Uint8Array>(path, {
      keyEncoding: 'utf-8',
      valueEncoding: 'view', // returns uint8array
    });
  }

  private newSession(): SessionState {
    const doc = new Y.Doc();
    const awareness = new Awareness(doc);
    return {
      doc,
      awareness,
      numberOfOperations: 0,
      lastSnapshotAt: Date.now(),
      isLoadedFromDB: false,
      language: 'python',
    };
  }

  async setLanguage(sessionId: string, language: string) {
    const session = await this.getOrLoadSession(sessionId);
    session.language = language;
  }

  async getLanguage(sessionId: string): Promise<string> {
    const session = await this.getOrLoadSession(sessionId);
    return session.language;
  }

  async getOrLoadSession(sessionId: string): Promise<SessionState> {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = this.newSession();
      this.sessions.set(sessionId, session);
    }
    if (!session.isLoadedFromDB) {
      await this.loadSessionFromDB(sessionId, session);
      session.isLoadedFromDB = true;
    }
    return session;
  }

  async loadSessionFromDB(sessionId: string, session: SessionState) {
    // load latest snapshot
    try {
      const snapshotKey = SNAPSHOT_PREFIX + sessionId;
      const snapshot = await this.db.get(snapshotKey);
      if (snapshot && snapshot.byteLength > 0) {
        Y.applyUpdate(session.doc, snapshot);
        this.log.log(`Loaded snapshot for session ${sessionId}`);
      }
    } catch (error) {
      this.log.error(
        `Failed to load snapshot for session ${sessionId}: ${error}`,
      );
    }
    // check latest updates
    for await (const [key, val] of this.db.iterator(updateRange(sessionId))) {
      try {
        Y.applyUpdate(session.doc, val);
      } catch (error) {
        this.log.error(
          `Failed to apply update ${key} for session ${sessionId}: ${error}`,
        );
      }
    }
  }

  encodeCurrentState(sessionId: string): Promise<Uint8Array> {
    // return Y.encodeStateAsUpdate(this.getOrCreateSession(sessionId).doc);
    return this.getOrLoadSession(sessionId).then((session) =>
      Y.encodeStateAsUpdate(session.doc),
    );
  }

  async applyAndPersistUpdate(
    sessionId: string,
    update: Uint8Array,
    userId: string,
  ) {
    if (this.isReverting(sessionId)) {
      // skip applying updates while reverting
      return null;
    }

    const session = await this.getOrLoadSession(sessionId);
    const currentText = session.doc.getText('content');
    let historyRecord: EditHistoryRecord | null = null;
    const now = Date.now();

    const beforeUpdateText = currentText.toString();
    let change: Array<any> | null = null;

    // Observe changes to capture the diff when this update is applied
    const capture = (event: Y.YTextEvent) => {
      change = event.delta as Array<any>;
    };
    currentText.observe(capture);
    try {
      Y.applyUpdate(session.doc, update);
    } finally {
      currentText.unobserve(capture);
    }

    // Append update to the database
    const key = updateKey(sessionId, now);
    await this.db.put(key, update);

    // Record edit history if we captured a change
    if (change) {
      const changes: Change[] = [];
      let offset = 0;
      for (const operation of change) {
        if (operation.retain) {
          offset += operation.retain;
        } else if (typeof operation.insert === 'string') {
          const snippet = operation.insert.slice(0, MAX_SNIPPET_LENGTH);
          const { line, col } = findSnippetLocation(beforeUpdateText, offset);
          changes.push({
            type: 'insert',
            line,
            col,
            snippet,
          });
        } else if (operation.delete) {
          const removed = beforeUpdateText
            .slice(offset, offset + operation.delete)
            .slice(0, MAX_SNIPPET_LENGTH); // get snippet of deleted text
          const { line, col } = findSnippetLocation(beforeUpdateText, offset);
          changes.push({
            type: 'delete',
            line,
            col,
            snippet: removed,
          });
          offset += operation.delete;
        }
      }

      if (changes.length > 0) {
        const historyKey = `${HISTORY_PREFIX}${sessionId}:${now}:${Math.random().toString(36).slice(2, 8)}`;
        historyRecord = {
          userId,
          timestamp: now,
          updateTimestamp: now,
          changes,
        };
        await this.db.put(
          historyKey,
          new TextEncoder().encode(JSON.stringify(historyRecord)),
        );
      }
    }

    session.numberOfOperations++;
    const shouldSnapshot =
      session.numberOfOperations >= OPERATIONS_THRESHOLD ||
      now - session.lastSnapshotAt >= SNAPSHOT_INTERVAL_MS;

    if (shouldSnapshot) {
      await this.writeSnapshotToDb(sessionId, session);
      session.numberOfOperations = 0;
      session.lastSnapshotAt = now;
      const { ts: snapTs } = await this.getLatestSnapshotInfo(sessionId);
      const threshold = Math.min(now - PRUNE_THRESHOLD_MS, snapTs ?? Infinity);
      await this.pruneOldUpdates(sessionId, threshold);
    }

    return historyRecord;
  }

  async writeSnapshotToDb(sessionId: string, session: SessionState) {
    const state = Y.encodeStateAsUpdate(session.doc);
    const now = Date.now();
    await this.db.put(SNAPSHOT_PREFIX + sessionId, state);
    await this.db.put(
      SNAPSHOT_META_PREFIX + sessionId,
      new TextEncoder().encode(JSON.stringify({ ts: now })),
    );
    this.log.log(`Wrote snapshot for session ${sessionId}`);
  }

  async pruneOldUpdates(sessionId: string, thresholdTimestamp: number) {
    const toDelete: string[] = [];
    for await (const [key] of this.db.iterator(updateRange(sessionId))) {
      const parts = key.split(':');
      const timestampString = parts[2];
      const timestamp = Number(timestampString);
      if (timestamp < thresholdTimestamp) {
        toDelete.push(key);
      }
    }

    if (toDelete.length) {
      const batch = this.db.batch();
      for (const delKey of toDelete) {
        batch.del(delKey);
      }
      await batch.write();
      this.log.log(
        `Pruned ${toDelete.length} old updates for session ${sessionId}`,
      );
    }
  }

  async getHistory(
    sessionId: string,
    limit: number = 50,
  ): Promise<EditHistoryRecord[]> {
    const raw: EditHistoryRecord[] = [];

    // read extra because many single-char rows will collapse
    const fetchLimit = Math.max(limit * 6, 200);
    let count = 0;

    for await (const [_, val] of this.db.iterator(
      historyRange(sessionId, fetchLimit),
    )) {
      if (count++ >= fetchLimit) break;
      try {
        const row = JSON.parse(
          new TextDecoder().decode(val),
        ) as EditHistoryRecord;
        row.updateTimestamp ??= row.timestamp; // for legacy records
        raw.push(row);
      } catch (error) {
        this.log.error(
          `Failed to parse history record for session ${sessionId}: ${error}`,
        );
      }
    }

    const merged = mergeAdjacent(raw);
    return merged.slice(0, limit);
  }

  async buildDocAt(sessionId: string, timestamp: number): Promise<Y.Doc> {
    const doc = new Y.Doc();
    const { ts: snapTs, state: snapState } =
      await this.getLatestSnapshotInfo(sessionId);

    if (snapState && snapTs !== null && snapTs <= timestamp) {
      try {
        Y.applyUpdate(doc, snapState);
      } catch (e) {
        this.log.error(`Failed to apply snapshot for ${sessionId}: ${e}`);
      }
    }

    const base = `${UPDATE_PREFIX}${sessionId}:`;
    const lower =
      snapTs !== null && snapTs <= timestamp
        ? `${UPDATE_PREFIX}${sessionId}:${String(snapTs).padStart(13, '0')}\x00` // just above snapshot
        : base;
    const upper = `${UPDATE_PREFIX}${sessionId}:${String(timestamp).padStart(13, '0')}\xFF`;

    for await (const [key, val] of this.db.iterator({
      gte: lower,
      lt: upper,
    })) {
      try {
        Y.applyUpdate(doc, val);
      } catch (error) {
        this.log.error(
          `Failed to apply update ${key} for ${sessionId}: ${error}`,
        );
      }
    }
    this.log.debug(`[buildDocAt] using snapTs=${snapTs} targetTs=${timestamp}`);
    return doc;
  }

  async getStateTextAt(sessionId: string, timestamp: number): Promise<string> {
    const doc = await this.buildDocAt(sessionId, timestamp);
    return doc.getText('content').toString();
  }

  async revertToText(
    sessionId: string,
    text: string,
    userId: string,
  ): Promise<Uint8Array> {
    const session = await this.getOrLoadSession(sessionId);

    let finalUpdate: Uint8Array | null = null;
    const onUpdate = (update: Uint8Array) => {
      finalUpdate = update;
    };
    session.doc.once('update', onUpdate);

    session.doc.transact(() => {
      const y = session.doc.getText('content');
      const length = y.length ?? y.toString().length;
      if (length > 0) {
        y.delete(0, length);
      }
      if (text && text.length > 0) {
        y.insert(0, text);
      }
    }, 'revert');

    session.doc.off('update', onUpdate);

    if (!finalUpdate || finalUpdate.byteLength === 0) {
      return new Uint8Array();
    }

    const now = Date.now();
    await this.db.put(updateKey(sessionId, now), finalUpdate);

    const historyKey = `${HISTORY_PREFIX}${sessionId}:${now}:${Math.random().toString(36).slice(2, 8)}`;
    const historyRecord: EditHistoryRecord = {
      userId,
      timestamp: now,
      changes: [
        {
          type: 'insert',
          line: 1,
          col: 1,
          snippet: '[Document reverted]',
        },
      ],
    };
    await this.db.put(
      historyKey,
      new TextEncoder().encode(JSON.stringify(historyRecord)),
    );

    return finalUpdate;
  }

  beginRevertSession(sessionId: string) {
    this.revertingSessions.add(sessionId);
  }

  endRevertSession(sessionId: string) {
    this.revertingSessions.delete(sessionId);
  }

  isReverting(sessionId: string): boolean {
    return this.revertingSessions.has(sessionId);
  }

  async pruneForwardHistory(sessionId: string, cutoffTimestamp: number) {
    const deleteKeys: string[] = [];

    // delete updates after cutoffTimestamp
    for await (const [key] of this.db.iterator(updateRange(sessionId))) {
      const timestamp = Number(key.split(':')[2]);
      if (timestamp > cutoffTimestamp) {
        deleteKeys.push(key);
      }
    }

    // delete history records after cutoffTimestamp
    const historyPrefix = `${HISTORY_PREFIX}${sessionId}:`;
    for await (const [key] of this.db.iterator({
      gte: historyPrefix,
      lt: historyPrefix + '\xFF',
    })) {
      const timestamp = Number(key.split(':')[2]);
      if (timestamp > cutoffTimestamp) {
        deleteKeys.push(key);
      }
    }

    if (deleteKeys.length) {
      const batch = this.db.batch();
      for (const delKey of deleteKeys) {
        batch.del(delKey);
      }
      await batch.write();
    }
  }

  async revertHard(
    sessionId: string,
    targetTimestamp: number,
    userId: string,
    exactUpdateTimestamp?: number,
  ): Promise<{ state: Uint8Array; history: EditHistoryRecord[] }> {
    this.beginRevertSession(sessionId);

    try {
      const effectiveTimestamp =
        exactUpdateTimestamp ??
        (await this.getEffectiveUpdateTs(sessionId, targetTimestamp));

      // build target doc from DB to state to revert to
      const targetDoc = await this.buildDocAt(sessionId, effectiveTimestamp);
      const targetText = targetDoc.getText('content').toString();

      // replace in memory doc
      const session = await this.getOrLoadSession(sessionId);
      session.doc.transact(() => {
        const y = session.doc.getText('content');
        const length = y.length ?? y.toString().length;
        if (length > 0) {
          y.delete(0, length);
        }
        if (targetText) {
          y.insert(0, targetText);
        }
      }, 'revert-hard');

      // prune forward in DB
      await this.pruneForwardHistory(sessionId, effectiveTimestamp);

      // snapshot new HEAD
      await this.writeSnapshotToDb(sessionId, session);
      session.numberOfOperations = 0;
      session.lastSnapshotAt = Date.now();

      // write one marker history record
      const now = Date.now();
      const historyKey = `${HISTORY_PREFIX}${sessionId}:${now}:${Math.random().toString(36).slice(2, 8)}`;
      const markerRecord: EditHistoryRecord = {
        userId,
        timestamp: now,
        updateTimestamp: effectiveTimestamp,
        changes: [
          {
            type: 'insert',
            line: 1,
            col: 1,
            snippet: '[Reverted to this version]',
          },
        ],
      };
      await this.db.put(
        historyKey,
        new TextEncoder().encode(JSON.stringify(markerRecord)),
      );

      // return full state and refreshed history
      const state = Y.encodeStateAsUpdate(session.doc);
      const history = await this.getHistory(sessionId, 50);
      this.log.debug(
        `[revertHard] target=${targetTimestamp} effective=${effectiveTimestamp}`,
      );
      return { state, history };
    } finally {
      this.endRevertSession(sessionId);
    }
  }

  async getEffectiveUpdateTs(
    sessionId: string,
    historyTimestamp: number,
  ): Promise<number> {
    const base = `${UPDATE_PREFIX}${sessionId}:`;
    const upper = `${UPDATE_PREFIX}${sessionId}:${String(historyTimestamp).padStart(13, '0')}\xFF`;

    let lastTimestamp: number | null = null;
    for await (const [key] of this.db.iterator({ gte: base, lt: upper })) {
      const parts = key.split(':');
      const timestamp = Number(parts[2]);
      if (!Number.isNaN(timestamp)) lastTimestamp = timestamp;
    }
    return lastTimestamp ?? 0;
  }

  async getLatestSnapshotInfo(
    sessionId: string,
  ): Promise<{ ts: number | null; state: Uint8Array | null }> {
    try {
      const metaRaw = await this.db.get(SNAPSHOT_META_PREFIX + sessionId);
      const parsed = JSON.parse(new TextDecoder().decode(metaRaw)) as {
        ts?: number;
      };
      const ts =
        typeof parsed.ts === 'number' && Number.isFinite(parsed.ts)
          ? parsed.ts
          : null;

      const snap = await this.db.get(SNAPSHOT_PREFIX + sessionId);
      if (!snap || snap.byteLength === 0) return { ts: null, state: null };

      return { ts, state: snap };
    } catch {
      return { ts: null, state: null };
    }
  }

  getAwareness(sessionId: string): Promise<Awareness> {
    return this.getOrLoadSession(sessionId).then(
      (session) => session.awareness,
    );
  }
}
