import { InboundMessage } from "../../types.js";

// Every connector (Gmail, Outlook, mock) implements this interface.
// This is the seam that lets you swap the real Gmail API in later
// without touching any of the agent/graph logic.
export interface EmailConnector {
  /** Pull new/unread messages since last check. */
  fetchNewMessages(): Promise<InboundMessage[]>;

  /** Fetch prior messages in a thread, for conversation context. */
  fetchThreadHistory(threadId: string): Promise<InboundMessage[]>;

  /** Save a reply as a draft (human reviews before sending). */
  saveDraft(threadId: string, body: string): Promise<void>;

  /** Send a reply directly. */
  sendReply(threadId: string, to: string, body: string): Promise<void>;

  /** Flag/label a thread for human attention (e.g. add "Escalated" label). */
  markEscalated(threadId: string, reason: string): Promise<void>;
}
