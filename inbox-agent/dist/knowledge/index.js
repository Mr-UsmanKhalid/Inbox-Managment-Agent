import { InMemoryVectorStore } from "./inMemoryStore.js";
// VECTOR_STORE=pinecone (requires PINECONE_API_KEY + PINECONE_INDEX)
// VECTOR_STORE=memory or unset -> in-memory store (default, zero setup)
let sharedStore = null;
export async function getKnowledgeStore() {
    if (sharedStore)
        return sharedStore;
    const backend = (process.env.VECTOR_STORE || "memory").toLowerCase();
    if (backend === "pinecone") {
        // Dynamic import so the @pinecone-database/pinecone package is only
        // required if Pinecone is actually selected.
        const { PineconeKnowledgeStore } = await import("./pineconeStore.js");
        sharedStore = new PineconeKnowledgeStore();
    }
    else {
        sharedStore = new InMemoryVectorStore();
    }
    await sharedStore.ingestDirectory();
    return sharedStore;
}
