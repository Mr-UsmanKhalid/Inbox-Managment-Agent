import { google, gmail_v1 } from "googleapis";
import { EmailConnector } from "./types.js";
import { InboundMessage } from "../../types.js";

/**
 * Real Gmail connector, using the Gmail API via googleapis.
 *
 * Setup:
 *   1. npm install googleapis (already in package.json dependencies)
 *   2. Create a Google Cloud project, enable the Gmail API.
 *   3. Create OAuth 2.0 credentials and run through the consent flow once
 *      to get a refresh token - e.g. via Google's OAuth 2.0 Playground
 *      (https://developers.google.com/oauthplayground) against the
 *      https://www.googleapis.com/auth/gmail.modify scope.
 *   4. Set GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN in
 *      .env, and EMAIL_CONNECTOR=gmail.
 *
 * The "Escalated" label is created automatically on first use if it
 * doesn't already exist in the mailbox.
 */
export class GmailConnector implements EmailConnector {
  private gmail: gmail_v1.Gmail;
  private escalatedLabelId: string | null = null;

  constructor(credentials?: { clientId: string; clientSecret: string; refreshToken: string }) {
    const clientId = credentials?.clientId ?? requireEnv("GMAIL_CLIENT_ID");
    const clientSecret = credentials?.clientSecret ?? requireEnv("GMAIL_CLIENT_SECRET");
    const refreshToken = credentials?.refreshToken ?? requireEnv("GMAIL_REFRESH_TOKEN");

    const auth = new google.auth.OAuth2(clientId, clientSecret);
    auth.setCredentials({ refresh_token: refreshToken });

    this.gmail = google.gmail({ version: "v1", auth });
  }

  async fetchNewMessages(): Promise<InboundMessage[]> {
    const list = await this.gmail.users.messages.list({
      userId: "me",
      q: "is:unread in:inbox",
      maxResults: 25,
    });

    const ids = list.data.messages ?? [];
    const messages: InboundMessage[] = [];
    for (const { id } of ids) {
      if (!id) continue;
      const full = await this.gmail.users.messages.get({ userId: "me", id, format: "full" });
      messages.push(this.toInboundMessage(full.data));
    }
    return messages;
  }

  async fetchThreadHistory(threadId: string): Promise<InboundMessage[]> {
    const thread = await this.gmail.users.threads.get({ userId: "me", id: threadId, format: "full" });
    return (thread.data.messages ?? []).map((m) => this.toInboundMessage(m));
  }

  async saveDraft(threadId: string, body: string): Promise<void> {
    const { to, subject } = await this.getReplyContext(threadId);
    const raw = buildRawMessage({ to, subject: `Re: ${subject}`, body });
    await this.gmail.users.drafts.create({
      userId: "me",
      requestBody: { message: { raw, threadId } },
    });
  }

  async sendReply(threadId: string, to: string, body: string): Promise<void> {
    const { subject } = await this.getReplyContext(threadId);
    const raw = buildRawMessage({ to, subject: `Re: ${subject}`, body });
    await this.gmail.users.messages.send({
      userId: "me",
      requestBody: { raw, threadId },
    });
  }

  async markEscalated(threadId: string, reason: string): Promise<void> {
    const labelId = await this.getOrCreateEscalatedLabel();
    await this.gmail.users.threads.modify({
      userId: "me",
      id: threadId,
      requestBody: { addLabelIds: [labelId] },
    });
    // Gmail has no native "reason" field - log it; swap for a CRM/ticket
    // note if you have somewhere better to put it.
    console.log(`[Gmail] Escalated thread ${threadId}: ${reason}`);
  }

  private async getReplyContext(threadId: string): Promise<{ to: string; subject: string }> {
    const thread = await this.gmail.users.threads.get({ userId: "me", id: threadId, format: "metadata" });
    const first = thread.data.messages?.[0];
    const headers = first?.payload?.headers ?? [];
    const to = headers.find((h) => h.name === "From")?.value ?? "";
    const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
    return { to, subject };
  }

  private async getOrCreateEscalatedLabel(): Promise<string> {
    if (this.escalatedLabelId) return this.escalatedLabelId;

    const { data } = await this.gmail.users.labels.list({ userId: "me" });
    const existing = data.labels?.find((l) => l.name === "Escalated");
    if (existing?.id) {
      this.escalatedLabelId = existing.id;
      return existing.id;
    }

    const created = await this.gmail.users.labels.create({
      userId: "me",
      requestBody: { name: "Escalated", labelListVisibility: "labelShow", messageListVisibility: "show" },
    });
    this.escalatedLabelId = created.data.id!;
    return this.escalatedLabelId;
  }

  private toInboundMessage(m: gmail_v1.Schema$Message): InboundMessage {
    const headers = m.payload?.headers ?? [];
    const header = (name: string) => headers.find((h) => h.name === name)?.value ?? "";

    return {
      id: m.id ?? "",
      threadId: m.threadId ?? "",
      channel: "gmail",
      from: header("From"),
      to: header("To"),
      subject: header("Subject"),
      body: extractBody(m.payload),
      receivedAt: m.internalDate ? new Date(Number(m.internalDate)).toISOString() : new Date().toISOString(),
    };
  }
}

function extractBody(payload?: gmail_v1.Schema$MessagePart): string {
  if (!payload) return "";
  if (payload.body?.data) return decodeBase64Url(payload.body.data);

  const plainPart = payload.parts?.find((p) => p.mimeType === "text/plain");
  if (plainPart?.body?.data) return decodeBase64Url(plainPart.body.data);

  const htmlPart = payload.parts?.find((p) => p.mimeType === "text/html");
  if (htmlPart?.body?.data) return decodeBase64Url(htmlPart.body.data).replace(/<[^>]+>/g, " ");

  // Nested multipart (e.g. multipart/mixed containing multipart/alternative)
  for (const part of payload.parts ?? []) {
    const nested = extractBody(part);
    if (nested) return nested;
  }
  return "";
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf-8");
}

function buildRawMessage(opts: { to: string; subject: string; body: string }): string {
  const lines = [`To: ${opts.to}`, `Subject: ${opts.subject}`, "Content-Type: text/plain; charset=utf-8", "", opts.body];
  return Buffer.from(lines.join("\r\n")).toString("base64url");
}

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`${name} is required to use GmailConnector.`);
  return val;
}
