"use client";

import { Thread } from "@/lib/types";
import { statusColor, categoryLabel, formatTime, initials } from "@/lib/format";

export function ThreadList({
  threads,
  selectedId,
  onSelect,
}: {
  threads: Thread[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="flex flex-col">
      {threads.map((t) => {
        const s = statusColor(t.status);
        const active = t.id === selectedId;
        return (
          <li key={t.id}>
            <button
              onClick={() => onSelect(t.id)}
              className="w-full text-left flex items-stretch gap-0 border-b border-line-soft transition-colors"
              style={{ background: active ? "var(--surface)" : "transparent" }}
            >
              <span className="w-[3px] shrink-0" style={{ background: s.fg }} aria-hidden />
              <span className="flex-1 px-4 py-3.5 flex flex-col gap-1.5 min-w-0">
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0"
                      style={{ background: "var(--line-soft)", color: "var(--ink-soft)" }}
                    >
                      {initials(t.entities.customerName || t.from)}
                    </span>
                    <span className="font-medium text-[13.5px] truncate">{t.entities.customerName || t.from}</span>
                  </span>
                  <span className="font-mono text-[11px] text-ink-soft shrink-0">{formatTime(t.receivedAt)}</span>
                </span>
                <span className="text-[13px] text-ink-soft truncate pl-8">{t.subject}</span>
                <span className="flex items-center gap-1.5 pl-8">
                  <span
                    className="text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{ background: s.bg, color: s.fg }}
                  >
                    {s.label}
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded bg-line-soft text-ink-soft">
                    {categoryLabel(t.classification.category)}
                  </span>
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
