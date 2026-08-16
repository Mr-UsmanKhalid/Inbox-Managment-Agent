import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EmailConnector } from "./types.js";
import { InboundMessage } from "../../types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_DIR = path.resolve(__dirname, "../../../data/sample-emails");

export class MockEmailConnector implements EmailConnector {
  async fetchNewMessages(): Promise<InboundMessage[]> {
    const files = fs.readdirSync(SAMPLE_DIR).filter((f) => f.endsWith(".json"));
    return files.map((f) => JSON.parse(fs.readFileSync(path.join(SAMPLE_DIR, f), "utf-8")));
  }

  async fetchThreadHistory(_threadId: string): Promise<InboundMessage[]> {
    // No prior history in the mock dataset - every sample email is a fresh thread.
    return [];
  }

  async saveDraft(threadId: string, body: string): Promise<void> {
    console.log(`\n[MOCK] Draft saved for thread ${threadId}:\n${body}\n`);
  }

  async sendReply(threadId: string, to: string, body: string): Promise<void> {
    console.log(`\n[MOCK] Reply sent for thread ${threadId} to ${to}:\n${body}\n`);
  }

  async markEscalated(threadId: string, reason: string): Promise<void> {
    console.log(`\n[MOCK] Thread ${threadId} escalated to human. Reason: ${reason}\n`);
  }
}
