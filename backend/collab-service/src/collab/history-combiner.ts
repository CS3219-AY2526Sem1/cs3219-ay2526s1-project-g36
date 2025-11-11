import { Change, EditHistoryRecord } from './types';
import { MERGE_WINDOW_MS } from './helpers';

/**
 * Combines changes for persistent history storage.
 * More thorough merging that handles all edge cases.
 */
export function combineChanges(changes: Change[]): Change[] {
  if (!changes.length) return [];

  type Item = { col: number; order: number; text: string };
  const byKey = new Map<
    string,
    { type: Change['type']; line: number; items: Item[] }
  >();

  let order = 0; // oldest -> newest
  for (const ch of changes) {
    const key = `${ch.type}:${ch.line}`;
    let g = byKey.get(key);
    if (!g) {
      g = { type: ch.type, line: ch.line, items: [] };
      byKey.set(key, g);
    }
    g.items.push({ col: ch.col, order: order++, text: ch.snippet });
  }

  const out: Change[] = [];
  for (const g of byKey.values()) {
    // left->right; for same col, chronological
    g.items.sort((a, b) => a.col - b.col || a.order - b.order);

    let snippet = '';
    let i = 0;
    while (i < g.items.length) {
      let j = i + 1;
      while (j < g.items.length && g.items[j].col === g.items[i].col) j++;

      const slice = g.items.slice(i, j);
      if (g.type === 'insert') {
        // equal-col inserts must be newest-first (reverse chronological)
        for (let k = slice.length - 1; k >= 0; k--) snippet += slice[k].text;
      } else {
        // deletes in chronological order
        for (let k = 0; k < slice.length; k++) snippet += slice[k].text;
      }
      i = j;
    }

    out.push({
      type: g.type,
      line: g.line,
      col: Math.min(...g.items.map((it) => it.col)),
      snippet,
    });
  }

  // stable UI ordering
  out.sort((a, b) => a.line - b.line || (a.type === 'insert' ? -1 : 1));
  return out;
}

export function mergeAdjacent(
  records: EditHistoryRecord[],
): EditHistoryRecord[] {
  if (!records.length) return [];
  const merged: EditHistoryRecord[] = [];
  let bucket: EditHistoryRecord[] = [records[0]];

  const flush = () => {
    if (!bucket.length) return;
    const chron = [...bucket].reverse(); // oldest -> newest
    const userId = chron[0].userId;
    const timestamp = chron[chron.length - 1].timestamp; // newest timestamp
    const all: Change[] = [];
    for (const r of chron) all.push(...r.changes);
    merged.push({ userId, timestamp, changes: combineChanges(all) });
    bucket = [];
  };

  for (let i = 1; i < records.length; i++) {
    const prevNewest = bucket[0];
    const cur = records[i];
    const sameUser = cur.userId === prevNewest.userId;
    const within = prevNewest.timestamp - cur.timestamp <= MERGE_WINDOW_MS;
    if (sameUser && within) bucket.unshift(cur);
    else {
      flush();
      bucket = [cur];
    }
  }
  flush();
  return merged;
}
