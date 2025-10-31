"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "../../../../context/ThemeContext";
import LogoutButton from "./LogoutButton";

export default function ProfileButton() {
  const { theme, mode, toggleTheme } = useTheme();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        style={{
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
        }}
        className="rounded-full p-1 hover:opacity-80 transition"
      >
        <Image
          src="globe.svg" // TODO: Replace with user profile image
          alt="?"
          width={36}
          height={36}
          className="rounded-full cursor-pointer"
        />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div
          style={{
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            boxShadow: theme.card.shadow,
            color: theme.text,
          }}
          className="absolute right-0 mt-2 w-44 rounded-xl z-50"
        >
          <ul className="py-1">
            {/* Settings Link */}
            <li>
              <button
                onClick={() => {
                  router.push("/profile");
                  setOpen(false);
                }}
                style={{
                  color: theme.text,
                  backgroundColor: theme.surface,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = theme.primaryHover, e.currentTarget.style.cursor = "pointer")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = theme.surface)
                }
                className="block w-full text-left px-4 py-2 rounded-lg transition"
              >
                Settings
              </button>
            </li>
            {/* Theme Toggle */}
            <li>
              <button
                onClick={() => {
                  toggleTheme();
                  setOpen(false);
                }}
                style={{
                  color: theme.text,
                  backgroundColor: theme.surface,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = theme.primaryHover, e.currentTarget.style.cursor = "pointer")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = theme.surface)
                }
                className="block w-full text-left px-4 py-2 rounded-lg transition"
              >
                Theme: {mode === "dark" ? "🌙 Dark" : "☀️ Light"}
              </button>
            </li>
            <li>
                <div className="px-2 pb-2">
                    <LogoutButton className="w-full" />
                </div>
            </li>
          </ul>
        </div>

      )}
    </div>
  );
}
