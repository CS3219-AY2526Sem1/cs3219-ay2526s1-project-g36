export const TYPE_BURST_MS = 1000; // pause threshold to “close” a burst
export const MAX_BURST_MS = 5000; // safety cap: flush even if never paused

export const SNAPSHOT_PREFIX = 'snapshot:';
export const UPDATE_PREFIX = 'update:';
export const HISTORY_PREFIX = 'history:';

export const SNAPSHOT_INTERVAL_MS = 30000; // 30 seconds
export const OPERATIONS_THRESHOLD = 200;
export const PRUNE_THRESHOLD_MS = 60000; // 1 minute
export const MAX_SNIPPET_LENGTH = 120;
export const MERGE_WINDOW_MS = 1200;

export const ALLOWED_LANGUAGES = new Set([
  'python',
  'javascript',
  'java',
  'cpp',
  'c',
]);

export function toUint8(data: unknown): Uint8Array {
  if (data instanceof Uint8Array) return data;
  // Node Buffer
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(data))
    return new Uint8Array(data);
  // Browser ArrayBuffer that made it through
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  // ArrayBufferView (e.g., DataView)
  if (ArrayBuffer.isView(data))
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  return new Uint8Array();
}

export function updateKey(sessionId: string, timestamp: number) {
  const random = Math.random().toString(36).slice(2, 8);
  const paddedTimestamp = String(timestamp).padStart(13, '0');
  return `${UPDATE_PREFIX}${sessionId}:${paddedTimestamp}:${random}`;
}

export function updateRange(sessionId: string) {
  const base = `${UPDATE_PREFIX}${sessionId}:`;
  return { gte: base, lt: base + '\xFF' };
}

export function historyRange(sessionId: string, limit = 50) {
  const base = `${HISTORY_PREFIX}${sessionId}:`;
  return { gte: base, lt: base + '\xFF', reverse: true, limit: limit };
}

export function findSnippetLocation(text: string, offset: number) {
  let line = 1,
    col = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  return { line, col };
}
