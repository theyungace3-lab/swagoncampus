"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Sparkles, UserPlus, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignUpClient() {
  const router = useRouter();

  const [fullName, setFullName]   = useState("");
  const [email, setEmail]         = useState("");
  const [phone, setPhone]         = useState("");
  const [hostel, setHostel]       = useState("");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState(false);

  const passwordStrength = password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password);

  async function handleSubmit(e: React.FormEvent) {
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

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone, hostel },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-primary)" }}>
        <div className="luxury-card p-10 max-w-md w-full text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: "rgba(201,146,42,0.12)" }}
          >
            <Check className="w-8 h-8" style={{ color: "var(--gold-primary)" }} />
          </div>
          <h2 className="text-2xl font-black mb-3 gold-text">Check your email!</h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--text-muted)" }}>
            We sent a confirmation link to <strong>{email}</strong>.
            Click the link in the email to activate your account, then sign in.
          </p>
          <Link href="/auth/signin" className="btn-gold px-8 py-3 rounded-full font-bold text-sm inline-block">
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left: Background image (colorful clothing rack) ── */}
      <div
        className="hidden lg:block lg:w-1/2 relative bg-cover bg-center"
        style={{ backgroundImage: "url('/auth-signup-bg.jpg')" }}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-12">
          <Sparkles className="w-12 h-12 mb-4" style={{ color: "#e8b84b" }} />
          <h2 className="text-4xl font-black text-white leading-tight mb-3">
            Join the campus<br />
            <span style={{ color: "#e8b84b" }}>fashion wave.</span>
          </h2>
          <p className="text-white/70 text-lg">
            Create your free account and start<br />
            shopping the freshest fits on campus.
          </p>
          <div className="mt-8 flex flex-col gap-3 text-left">
            {["Free account, no hidden fees", "Order via WhatsApp instantly", "Campus delivery to your hostel", "Exclusive student deals"].map((perk) => (
              <div key={perk} className="flex items-center gap-2 text-white/80 text-sm">
                <Check className="w-4 h-4 flex-shrink-0" style={{ color: "#e8b84b" }} />
                {perk}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Form ── */}
      <div
        className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 overflow-y-auto"
        style={{ background: "var(--bg-primary)" }}
      >
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-6 h-6" style={{ color: "var(--gold-primary)" }} />
            <span className="text-2xl font-black gold-text">SwagOnCampus</span>
          </div>

          <h1 className="text-3xl font-black mb-2" style={{ color: "var(--text-primary)" }}>
            Create Account
          </h1>
          <p className="text-sm mb-7" style={{ color: "var(--text-muted)" }}>
            Already have an account?{" "}
            <Link href="/auth/signin" className="font-semibold hover:underline" style={{ color: "var(--gold-primary)" }}>
              Sign in
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Full name */}
            <div>
              <label htmlFor="full-name" className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                Full Name
              </label>
              <input
                id="full-name"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Adewale Johnson"
                className="admin-input"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="signup-email" className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                Email Address
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="admin-input"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                WhatsApp Number <span className="normal-case font-normal">(optional)</span>
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 800 000 0000"
                className="admin-input"
              />
            </div>

            {/* Hostel */}
            <div>
              <label htmlFor="hostel" className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                Hostel / Address on Campus <span className="normal-case font-normal">(optional)</span>
              </label>
              <input
                id="hostel"
                type="text"
                value={hostel}
                onChange={(e) => setHostel(e.target.value)}
                placeholder="e.g. Awo Hall, Room 14"
                className="admin-input"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="signup-password" className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                Password
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="admin-input pr-12"
                />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: "var(--text-muted)" }}
                  aria-label={showPw ? "Hide" : "Show"}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && (
                <p className={`text-xs mt-1.5 ${passwordStrength ? "text-green-500" : "text-amber-500"}`}>
                  {passwordStrength ? "✓ Strong password" : "Add uppercase letters and numbers for a stronger password"}
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="confirm-password" className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                className="admin-input"
              />
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
              <UserPlus className="w-4 h-4" />
              {loading ? "Creating account…" : "Create Account"}
            </button>

            <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
              By signing up you agree to our{" "}
              <span className="font-semibold" style={{ color: "var(--gold-primary)" }}>Terms of Service</span>
            </p>
          </form>

          <p className="mt-5 text-center text-xs" style={{ color: "var(--text-muted)" }}>
            <Link href="/" className="hover:text-[var(--gold-primary)] transition-colors">← Back to store</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
