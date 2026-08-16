"use client";

import { confidenceBand } from "@/lib/format";

// Signature element: a semicircular instrument gauge, not a progress bar or
// badge. Confidence is the whole safety mechanism of this agent (low
// confidence -> escalate to a human), so it earns a dedicated instrument
// rather than a generic percentage chip.
export function ConfidenceDial({ confidence, size = 88 }: { confidence: number; size?: number }) {
  const { color, label } = confidenceBand(confidence);
  const pct = Math.round(confidence * 100);

  const w = size;
  const h = size * 0.62;
  const cx = w / 2;
  const cy = h - 4;
  const r = w / 2 - 8;

  const angleFor = (t: number) => Math.PI - t * Math.PI; // 180deg -> 0deg
  const arcPoint = (t: number) => {
    const a = angleFor(t);
    return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
  };

  const start = arcPoint(0);
  const end = arcPoint(1);
  const needle = arcPoint(confidence);

  const trackPath = `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`;

  // Progress arc via stroke-dasharray on the same path
  const circumference = Math.PI * r;
  const dash = circumference * confidence;

  return (
    <div className="flex flex-col items-center gap-1" role="img" aria-label={`Draft confidence ${pct} percent, ${label}`}>
      <svg width={w} height={h + 6} viewBox={`0 0 ${w} ${h + 6}`}>
        <path d={trackPath} fill="none" stroke="var(--line)" strokeWidth={7} strokeLinecap="round" />
        <path
          d={trackPath}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
        <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke="var(--ink)" strokeWidth={2} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={3.5} fill="var(--ink)" />
      </svg>
      <div className="font-mono text-[13px] leading-none -mt-1" style={{ color }}>
        {pct}%
      </div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-ink-soft leading-none">{label} confidence</div>
    </div>
  );
}
