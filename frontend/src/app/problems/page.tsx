"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProblemDetailsPanel from "../components/problems/ProblemDetailsPanel";

type Question = {
  _id?: unknown;
  id?: number;
  title: string;
  difficulty?: string;
  url?: string;
  related_topics?: string | string[];
  // Add any extra fields your ProblemDetailsPanel expects:
  // description?: string;
  // starter_code?: string;
};

export default function ProblemsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Question[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [topic, setTopic] = useState("");
  const [total, setTotal] = useState(0);
  const [selectedProblem, setSelectedProblem] = useState<Question | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const qs = new URLSearchParams();
        qs.set("page", String(page));
        qs.set("pageSize", String(pageSize));
        if (topic.trim()) qs.set("topic", topic.trim());

        const res = await fetch(`/api/questions?${qs.toString()}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        if (!ignore) {
          if (Array.isArray(data)) {
            // Back-compat: upstream returned array → unknown total
            setItems(data);
            setTotal(page * pageSize + (data?.length ?? 0));
          } else {
            setItems(Array.isArray(data.items) ? data.items : []);
            setTotal(typeof data.total === "number" ? data.total : 0);
          }
        }
      } catch (e) {
        if (!ignore) setError((e as Error).message || "Failed to load questions");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [page, pageSize, topic]);

  return (
    <main className="relative min-h-screen p-8">
      <h1 className="mb-4 text-3xl font-bold">Problem Database</h1>
      <p className="mb-6 text-gray-700">
        Browse and solve coding problems, or find a partner to collaborate with.
      </p>

      {loading && <p className="text-gray-600">Loading problems…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {/* Filter controls */}
      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          placeholder="Filter by related topic (e.g., Array)"
          value={topic}
          onChange={(e) => {
            setPage(1);
            setTopic(e.target.value);
          }}
          className="w-80 rounded border px-3 py-2"
        />
      </div>

      {/* List */}
      {!loading && !error && (
        <div className="space-y-3">
          {items.map((q, idx) => {
            const topics = Array.isArray(q.related_topics)
              ? q.related_topics
              : typeof q.related_topics === "string"
              ? q.related_topics.split(",").map((t) => t.trim()).filter(Boolean)
              : [];

            const key = (q.id ?? String(q._id ?? idx)) as React.Key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedProblem(q)}
                className="w-full rounded-lg border p-4 text-left transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="flex items-center justify-between">
                  <h2 className="mr-4 truncate font-semibold">{q.title}</h2>
                  {q.difficulty && (
                    <span className="text-sm text-gray-600">Difficulty: {q.difficulty}</span>
                  )}
                </div>

                {topics.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {topics.map((t, i) => (
                      <span key={i} className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-800">
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {q.url && (
                  <a
                    href={q.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View on LeetCode
                  </a>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {total > 0 ? (
              <>
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
              </>
            ) : (
              <>Page {page}</>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded border px-3 py-2 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={total > 0 ? page * pageSize >= total : items.length < pageSize}
              className="rounded border px-3 py-2 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <Link
        href="/room/abc123"
        className="mt-8 inline-block rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
      >
        Join Collaboration Room
      </Link>

      {/* Right-side details panel */}
      {selectedProblem && (
        <ProblemDetailsPanel
          problem={selectedProblem}
          onClose={() => setSelectedProblem(null)}
        />
      )}
    </main>
  );
}
