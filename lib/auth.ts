export const EMAIL_CODE_LENGTH = 6;
export const EMAIL_CODE_COOLDOWN_SECONDS = 60;

export type EmailCodePurpose = "signup" | "recovery";

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isEmailCode(value: unknown): value is string {
  return typeof value === "string" && /^\d{6}$/.test(value);
}

// Never let query parameters redirect authenticated users to another origin or
// back into an authentication loop. Check the normalized path as well as input.
export function safeAuthRedirect(value: string | null | undefined): string {
  if (!value?.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value)) return "/";
  try {
    const url = new URL(value, "https://auth.invalid");
    const decodedPath = decodeURIComponent(url.pathname);
    if (url.origin !== "https://auth.invalid" || decodedPath.startsWith("//") ||
        /[\\\u0000-\u0020\u007f]/.test(decodedPath) || /^\/(auth|api)(\/|$)/.test(decodedPath)) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export function authErrorMessage(error: unknown, action: "send" | "verify" | "password" | "google" | "update"): string {
  const detail = error && typeof error === "object" ? error as { code?: string; status?: number; message?: string } : {};
  const code = detail.code ?? "";
  if (detail.status === 429 || code === "over_email_send_rate_limit" || code === "over_request_rate_limit") {
    return "Too many requests. Wait a minute before trying again. If this continues, the store's email sending limit may have been reached.";
  }
  if (action === "verify" && ["otp_expired", "otp_disabled", "validation_failed"].includes(code)) {
    return "That code is incorrect, expired, or already used. Enter the newest code or request another.";
  }
  if (action === "send" && (detail.status === 500 || ["email_address_not_authorized", "email_provider_disabled", "unexpected_failure"].includes(code))) {
    return "Email delivery is currently unavailable. Please try again later or use another sign-in method.";
  }
  if (code === "same_password") return "Choose a password different from your current password.";
  if (code === "weak_password") return "Choose a stronger password with at least 8 characters, including letters and numbers.";
  if (action === "password" && ["invalid_credentials", "email_not_confirmed"].includes(code)) {
    return "Unable to sign in with those details. Check your email and password.";
  }
  if (action === "google") return "Google sign-in could not start. Try again or use email. If it keeps failing, Google sign-in may not be configured yet.";
  if (action === "send") return "We couldn't send a code. Check your email address and connection, then try again. New here? Choose Create account.";
  if (action === "verify") return "We couldn't verify that code. Check your connection and use the newest six-digit code.";
  if (action === "update") return "Your password could not be updated. Try again, or request a new recovery code if your session expired.";
  return "Sign-in failed. Check your connection and try again.";
}
