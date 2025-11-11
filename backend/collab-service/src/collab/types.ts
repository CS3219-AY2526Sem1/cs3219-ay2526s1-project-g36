import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';

export type Change = {
  type: 'insert' | 'delete';
  line: number;
  col: number;
  snippet: string;
};
export type EditHistoryRecord = {
  userId: string;
  timestamp: number;
  changes: Change[];
};

export type BurstBuffer = {
  timer: NodeJS.Timeout | null;
  startedAt: number; // when burst begun
  lastAt: number; // last record time
  lastLine: number | null; // to keep same-line bursts together
  records: EditHistoryRecord[];
};

export type SessionState = {
  doc: Y.Doc;
  awareness: Awareness;
  numberOfOperations: number;
  lastSnapshotAt: number;
  isLoadedFromDB: boolean;
  language: string;
};
