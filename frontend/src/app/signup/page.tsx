/*
AI Assistance Disclosure:
Tool: ChatGPT (GPT-5)
Scope: Suggested form component and submission logic for new user registration.
Author review: Adjusted validation schema, added password confirmation checks, and integrated success redirect to dashboard.
*/

"use client";

import { useEffect, useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import TopNavBar from "../components/navbar/TopNavBar";
import LoadingOverlay from "../components/common/LoadingOverlay";
import { useTheme } from "../../../context/ThemeContext";
import { signUp } from "../../../lib/auth";

export default function SignupPage() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [touched, setTouched] = useState({ email: false, password: false });
    const router = useRouter();
    const { theme } = useTheme();

    // Email + password policy
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Whole-policy regex (useful for quick gate)
    const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{12,}$/;

    // Fine-grained checks for the checklist UI
    const hasMinLen = password.length >= 12;
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSymbol = /[\W_]/.test(password);

    const emailValid = emailRegex.test(email);
    const passwordValid =
        hasMinLen && hasLower && hasUpper && hasDigit && hasSymbol; // same as passwordPolicy.test(password)

    const canSubmit = emailValid && passwordValid && !loading;

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        // Guard on client before calling API
        if (!emailValid) {
            setError("Please enter a valid email address.");
            return;
        }
        if (!passwordValid) {
            setError(
                "Password must be at least 12 characters and include uppercase, lowercase, a number, and a symbol."
            );
            return;
        }

        setLoading(true);
        try {
            await signUp(email, password);
            router.push("/login");
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    }

    // skeleton frontend, need to add other user details later
    return (
        <main className="flex flex-col items-center justify-center min-h-screen bg-background">
            <form
                onSubmit={handleSignup}
                className="bg-surface shadow-lg rounded-lg p-6 w-full max-w-sm space-y-4"
            >
                <h1 className="text-2xl font-bold text-center">Create Account</h1>

                {error && <p className="text-red-600 text-sm text-center">{error}</p>}

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    required
                />

                <input
                    type="password"
                    placeholder="Password (min 6 chars)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    required
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition disabled:bg-gray-300"
                >
                    {loading ? 'Creating...' : 'Sign Up'}
                </button>

                <p className="text-sm text-center mt-2 text-gray-600">
                    Already have an account?{' '}
                    <a href="/login" className="text-blue-600 hover:underline">
                        Log in
                    </a>
                </p>
            </form>
        </main>
    );
}