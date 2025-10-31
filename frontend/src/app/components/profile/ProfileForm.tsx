"use client";

import { color } from "framer-motion";
import { useTheme } from "../../../../context/ThemeContext";
import { style } from "framer-motion/client";

type ProfileFormProps = {
  theme: any;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  saving: boolean;
  success: string | null;
  error: string | null;
  namePreview: string;
  onSave: (e: React.FormEvent) => void;
  setUsername: (v: string) => void;
  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
};

export default function ProfileForm({
  theme,
  email,
  username,
  firstName,
  lastName,
  saving,
  success,
  error,
  namePreview,
  onSave,
  setUsername,
  setFirstName,
  setLastName,
}: ProfileFormProps) {
  return (
    <section
      className="p-6 rounded-2xl shadow-lg w-full max-w-2xl"
      style={{ backgroundColor: theme.surface }}
    >
      <form onSubmit={onSave} className="space-y-5">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium" style={{ color: theme.textSecondary }}>
            Email (read-only)
          </label>
          <input
            className="mt-1 w-full rounded-lg px-3 py-2"
            value={email}
            disabled
            style={{
              backgroundColor: theme.input.background,
              color: theme.input.text,
              border: `1px solid ${theme.input.border}`,
            }}
          />
        </div>

        {/* Username */}
        <div>
          <label className="block text-sm font-medium" style={{ color: theme.textSecondary }}>
            Username
          </label>
          <input
            className="mt-1 w-full rounded-lg px-3 py-2 focus:outline-none"
            style={{
              backgroundColor: theme.input.background,
              color: theme.input.text,
              border: `1px solid ${theme.input.border}`,
            }}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your-handle"
          />
        </div>

        {/* First + Last Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium" style={{ color: theme.textSecondary }}>
              First name
            </label>
            <input
              className="mt-1 w-full rounded-lg px-3 py-2 focus:outline-none"
              style={{
                backgroundColor: theme.input.background,
                color: theme.input.text,
                border: `1px solid ${theme.input.border}`,
              }}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="John"
            />
          </div>
          <div>
            <label className="block text-sm font-medium" style={{ color: theme.textSecondary }}>
              Last name
            </label>
            <input
              className="mt-1 w-full rounded-lg px-3 py-2 focus:outline-none"
              style={{
                backgroundColor: theme.input.background,
                color: theme.input.text,
                border: `1px solid ${theme.input.border}`,
              }}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
            />
          </div>
        </div>

        {/* Feedback */}
        {success && <p style={{ color: "lightgreen" }}>{success}</p>}
        {error && <p style={{ color: theme.error }}>{error}</p>}

       <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg font-semibold transition disabled:opacity-60"
          style={{
            backgroundColor: theme.primary,
            color: theme.button.text,
            cursor: saving ? "not-allowed" : "pointer",
          }}
          onMouseEnter={(e) => {
            if (!saving) e.currentTarget.style.backgroundColor = theme.hover;
          }}
          onMouseLeave={(e) => {
            if (!saving) e.currentTarget.style.backgroundColor = theme.primary;
          }}
          >
          {saving ? "Saving…" : "Save Changes"}
        </button>

        <span className="text-sm" style={{ color: theme.textSecondary }}>
          Preview name: <strong style={{ color: theme.text }}>{namePreview}</strong>
        </span>
      </div>

      </form>
    </section>
  );
}
