"use client";

import { useEffect, useMemo, useState } from "react";
import { backendJson } from "../../../lib/backend";
import { supabaseBrowser } from "../../../utils/supabase/client";
import TopNavBar from "../components/navbar/TopNavBar";
import ProfileForm from "../components/profile/ProfileForm";
import QuestionHistory from "../components/profile/QuestionHistory";
import { useTheme } from "../../../context/ThemeContext";

type Profile = {
  id: string;
  email: string | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
};

export default function ProfilePage() {
  const { theme } = useTheme();

  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // preload email from Supabase
  useEffect(() => {
    (async () => {
      const { data } = await supabaseBrowser.auth.getUser();
      const sessionEmail = data.user?.email ?? "";
      if (sessionEmail) setEmail(sessionEmail);
    })();
  }, []);

  // fetch user profile
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const response = await backendJson<{ profile: Profile }>("/profile/me", {
          method: "GET",
        });
        const me = response.profile;
        if (!mounted) return;
        setUsername(me.username ?? "");
        setFirstName(me.first_name ?? "");
        setLastName(me.last_name ?? "");
      } catch (e: any) {
        setError(e?.message ?? "Failed to load profile");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await backendJson<Profile>("/profile/me", {
        method: "PATCH",
        body: JSON.stringify({
          username: username || null,
          first_name: firstName || null,
          last_name: lastName || null,
        }),
      });
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
    () =>
      [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") ||
      email ||
      "",
    [firstName, lastName, email]
  );

  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: theme.background, color: theme.text }}
    >
      <TopNavBar />
      <div className="flex flex-col items-center px-6 py-10">
        <ProfileHeader loading={loading} />
        <ProfileForm
          theme={theme}
          email={email}
          username={username}
          firstName={firstName}
          lastName={lastName}
          saving={saving}
          success={success}
          error={error}
          onSave={handleSave}
          setUsername={setUsername}
          setFirstName={setFirstName}
          setLastName={setLastName}
          namePreview={namePreview}
        />
        <QuestionHistory theme={theme} />
      </div>
    </main>
  );
}

/* ---------------------- PROFILE HEADER ---------------------- */
function ProfileHeader({ loading }: { loading: boolean }) {
  const { theme } = useTheme();
  return (
    <header className="text-center mb-6">
      <h1
        className="text-4xl font-bold tracking-tight"
        style={{ color: theme.accent }}
      >
        My Profile
      </h1>
      {loading && <p className="text-sm" style={{ color: theme.textSecondary }}>Loading…</p>}
    </header>
  );
}
