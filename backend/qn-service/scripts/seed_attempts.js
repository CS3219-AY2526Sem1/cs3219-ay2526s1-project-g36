/**
AI Assistance Disclosure:
Tool: OpenAI ChatGPT via Codex CLI, date: 2025-11-10
Scope: Generated seeding script to mass-create attempts for authenticated user via Question Service API.
Author review: Adjusted env handling, randomized timestamps, and logging.
*/
/**
 * Seed Question Attempts into Question Service
 *
 * Requirements:
 * - Node.js v18+ (global fetch)
 * - A valid JWT for the Question Service (Supabase user token)
 *
 * Usage (bash or cmd/powershell):
 *   set QN_TOKEN=eyJ... (Windows cmd)
 *   $env:QN_TOKEN="eyJ..."   (PowerShell)
 *   export QN_TOKEN=eyJ...    (bash)
 *
 *   # optional:
 *   export QN_BASE_URL=http://localhost:3000
 *   export COUNT=50
 *
 *   node backend/qn-service/scripts/seed_attempts.js
 *   # or specify count via arg:
 *   node backend/qn-service/scripts/seed_attempts.js 100
 */

const BASE = process.env.QN_BASE_URL || 'http://localhost:3000';
const TOKEN = process.env.QN_TOKEN || '';
const COUNT = Number(process.argv[2] || process.env.COUNT || 50);

if (!TOKEN) {
  console.error('Error: QN_TOKEN env var is required (Bearer JWT).');
  process.exit(1);
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateWithinDays(days) {
  const now = new Date();
  const past = new Date(now);
  past.setDate(now.getDate() - days);
  const t = randInt(past.getTime(), now.getTime());
  return new Date(t);
}

async function qnJson(path, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${TOKEN}`);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    let message = `HTTP ${res.status} ${res.statusText}`;
    if (body && typeof body === 'object') {
      if (typeof body.error === 'string') message = body.error;
      else if (typeof body.message === 'string') message = body.message;
      else if (typeof body.detail === 'string') message = body.detail;
    }
    throw new Error(message);
  }
  return body;
}

async function fetchQuestions(max = 500) {
  const pageSize = 200;
  let page = 1;
  const items = [];
  while (items.length < max) {
    const q = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    const resp = await qnJson(`/questions?${q.toString()}`);
    const arr = Array.isArray(resp.items) ? resp.items : [];
    items.push(...arr);
    const total = typeof resp.total === 'number' ? resp.total : items.length;
    if (items.length >= total || arr.length === 0) break;
    page += 1;
  }
  return items;
}

async function seed() {
  console.log(`Seeding attempts → BASE=${BASE}, COUNT=${COUNT}`);
  const questions = await fetchQuestions(COUNT * 2);
  if (questions.length === 0) {
    console.error('No questions found. Ensure Question Service has data.');
    process.exit(2);
  }

  let ok = 0;
  let fail = 0;
  for (let i = 0; i < COUNT; i++) {
    const q = questions[randInt(0, questions.length - 1)];
    const questionId = q?.id ?? q?.question_id ?? q?._id ?? String(i + 1);
    const started = randomDateWithinDays(180);
    const durationMin = randInt(2, 90);
    const submitted = new Date(started.getTime() + durationMin * 60 * 1000);
    const status = Math.random() < 0.7 ? 'completed' : 'left';

    const snapshot = {
      id: q?.id ?? undefined,
      title: q?.title ?? q?.name ?? undefined,
      difficulty: q?.difficulty ?? undefined,
      topic: q?.topic ?? (Array.isArray(q?.related_topics) ? q.related_topics[0] : undefined),
      related_topics: q?.related_topics ?? undefined,
      acceptance_rate: q?.acceptance_rate ?? q?.acceptanceRate ?? undefined,
    };

    try {
      await qnJson('/attempts', {
        method: 'POST',
        body: JSON.stringify({
          question_id: questionId,
          status,
          started_at: started.toISOString(),
          submitted_at: submitted.toISOString(),
          question: snapshot,
        }),
      });
      ok++;
      if (ok % 10 === 0) console.log(`  created ${ok}/${COUNT}…`);
    } catch (e) {
      fail++;
      console.warn(`  failed (${ok + fail}/${COUNT}) for question ${questionId}: ${e.message}`);
    }
  }

  console.log(`Done. Success: ${ok}, Failed: ${fail}`);
}

seed().catch((e) => {
  console.error('Seed error:', e);
  process.exit(1);
});
