"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { AuthScreen } from "@/components/AuthScreen";
import { EmailCodeForm } from "@/components/EmailCodeForm";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage, normalizeEmail, safeAuthRedirect } from "@/lib/auth";

export function EmailAuthForm({ purpose }: { purpose: "signup" | "signin" }) {
  const searchParams = useSearchParams();
  const destination = safeAuthRedirect(searchParams.get("redirect") ?? searchParams.get("next"));
  const [usePassword, setUsePassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [processing, setProcessing] = useState<"password" | "google" | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);
  const [error, setError] = useState(() => {
    const callbackError = searchParams.get("error");
    return callbackError === "oauth_cancelled" ? "Google sign-in was cancelled. You can try again or use email."
      : callbackError ? "Sign-in could not be completed. Please try again or use an email code." : "";
  });
  const busy = useRef(false);
  const mounted = useRef(false);
  const disabled = emailBusy || processing !== null;
  const isSignup = purpose === "signup";

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function signInWithGoogle() {
    if (busy.current || emailBusy) return;
    busy.current = true;
    setProcessing("google");
    setError("");
    try {
      // Supabase keeps the PKCE verifier in its cookies and handles Google's
      // identity checks. Never request Gmail access or expose a client secret.
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", destination);
      const { data, error: oauthError } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callback.toString(), skipBrowserRedirect: true, queryParams: { prompt: "select_account" } },
      });
      if (!mounted.current) return;
      if (oauthError) throw oauthError;
      if (!data.url) throw new Error("Google sign-in URL missing");
      window.location.assign(data.url);
    } catch (cause) {
      if (mounted.current) setError(authErrorMessage(cause, "google"));
    } finally {
      busy.current = false;
      if (mounted.current) setProcessing(null);
    }
  }

  async function signInWithPassword(event: FormEvent) {
    event.preventDefault();
    if (busy.current || emailBusy) return;
    busy.current = true;
    setProcessing("password");
    setError("");
    try {
      const { data, error: signInError } = await createClient().auth.signInWithPassword({ email: normalizeEmail(email), password });
      if (!mounted.current) return;
      if (signInError) throw signInError;
      if (!data.session) throw new Error("Sign-in session missing");
      window.location.assign(destination);
    } catch (cause) {
      if (mounted.current) setError(authErrorMessage(cause, "password"));
    } finally {
      busy.current = false;
      if (mounted.current) setProcessing(null);
    }
  }

  const otherPage = isSignup ? "/auth/signin" : "/auth/signup";
  const otherHref = destination === "/" ? otherPage : `${otherPage}?redirect=${encodeURIComponent(destination)}`;

  return (
    <AuthScreen variant={isSignup ? "signup" : "signin"}>
      <h1 className="mb-2 text-3xl font-black" style={{ color: "var(--text-primary)" }}>{isSignup ? "Create your account" : "Sign in"}</h1>
      <p className="mb-6 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {isSignup ? "Start with your email or Google. No password needed." : "Use a six-digit email code or continue with Google."}
      </p>

      <button type="button" onClick={() => void signInWithGoogle()} disabled={disabled} className="auth-google-button flex min-h-12 w-full items-center justify-center gap-3 rounded-full border px-4 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-60">
        <GoogleIcon />
        {processing === "google" ? "Opening Google..." : "Continue with Google"}
      </button>
      <div className="my-6 flex items-center gap-3 text-xs" style={{ color: "var(--text-secondary)" }}>
        <span className="h-px flex-1" style={{ background: "var(--border-color)" }} />or use email<span className="h-px flex-1" style={{ background: "var(--border-color)" }} />
      </div>

      {usePassword ? (
        <form onSubmit={signInWithPassword} className="space-y-5">
          <div>
            <label htmlFor="signin-email" className="mb-2 block text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Email address</label>
            <input id="signin-email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required disabled={disabled} value={email} onChange={(event) => setEmail(event.target.value)} className="admin-input" placeholder="you@example.com" />
          </div>
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              <label htmlFor="signin-password" className="font-semibold">Password</label>
              <Link href="/auth/forgot-password" className="underline underline-offset-4">Forgot password?</Link>
            </div>
            <div className="relative">
              <input id="signin-password" type={showPassword ? "text" : "password"} autoComplete="current-password" required disabled={disabled} value={password} onChange={(event) => setPassword(event.target.value)} className="admin-input pr-12" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl" style={{ color: "var(--text-secondary)" }}>
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={disabled} className="btn-gold min-h-12 w-full rounded-full px-4 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-60">{processing === "password" ? "Signing in..." : "Sign in with password"}</button>
        </form>
      ) : (
        <EmailCodeForm purpose={purpose} onVerified={() => window.location.assign(destination)} disabled={processing !== null} onBusyChange={setEmailBusy} />
      )}

      {error && <p role="alert" className="auth-error mt-4 rounded-xl border px-4 py-3 text-sm">{error}</p>}

      {!isSignup && (
        <button type="button" disabled={disabled} onClick={() => { setUsePassword((value) => !value); setError(""); setPassword(""); }} className="mt-4 min-h-11 w-full rounded text-sm font-semibold underline-offset-4 hover:underline disabled:opacity-60" style={{ color: "var(--text-secondary)" }}>
          {usePassword ? "Use an email code instead" : "Use a password instead"}
        </button>
      )}
      <p className="mt-5 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
        {isSignup ? "Already have an account? " : "New to SwagOnCampus? "}
        <Link href={otherHref} className="font-bold underline underline-offset-4">{isSignup ? "Sign in" : "Create account"}</Link>
      </p>
    </AuthScreen>
  );
}

function GoogleIcon() {
  // Google identity mark from gstatic.com/firebasejs/ui (c) 2016 Google Inc.
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 118 120" aria-hidden="true">
      <path fill="#4285F4" d="M117.6,61.3636364 C117.6,57.1090909 117.218182,53.0181818 116.509091,49.0909091 L60,49.0909091 L60,72.3 L92.2909091,72.3 C90.9,79.8 86.6727273,86.1545455 80.3181818,90.4090909 L80.3181818,105.463636 L99.7090909,105.463636 C111.054545,95.0181818 117.6,79.6363636 117.6,61.3636364 Z" />
      <path fill="#34A853" d="M60,120 C76.2,120 89.7818182,114.627273 99.7090909,105.463636 L80.3181818,90.4090909 C74.9454545,94.0090909 68.0727273,96.1363636 60,96.1363636 C44.3727273,96.1363636 31.1454545,85.5818182 26.4272727,71.4 L6.38181818,71.4 L6.38181818,86.9454545 C16.2545455,106.554545 36.5454545,120 60,120 Z" />
      <path fill="#FBBC05" d="M26.4272727,71.4 C25.2272727,67.8 24.5454545,63.9545455 24.5454545,60 C24.5454545,56.0454545 25.2272727,52.2 26.4272727,48.6 L26.4272727,33.0545455 L6.38181818,33.0545455 C2.31818182,41.1545455 0,50.3181818 0,60 C0,69.6818182 2.31818182,78.8454545 6.38181818,86.9454545 L26.4272727,71.4 Z" />
      <path fill="#EA4335" d="M60,23.8636364 C68.8090909,23.8636364 76.7181818,26.8909091 82.9363636,32.8363636 L100.145455,15.6272727 C89.7545455,5.94545455 76.1727273,0 60,0 C36.5454545,0 16.2545455,13.4454545 6.38181818,33.0545455 L26.4272727,48.6 C31.1454545,34.4181818 44.3727273,23.8636364 60,23.8636364 Z" />
    </svg>
  );
}
