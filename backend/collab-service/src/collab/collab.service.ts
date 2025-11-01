import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { Injectable, Logger } from '@nestjs/common';
import { ClassicLevel } from 'classic-level';

export type SessionState = {
  doc: Y.Doc;
  awareness: Awareness;
  numberOfOperations: number;
  lastSnapshotAt: number;
  isLoadedFromDB: boolean;
};

const SNAPSHOT_PREFIX = 'snapshot:';
const UPDATE_PREFIX = 'update:';

const SNAPSHOT_INTERVAL_MS = 30000; // 30 seconds
const OPERATIONS_THRESHOLD = 200;
const PRUNE_THRESHOLD_MS = 60000; // 1 minute

function updateKey(sessionId: string, timestamp: number) {
  const random = Math.random().toString(36).slice(2, 8);
  const paddedTimestamp = String(timestamp).padStart(13, '0');
  return `${UPDATE_PREFIX}${sessionId}:${paddedTimestamp}:${random}`;
}

function updateRange(sessionId: string) {
  const base = `${UPDATE_PREFIX}${sessionId}:`;
  return { gte: base, lt: base + '\xFF' };
}

@Injectable()
export class CollabService {
  private readonly log = new Logger('CollabService');

  private sessions = new Map<string, SessionState>();
  private db: ClassicLevel<string, Uint8Array>;

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
    };
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

  async applyAndPersistUpdate(sessionId: string, update: Uint8Array) {
    const session = await this.getOrLoadSession(sessionId);
    Y.applyUpdate(session.doc, update);

    // Append update to the database
    const key = updateKey(sessionId, Date.now());
    await this.db.put(key, update);

    session.numberOfOperations++;
    const now = Date.now();
    const shouldSnapshot =
      session.numberOfOperations >= OPERATIONS_THRESHOLD ||
      now - session.lastSnapshotAt >= SNAPSHOT_INTERVAL_MS;

    if (shouldSnapshot) {
      await this.writeSnapshotToDb(sessionId, session);
      session.numberOfOperations = 0;
      session.lastSnapshotAt = now;
      await this.pruneOldUpdates(sessionId, now - PRUNE_THRESHOLD_MS);
    }
  }

  async writeSnapshotToDb(sessionId: string, session: SessionState) {
    const state = Y.encodeStateAsUpdate(session.doc);
    await this.db.put(SNAPSHOT_PREFIX + sessionId, state);
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

  getAwareness(sessionId: string): Promise<Awareness> {
    return this.getOrLoadSession(sessionId).then(
      (session) => session.awareness,
    );
  }
}
