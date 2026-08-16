"use client";

import { useEffect, useState } from "react";
import { Thread } from "@/lib/types";
import { categoryLabel, sentimentLabel, formatTime } from "@/lib/format";
import { ConfidenceDial } from "./ConfidenceDial";

export function ThreadDetail({
  thread,
  onAction,
  onBack,
}: {
  thread: Thread;
  onAction: (id: string, action: "send" | "save_draft" | "escalate", draftBody: string) => Promise<void>;
  onBack?: () => void;
}) {
  const [draft, setDraft] = useState(thread.draftBody);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setDraft(thread.draftBody);
  }, [thread.id, thread.draftBody]);

  const act = async (action: "send" | "save_draft" | "escalate") => {
    setBusy(action);
    await onAction(thread.id, action, draft);
    setBusy(null);
  };

  const locked = thread.status === "sent";

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-7 pt-6 pb-5 border-b border-line-soft">
        <button
          onClick={onBack}
          className="md:hidden mb-3 text-[12.5px] font-mono text-ink-soft flex items-center gap-1 hover:text-ink"
        >
          ← Back to inbox
        </button>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-[19px] font-semibold leading-snug">{thread.subject}</h1>
            <p className="text-[13px] text-ink-soft mt-1">
              <span className="font-medium text-ink">{thread.entities.customerName || thread.from}</span>
              {"  ·  "}
              <span className="font-mono">{thread.from}</span>
              {"  ·  "}
              {formatTime(thread.receivedAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <Tag>{categoryLabel(thread.classification.category)}</Tag>
          <Tag>{sentimentLabel(thread.classification.sentiment)}</Tag>
          <Tag>Urgency {thread.classification.urgency}/100</Tag>
        </div>
      </div>

      <div className="px-7 py-5 flex flex-col gap-6">
        {/* Escalation banner */}
        {thread.escalation.escalate && (
          <div
            className="rounded-md px-4 py-3 border text-[13px] leading-relaxed"
            style={{ background: "var(--urgent-soft)", borderColor: "var(--urgent)", color: "var(--urgent)" }}
          >
            <p className="font-semibold font-display text-[13px] mb-1">Flagged for human review</p>
            <p className="text-ink">{thread.escalation.reason}</p>
          </div>
        )}

        {/* Original message */}
        <section>
          <SectionLabel>Original message</SectionLabel>
          <blockquote className="border-l-2 border-line pl-4 text-[13.5px] leading-relaxed text-ink-soft whitespace-pre-wrap">
            {thread.body}
          </blockquote>
        </section>

        {/* Extracted entities */}
        <section>
          <SectionLabel>Extracted</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {thread.entities.orderNumber && <Chip label="Order" value={thread.entities.orderNumber} mono />}
            {thread.entities.customerName && <Chip label="Customer" value={thread.entities.customerName} />}
            {thread.entities.requirements.map((r, i) => (
              <Chip key={i} value={r} />
            ))}
            {!thread.entities.orderNumber && !thread.entities.requirements.length && (
              <span className="text-[13px] text-ink-soft italic">Nothing extracted</span>
            )}
          </div>
        </section>

        {/* Retrieved KB context */}
        {thread.retrieved.length > 0 && (
          <section>
            <SectionLabel>Knowledge base context used</SectionLabel>
            <div className="flex flex-col gap-2">
              {thread.retrieved.map((r, i) => (
                <div key={i} className="rounded-md border border-line-soft bg-surface px-3.5 py-2.5">
                  <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1">{r.source}</p>
                  <p className="text-[13px] leading-relaxed">{r.content}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Draft + confidence + actions */}
        <section>
          <div className="flex items-start justify-between gap-4 mb-2">
            <SectionLabel>{locked ? "Sent reply" : "Draft reply"}</SectionLabel>
          </div>
          <div className="flex gap-5 items-start">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={locked}
              rows={8}
              className="flex-1 rounded-md border border-line bg-surface px-3.5 py-3 text-[13.5px] leading-relaxed resize-none disabled:opacity-70 disabled:bg-line-soft"
            />
            <div className="shrink-0 pt-1">
              <ConfidenceDial confidence={thread.draftConfidence} />
            </div>
          </div>
        </section>

        {/* Actions */}
        {!locked && (
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => act("send")}
              disabled={busy !== null}
              className="px-4 py-2 rounded-md text-[13px] font-medium bg-brand text-brand-ink hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {busy === "send" ? "Sending…" : "Approve & send"}
            </button>
            <button
              onClick={() => act("save_draft")}
              disabled={busy !== null}
              className="px-4 py-2 rounded-md text-[13px] font-medium border border-line hover:bg-line-soft disabled:opacity-50 transition-colors"
            >
              {busy === "save_draft" ? "Saving…" : "Save draft"}
            </button>
            <button
              onClick={() => act("escalate")}
              disabled={busy !== null}
              className="px-4 py-2 rounded-md text-[13px] font-medium border transition-colors disabled:opacity-50"
              style={{ borderColor: "var(--urgent)", color: "var(--urgent)" }}
            >
              {busy === "escalate" ? "Escalating…" : "Escalate"}
            </button>
          </div>
        )}

        {/* Audit trail */}
        <section>
          <SectionLabel>Audit trail</SectionLabel>
          <ol className="flex flex-col gap-2">
            {thread.history.map((h, i) => (
              <li key={i} className="flex items-baseline gap-3 text-[12.5px]">
                <span className="font-mono text-ink-soft w-[110px] shrink-0">{formatTime(h.timestamp)}</span>
                <span
                  className="text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0"
                  style={{
                    background: h.actor === "agent" ? "var(--line-soft)" : "var(--brand)",
                    color: h.actor === "agent" ? "var(--ink-soft)" : "var(--brand-ink)",
                  }}
                >
                  {h.actor}
                </span>
                <span>
                  {h.action}
                  {h.detail && <span className="text-ink-soft"> — {h.detail}</span>}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[10px] uppercase tracking-wider text-ink-soft mb-2">{children}</p>;
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-mono uppercase tracking-wide px-2 py-0.5 rounded bg-line-soft text-ink-soft">
      {children}
    </span>
  );
}

function Chip({ label, value, mono }: { label?: string; value: string; mono?: boolean }) {
  return (
    <span className="text-[12.5px] px-2.5 py-1 rounded-full border border-line bg-surface">
      {label && <span className="text-ink-soft">{label} </span>}
      <span className={mono ? "font-mono" : ""}>{value}</span>
    </span>
  );
}
