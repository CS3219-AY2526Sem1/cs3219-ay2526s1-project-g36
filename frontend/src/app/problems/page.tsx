"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Question = {
  _id?: unknown;
  id?: number;
  title: string;
  difficulty?: string;
  url?: string;
  related_topics?: string | string[];
};

export default function ProblemsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Question[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [topic, setTopic] = useState("");
  const [total, setTotal] = useState(0);

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
            // Backward-compat: if upstream returns array, assume unknown total
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
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-4">Problem Database</h1>
      <p className="text-gray-700 mb-6">
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
          className="border rounded px-3 py-2 w-80"
        />
      </div>

      {!loading && !error && (
        <div className="space-y-3">
          {items.map((q, idx) => {
            const topics = Array.isArray(q.related_topics)
              ? q.related_topics
              : typeof q.related_topics === "string"
              ? q.related_topics.split(",").map((t) => t.trim()).filter(Boolean)
              : [];
            return (
              <div key={(q.id ?? idx) as React.Key} className="border p-4 rounded-lg hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold truncate mr-4">{q.title}</h2>
                  {q.difficulty && (
                    <span className="text-sm text-gray-600">Difficulty: {q.difficulty}</span>
                  )}
                </div>

                {topics.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {topics.map((t, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
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
                    className="mt-2 inline-block text-blue-600 text-sm hover:underline"
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
              <>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</>
            ) : (
              <>Page {page}</>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-2 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={total > 0 ? page * pageSize >= total : items.length < pageSize}
              className="px-3 py-2 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <Link
        href="/room/abc123"
        className="inline-block mt-8 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
      >
        Join Collaboration Room
      </Link>
    </main>
  );
}
