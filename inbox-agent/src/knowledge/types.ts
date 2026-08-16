import { RetrievedChunk } from "../types.js";

// Common interface so the retrieve node doesn't care whether it's talking
// to the in-memory dev store or a real Pinecone index.
export interface KnowledgeStore {
  ingestDirectory(dir?: string): Promise<void>;
  search(query: string, topK?: number): Promise<RetrievedChunk[]>;
}
