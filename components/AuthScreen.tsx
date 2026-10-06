import type { ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

export function AuthScreen({ children, variant = "signin" }: { children: ReactNode; variant?: "signin" | "signup" }) {
  return (
    <div className="auth-screen relative min-h-screen lg:flex">
      <div
        className="absolute inset-0 bg-cover bg-center lg:relative lg:w-1/2"
        style={{ backgroundImage: `url('/auth-${variant}-bg.jpg')` }}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 hidden flex-col items-center justify-center px-12 text-center lg:flex">
          <BrandMark size={56} className="mb-4" />
          <h2 className="mb-3 text-4xl font-black leading-tight text-white">
            {variant === "signup" ? "Join the campus" : "Welcome back to"}<br />
            <span style={{ color: "var(--gold-light)" }}>{variant === "signup" ? "fashion wave." : "SwagOnCampus"}</span>
          </h2>
          <p className="text-lg text-white/85">Your campus fashion destination.</p>
        </div>
      </div>
      <div className="relative z-10 flex min-h-screen w-full items-center justify-center px-4 py-10 lg:w-1/2 lg:px-6 lg:py-16">
        <div className="auth-form-surface w-full max-w-md">
          <Link href="/" className="mb-7 inline-flex items-center gap-2 rounded-sm" aria-label="SwagOnCampus home">
            <BrandMark size={28} />
            <span className="text-2xl font-black gold-text">SwagOnCampus</span>
          </Link>
          {children}
          <p className="mt-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
            <Link href="/" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">Back to store</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
