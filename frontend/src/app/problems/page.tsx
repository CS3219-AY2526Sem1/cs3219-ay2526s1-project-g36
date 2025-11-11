"use client";

import { useEffect, useState } from "react";
import TopNavBar from "../components/navbar/TopNavBar";
import FilterPanel from "../components/problems/FilterPanel";
import ProblemDetailsPanel from "../components/problems/ProblemDetailsPanel";
import { qnJson } from "../../../lib/qn";
import { Question } from "../../../lib/mockApi";
import { useRequireAuth } from "../../../lib/useRequireAuth";

export default function ProblemsPage() {
  const ok = useRequireAuth();
  const [selectedProblem, setSelectedProblem] = useState<Question | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [debounced, setDebounced] = useState<string>("");

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch questions from qn-service (expects { items, total, page, pageSize })
  useEffect(() => {
    if (!ok) return; // wait until authenticated before fetching
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          sortBy: 'title',
          sortDir: 'asc',
        });
        if (debounced) query.set('q', debounced);
        const resp = await qnJson<{ items: any[]; total: number; page: number; pageSize: number }>(
          `/questions?${query.toString()}`
        );
        const list = Array.isArray(resp?.items) ? resp.items : [];
        const mapped: Question[] = list.map((q: any, idx: number) => {
          let dataStructures: string[] = [];
          if (Array.isArray(q.related_topics)) dataStructures = q.related_topics;
          else if (typeof q.related_topics === "string")
            dataStructures = q.related_topics
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean);
          else if (Array.isArray(q.dataStructures)) dataStructures = q.dataStructures;
          else if (Array.isArray(q.tags)) dataStructures = q.tags;

          const name = q.title ?? q.name ?? String(q._id ?? `Question ${idx + 1}`);
          const topic = q.topic ?? q.category ?? (dataStructures[0] ?? "");
          let difficulty = (q.difficulty ?? "easy").toString().toLowerCase();
          if (!["easy", "medium", "hard"].includes(difficulty)) difficulty = "easy";
          const acceptanceRate = Number(q.acceptanceRate ?? q.acceptance_rate ?? q.solve_rate ?? 0);

          return {
            id: Number(q.id ?? (page - 1) * pageSize + idx + 1),
            name,
            description: q.description ?? "",
            difficulty,
            acceptanceRate: isFinite(acceptanceRate) ? acceptanceRate : 0,
            dataStructures,
            topic,
          } as Question;
        });
        if (mounted) {
          setQuestions(mapped);
          setTotal(typeof resp?.total === "number" ? resp.total : mapped.length);
        }
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Failed to load questions");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [ok, page, pageSize, debounced]);

  if (!ok) {
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
          <h1 className="text-2xl font-bold mb-4">Problems</h1>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by title or topic"
              className="w-full max-w-xl border rounded px-3 py-2"
            />
            {search && (
              <button
                className="px-3 py-2 border rounded"
                onClick={() => { setSearch(''); setPage(1); }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
        {loading ? (
          <p className="text-gray-600">Loading questions...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : (
          <>
            <FilterPanel
              questions={questions}
              onSelectProblem={(question) => setSelectedProblem(question)}
              startIndex={(page - 1) * pageSize}
            />
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {total > 0
                  ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(
                      total,
                      page * pageSize
                    )} of ${total}`
                  : "No results"}
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
                  {[10, 20, 50, 100, 200].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
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
          </>
        )}
      </div>

      {selectedProblem && (
        <ProblemDetailsPanel
          problem={selectedProblem}
          onClose={() => setSelectedProblem(null)}
        />
      )}
    </main>
  );
}
