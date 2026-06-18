import React from "react";

export type VisitStatus = "green" | "yellow" | "orange" | "red";

interface StatusRingProps {
  photoUrl?: string | null;
  name: string;
  daysSinceVisit: number;
  status: VisitStatus;
  threshold?: number; // alert threshold in days, default 21
  size?: number; // diameter in px, default 160
  className?: string;
}

// Grandma SVG emoji avatar — shown when no photo is provided
function GrandmaAvatar({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background */}
      <circle cx="50" cy="50" r="50" fill="#fef3c7" />
      {/* Hair */}
      <ellipse cx="50" cy="32" rx="22" ry="20" fill="#d1d5db" />
      <ellipse cx="50" cy="28" rx="18" ry="14" fill="#e5e7eb" />
      {/* Hair bun */}
      <circle cx="50" cy="16" r="9" fill="#d1d5db" />
      <circle cx="50" cy="16" r="6" fill="#e5e7eb" />
      {/* Face */}
      <ellipse cx="50" cy="52" rx="18" ry="20" fill="#fde68a" />
      {/* Eyes */}
      <ellipse cx="43" cy="48" rx="2.5" ry="2" fill="#374151" />
      <ellipse cx="57" cy="48" rx="2.5" ry="2" fill="#374151" />
      {/* Glasses */}
      <rect x="38" y="44" width="10" height="8" rx="4" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
      <rect x="52" y="44" width="10" height="8" rx="4" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
      <line x1="48" y1="48" x2="52" y2="48" stroke="#9ca3af" strokeWidth="1.5" />
      {/* Nose */}
      <ellipse cx="50" cy="55" rx="2" ry="1.5" fill="#f59e0b" opacity="0.5" />
      {/* Smile with wrinkles */}
      <path d="M44 61 Q50 67 56 61" stroke="#92400e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Cheeks */}
      <ellipse cx="40" cy="58" rx="4" ry="3" fill="#fca5a5" opacity="0.5" />
      <ellipse cx="60" cy="58" rx="4" ry="3" fill="#fca5a5" opacity="0.5" />
      {/* Earrings */}
      <circle cx="32" cy="55" r="2.5" fill="#fbbf24" />
      <circle cx="68" cy="55" r="2.5" fill="#fbbf24" />
      {/* Body / collar */}
      <path d="M20 100 Q20 80 50 78 Q80 80 80 100" fill="#6ee7b7" />
      <path d="M42 78 L50 88 L58 78" fill="white" opacity="0.8" />
    </svg>
  );
}

const STATUS_COLORS: Record<VisitStatus, { stroke: string; glow: string; label: string; overlay: string }> = {
  green: {
    stroke: "#22c55e",
    glow: "drop-shadow(0 0 10px rgba(34, 197, 94, 0.5))",
    label: "All good",
    overlay: "transparent",
  },
  yellow: {
    stroke: "#eab308",
    glow: "drop-shadow(0 0 12px rgba(234, 179, 8, 0.5))",
    label: "Due soon",
    overlay: "transparent",
  },
  orange: {
    stroke: "#f97316",
    glow: "drop-shadow(0 0 14px rgba(249, 115, 22, 0.6))",
    label: "Overdue",
    overlay: "transparent",
  },
  red: {
    stroke: "#ef4444",
    glow: "drop-shadow(0 0 20px rgba(239, 68, 68, 0.9))",
    label: "Alert!",
    overlay: "rgba(239, 68, 68, 0.35)",
  },
};

export function StatusRing({
  photoUrl,
  name,
  daysSinceVisit,
  status,
  threshold = 21,
  size = 160,
  className = "",
}: StatusRingProps) {
  const colors = STATUS_COLORS[status];
  const strokeWidth = Math.max(size * 0.06, 8);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Arc drains from full green circle as days pass.
  // At day 0 → full circle (360°). At threshold → 0° (empty / gap open).
  // We clamp so it never goes below 0.
  const clampedDays = Math.min(daysSinceVisit, threshold);
  // fillRatio: 1.0 = full green ring, 0.0 = completely drained (red)
  const fillRatio = Math.max(0, 1 - clampedDays / threshold);
  const strokeDashoffset = circumference * (1 - fillRatio);

  // Track arc (the grey "empty" portion)
  const trackDashoffset = circumference * fillRatio;

  const isRed = status === "red";
  const imgSize = size - strokeWidth * 2.5;

  const daysText =
    daysSinceVisit >= 999
      ? "Never visited"
      : daysSinceVisit === 0
      ? "Visited today!"
      : daysSinceVisit === 1
      ? "1 day ago"
      : `${daysSinceVisit} days ago`;

  // Accessible description for VoiceOver / TalkBack
  const ringAriaLabel = `${name} — ${colors.label}. ${daysText}.`;

  return (
    <div
      className={`flex flex-col items-center gap-3 ${className}`}
      role="img"
      aria-label={ringAriaLabel}
    >
      {/* Ring + Photo — aria-hidden so VoiceOver reads the parent label only */}
      <div className="relative" aria-hidden="true" style={{ width: size, height: size }}>
        {/* SVG ring — starts at top (rotated -90deg) */}
        <svg
          width={size}
          height={size}
          className={`absolute inset-0 ${isRed ? "status-ring-pulse" : ""}`}
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Track — the "drained" grey portion */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(0,0,0,0.10)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={trackDashoffset}
          />
          {/* Filled arc — green draining to red */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              filter: colors.glow,
              transition: "stroke-dashoffset 1.2s ease, stroke 1.2s ease",
            }}
          />
        </svg>

        {/* Photo or grandma avatar */}
        <div
          className="absolute overflow-hidden bg-muted"
          style={{
            width: imgSize,
            height: imgSize,
            top: (size - imgSize) / 2,
            left: (size - imgSize) / 2,
            borderRadius: "50%",
          }}
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={name}
              className="w-full h-full object-cover"
              style={{ borderRadius: "50%" }}
            />
          ) : (
            <GrandmaAvatar size={imgSize} />
          )}

          {/* Red urgency overlay — only when status is red */}
          {isRed && (
            <div
              className="absolute inset-0"
              style={{
                background: colors.overlay,
                borderRadius: "50%",
                animation: "redOverlayPulse 2s ease-in-out infinite",
              }}
            />
          )}
        </div>
      </div>

      {/* Days counter */}
      <div className="text-center">
        <div
          className="font-bold leading-tight"
          style={{ color: colors.stroke, fontSize: size * 0.14 }}
        >
          {daysText}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 font-medium uppercase tracking-wide">
          {colors.label}
        </div>
      </div>

      <style>{`
        @keyframes redOverlayPulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.5; }
        }
        .status-ring-pulse circle:last-child {
          animation: ringPulse 1.5s ease-in-out infinite;
        }
        @keyframes ringPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default StatusRing;
