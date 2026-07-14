import { useRef, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from "react";

const LENGTH = 6;

/**
 * Six single-character OTP boxes. Auto-advances on type, Backspace moves
 * back, and pasting a full code fills every box. `value` is a compact
 * digit string (0–6 chars); box i renders value[i].
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  label = "One-time code",
}: {
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  function commit(next: string, focusIndex?: number) {
    const clean = next.replace(/\D/g, "").slice(0, LENGTH);
    onChange(clean);
    if (focusIndex !== undefined) {
      refs.current[Math.max(0, Math.min(focusIndex, LENGTH - 1))]?.focus();
    }
    if (clean.length === LENGTH && clean !== value) onComplete?.(clean);
  }

  function handleChange(i: number, e: ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    if (!digits) {
      // Box cleared — drop the character at this position.
      commit(value.slice(0, i) + value.slice(i + 1), i);
      return;
    }
    const d = digits[digits.length - 1]; // last typed digit wins (overwrite)
    const next =
      i >= value.length
        ? value + d // typing in the first empty box → append
        : value.slice(0, i) + d + value.slice(i + 1);
    commit(next, i + 1);
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      e.preventDefault();
      commit(value.slice(0, i - 1) + value.slice(i), i - 1);
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < LENGTH - 1) {
      e.preventDefault();
      refs.current[i + 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (digits) commit(digits, digits.length);
  }

  function handleFocus(i: number) {
    // Don't allow focusing a box past the first empty one (no holes).
    if (i > value.length) refs.current[Math.min(value.length, LENGTH - 1)]?.focus();
  }

  return (
    <div role="group" aria-label={label} className="row" style={{ gap: 8, justifyContent: "center" }}>
      {Array.from({ length: LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="input mono"
          style={{ width: 42, height: 48, textAlign: "center", fontSize: 18, padding: 0 }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`${label}: digit ${i + 1} of ${LENGTH}`}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(i)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
