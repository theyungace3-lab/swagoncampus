"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called once the full code is entered (auto-submit convenience). */
  onComplete?: (value: string) => void;
  disabled?: boolean;
  length?: number;
  label?: string;
}

/**
 * Segmented one-time-code input. Keeps a single contiguous string value,
 * so callers can pass it straight to Supabase's `token` field.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  length = 6,
  label = "Verification code",
}: OtpInputProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? "");

  function commit(raw: string) {
    const clean = raw.replace(/\D/g, "").slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
  }

  function handleChange(index: number, raw: string) {
    const typed = raw.replace(/\D/g, "");
    if (!typed) {
      // Deletion is handled by onKeyDown so the boxes stay aligned.
      commit(value.slice(0, index) + value.slice(index + 1));
      return;
    }
    const next = (value.slice(0, index) + typed + value.slice(index + typed.length)).slice(0, length);
    commit(next);
    inputs.current[Math.min(index + typed.length, length - 1)]?.focus();
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (digits[index]) {
        commit(value.slice(0, index) + value.slice(index + 1));
      } else if (index > 0) {
        commit(value.slice(0, index - 1) + value.slice(index));
        inputs.current[index - 1]?.focus();
      }
    } else if (event.key === "ArrowLeft" && index > 0) {
      inputs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    commit(event.clipboardData.getData("text"));
    inputs.current[length - 1]?.focus();
  }

  return (
    <div role="group" aria-label={label} className="flex justify-between gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputs.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          aria-label={`${label}, digit ${index + 1}`}
          className="otp-box"
        />
      ))}
    </div>
  );
}
