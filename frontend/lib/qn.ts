import { supabaseBrowser } from '../utils/supabase/client';

// Base URL for the Question service
const QN_BASE = process.env.NEXT_PUBLIC_QN_BASE_URL || 'http://localhost:3000';

export async function qnFetch(path: string, init?: RequestInit) {
  const { data: { session } } = await supabaseBrowser.auth.getSession();

  const headers = new Headers(init?.headers || {});
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(`${QN_BASE}${path}`, { ...init, headers });
}

export async function qnJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await qnFetch(path, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    let message = `HTTP ${res.status} ${res.statusText}`;
    if (body && typeof body === 'object') {
      const obj = body as { error?: unknown; message?: unknown; detail?: unknown };
      if (typeof obj.error === 'string') message = obj.error;
      else if (typeof obj.message === 'string') message = obj.message;
      else if (typeof obj.detail === 'string') message = obj.detail;
    }
    throw new Error(message);
  }
  return body as T;
}
