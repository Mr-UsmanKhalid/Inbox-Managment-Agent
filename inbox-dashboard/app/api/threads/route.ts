import { NextResponse } from "next/server";

const AGENT_API_URL = process.env.AGENT_API_URL || "http://localhost:4000";

export async function GET() {
  try {
    const res = await fetch(`${AGENT_API_URL}/api/threads`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: "Agent backend returned an error" }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Failed to reach inbox-agent backend:", err);
    return NextResponse.json(
      { error: `Could not reach inbox-agent backend at ${AGENT_API_URL}. Is it running (npm run dev:server)?` },
      { status: 502 }
    );
  }
}
