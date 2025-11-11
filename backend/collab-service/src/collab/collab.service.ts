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
      await this.pruneOldUpdates(sessionId, now - PRUNE_THRESHOLD_MS);
    }

    return historyRecord;
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
        raw.push(JSON.parse(new TextDecoder().decode(val)));
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
    const base = `${UPDATE_PREFIX}${sessionId}:`;
    const upperBound = `${UPDATE_PREFIX}${sessionId}:${String(timestamp).padStart(13, '0')}\xFF`;

    for await (const [key, val] of this.db.iterator({
      gte: base,
      lt: upperBound,
    })) {
      try {
        Y.applyUpdate(doc, val);
      } catch (error) {
        this.log.error(
          `Failed to apply update ${key} for session ${sessionId}: ${error}`,
        );
      }
    }
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
  ): Promise<{ state: Uint8Array; history: EditHistoryRecord[] }> {
    this.beginRevertSession(sessionId);

    try {
      // build target doc from DB to state to revert to
      const targetDoc = await this.buildDocAt(sessionId, targetTimestamp);
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
      await this.pruneForwardHistory(sessionId, targetTimestamp);

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
      return { state, history };
    } finally {
      this.endRevertSession(sessionId);
    }
  }

  getAwareness(sessionId: string): Promise<Awareness> {
    return this.getOrLoadSession(sessionId).then(
      (session) => session.awareness,
    );
  }
}
