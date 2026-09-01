"use client";

import { useEffect, useRef } from "react";
import { toPersianDigits } from "@/lib/utils/numberUtils";
import { normalizeOtpInput, OTP_LENGTH } from "@/lib/utils/otpAutofill";
import { useWebOtp } from "@/hooks/useWebOtp";

type OtpCodeInputVariant = "light" | "dark";

interface OtpCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  /** Bump after resend / error to restart WebOTP and reset the native input */
  webOtpSession?: number;
  disabled?: boolean;
  variant?: OtpCodeInputVariant;
}

/**
 * iOS Safari needs:
 * - autocomplete="one-time-code" on a real (not opacity-0) input
 * - uncontrolled input (controlled inputs often block SMS QuickType)
 * - no focus outline on the full-width overlay input
 * SMS last line: @opalbox.ir #1234
 */
export default function OtpCodeInput({
  value,
  onChange,
  onComplete,
  webOtpSession = 0,
  disabled = false,
  variant = "light",
}: OtpCodeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isDark = variant === "dark";

  useEffect(() => {
    if (!disabled) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 100);
      return () => window.clearTimeout(t);
    }
  }, [disabled, webOtpSession]);

  const applyCode = (raw: string) => {
    const normalized = normalizeOtpInput(raw);
    onChange(normalized);
    if (inputRef.current && inputRef.current.value !== normalized) {
      inputRef.current.value = normalized;
    }
    if (normalized.length === OTP_LENGTH) {
      onComplete?.(normalized);
    }
  };

  useWebOtp({
    enabled: !disabled,
    sessionKey: webOtpSession,
    length: OTP_LENGTH,
    onCode: applyCode,
    inputRef,
  });

  return (
    <div className="space-y-2">
      <div
        className="relative w-full h-16"
        onClick={() => !disabled && inputRef.current?.focus()}
        role="group"
        aria-label="کد تایید چهار رقمی"
      >
        <div className="absolute inset-0 flex justify-between gap-4 ltr pointer-events-none select-none" dir="ltr">
          {Array.from({ length: OTP_LENGTH }, (_, index) => {
            const digit = value[index];
            const isActive = index === value.length;

            return (
              <div
                key={index}
                className={`
                  flex-1 h-16 rounded-2xl border-2 flex items-center justify-center text-3xl font-black transition-all duration-200 shadow-sm
                  ${
                    isActive
                      ? isDark
                        ? "border-gold-500 ring-4 ring-gold-500/10 bg-slate-700 scale-110 z-10 shadow-gold-500/20"
                        : "border-gold-500 ring-4 ring-gold-500/10 bg-white scale-110 z-10 shadow-gold-500/20"
                      : isDark
                        ? "border-slate-600 bg-slate-900"
                        : "border-gray-200 bg-gray-50"
                  }
                  ${
                    digit
                      ? isDark
                        ? "border-gold-500 text-white bg-slate-700"
                        : "border-gray-800 text-gray-900 bg-white"
                      : isDark
                        ? "text-slate-500"
                        : "text-gray-300"
                  }
                `}
              >
                {digit ? toPersianDigits(digit) : "-"}
              </div>
            );
          })}
        </div>

        {/* Uncontrolled for iOS SMS QuickType; transparent overlay without Safari blue focus ring */}
        <input
          key={`otp-${webOtpSession}`}
          ref={inputRef}
          id="otp-code"
          name="one-time-code"
          defaultValue=""
          onInput={(e) => applyCode(e.currentTarget.value)}
          onChange={(e) => applyCode(e.target.value)}
          disabled={disabled}
          className="otp-autofill-input absolute inset-0 z-20 w-full h-full border-0 bg-transparent shadow-none outline-none ring-0 focus:outline-none focus:ring-0 focus:border-0 appearance-none cursor-text text-transparent caret-transparent text-xl text-center tracking-[0.5em] font-black"
          style={{
            WebkitAppearance: "none",
            WebkitTapHighlightColor: "transparent",
            WebkitTextFillColor: "transparent",
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          pattern="[0-9]*"
          maxLength={OTP_LENGTH}
          enterKeyHint="done"
          aria-label="کد تایید"
        />
      </div>

      <p className={`text-[11px] text-center ${isDark ? "text-slate-500" : "text-gray-400"}`}>
        کد از پیامک روی کیبورد پیشنهاد می‌شود — روی پیشنهاد بالای کیبورد بزنید
      </p>
    </div>
  );
}
