"use client";

import { useEffect, useMemo, useState } from "react";
import { backendJson } from "../../../lib/backend";
import { supabaseBrowser } from "../../../utils/supabase/client";

type Profile = {
  id: string;
  email: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
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
        const me = await backendJson<Profile>("/auth/me", { method: "GET" });
        if (!mounted) return;

        // coalesce nullish values to empty strings for controlled inputs
        //setEmail(me.email ?? "");
        setUsername(me.username ?? "");
        setFirstName(me.firstName ?? "");
        setLastName(me.lastName ?? "");
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
      const updated = await backendJson<Profile>("/me", {
        method: "PATCH",
        body: JSON.stringify({
          username: username || null,   // (optional) send null to clear on backend
          firstName: firstName || null,
          lastName: lastName || null,
        }),
      });
      // re-hydrate with what backend actually stored
      setEmail(updated.email ?? "");
      setUsername(updated.username ?? "");
      setFirstName(updated.firstName ?? "");
      setLastName(updated.lastName ?? "");
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

      {/* you can keep your history section below, unchanged */}
    </main>
  );
}
