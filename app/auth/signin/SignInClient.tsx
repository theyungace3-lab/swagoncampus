"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, KeyRound, LogIn, Mail } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { OtpInput } from "@/components/OtpInput";
import { createClient } from "@/lib/supabase/client";

type Method = "password" | "otp";

const RESEND_SECONDS = 60;

export function SignInClient() {
  const searchParams = useSearchParams();
  const redirect     = searchParams.get("redirect") ?? "/";

  const [method, setMethod]     = useState<Method>("password");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode]         = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [notice, setNotice]     = useState("");
  const [resendIn, setResendIn] = useState(0);
  const busy = useRef(false);

  // Resend cooldown, mirroring Supabase's 60-second per-user window.
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  function switchMethod(next: Method) {
    if (next === method) return;
    setMethod(next);
    setError("");
    setNotice("");
    setPassword("");
    setCode("");
    setCodeSent(false);
    setResendIn(0);
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await createClient().auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // Hard redirect so proxy/server reads the fresh session cookie
    window.location.href = redirect;
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy.current || resendIn > 0) return;
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }

    busy.current = true;
    setError("");
    setNotice("");
    setLoading(true);

    // shouldCreateUser:false keeps this a sign-in, never a hidden signup.
    const { error: sendError } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });

    setLoading(false);
    busy.current = false;

    if (sendError) {
      setError(sendError.message);
      return;
    }

    setCode("");
    setCodeSent(true);
    setResendIn(RESEND_SECONDS);
    setNotice(`We sent a 6-digit code to ${email.trim()}. It expires shortly.`);
  }

  async function verifyCode(token: string) {
    if (busy.current || token.length !== 6) return;
    busy.current = true;
    setError("");
    setLoading(true);

    const { error: verifyError } = await createClient().auth.verifyOtp({
      email: email.trim(),
      token,
      type: "email",
    });

    setLoading(false);
    busy.current = false;

    if (verifyError) {
      setError(verifyError.message || "That code is incorrect or has expired.");
      setCode("");
      return;
    }

    window.location.href = redirect;
  }

  const methodTabs: Array<{ id: Method; label: string; icon: React.ReactNode }> = [
    { id: "password", label: "Password", icon: <KeyRound className="w-4 h-4" /> },
    { id: "otp", label: "Email code", icon: <Mail className="w-4 h-4" /> },
  ];

  return (
    <div className="relative min-h-screen lg:flex">
      {/* ── Background image (wooden hangers): full-screen on mobile, left half on desktop ── */}
      <div
        className="absolute inset-0 lg:relative lg:w-1/2 bg-cover bg-center"
        style={{ backgroundImage: "url('/auth-signin-bg.jpg')" }}
        aria-hidden="true"
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50" />
        {/* Tagline (desktop only, the mobile card carries the branding) */}
        <div className="hidden lg:flex absolute inset-0 flex-col items-center justify-center text-center px-12">
          <BrandMark size={56} className="mb-4 animate-gentle-bounce" />
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

      {/* ── Form ── */}
      <div className="relative z-10 flex min-h-screen w-full items-center justify-center px-4 py-12 lg:w-1/2 lg:px-6 lg:py-16">
        <div className="auth-form-surface w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <BrandMark size={28} />
            <span className="text-2xl font-black gold-text">SwagOnCampus</span>
          </div>

          <h1 className="text-3xl font-black mb-2" style={{ color: "var(--text-primary)" }}>
            Sign In
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup"
              className="font-semibold hover:underline"
              style={{ color: "var(--gold-primary)" }}
            >
              Create one free
            </Link>
          </p>

          {/* Method toggle */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-full p-1" style={{ background: "var(--bg-secondary)" }} role="tablist" aria-label="Sign in method">
            {methodTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={method === tab.id}
                onClick={() => switchMethod(tab.id)}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-full text-sm font-bold transition-all ${method === tab.id ? "btn-gold" : "btn-ghost-gold border-transparent"}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {method === "password" ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-5" noValidate>
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

              {error && (
                <div role="alert" className="px-4 py-3 rounded-xl text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-gold w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-bold text-sm disabled:opacity-60"
              >
                <LogIn className="w-4 h-4" />
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              {/* Email */}
              <div>
                <label
                  htmlFor="otp-email"
                  className="block text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  Email address
                </label>
                <input
                  id="otp-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  disabled={codeSent}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="admin-input disabled:opacity-60"
                />
              </div>

              {!codeSent ? (
                <button
                  type="button"
                  onClick={() => void sendCode()}
                  disabled={loading}
                  className="btn-gold w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-bold text-sm disabled:opacity-60"
                >
                  <Mail className="w-4 h-4" />
                  {loading ? "Sending code…" : "Email me a code"}
                </button>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                      6-digit code
                    </label>
                    <OtpInput
                      value={code}
                      onChange={setCode}
                      onComplete={(value) => void verifyCode(value)}
                      disabled={loading}
                      label="Sign-in code"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => void verifyCode(code)}
                    disabled={loading || code.length !== 6}
                    className="btn-gold w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-bold text-sm disabled:opacity-60"
                  >
                    <LogIn className="w-4 h-4" />
                    {loading ? "Verifying…" : "Verify & Sign In"}
                  </button>

                  <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
                    <button
                      type="button"
                      onClick={() => void sendCode()}
                      disabled={loading || resendIn > 0}
                      className="font-semibold hover:underline disabled:cursor-not-allowed disabled:opacity-60 disabled:no-underline"
                      style={{ color: "var(--gold-primary)" }}
                    >
                      {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCodeSent(false); setCode(""); setNotice(""); setError(""); setResendIn(0); }}
                      className="font-semibold hover:underline"
                    >
                      Use a different email
                    </button>
                  </div>
                </>
              )}

              {notice && (
                <div role="status" className="px-4 py-3 rounded-xl text-sm border" style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)", background: "var(--bg-secondary)" }}>
                  {notice}
                </div>
              )}

              {error && (
                <div role="alert" className="px-4 py-3 rounded-xl text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800">
                  {error}
                </div>
              )}
            </div>
          )}

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
