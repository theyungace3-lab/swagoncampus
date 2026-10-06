"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { BrandMark } from "@/components/BrandMark";
import { OtpInput } from "@/components/OtpInput";
import { createClient } from "@/lib/supabase/client";

type Step = "request" | "code" | "password" | "done";

const RESEND_SECONDS = 60;

export function ForgotPasswordClient() {
  const searchParams = useSearchParams();
  const wantsResetLink = searchParams.get("step") === "reset";

  const [step, setStep]         = useState<Step>("request");
  const [email, setEmail]       = useState("");
  const [code, setCode]         = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [resendIn, setResendIn] = useState(0);
  const busy = useRef(false);

  // Arriving from the emailed link: the callback already opened a recovery
  // session, so skip straight to choosing a new password.
  useEffect(() => {
    if (!wantsResetLink) return;
    let active = true;
    createClient()
      .auth.getSession()
      .then(({ data }: { data: { session: Session | null } }) => {
        if (!active) return;
        if (data.session) {
          setStep("password");
        } else {
          setError("That reset link has expired. Request a new code below.");
        }
      });
    return () => {
      active = false;
    };
  }, [wantsResetLink]);

  // Resend cooldown, mirroring Supabase's 60-second per-user window.
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy.current || resendIn > 0) return;
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }

    busy.current = true;
    setError("");
    setLoading(true);

    const { error: sendError } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      // Also supports clicking the emailed link, which returns to this page.
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/auth/forgot-password?step=reset")}`,
    });

    setLoading(false);
    busy.current = false;

    if (sendError) {
      setError(sendError.message);
      return;
    }

    setCode("");
    setStep("code");
    setResendIn(RESEND_SECONDS);
  }

  async function verifyCode(token: string) {
    if (busy.current || token.length !== 6) return;
    busy.current = true;
    setError("");
    setLoading(true);

    const { error: verifyError } = await createClient().auth.verifyOtp({
      email: email.trim(),
      token,
      type: "recovery",
    });

    setLoading(false);
    busy.current = false;

    if (verifyError) {
      setError(verifyError.message || "That code is incorrect or has expired.");
      setCode("");
      return;
    }

    setStep("password");
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    // Invalidate sessions on any other device that still has the old password.
    await supabase.auth.signOut({ scope: "global" });
    setStep("done");
  }

  const heading = step === "done" ? "All set" : step === "password" ? "Choose a new password" : "Reset your password";
  const strength = password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password);

  return (
    <div className="relative min-h-screen lg:flex">
      {/* ── Background image (wooden hangers): full-screen on mobile, left half on desktop ── */}
      <div
        className="absolute inset-0 lg:relative lg:w-1/2 bg-cover bg-center"
        style={{ backgroundImage: "url('/auth-signin-bg.jpg')" }}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="hidden lg:flex absolute inset-0 flex-col items-center justify-center text-center px-12">
          <BrandMark size={56} className="mb-4 animate-gentle-bounce" />
          <h2 className="text-4xl font-black text-white leading-tight mb-3">
            Forgot your<br />
            <span style={{ color: "#e8b84b" }}>password?</span>
          </h2>
          <p className="text-white/70 text-lg">
            We&apos;ll email you a secure code.<br />
            No passwords to remember while you wait.
          </p>
        </div>
      </div>

      {/* ── Form ── */}
      <div className="relative z-10 flex min-h-screen w-full items-center justify-center px-4 py-12 lg:w-1/2 lg:px-6 lg:py-16">
        <div className="auth-form-surface w-full max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <BrandMark size={28} />
            <span className="text-2xl font-black gold-text">SwagOnCampus</span>
          </div>

          {step === "done" ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "rgba(201,146,42,0.12)" }}>
                <Check className="w-8 h-8" style={{ color: "var(--gold-primary)" }} />
              </div>
              <h1 className="text-2xl font-black mb-3 gold-text">{heading}</h1>
              <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--text-muted)" }}>
                Your password has been updated. Sign in with your new password. Any other
                device that was still signed in has been logged out.
              </p>
              <Link href="/auth/signin" className="btn-gold inline-block px-8 py-3 rounded-full font-bold text-sm">
                Go to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-black mb-2" style={{ color: "var(--text-primary)" }}>
                {heading}
              </h1>
              <p className="text-sm mb-7" style={{ color: "var(--text-muted)" }}>
                {step === "request" && "Enter your email and we'll send you a 6-digit code."}
                {step === "code" && `Enter the 6-digit code we sent to ${email.trim()}.`}
                {step === "password" && "Pick a new password for your account."}
              </p>

              {step === "request" && (
                <form onSubmit={sendCode} className="space-y-5" noValidate>
                  <div>
                    <label htmlFor="reset-email" className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                      Email address
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="admin-input"
                    />
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
                    <Mail className="w-4 h-4" />
                    {loading ? "Sending code…" : "Send reset code"}
                  </button>
                </form>
              )}

              {step === "code" && (
                <div className="space-y-5">
                  <OtpInput
                    value={code}
                    onChange={setCode}
                    onComplete={(value) => void verifyCode(value)}
                    disabled={loading}
                    label="Reset code"
                  />

                  <button
                    type="button"
                    onClick={() => void verifyCode(code)}
                    disabled={loading || code.length !== 6}
                    className="btn-gold w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-bold text-sm disabled:opacity-60"
                  >
                    <KeyRound className="w-4 h-4" />
                    {loading ? "Verifying…" : "Verify code"}
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
                      onClick={() => { setStep("request"); setCode(""); setError(""); setResendIn(0); }}
                      className="font-semibold hover:underline"
                    >
                      Use a different email
                    </button>
                  </div>

                  {error && (
                    <div role="alert" className="px-4 py-3 rounded-xl text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800">
                      {error}
                    </div>
                  )}
                </div>
              )}

              {step === "password" && (
                <form onSubmit={savePassword} className="space-y-5" noValidate>
                  <div>
                    <label htmlFor="new-password" className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                      New password
                    </label>
                    <div className="relative">
                      <input
                        id="new-password"
                        type={showPw ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 6 characters"
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
                    {password && (
                      <p className={`text-xs mt-1.5 ${strength ? "text-green-500" : "text-amber-500"}`}>
                        {strength ? "✓ Strong password" : "Add uppercase letters and numbers for a stronger password"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirm-new-password" className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                      Confirm password
                    </label>
                    <input
                      id="confirm-new-password"
                      type={showPw ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repeat your password"
                      className="admin-input"
                    />
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
                    <KeyRound className="w-4 h-4" />
                    {loading ? "Saving…" : "Set new password"}
                  </button>
                </form>
              )}

              <p className="mt-6 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                <Link href="/auth/signin" className="inline-flex items-center gap-1 hover:text-[var(--gold-primary)] transition-colors">
                  <ArrowLeft className="w-3 h-3" /> Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
