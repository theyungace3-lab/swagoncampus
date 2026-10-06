"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage, EMAIL_CODE_COOLDOWN_SECONDS, isEmail, isEmailCode, normalizeEmail, type EmailCodePurpose } from "@/lib/auth";
import { OtpInput } from "@/components/OtpInput";

export function EmailCodeForm({ purpose, onVerified, disabled = false, onBusyChange }: {
  purpose: EmailCodePurpose;
  onVerified: (session: Session) => void;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<"send" | "verify" | null>(null);
  const [remaining, setRemaining] = useState(0);
  const busy = useRef(false);
  const mounted = useRef(false);
  const nextSendAt = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((nextSendAt.current - Date.now()) / 1_000)));
    }, 1_000);
    return () => clearInterval(timer);
  }, []);

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    if (busy.current || disabled) return;
    const address = normalizeEmail(sentEmail || email);
    if (!isEmail(address)) { setError("Enter a valid email address."); return; }
    if (Date.now() < nextSendAt.current) { setError("Please wait before requesting another code."); return; }

    busy.current = true;
    setLoading("send");
    onBusyChange?.(true);
    setError("");
    try {
      const auth = createClient().auth;
      const result = purpose === "recovery"
        ? await auth.resetPasswordForEmail(address)
        : await auth.signInWithOtp({ email: address, options: { shouldCreateUser: purpose === "signup" } });
      if (!mounted.current) return;
      if (result.error) throw result.error;
      setEmail(address);
      setSentEmail(address);
      setCode("");
      nextSendAt.current = Date.now() + EMAIL_CODE_COOLDOWN_SECONDS * 1_000;
      setRemaining(EMAIL_CODE_COOLDOWN_SECONDS);
    } catch (cause) {
      if (mounted.current) setError(authErrorMessage(cause, "send"));
    } finally {
      busy.current = false;
      if (mounted.current) { setLoading(null); onBusyChange?.(false); }
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (busy.current || disabled || !sentEmail) return;
    if (!isEmailCode(code)) { setError("Enter all six digits from your email."); return; }
    busy.current = true;
    setLoading("verify");
    onBusyChange?.(true);
    setError("");
    try {
      const { data, error: verifyError } = await createClient().auth.verifyOtp({
        email: sentEmail,
        token: code,
        type: purpose === "recovery" ? "recovery" : "email",
      });
      if (!mounted.current) return;
      if (verifyError) throw verifyError;
      if (!data.session) throw new Error("No verified session returned");
      onVerified(data.session);
    } catch (cause) {
      if (mounted.current) setError(authErrorMessage(cause, "verify"));
    } finally {
      busy.current = false;
      if (mounted.current) { setLoading(null); onBusyChange?.(false); }
    }
  }

  const isBusy = disabled || loading !== null;
  return (
    <form onSubmit={sentEmail ? verifyCode : sendCode} className="space-y-5">
      {sentEmail ? (
        <>
          <div role="status" className="rounded-xl border p-4 text-sm leading-relaxed" style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)", background: "var(--bg-secondary)" }}>
            {purpose === "recovery" ? "If an account exists for " : "Check the inbox for "}
            <strong className="break-all">{sentEmail}</strong>
            {purpose === "recovery" ? ", it will receive a six-digit recovery code." : " and enter the six-digit code below."}
            <span className="mt-1 block">Use the newest code. Check Spam or Promotions if it is missing.</span>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Six-digit code</p>
            <OtpInput value={code} onChange={setCode} disabled={isBusy} label={purpose === "recovery" ? "Recovery code" : "Email verification code"} />
          </div>
          <button type="submit" disabled={isBusy || !isEmailCode(code)} className="btn-gold flex min-h-12 w-full items-center justify-center rounded-full px-4 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-60">
            {loading === "verify" ? "Verifying..." : purpose === "recovery" ? "Verify code" : "Verify and continue"}
          </button>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            <button type="button" disabled={isBusy || remaining > 0} onClick={() => void sendCode()} className="min-h-11 rounded px-1 font-semibold underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-60">
              {loading === "send" ? "Sending..." : remaining > 0 ? `Resend in ${remaining}s` : "Resend code"}
            </button>
            <button type="button" disabled={isBusy} onClick={() => { setSentEmail(""); setCode(""); setError(""); }} className="min-h-11 rounded px-1 underline-offset-4 hover:underline disabled:opacity-60">Change email</button>
          </div>
        </>
      ) : (
        <>
          <div>
            <label htmlFor={`${purpose}-email`} className="mb-2 block text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Email address</label>
            <input id={`${purpose}-email`} type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={254} disabled={isBusy} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="admin-input disabled:opacity-60" />
          </div>
          <button type="submit" disabled={isBusy || remaining > 0} className="btn-gold flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-4 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-60">
            <Mail className="h-4 w-4" aria-hidden="true" />
            {loading === "send" ? "Sending code..." : remaining > 0 ? `Try again in ${remaining}s` : purpose === "recovery" ? "Send recovery code" : "Continue with email"}
          </button>
          <p className="text-center text-sm" style={{ color: "var(--text-secondary)" }}>A six-digit code. No email link to click.</p>
        </>
      )}
      {error && <p role="alert" className="auth-error rounded-xl border px-4 py-3 text-sm">{error}</p>}
    </form>
  );
}
