import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInClient } from "./SignInClient";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your SwagOnCampus account",
};

export default function SignInPage() {
  return (
    <Suspense>
      <SignInClient />
    </Suspense>
  );
}
