import { EmailConnector } from "./types.js";
import { MockEmailConnector } from "./mockConnector.js";

// EMAIL_CONNECTOR=gmail | outlook | mock (default, zero setup)
let shared: EmailConnector | null = null;

export async function getEmailConnector(): Promise<EmailConnector> {
  if (shared) return shared;

  const provider = (process.env.EMAIL_CONNECTOR || "mock").toLowerCase();

  if (provider === "gmail") {
    const { GmailConnector } = await import("./gmailConnector.js");
    shared = new GmailConnector();
  } else if (provider === "outlook") {
    const { OutlookConnector } = await import("./outlookConnector.js");
    shared = new OutlookConnector();
  } else {
    shared = new MockEmailConnector();
  }

  return shared;
}

export * from "./types.js";
