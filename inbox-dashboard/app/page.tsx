"use client";

import { useEffect, useState } from "react";
import { Thread } from "@/lib/types";
import { TopBar } from "@/components/TopBar";
import { ThreadList } from "@/components/ThreadList";
import { ThreadDetail } from "@/components/ThreadDetail";

export default function Home() {
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  useEffect(() => {
    fetch("/api/threads")
      .then((r) => r.json())
      .then((data: { threads?: Thread[]; error?: string }) => {
        if (!data.threads) {
          setError(data.error ?? "No threads returned from the API.");
          return;
        }
        setThreads(data.threads);
        setSelectedId(data.threads[0]?.id ?? null);
      })
      .catch((err) => setError(String(err)));
  }, []);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center h-screen">
        <div className="max-w-md text-center font-mono text-[13px] text-ink-soft space-y-2">
          <p className="text-red-500 font-semibold">Couldn&apos;t load threads</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setMobileView("detail");
  };

  const handleAction = async (id: string, action: "send" | "save_draft" | "escalate", draftBody: string) => {
    const res = await fetch(`/api/threads/${id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, draftBody }),
    });
    const data = await res.json();
    if (data.thread) {
      setThreads((prev) => (prev ? prev.map((t) => (t.id === id ? data.thread : t)) : prev));
    }
  };

  if (!threads) {
    return (
      <div className="flex-1 flex items-center justify-center text-ink-soft font-mono text-[13px]">
        Loading inbox…
      </div>
    );
  }

  const selected = threads.find((t) => t.id === selectedId) ?? threads[0];

  return (
    <div className="flex flex-col h-screen">
      <TopBar threads={threads} />
      <div className="flex flex-1 min-h-0">
        <div
          className={`${
            mobileView === "detail" ? "hidden" : "flex"
          } md:flex w-full md:w-[340px] shrink-0 border-r border-line bg-paper overflow-y-auto flex-col`}
        >
          <ThreadList threads={threads} selectedId={selected?.id ?? null} onSelect={handleSelect} />
        </div>
        <div className={`${mobileView === "list" ? "hidden" : "flex"} md:flex flex-1 min-w-0 bg-paper flex-col`}>
          {selected ? (
            <ThreadDetail thread={selected} onAction={handleAction} onBack={() => setMobileView("list")} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-ink-soft font-mono text-[13px] h-full">
              No conversations
            </div>
          )}
        </div>
      </div>
    </div>
  );
}