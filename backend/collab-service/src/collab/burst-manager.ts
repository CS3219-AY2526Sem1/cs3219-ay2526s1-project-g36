import { BurstBuffer, Change, EditHistoryRecord } from './types';
import { Server } from 'socket.io';

export function mergeRecords(records: EditHistoryRecord[]): EditHistoryRecord {
  const userId = records[0].userId;
  const timestamp = records[records.length - 1].timestamp;
  const all: Change[] = [];
  for (const r of records) all.push(...r.changes);
  const changes = combineChanges(all);
  return { userId, timestamp, changes };
}

export function flushBurst(
  server: Server,
  sessionId: string,
  key: string,
  bursts: Map<string, BurstBuffer>,
) {
  const buffer = bursts.get(key);
  if (!buffer || buffer.records.length === 0) return;
  const merged = mergeRecords(buffer.records);
  server.to('session:' + sessionId).emit('collab:history:new', merged);
  // reset
  if (buffer.timer) clearTimeout(buffer.timer);
  bursts.delete(key);
}

/**
 * Combines changes for real-time burst buffering.
 * Optimized for speed and forward-typing patterns.
 */
export function combineChanges(changes: Change[]): Change[] {
  if (!changes.length) return [];

  // Keep order as emitted
  const out: Change[] = [];
  let cur: Change | null = null;

  const pushCur = () => {
    if (cur) out.push({ ...cur });
  };

  for (const nxt of changes) {
    if (!cur) {
      cur = { ...nxt };
      continue;
    }

    const sameType = cur.type === nxt.type;
    const sameLine = cur.line === nxt.line;

    if (sameType && sameLine) {
      if (cur.type === 'insert') {
        // Merge if the next insert starts at or near the end of current snippet (typing forward)
        const curEnd = cur.col + cur.snippet.length;
        if (nxt.col <= curEnd + 5 && nxt.col >= cur.col - 1) {
          // If there is a small gap, fill with spaces so order stays correct
          const gap = Math.max(0, nxt.col - curEnd);
          if (gap > 0) cur.snippet += ' '.repeat(gap);
          cur.snippet += nxt.snippet;
          continue;
        }
      } else {
        // DELETE: merge if ranges touch or overlap, including backspace-left behavior
        const curStart = cur.col;
        const curEnd = cur.col + cur.snippet.length;

        const nxtStart = nxt.col;
        const nxtEnd = nxt.col + nxt.snippet.length;

        const touchingOrOverlapping = !(
          nxtStart > curEnd + 1 || nxtEnd < curStart - 1
        );

        if (touchingOrOverlapping) {
          // Expand to the union and rebuild snippet in correct order
          const newStart = Math.min(curStart, nxtStart);
          const leftFirst = nxtStart < curStart;

          cur.snippet = leftFirst
            ? nxt.snippet + cur.snippet
            : cur.snippet + nxt.snippet;
          cur.col = newStart;
          continue;
        }
      }
    }

    pushCur();
    cur = { ...nxt };
  }

  pushCur();

  // Combine multi-line pastes typed in one burst
  const final: Change[] = [];
  for (const ch of out) {
    const last = final[final.length - 1];
    if (
      last &&
      last.type === ch.type &&
      (last.line === ch.line || last.line + 1 === ch.line) &&
      last.snippet.endsWith('\n')
    ) {
      last.snippet += ch.snippet;
    } else {
      final.push(ch);
    }
  }
  return final;
}
