import { OpenAIEmbeddings } from "@langchain/openai";
function getEmbeddingsProvider() {
    const p = (process.env.EMBEDDINGS_PROVIDER || "openai").toLowerCase();
    if (p === "huggingface" || p === "huggingface-local")
        return p;
    return "openai";
}
let cached = null;
export async function getEmbeddings() {
    if (cached)
        return cached;
    const provider = getEmbeddingsProvider();
    if (provider === "huggingface-local") {
        const { HuggingFaceTransformersEmbeddings } = await import("@langchain/community/embeddings/huggingface_transformers");
        cached = new HuggingFaceTransformersEmbeddings({
            model: process.env.HF_LOCAL_MODEL || "Xenova/all-MiniLM-L6-v2", // 384-dim, small & fast
        });
        return cached;
    }
    if (provider === "huggingface") {
        if (!process.env.HUGGINGFACEHUB_API_KEY) {
            throw new Error("HUGGINGFACEHUB_API_KEY is required when EMBEDDINGS_PROVIDER=huggingface.");
        }
        const { HuggingFaceInferenceEmbeddings } = await import("@langchain/community/embeddings/hf");
        cached = new HuggingFaceInferenceEmbeddings({
            apiKey: process.env.HUGGINGFACEHUB_API_KEY,
            model: process.env.HF_MODEL || "sentence-transformers/all-MiniLM-L6-v2", // 384-dim
        });
        return cached;
    }
    cached = new OpenAIEmbeddings({ model: "text-embedding-3-small" }); // 1536-dim
    return cached;
}
export function getEmbeddingsProviderName() {
    return getEmbeddingsProvider();
}
