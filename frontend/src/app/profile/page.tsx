"use client";

import { useEffect, useMemo, useState } from "react";
import { backendJson } from "../../../lib/backend";
import { supabaseBrowser } from "../../../utils/supabase/client";

type Profile = {
  id: string;
  email: string | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
};

type QuestionHistoryItem = {
  id: string;
  questionId: string;
  title: string;
  startedAt: string;   // ISO
  submittedAt: string; // ISO
};

export default function ProfilePage() {
  // form state always defaults to empty strings so inputs always show usable fields
  const [username, setUsername]   = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState(""); // show email ASAP from session

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [history, setHistory] = useState<QuestionHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // get email quickly from supabase session so it’s visible before /me resolves
  useEffect(() => {
    (async () => {
      const { data } = await supabaseBrowser.auth.getUser();
      const sessionEmail = data.user?.email ?? "";
      if (sessionEmail) setEmail(sessionEmail);
      const token = supabaseBrowser.auth.getSession().then(({ data }) => data.session?.access_token);
      console.log("Profile page access token:", await token);
    })();
  }, []);

  // hydrate fields from backend when available
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await backendJson<{ profile: Profile }>("/profile/me", { method: "GET" });
        const me = response.profile;
        if (!mounted) return;

        // coalesce nullish values to empty strings for controlled inputs
        //setEmail(me.email ?? "");
        setUsername(me.username ?? "");
        setFirstName(me.first_name ?? "");
        setLastName(me.last_name ?? "");
      } catch (e: any) {
        setError(e?.message ?? "Failed to load profile");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await backendJson<Profile>("/profile/me", {
        method: "PATCH",
        body: JSON.stringify({
          username: username || null,   // (optional) send null to clear on backend
          first_name: firstName || null,
          last_name: lastName || null,
        }),
      });
      // re-hydrate with what backend actually stored
      setEmail(updated.email ?? "");
      setUsername(updated.username ?? "");
      setFirstName(updated.first_name ?? "");
      setLastName(updated.last_name ?? "");
      setSuccess("Profile saved!");
    } catch (e: any) {
      setError(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const namePreview = useMemo(
    () => [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || email || "",
    [firstName, lastName, email]
  );

  return (
    <main className="p-8">
      <div className="flex items-baseline gap-3">
        <h1 className="text-3xl font-bold">My Profile</h1>
        {loading && <span className="text-sm text-gray-500">loading…</span>}
      </div>

      <section className="bg-white p-6 rounded-xl shadow-md max-w-2xl mt-6">
        <form onSubmit={onSave} className="space-y-5">
          {/* email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Email (read-only)</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 bg-gray-100 text-black"
              value={email}
              disabled
            />
          </div>

          {/* username */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring bg-gray-100 text-black"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your-handle"
            />
          </div>

          {/* first & last name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">First name</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring bg-gray-100 text-black"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last name</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring bg-gray-100 text-black"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>

          {/* feedback */}
          {success && <p className="text-green-700">{success}</p>}
          {error && <p className="text-red-600">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>

            <span className="text-sm text-gray-500">
              Preview name: <strong>{namePreview}</strong>
            </span>
          </div>
        </form>
      </section>

      {/* Question History */}
      <section className="mt-10 max-w-2xl">
        <h2 className="text-2xl font-semibold mb-3">Question History</h2>
        {historyLoading ? (
          <p className="text-gray-600">Loading history…</p>
        ) : history.length === 0 ? (
          <p className="text-gray-600">No questions completed yet.</p>
        ) : (
          <ul className="divide-y rounded-xl border bg-white">
            {history.map((h) => (
              <li key={h.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{h.title}</p>
                  <p className="text-sm text-gray-600">
                    {h.startedAt ?? "—"} · {new Date(h.submittedAt).toLocaleString()}
                  </p>
                </div>
                <a
                  href={`/questions/${h.questionId}`}
                  className="text-blue-600 hover:underline text-sm"
                >
                  View
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
