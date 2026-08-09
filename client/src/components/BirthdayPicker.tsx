import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BirthdayPickerProps {
  /** "YYYY-MM-DD" or "" */
  value: string;
  onChange: (value: string) => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * iOS WebKit (iPhone/iPod + iPadOS Safari). On these devices BOTH native
 * <select> and Radix Select dropdowns proved unreliable in the field
 * (list opens, tapping an item closes it without selecting — 2026-08-09).
 * iOS's own <input type="date"> wheel is OS-rendered and cannot be broken
 * by page CSS/JS, and its year wheel handles old birth years well.
 */
const IS_IOS =
  typeof navigator !== "undefined" &&
  (/iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

function daysInMonth(year: number | null, month: number | null): number {
  if (!month) return 31;
  // Use a leap-safe year when the year isn't chosen yet
  return new Date(year ?? 2000, month, 0).getDate();
}

/**
 * Three simple dropdowns (Day / Month / Year) instead of the platform
 * calendar widget — scrolling back to the 1940s in a month-by-month
 * calendar is painful. Emits "YYYY-MM-DD" once all three are chosen.
 *
 * Uses the app's Radix Select (JS-rendered dropdown) rather than native
 * <select>: the iOS WKWebView refused to open native select pickers here
 * (field report 2026-08-09), while Radix Select is proven working in the
 * native app (Care schedule panel uses it).
 */
export function BirthdayPicker({ value, onChange }: BirthdayPickerProps) {
  // iOS: use the OS-native date wheel — see IS_IOS note above. The dropdown
  // row below is for Android + desktop, where it's tested and working.
  if (IS_IOS) {
    const today = new Date();
    const max = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return (
      <input
        type="date"
        aria-label="Gran's birthday"
        className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        value={value}
        min="1900-01-01"
        max={max}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return <BirthdayDropdowns value={value} onChange={onChange} />;
}

function BirthdayDropdowns({ value, onChange }: BirthdayPickerProps) {
  const parsed = useMemo(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!m) return { year: null as number | null, month: null as number | null, day: null as number | null };
    return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  }, [value]);

  const thisYear = new Date().getFullYear();
  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = thisYear; y >= 1900; y--) list.push(y);
    return list;
  }, [thisYear]);

  const maxDay = daysInMonth(parsed.year, parsed.month);

  const emit = (year: number | null, month: number | null, day: number | null) => {
    // Clamp day if the month/year change makes it invalid (e.g. 31 → April)
    let d = day;
    if (d && month) {
      const max = daysInMonth(year, month);
      if (d > max) d = max;
    }
    if (year && month && d) {
      onChange(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    } else {
      onChange("");
    }
  };

  const triggerClass = "h-12 w-full";

  /**
   * iOS guard: if a text input still has focus (e.g. the user was typing the
   * name), blur it before the dropdown opens. A focused input + open keyboard
   * made dropdown taps dead on iPhone (field report 2026-08-09).
   */
  const blurActive = (e: React.PointerEvent) => {
    const el = document.activeElement;
    if (el instanceof HTMLElement && el !== e.currentTarget) el.blur();
  };

  return (
    <div className="grid grid-cols-[1fr_1.6fr_1.2fr] gap-2">
      <Select
        value={parsed.day ? String(parsed.day) : ""}
        onValueChange={(v) => emit(parsed.year, parsed.month, v ? Number(v) : null)}
      >
        <SelectTrigger className={triggerClass} aria-label="Birthday day" onPointerDown={blurActive}>
          <SelectValue placeholder="Day" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
            <SelectItem key={d} value={String(d)}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={parsed.month ? String(parsed.month) : ""}
        onValueChange={(v) => emit(parsed.year, v ? Number(v) : null, parsed.day)}
      >
        <SelectTrigger className={triggerClass} aria-label="Birthday month" onPointerDown={blurActive}>
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {MONTHS.map((name, i) => (
            <SelectItem key={name} value={String(i + 1)}>{name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={parsed.year ? String(parsed.year) : ""}
        onValueChange={(v) => emit(v ? Number(v) : null, parsed.month, parsed.day)}
      >
        <SelectTrigger className={triggerClass} aria-label="Birthday year" onPointerDown={blurActive}>
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default BirthdayPicker;
