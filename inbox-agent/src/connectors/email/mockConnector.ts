import { EmailConnector } from "./types.js";
import { InboundMessage } from "../../types.js";
import { SAMPLE_MESSAGES } from "./sampleMessages.js";

export class MockEmailConnector implements EmailConnector {
  async fetchNewMessages(): Promise<InboundMessage[]> {
    // Inlined data (see sampleMessages.ts) rather than read from
    // data/sample-emails/*.json at runtime - the file-based version worked
    // locally but crashed on Vercel, since serverless bundlers don't
    // reliably trace/include files only accessed via fs at runtime.
    return SAMPLE_MESSAGES;
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
