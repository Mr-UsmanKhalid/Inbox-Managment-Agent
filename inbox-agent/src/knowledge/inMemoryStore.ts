import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Embeddings } from "@langchain/core/embeddings";
import { RetrievedChunk } from "../types.js";
import { isMockMode } from "../llm.js";
import { getEmbeddings } from "./embeddings.js";
import { KnowledgeStore } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KB_DIR = path.resolve(__dirname, "../../data/kb");

interface KBDoc {
  content: string;
  source: string;
  embedding: number[];
}

// Minimal in-memory vector store - zero setup, good for local dev and demos.
// Not persistent (rebuilt on every process start) and not suitable for
// production scale. Implements the same KnowledgeStore interface as
// PineconeStore, so the retrieve node doesn't know or care which is active.
export class InMemoryVectorStore implements KnowledgeStore {
  private docs: KBDoc[] = [];
  private embeddings: Embeddings | null = null;

  private async getEmbeddings(): Promise<Embeddings | null> {
    if (isMockMode()) return null;
    if (!this.embeddings) this.embeddings = await getEmbeddings();
    return this.embeddings;
  }

  async ingestDirectory(dir: string = KB_DIR): Promise<void> {
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".md") || f.endsWith(".txt")) : [];
    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), "utf-8");
      const chunks = chunkText(content, 800);
      for (const chunk of chunks) {
        const embedding = await this.embed(chunk);
        this.docs.push({ content: chunk, source: file, embedding });
      }
    }
  }

  async search(query: string, topK = 3): Promise<RetrievedChunk[]> {
    if (this.docs.length === 0) return [];
    const queryEmbedding = await this.embed(query);
    const scored = this.docs.map((d) => ({
      content: d.content,
      source: d.source,
      score: cosineSimilarity(queryEmbedding, d.embedding),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  private async embed(text: string): Promise<number[]> {
    const embeddings = await this.getEmbeddings();
    if (embeddings) {
      return embeddings.embedQuery(text);
    }
    // Mock embedding: cheap bag-of-words hash vector, deterministic,
    // good enough to demonstrate the retrieval pipeline offline.
    return mockEmbed(text);
  }
}

function chunkText(text: string, maxLen: number): string[] {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    if ((current + "\n\n" + p).length > maxLen && current) {
      chunks.push(current);
      current = p;
    } else {
      current = current ? current + "\n\n" + p : p;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

const MOCK_DIM = 128;
function mockEmbed(text: string): number[] {
  const vec = new Array(MOCK_DIM).fill(0);
  const words = text.toLowerCase().match(/[a-z0-9]+/g) || [];
  for (const w of words) {
    let hash = 0;
    for (let i = 0; i < w.length; i++) hash = (hash * 31 + w.charCodeAt(i)) >>> 0;
    vec[hash % MOCK_DIM] += 1;
  }
  return vec;
}
