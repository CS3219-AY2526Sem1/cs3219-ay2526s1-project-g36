import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);

  const base =
    process.env.QN_SERVICE_URL ||
    process.env.NEXT_PUBLIC_QN_SERVICE_URL ||
    'http://localhost:3000';

  // Forward all search params (page, pageSize, limit, topic, etc.)
  const params = new URLSearchParams(url.search);
  const upstream = `${base.replace(/\/+$/, '')}/questions?${params.toString()}`;

  const headers = new Headers();
  const auth = req.headers.get('authorization');
  if (auth) headers.set('authorization', auth);

  const res = await fetch(upstream, { headers, cache: 'no-store' });
  const body = await res.json().catch(() => ({}));

  return new NextResponse(JSON.stringify(body), {
    status: res.status,
    headers: { 'content-type': 'application/json' },
  });
}
