"use client";

import { Thread } from "@/lib/types";

export function TopBar({ threads }: { threads: Thread[] }) {
  const pending = threads.filter((t) => t.status === "pending_review").length;
  const escalated = threads.filter((t) => t.status === "escalated").length;
  const sent = threads.filter((t) => t.status === "sent" || t.status === "draft_saved").length;

  return (
    <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-line bg-surface shrink-0">
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <span className="w-2 h-2 rounded-full bg-brand shrink-0" aria-hidden />
        <span className="font-display font-semibold text-[15px] tracking-tight whitespace-nowrap">Inbox Agent</span>
        <span className="hidden sm:inline text-[12px] text-ink-soft font-mono whitespace-nowrap">/ triage</span>
      </div>
      <div className="flex items-center gap-3 sm:gap-5 font-mono text-[12px] shrink-0">
        <Stat value={pending} label="pending" color="var(--pending)" />
        <Stat value={escalated} label="escalated" color="var(--urgent)" />
        <Stat value={sent} label="resolved" color="var(--resolved)" />
      </div>
    </header>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="font-semibold text-[13px]" style={{ color }}>
        {value}
      </span>
      <span className="hidden sm:inline text-ink-soft uppercase tracking-wide text-[10.5px] whitespace-nowrap">
        {label}
      </span>
    </span>
  );
}
