import { NextRequest, NextResponse } from "next/server";

const AGENT_API_URL = process.env.AGENT_API_URL || "http://localhost:4000";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  try {
    const res = await fetch(`${AGENT_API_URL}/api/threads/${encodeURIComponent(id)}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Failed to reach inbox-agent backend:", err);
    return NextResponse.json(
      { error: `Could not reach inbox-agent backend at ${AGENT_API_URL}. Is it running (npm run dev:server)?` },
      { status: 502 }
    );
  }
}
