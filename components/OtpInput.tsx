"use client";

import { EMAIL_CODE_LENGTH } from "@/lib/auth";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Optional convenience; callers must still prevent duplicate submissions. */
  onComplete?: (value: string) => void;
  disabled?: boolean;
  label?: string;
}

/**
 * One native input keeps paste, autofill, selection and backspace predictable.
 * The six visual cells are decorative; screen readers encounter one field.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  label = "Verification code",
}: OtpInputProps) {
  function commit(raw: string) {
    const clean = raw.replace(/\D/g, "").slice(0, EMAIL_CODE_LENGTH);
    onChange(clean);
    if (clean !== value && clean.length === EMAIL_CODE_LENGTH) onComplete?.(clean);
  }

  return (
    <div className={`otp-control relative ${disabled ? "opacity-60" : ""}`}>
      <div className="grid grid-cols-6 gap-2" aria-hidden="true">
        {Array.from({ length: EMAIL_CODE_LENGTH }, (_, index) => (
          <span key={index} className="otp-box flex min-w-0 items-center justify-center">{value[index] ?? ""}</span>
        ))}
      </div>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={EMAIL_CODE_LENGTH}
        pattern="[0-9]{6}"
        required
        autoFocus
        value={value}
        disabled={disabled}
        onChange={(event) => commit(event.target.value)}
        onPaste={(event) => { event.preventDefault(); commit(event.clipboardData.getData("text")); }}
        aria-label={label}
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
      />
    </div>
  );
}
