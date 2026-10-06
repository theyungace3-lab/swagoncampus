"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { AuthScreen } from "@/components/AuthScreen";
import { EmailCodeForm } from "@/components/EmailCodeForm";
import { authErrorMessage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordClient() {
  const [verifiedUserId, setVerifiedUserId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [signOutWarning, setSignOutWarning] = useState(false);
  const busy = useRef(false);

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    if (busy.current || !verifiedUserId) return;
    if (password.length < 8) { setError("Use a password with at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    busy.current = true;
    setLoading(true);
    setError("");
    const auth = createClient().auth;
    try {
      // A session restored from cookies (or ?step=reset) is not proof of a fresh
      // recovery code. Also prevent another tab's login from changing the target.
      const { data, error: sessionError } = await auth.getUser();
      if (sessionError || data.user?.id !== verifiedUserId) {
        setVerifiedUserId(null);
        setPassword("");
        setConfirm("");
        setError("Your recovery session changed or expired. Request a new code.");
        return;
      }
      const { error: updateError } = await auth.updateUser({ password });
      if (updateError) throw updateError;
      // Password change succeeded even if revoking other sessions fails offline.
      try {
        const { error: signOutError } = await auth.signOut({ scope: "global" });
        setSignOutWarning(!!signOutError);
      } catch {
        setSignOutWarning(true);
      }
      setPassword("");
      setConfirm("");
      setDone(true);
    } catch (cause) {
      setError(authErrorMessage(cause, "update"));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  return (
    <AuthScreen>
      {done ? (
        <div className="text-center">
          <Check className="mx-auto mb-4 h-10 w-10" style={{ color: "var(--gold-primary)" }} aria-hidden="true" />
          <h1 className="mb-3 text-3xl font-black" style={{ color: "var(--text-primary)" }}>Password updated</h1>
          <p className="mb-5 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            You can now sign in with your new password or an email code.
          </p>
          {signOutWarning ? (
            <p role="alert" className="auth-error mb-5 rounded-xl border p-4 text-sm">Your password was saved, but other sessions could not be signed out. Sign out of any shared devices.</p>
          ) : (
            <p className="mb-5 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>Other sessions cannot refresh. Already issued access tokens can remain valid until they expire.</p>
          )}
          <Link href="/auth/signin" className="btn-gold inline-flex min-h-12 items-center justify-center rounded-full px-8 py-3 font-bold">Go to sign in</Link>
        </div>
      ) : (
        <>
          <h1 className="mb-2 text-3xl font-black" style={{ color: "var(--text-primary)" }}>{verifiedUserId ? "Choose a new password" : "Reset your password"}</h1>
          <p className="mb-6 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{verifiedUserId ? "Your email is verified. Choose a new password below." : "Enter your account email to receive a six-digit recovery code."}</p>
          {!verifiedUserId ? (
            <EmailCodeForm purpose="recovery" onVerified={(session) => { setVerifiedUserId(session.user.id); setError(""); }} />
          ) : (
            <form onSubmit={savePassword} className="space-y-5">
              <div>
                <label htmlFor="new-password" className="mb-2 block text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>New password</label>
                <div className="relative">
                  <input id="new-password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} required disabled={loading} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="admin-input pr-12" />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl" style={{ color: "var(--text-secondary)" }}>
                    {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirm-new-password" className="mb-2 block text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Confirm password</label>
                <input id="confirm-new-password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} required disabled={loading} value={confirm} onChange={(event) => setConfirm(event.target.value)} className="admin-input" />
              </div>
              <button type="submit" disabled={loading} className="btn-gold min-h-12 w-full rounded-full px-4 py-3 font-bold disabled:opacity-60">{loading ? "Saving..." : "Set new password"}</button>
            </form>
          )}
          {error && <p role="alert" className="auth-error mt-4 rounded-xl border p-4 text-sm">{error}</p>}
          <p className="mt-5 text-center text-sm" style={{ color: "var(--text-secondary)" }}><Link href="/auth/signin" className="inline-flex min-h-11 items-center underline underline-offset-4">Back to sign in</Link></p>
        </>
      )}
    </AuthScreen>
  );
}
