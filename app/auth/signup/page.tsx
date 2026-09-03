import type { Metadata } from "next";
import { Suspense } from "react";
import { SignUpClient } from "./SignUpClient";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Join SwagOnCampus — the #1 campus fashion store for FUNAAB students",
};

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpClient />
    </Suspense>
  );
}
