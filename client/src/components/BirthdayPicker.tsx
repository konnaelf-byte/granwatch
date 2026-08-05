import { useMemo } from "react";

interface BirthdayPickerProps {
  /** "YYYY-MM-DD" or "" */
  value: string;
  onChange: (value: string) => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function daysInMonth(year: number | null, month: number | null): number {
  if (!month) return 31;
  // Use a leap-safe year when the year isn't chosen yet
  return new Date(year ?? 2000, month, 0).getDate();
}

/**
 * Three simple dropdowns (Day / Month / Year) instead of the platform
 * calendar widget — scrolling back to the 1940s in a month-by-month
 * calendar is painful. Emits "YYYY-MM-DD" once all three are chosen.
 */
export function BirthdayPicker({ value, onChange }: BirthdayPickerProps) {
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

  const selectClass =
    "h-12 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="grid grid-cols-[1fr_1.6fr_1.2fr] gap-2">
      <select
        aria-label="Birthday day"
        className={selectClass}
        value={parsed.day ?? ""}
        onChange={(e) => emit(parsed.year, parsed.month, e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">Day</option>
        {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>

      <select
        aria-label="Birthday month"
        className={selectClass}
        value={parsed.month ?? ""}
        onChange={(e) => emit(parsed.year, e.target.value ? Number(e.target.value) : null, parsed.day)}
      >
        <option value="">Month</option>
        {MONTHS.map((name, i) => (
          <option key={name} value={i + 1}>{name}</option>
        ))}
      </select>

      <select
        aria-label="Birthday year"
        className={selectClass}
        value={parsed.year ?? ""}
        onChange={(e) => emit(e.target.value ? Number(e.target.value) : null, parsed.month, parsed.day)}
      >
        <option value="">Year</option>
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}

export default BirthdayPicker;
