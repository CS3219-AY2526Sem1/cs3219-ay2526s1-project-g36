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
  const [difficulty, setDifficulty] = useState<string>("");
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<string>("title");
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
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
        if (difficulty) qs.set("difficulty", difficulty);
        if (q.trim()) qs.set("q", q);
        if (sortBy) qs.set("sortBy", sortBy);
        if (sortDir) qs.set("sortDir", sortDir);

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
  }, [page, pageSize, topic, difficulty, q, sortBy, sortDir]);

  return (
    <main className="relative min-h-screen p-8">
      <h1 className="mb-4 text-3xl font-bold">Problem Database</h1>
      <p className="mb-6 text-gray-700">
        Browse and solve coding problems, or find a partner to collaborate with.
      </p>

      {loading && <p className="text-gray-600">Loading problems…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {/* Filter and sort controls */}
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <input
          type="text"
          placeholder="Search by keyword / name / index (case sensitive)"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          className="w-full rounded border px-3 py-2"
        />
        <div className="flex gap-2">
          <select
            className="w-full rounded border px-3 py-2"
            value={difficulty}
            onChange={(e) => {
              setPage(1);
              setDifficulty(e.target.value);
            }}
          >
            <option value="">All difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
          <input
            type="text"
            placeholder="Filter by topic (e.g., Array)"
            value={topic}
            onChange={(e) => {
              setPage(1);
              setTopic(e.target.value);
            }}
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            className="w-full rounded border px-3 py-2"
            value={sortBy}
            onChange={(e) => {
              setPage(1);
              setSortBy(e.target.value);
            }}
          >
            <option value="title">Title</option>
            <option value="difficulty">Difficulty</option>
            <option value="popularity">Popularity (likes)</option>
            <option value="solve_rate">Solve rate (acceptance)</option>
            <option value="discuss_count">Discuss count</option>
            <option value="rating">Rating</option>
            <option value="frequency">Frequency</option>
            <option value="id">Index</option>
            <option value="topic">Topic</option>
          </select>
          <button
            onClick={() => {
              setPage(1);
              setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
            }}
            className="whitespace-nowrap rounded border px-3 py-2"
            aria-label="Toggle sort direction"
            type="button"
          >
            {sortDir === 'asc' ? 'Asc' : 'Desc'}
          </button>
        </div>
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
              <div
                key={key}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedProblem(q)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedProblem(q);
                  }
                }}
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
                      <button
                        key={i}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTopic(t);
                          setPage(1);
                        }}
                        className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-800 hover:bg-gray-200"
                        title={`Filter by ${t}`}
                      >
                        {t}
                      </button>
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
              </div>
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
