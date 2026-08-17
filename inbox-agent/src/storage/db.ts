import { JSONFilePreset } from "lowdb/node";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AuditLogEntry, ConversationStatus } from "../types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Vercel's (and most serverless platforms') filesystem is read-only at
// runtime everywhere except /tmp - writing to the repo's own data/ folder,
// which works fine locally, crashes there with EROFS. /tmp is writable but
// ephemeral (wiped between cold starts, not shared across instances) - fine
// for a demo's audit log, not a real persistence guarantee. Swap this
// whole file for Postgres/Mongo before relying on this for anything real;
// the read/write API surface below (get/set/append) stays the same shape.
const DB_PATH = process.env.VERCEL ? "/tmp/db.json" : path.resolve(__dirname, "../../data/db.json");

interface ConversationRecord {
  threadId: string;
  status: ConversationStatus;
  lastUpdated: string;
  lastCategory?: string;
}

interface DBSchema {
  conversations: ConversationRecord[];
  auditLog: AuditLogEntry[];
}

// lowdb writes a plain JSON file - swap for Postgres/Mongo in production,
// the read/write API surface below (get/set/append) stays the same shape.
let dbPromise: ReturnType<typeof JSONFilePreset<DBSchema>> | null = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = JSONFilePreset<DBSchema>(DB_PATH, { conversations: [], auditLog: [] });
  }
  return dbPromise;
}

export async function upsertConversationStatus(threadId: string, status: ConversationStatus, category?: string) {
  const db = await getDb();
  const existing = db.data.conversations.find((c) => c.threadId === threadId);
  if (existing) {
    existing.status = status;
    existing.lastUpdated = new Date().toISOString();
    if (category) existing.lastCategory = category;
  } else {
    db.data.conversations.push({
      threadId,
      status,
      lastUpdated: new Date().toISOString(),
      lastCategory: category,
    });
  }
  await db.write();
}

export async function appendAuditEntries(entries: AuditLogEntry[]) {
  const db = await getDb();
  db.data.auditLog.push(...entries);
  await db.write();
}

export async function getConversationStatus(threadId: string): Promise<ConversationRecord | undefined> {
  const db = await getDb();
  return db.data.conversations.find((c) => c.threadId === threadId);
}

export async function getAllAuditEntries(): Promise<AuditLogEntry[]> {
  const db = await getDb();
  return db.data.auditLog;
}
