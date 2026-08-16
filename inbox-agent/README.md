# Inbox Management Agent — MVP

A working prototype of the AI inbox agent: reads messages, classifies them,
extracts entities, retrieves context from a knowledge base (RAG), drafts a
reply, and decides whether to auto-draft or escalate to a human.

## What's built

```
src/
  types.ts                    Shared schema (Message, Classification, etc.)
  llm.ts                      OpenAI client wrapper + mock-mode switch
  graph/
    buildGraph.ts              LangGraph pipeline: classify -> extract -> retrieve -> draftReply -> escalate
    nodes/
      classify.ts               Category, intent, urgency, sentiment
      extract.ts                 Customer name, order number, dates, requirements
      retrieve.ts                 RAG lookup against the vector store
      draft.ts                     Generates the reply + a confidence score
      escalate.ts                  Hard-coded safety rules + confidence check
  connectors/email/
    types.ts                    EmailConnector interface (channel-agnostic)
    mockConnector.ts             Reads data/sample-emails/*.json — for local dev/demo
    gmailConnector.ts            Stub showing exactly what to implement for real Gmail
  knowledge/vectorStore.ts     In-memory RAG store (swap for Pinecone/Qdrant/pgvector later)
  storage/db.ts                Conversation status + audit log (JSON file; swap for Postgres later)
  index.ts                      Runner: fetch -> run graph -> act -> log
data/
  kb/                          Sample knowledge base docs (shipping, returns, pricing)
  sample-emails/               4 sample inbound emails covering different scenarios
```

## Run it

```bash
npm install

# Mock mode - no API key needed, deterministic keyword-based logic,
# good for testing the pipeline shape and demoing to the client.
npm run dev:mock

# Live mode - real OpenAI calls via LangChain/LangGraph
export OPENAI_API_KEY=sk-...
npm run dev
```

### Optional: Groq instead of OpenAI for chat

```bash
export LLM_PROVIDER=groq
export GROQ_API_KEY=gsk_...
export OPENAI_API_KEY=sk-...   # still required - embeddings always go through OpenAI, Groq has no embeddings API
npm run dev
```

Groq is faster/cheaper per token than OpenAI's hosted models. Good default:
`llama-3.3-70b-versatile` (set via `GROQ_MODEL`), which is fine for structured
output (classification/extraction/drafting all use `withStructuredOutput`).

### Optional: Hugging Face instead of OpenAI for embeddings

Two flavors:

```bash
# Local - runs on your machine via transformers.js (ONNX), no API key at all.
# Downloads the model once (~90MB for the default) and caches it. Free forever.
export EMBEDDINGS_PROVIDER=huggingface-local

# Hosted - uses the HF Inference API, needs a free token from
# huggingface.co/settings/tokens, no local compute.
export EMBEDDINGS_PROVIDER=huggingface
export HUGGINGFACEHUB_API_KEY=hf_...
```

Combine this with `LLM_PROVIDER=groq` and you can run the whole pipeline
with **no OpenAI key at all**. The default HF model
(`Xenova/all-MiniLM-L6-v2` / `sentence-transformers/all-MiniLM-L6-v2`)
produces 384-dim vectors, vs OpenAI's 1536-dim — if you're using Pinecone,
create the index with the dimension matching whichever provider you pick,
and don't switch providers on an existing index without re-ingesting the KB
(embeddings from different models aren't comparable).

### Optional: Pinecone instead of the in-memory vector store

```bash
export VECTOR_STORE=pinecone
export PINECONE_API_KEY=...
export PINECONE_INDEX=inbox-agent-kb   # create this index first, dimension 1536 (text-embedding-3-small)
npm run dev
```

The in-memory store (default) is fine for a small, static KB and for demos,
but it re-embeds every document on every process start and holds nothing in
memory between restarts. Pinecone persists the index, scales past a few
dozen documents, and lets multiple agent instances share the same KB. Both
implement the same `KnowledgeStore` interface (`src/knowledge/types.ts`), so
switching is just the env vars above - no code changes, no changes to the
`retrieve` node.

All combinations of chat provider / embeddings provider / vector store work
together (e.g. Groq + Hugging Face local + Pinecone = zero OpenAI dependency)
- they're independent switches.

## Design decisions worth flagging to the client

1. **Draft-only by default.** The escalation node's `finalAction` defaults to
   `save_draft`, not `send`. Auto-send is one line to enable in `escalate.ts`
   once the client trusts the agent's output — but for launch, having a human
   glance at drafts before they go out is much safer.

2. **Escalation is rule-based, not just LLM judgment.** `escalate.ts` hard-codes
   thresholds (urgency score, sentiment=angry, keyword matches like "chargeback"
   or "lawyer", dollar amounts over $500) so a bad LLM call can't silently let
   something risky slip through. The LLM's classification feeds into these
   rules, but the rules themselves are deterministic and auditable.

3. **Everything is logged.** Every node appends to `auditTrail`, persisted to
   `data/db.json` (swap for Postgres in production). This gives you the "log
   AI decisions and actions for auditing" requirement out of the box — you can
   see exactly what the agent classified, extracted, retrieved, and decided,
   for every message.

4. **Connectors are pluggable.** `EmailConnector` is an interface — swapping
   the mock for real Gmail or Outlook means implementing 5 methods
   (`fetchNewMessages`, `fetchThreadHistory`, `saveDraft`, `sendReply`,
   `markEscalated`) without touching the graph/agent logic at all.

## Next steps to production

- [ ] Implement `GmailConnector` (or Outlook via Microsoft Graph) — see docstring in `gmailConnector.ts`
- [ ] Swap `VectorStore` for a real vector DB (Pinecone/Qdrant/pgvector) once the KB grows past a few dozen docs
- [ ] Swap `data/db.json` for Postgres/Mongo for conversation status + audit log
- [ ] Add a CRM lookup node (enrich `entities` with order history / customer tier before drafting)
- [ ] Add a human review queue (Slack approve/edit/reject buttons, or a simple dashboard)
- [ ] Wire this into n8n: either as an HTTP node calling this service, or reimplement the same
      graph using n8n's native AI Agent + Vector Store nodes for a lighter no-code version
- [ ] Add retry/error handling around every external API call (Gmail, OpenAI, vector DB)
- [ ] Load-test escalation rules against real historical emails from the client before going live
