"use client";

import { useEffect, useRef } from "react";
import { normalizeOtpInput } from "@/lib/utils/otpAutofill";

type OTPCredentialLike = Credential & { code?: string };

interface UseWebOtpOptions {
  enabled: boolean;
  /** Increment after resend to restart SMS listener */
  sessionKey: number;
  length?: number;
  onCode: (code: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

/**
 * WebOTP (Chrome Android) + iOS uses autocomplete="one-time-code" on the input.
 * SMS must end with: @opalbox.ir #1234
 */
export function useWebOtp({
  enabled,
  sessionKey,
  length = 4,
  onCode,
  inputRef,
}: UseWebOtpOptions) {
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("OTPCredential" in window)) {
      return;
    }

    const input = inputRef.current;
    if (!input) return;

    const ac = new AbortController();
    const form = input.closest("form");

    const abort = () => ac.abort();
    form?.addEventListener("submit", abort);

    navigator.credentials
      .get({
        otp: { transport: ["sms"] },
        signal: ac.signal,
      } as CredentialRequestOptions)
      .then((credential) => {
        const otpCredential = credential as OTPCredentialLike | null;
        if (!otpCredential?.code) return;

        const digits = normalizeOtpInput(otpCredential.code, length);
        if (digits.length === length) {
          onCodeRef.current(digits);
        }
      })
      .catch(() => {
        // User dismissed, timeout, or unsupported context (e.g. in-app browser)
      });

    return () => {
      form?.removeEventListener("submit", abort);
      ac.abort();
    };
  }, [enabled, sessionKey, length, inputRef]);
}
