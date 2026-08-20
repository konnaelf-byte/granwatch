import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

interface BirthdayPickerProps {
  /** "YYYY-MM-DD" or "" */
  value: string;
  onChange: (value: string) => void;
}

/**
 * History of this component (do not resurrect the dropdowns):
 * - 2026-08-09: iOS WKWebView — native <select> AND Radix Select both failed
 *   (list opens, tapping an item closes it without selecting). Fixed with the
 *   OS-native <input type="date"> wheel on iOS.
 * - 2026-08-20: the SAME Radix snap-back surfaced on Android (Play-store app)
 *   AND in desktop Chrome on macOS. Dropdowns are dead everywhere now: every
 *   platform gets the browser/OS-native date input. Desktop Chrome renders it
 *   as a typeable dd/mm/yyyy field with a calendar popup; Android shows the
 *   Material date dialog; iOS shows the wheel. None of them can be broken by
 *   page CSS/JS.
 */
const IS_ANDROID = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

/**
 * Native date input on every platform, with two UX helpers (Konna, 2026-08-20):
 *
 * 1. When no birthday is set yet, the picker opens at January 1960 instead of
 *    today — grans are born mid-century, not this morning. The seed is written
 *    straight to the DOM just before the picker reads it and is NOT committed
 *    to form state; if the user cancels or leaves without choosing, the field
 *    snaps back to empty (Chromium fires "cancel" on dialog dismissal; blur
 *    covers the rest).
 * 2. Android's Material dialog hides year navigation behind tapping the year
 *    in its header — nobody finds that. A one-line hint under the field points
 *    it out (Android only; iOS wheel and desktop input need no explanation).
 */
export function BirthdayPicker({ value, onChange }: BirthdayPickerProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLInputElement>(null);

  const today = new Date();
  const max = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const seedIfEmpty = () => {
    const el = ref.current;
    if (el && !value) el.value = "1960-01-01";
  };
  const clearSeedIfUncommitted = () => {
    const el = ref.current;
    if (el && !value) el.value = "";
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("cancel", clearSeedIfUncommitted);
    return () => el.removeEventListener("cancel", clearSeedIfUncommitted);
  });

  return (
    <div className="space-y-1.5">
      <input
        ref={ref}
        type="date"
        aria-label="Gran's birthday"
        className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        value={value}
        min="1900-01-01"
        max={max}
        onPointerDown={seedIfEmpty}
        onBlur={clearSeedIfUncommitted}
        onChange={(e) => onChange(e.target.value)}
      />
      {IS_ANDROID && (
        <p className="text-xs text-muted-foreground leading-snug">{t("elder.birthdayTip")}</p>
      )}
    </div>
  );
}

export default BirthdayPicker;
