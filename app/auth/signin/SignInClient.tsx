"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Sparkles, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignInClient() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirect     = searchParams.get("redirect") ?? "/";

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Hard redirect so proxy/server reads the fresh session cookie
    window.location.href = redirect;
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left: Background image (wooden hangers) ── */}
      <div
        className="hidden lg:block lg:w-1/2 relative bg-cover bg-center"
        style={{ backgroundImage: "url('/auth-signin-bg.jpg')" }}
        aria-hidden="true"
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50" />
        {/* Tagline */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-12">
          <Sparkles className="w-12 h-12 mb-4" style={{ color: "#e8b84b" }} />
          <h2 className="text-4xl font-black text-white leading-tight mb-3">
            Welcome back to<br />
            <span style={{ color: "#e8b84b" }}>SwagOnCampus</span>
          </h2>
          <p className="text-white/70 text-lg">
            Your campus fashion destination.<br />
            Sign in to shop seamlessly.
          </p>
        </div>
      </div>

      {/* ── Right: Form ── */}
      <div
        className="w-full lg:w-1/2 flex items-center justify-center px-6 py-16"
        style={{ background: "var(--bg-primary)" }}
      >
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <Sparkles className="w-6 h-6" style={{ color: "var(--gold-primary)" }} />
            <span className="text-2xl font-black gold-text">SwagOnCampus</span>
          </div>

          <h1 className="text-3xl font-black mb-2" style={{ color: "var(--text-primary)" }}>
            Sign In
          </h1>
          <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup"
              className="font-semibold hover:underline"
              style={{ color: "var(--gold-primary)" }}
            >
              Create one free
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div>
              <label
                htmlFor="signin-email"
                className="block text-xs font-bold uppercase tracking-wider mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Email address
              </label>
              <input
                id="signin-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="admin-input"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="signin-password"
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs hover:underline"
                  style={{ color: "var(--gold-primary)" }}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="signin-password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="admin-input pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: "var(--text-muted)" }}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="px-4 py-3 rounded-xl text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-bold text-sm disabled:opacity-60"
            >
              <LogIn className="w-4 h-4" />
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          {/* Back home */}
          <p className="mt-6 text-center text-xs" style={{ color: "var(--text-muted)" }}>
            <Link href="/" className="hover:text-[var(--gold-primary)] transition-colors">
              ← Back to store
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
