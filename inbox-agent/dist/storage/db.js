import { JSONFilePreset } from "lowdb/node";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "../../data/db.json");
// lowdb writes a plain JSON file - swap for Postgres/Mongo in production,
// the read/write API surface below (get/set/append) stays the same shape.
let dbPromise = null;
async function getDb() {
    if (!dbPromise) {
        dbPromise = JSONFilePreset(DB_PATH, { conversations: [], auditLog: [] });
    }
    return dbPromise;
}
export async function upsertConversationStatus(threadId, status, category) {
    const db = await getDb();
    const existing = db.data.conversations.find((c) => c.threadId === threadId);
    if (existing) {
        existing.status = status;
        existing.lastUpdated = new Date().toISOString();
        if (category)
            existing.lastCategory = category;
    }
    else {
        db.data.conversations.push({
            threadId,
            status,
            lastUpdated: new Date().toISOString(),
            lastCategory: category,
        });
    }
    await db.write();
}
export async function appendAuditEntries(entries) {
    const db = await getDb();
    db.data.auditLog.push(...entries);
    await db.write();
}
export async function getConversationStatus(threadId) {
    const db = await getDb();
    return db.data.conversations.find((c) => c.threadId === threadId);
}
export async function getAllAuditEntries() {
    const db = await getDb();
    return db.data.auditLog;
}
