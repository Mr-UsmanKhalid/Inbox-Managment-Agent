import { Category, Sentiment, ThreadStatus } from "./types";

export function statusColor(status: ThreadStatus): { fg: string; bg: string; label: string } {
  switch (status) {
    case "escalated":
      return { fg: "var(--urgent)", bg: "var(--urgent-soft)", label: "Escalated" };
    case "pending_review":
      return { fg: "var(--pending)", bg: "var(--pending-soft)", label: "Needs review" };
    case "draft_saved":
      return { fg: "var(--pending)", bg: "var(--pending-soft)", label: "Draft saved" };
    case "sent":
      return { fg: "var(--resolved)", bg: "var(--resolved-soft)", label: "Sent" };
  }
}

export function confidenceBand(confidence: number): { color: string; label: string } {
  if (confidence >= 0.75) return { color: "var(--resolved)", label: "High" };
  if (confidence >= 0.5) return { color: "var(--pending)", label: "Medium" };
  return { color: "var(--urgent)", label: "Low" };
}

export function categoryLabel(category: Category): string {
  const map: Record<Category, string> = {
    sales_inquiry: "Sales",
    support_request: "Support",
    billing: "Billing",
    complaint: "Complaint",
    order_status: "Order status",
    spam: "Spam",
    general: "General",
  };
  return map[category];
}

export function sentimentLabel(sentiment: Sentiment): string {
  const map: Record<Sentiment, string> = {
    positive: "Positive",
    neutral: "Neutral",
    negative: "Negative",
    angry: "Angry",
  };
  return map[sentiment];
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function initials(name: string): string {
  const parts = name.replace(/[<>]/g, "").split(/[\s.@]+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}
