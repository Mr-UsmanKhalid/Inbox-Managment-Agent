# Inbox Agent — Triage Dashboard

A human-review dashboard for the inbox management agent: see incoming
messages, what the AI classified/extracted/drafted, and approve, edit, or
escalate with one click.

Runs standalone with **zero API keys and zero backend dependency** — it's
seeded with the same 4 demo scenarios from the agent backend (routine order
question, angry refund complaint, enterprise sales inquiry, simple pricing
question), computed once so you can deploy and demo it today.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy (Vercel — easiest path, free tier is enough for a demo)

```bash
npm install -g vercel
vercel
```

Follow the prompts (link/create a project, accept defaults). Vercel will
give you a live URL in about a minute — no environment variables needed for
this standalone demo build.

Alternative: push this folder to a GitHub repo, then import it at
vercel.com/new — same result, plus automatic redeploys on every push.

## What's real vs. what's demo data

- **Real:** the UI, the interaction flow (select thread → review → approve
  send / save draft / escalate), the state updates, the audit trail, the
  responsive mobile layout.
- **Demo data:** the four conversations are pre-computed (not live LLM
  calls) so the dashboard works instantly with no keys. Actions
  (send/save/escalate) update an in-memory store on the server — fine for a
  walkthrough, but it resets on redeploy/cold start since there's no real
  database yet.

## Wiring it to the real backend

The `inbox-agent` backend (LangGraph pipeline) already produces exactly this
shape of data — `Classification`, `ExtractedEntities`, `DraftResponse`,
`EscalationDecision` in `inbox-agent/src/types.ts` map directly to
`lib/types.ts` here. To connect them:

1. Have the backend's `index.ts` write processed threads to a real
   database (Postgres/etc.) instead of `data/db.json`, using the schema in
   `lib/types.ts` as the target shape.
2. Replace `lib/store.ts` here with real DB queries instead of the
   in-memory `globalThis` store.
3. Replace the `action` API route's status updates with calls back into the
   backend's `EmailConnector` (`saveDraft`/`sendReply`/`markEscalated`) so
   clicking "Approve & send" here actually sends through Gmail/Outlook.

Until then, this dashboard is fully functional as a **client-facing demo**
of the review workflow — just not wired to a live inbox yet.
