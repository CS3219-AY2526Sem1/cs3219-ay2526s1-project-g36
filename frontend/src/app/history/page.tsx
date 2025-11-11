"use client";

import { useEffect, useState } from "react";
import TopNavBar from "../components/navbar/TopNavBar";
import { useRequireAuth } from "../../../lib/useRequireAuth";
import { qnJson } from "../../../lib/qn";

type Attempt = {
  user_id: string;
  question_id: string;
  status?: string;
  started_at: string;
  submitted_at?: string;
  created_at?: string;
  question?: {
    id?: number | string;
    name?: string;
    title?: string;
    description?: string;
    difficulty?: string;
    topic?: string;
    related_topics?: string[];
  } | null;
};

export default function HistoryPage() {
  const ok = useRequireAuth();
  const [items, setItems] = useState<Attempt[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ok) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await qnJson<{ items: Attempt[]; total?: number; page?: number; pageSize?: number }>(
          `/attempts?page=${page}&pageSize=${pageSize}`
        );
        if (!cancelled) {
          setItems(Array.isArray(data.items) ? data.items : []);
          setTotal(typeof data.total === 'number' ? data.total : (Array.isArray(data.items) ? data.items.length : 0));
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ok, page, pageSize]);

  if (!ok || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  return (
    <main className="relative min-h-screen flex p-6">
      <div className="flex-1">
        <TopNavBar />
        <div className="my-4">
          <h1 className="text-2xl font-bold mb-4">History</h1>
          {error && (
            <div className="text-red-600 mb-3">{error}</div>
          )}
          {/* Summary charts */}
          <SummaryCharts attempts={items} />

          {/* Top toolbar (match Problems page style) */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {total > 0
                ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(total, page * pageSize)} of ${total}`
                : 'No results'}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Rows per page</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  const size = Number(e.target.value) || 20;
                  setPage(1);
                  setPageSize(size);
                }}
                className="border rounded px-2 py-1"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <button
                className="px-3 py-1 border rounded disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Prev
              </button>
              <span className="text-sm text-gray-600">Page {page}</span>
              <button
                className="px-3 py-1 border rounded disabled:opacity-50"
                onClick={() => {
                  const maxPage = total > 0 ? Math.ceil(total / pageSize) : page + 1;
                  setPage((p) => (p < maxPage ? p + 1 : p));
                }}
                disabled={total > 0 && page >= Math.ceil(total / pageSize)}
              >
                Next
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <p className="mt-2 text-gray-600">No attempts yet.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {items.map((a, idx) => {
                const title = a.question?.title || a.question?.name || `Question ${a.question_id}`;
                const dateStr = a.submitted_at || a.created_at || a.started_at;
                const date = dateStr ? new Date(dateStr) : null;
                const dateFmt = date ? date.toLocaleString() : '—';
                const difficulty = (a.question?.difficulty || '').toString();
                const topic = a.question?.topic || (Array.isArray(a.question?.related_topics) ? a.question?.related_topics?.[0] : undefined) || '—';
                return (
                  <div key={idx} className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="font-semibold">{title}</div>
                      <div className="text-sm text-gray-600">{dateFmt}</div>
                    </div>
                    <div className="flex gap-3 text-sm">
                      <span className="px-2 py-1 rounded bg-gray-100">{difficulty || '—'}</span>
                      <span className="px-2 py-1 rounded bg-gray-100">{topic}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function SummaryCharts({ attempts }: { attempts: Attempt[] }) {
  // Difficulty breakdown
  const diffCounts = attempts.reduce(
    (acc, a) => {
      const d = String(a.question?.difficulty || '').toLowerCase();
      if (d.startsWith('eas')) acc.easy++;
      else if (d.startsWith('med')) acc.medium++;
      else if (d.startsWith('har')) acc.hard++;
      else acc.unknown++;
      return acc;
    },
    { easy: 0, medium: 0, hard: 0, unknown: 0 }
  );
  const diffTotal = diffCounts.easy + diffCounts.medium + diffCounts.hard + diffCounts.unknown;
  const pct = (n: number) => (diffTotal ? Math.round((n / diffTotal) * 100) : 0);

  // Completion rate by month (last 6 months)
  const months = (() => {
    const now = new Date();
    const list: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString(undefined, { month: 'short' });
      list.push({ key, label });
    }
    return list;
  })();

  const completionByMonth = new Map<string, number>();
  months.forEach((m) => completionByMonth.set(m.key, 0));
  for (const a of attempts) {
    const isCompleted = String(a.status || '').toLowerCase() === 'completed';
    if (!isCompleted) continue;
    const dateStr = a.submitted_at || a.created_at || a.started_at;
    if (!dateStr) continue;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (completionByMonth.has(key)) {
      completionByMonth.set(key, (completionByMonth.get(key) || 0) + 1);
    }
  }
  const monthlySeries = months.map((m) => ({ label: m.label, count: completionByMonth.get(m.key) || 0 }));
  const maxMonthly = monthlySeries.reduce((max, m) => Math.max(max, m.count), 0) || 1;

  // Top topics
  const topicCounts = new Map<string, number>();
  for (const a of attempts) {
    let t = a.question?.topic;
    if (!t && Array.isArray(a.question?.related_topics) && a.question!.related_topics!.length > 0) {
      t = a.question!.related_topics![0];
    }
    if (!t) continue;
    const key = String(t);
    topicCounts.set(key, (topicCounts.get(key) || 0) + 1);
  }
  const topTopics = Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxTopic = topTopics.reduce((m, [, c]) => Math.max(m, c), 0) || 1;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Difficulty Breakdown */}
      <div className="border rounded-lg p-4">
        <div className="font-semibold mb-3">Difficulty Breakdown</div>
        <div className="space-y-2">
          <DiffRow label="Easy" count={diffCounts.easy} total={diffTotal} color="bg-green-500" />
          <DiffRow label="Medium" count={diffCounts.medium} total={diffTotal} color="bg-yellow-500" />
          <DiffRow label="Hard" count={diffCounts.hard} total={diffTotal} color="bg-red-500" />
        </div>
      </div>

      {/* Completion Rate by Month (last 6 months) */}
      <div className="border rounded-lg p-4">
        <div className="font-semibold mb-3">Completions (last 6 months)</div>
        <div className="h-40 flex items-end gap-3">
          {monthlySeries.map((m, idx) => (
            <div key={idx} className="flex flex-col items-center justify-end gap-1">
              <div className="text-xs text-gray-600 h-4">{m.count}</div>
              <div className="w-6 bg-blue-600 rounded" style={{ height: `${(m.count / maxMonthly) * 100}%` }} />
              <div className="text-xs text-gray-600">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Topics */}
      <div className="border rounded-lg p-4">
        <div className="font-semibold mb-3">Top Topics</div>
        {topTopics.length === 0 ? (
          <div className="text-gray-600 text-sm">No topic data yet.</div>
        ) : (
          <div className="space-y-2">
            {topTopics.map(([topic, count]) => (
              <div key={topic} className="text-sm">
                <div className="flex justify-between mb-1">
                  <span>{topic}</span>
                  <span className="text-gray-600">{count}</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded overflow-hidden">
                  <div className="h-3 bg-purple-500" style={{ width: `${(count / maxTopic) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DiffRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percent = total ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="text-gray-600">{count} ({percent}%)</span>
      </div>
      <div className="w-full h-3 bg-gray-100 rounded overflow-hidden">
        <div className={`h-3 ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
