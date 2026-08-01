import { Sparkles } from "lucide-react";

/**
 * Small, ambient free-trial countdown. Shown wherever a Gran+ feature is
 * used while the profile is on its free trial (server sends trialDaysLeft
 * only in that state — null when paid or no trial, so paid users never see
 * a countdown). Muted for most of the trial; amber for the last 30 days.
 * A fuel gauge, not a nag — never a popup.
 */
export function TrialBadge({
  daysLeft,
  className = "",
}: {
  daysLeft: number | null | undefined;
  className?: string;
}) {
  if (!daysLeft || daysLeft <= 0) return null;
  const urgent = daysLeft <= 30;
  return (
    <p
      className={`flex items-center gap-1 text-[11px] leading-none ${
        urgent ? "text-amber-600 font-medium" : "text-muted-foreground"
      } ${className}`}
    >
      <Sparkles className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
      Gran+ free trial · {daysLeft} day{daysLeft === 1 ? "" : "s"} left
    </p>
  );
}
