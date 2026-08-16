import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore as LCPineconeStore } from "@langchain/pinecone";
import { Document } from "@langchain/core/documents";
import { getEmbeddings } from "./embeddings.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KB_DIR = path.resolve(__dirname, "../../data/kb");
/**
 * Pinecone-backed knowledge store, for production use.
 *
 * Requires:
 *   PINECONE_API_KEY
 *   PINECONE_INDEX (index must already exist - create it in the Pinecone
 *     console or via `pc.createIndex()`; dimension must match whichever
 *     embeddings provider is active - see EMBEDDINGS_PROVIDER in embeddings.ts:
 *       openai              -> 1536 (text-embedding-3-small)
 *       huggingface(-local) -> 384  (all-MiniLM-L6-v2, the default model)
 *
 * Re-running ingestDirectory() is idempotent-ish: it re-upserts by a
 * deterministic id (file name + chunk index), so re-ingesting the same
 * KB files updates existing vectors rather than duplicating them.
 */
export class PineconeKnowledgeStore {
    storePromise = null;
    async getStore() {
        if (!this.storePromise) {
            this.storePromise = (async () => {
                const pc = new Pinecone({ apiKey: requireEnv("PINECONE_API_KEY") });
                const index = pc.Index(requireEnv("PINECONE_INDEX"));
                const embeddings = await getEmbeddings();
                return LCPineconeStore.fromExistingIndex(embeddings, { pineconeIndex: index });
            })();
        }
        return this.storePromise;
    }
    async ingestDirectory(dir = KB_DIR) {
        const store = await this.getStore();
        const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".md") || f.endsWith(".txt")) : [];
        const documents = [];
        const ids = [];
        for (const file of files) {
            const content = fs.readFileSync(path.join(dir, file), "utf-8");
            const chunks = chunkText(content, 800);
            chunks.forEach((chunk, i) => {
                documents.push(new Document({ pageContent: chunk, metadata: { source: file } }));
                ids.push(`${file}::${i}`); // deterministic id -> re-ingest upserts instead of duplicating
            });
        }
        if (documents.length > 0) {
            await store.addDocuments(documents, { ids });
        }
    }
    async search(query, topK = 3) {
        const store = await this.getStore();
        const results = await store.similaritySearchWithScore(query, topK);
        return results.map(([doc, score]) => ({
            content: doc.pageContent,
            source: doc.metadata?.source || "unknown",
            score,
        }));
    }
}
function requireEnv(name) {
    const val = process.env[name];
    if (!val)
        throw new Error(`${name} is required to use the Pinecone knowledge store.`);
    return val;
}
function chunkText(text, maxLen) {
    const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    const chunks = [];
    let current = "";
    for (const p of paragraphs) {
        if ((current + "\n\n" + p).length > maxLen && current) {
            chunks.push(current);
            current = p;
        }
        else {
            current = current ? current + "\n\n" + p : p;
        }
    }
    if (current)
        chunks.push(current);
    return chunks;
}
