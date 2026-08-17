import { EmailConnector } from "./types.js";
import { InboundMessage } from "../../types.js";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

/**
 * Real Outlook / Microsoft 365 connector, using Microsoft Graph's REST API
 * directly (no SDK dependency - just fetch, since Graph is plain REST/JSON
 * and the SDK adds a lot of weight for five endpoints).
 *
 * Setup:
 *   1. Register an app in Azure AD (Entra ID) - App registrations ->
 *      New registration.
 *   2. Grant delegated or application permissions: Mail.Read, Mail.Send,
 *      Mail.ReadWrite (for drafts/labels).
 *   3. For a daemon/service scenario (no signed-in user), use the client
 *      credentials flow with an application permission + admin consent;
 *      for a single mailbox, delegated + refresh token works too.
 *   4. Set OUTLOOK_TENANT_ID / OUTLOOK_CLIENT_ID / OUTLOOK_CLIENT_SECRET in
 *      .env, and EMAIL_CONNECTOR=outlook. This connector uses the client
 *      credentials flow against OUTLOOK_MAILBOX_USER_ID (the mailbox to
 *      act on, e.g. support@yourcompany.com).
 *
 * "Escalated" is modeled as a category applied to the message (Outlook's
 * closest equivalent to a Gmail label), created if it doesn't exist.
 */
export class OutlookConnector implements EmailConnector {
  private tenantId: string;
  private clientId: string;
  private clientSecret: string;
  private mailboxUserId: string;
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(config?: { tenantId?: string; clientId?: string; clientSecret?: string; mailboxUserId?: string }) {
    this.tenantId = config?.tenantId ?? requireEnv("OUTLOOK_TENANT_ID");
    this.clientId = config?.clientId ?? requireEnv("OUTLOOK_CLIENT_ID");
    this.clientSecret = config?.clientSecret ?? requireEnv("OUTLOOK_CLIENT_SECRET");
    this.mailboxUserId = config?.mailboxUserId ?? requireEnv("OUTLOOK_MAILBOX_USER_ID");
  }

  async fetchNewMessages(): Promise<InboundMessage[]> {
    const data = await this.graphFetch(
      `/users/${this.mailboxUserId}/mailFolders/inbox/messages?$filter=isRead eq false&$top=25`
    );
    return (data.value ?? []).map((m: GraphMessage) => this.toInboundMessage(m));
  }

  async fetchThreadHistory(threadId: string): Promise<InboundMessage[]> {
    // Graph groups messages by conversationId, which is what we use as our
    // threadId for this connector.
    const data = await this.graphFetch(
      `/users/${this.mailboxUserId}/messages?$filter=conversationId eq '${threadId}'&$orderby=receivedDateTime asc`
    );
    return (data.value ?? []).map((m: GraphMessage) => this.toInboundMessage(m));
  }

  async saveDraft(threadId: string, body: string): Promise<void> {
    const { to, subject } = await this.getReplyContext(threadId);
    await this.graphFetch(`/users/${this.mailboxUserId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        subject: `Re: ${subject}`,
        body: { contentType: "Text", content: body },
        toRecipients: [{ emailAddress: { address: to } }],
        isDraft: true,
      }),
    });
  }

  async sendReply(threadId: string, to: string, body: string): Promise<void> {
    const { messageId } = await this.getReplyContext(threadId);
    await this.graphFetch(`/users/${this.mailboxUserId}/messages/${messageId}/reply`, {
      method: "POST",
      body: JSON.stringify({ comment: body }),
    });
  }

  async markEscalated(threadId: string, reason: string): Promise<void> {
    const { messageId } = await this.getReplyContext(threadId);
    await this.graphFetch(`/users/${this.mailboxUserId}/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({ categories: ["Escalated"] }),
    });
    console.log(`[Outlook] Escalated thread ${threadId}: ${reason}`);
  }

  private async getReplyContext(threadId: string): Promise<{ to: string; subject: string; messageId: string }> {
    const data = await this.graphFetch(
      `/users/${this.mailboxUserId}/messages?$filter=conversationId eq '${threadId}'&$orderby=receivedDateTime desc&$top=1`
    );
    const latest: GraphMessage | undefined = data.value?.[0];
    return {
      to: latest?.from?.emailAddress?.address ?? "",
      subject: latest?.subject ?? "",
      messageId: latest?.id ?? "",
    };
  }

  private toInboundMessage(m: GraphMessage): InboundMessage {
    return {
      id: m.id,
      threadId: m.conversationId,
      channel: "outlook",
      from: m.from?.emailAddress?.address ?? "",
      to: m.toRecipients?.[0]?.emailAddress?.address ?? "",
      subject: m.subject ?? "",
      body: m.body?.contentType === "html" ? (m.body.content ?? "").replace(/<[^>]+>/g, " ") : m.body?.content ?? "",
      receivedAt: m.receivedDateTime ?? new Date().toISOString(),
    };
  }

  private async getAccessToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 30_000) {
      return this.tokenCache.token;
    }

    const res = await fetch(`https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to get Microsoft Graph access token: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    this.tokenCache = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
    return this.tokenCache.token;
  }

  private async graphFetch(path: string, init?: RequestInit): Promise<any> {
    const token = await this.getAccessToken();
    const res = await fetch(`${GRAPH_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      throw new Error(`Microsoft Graph request failed: ${res.status} ${await res.text()} (${path})`);
    }
    if (res.status === 204) return {};
    return res.json();
  }
}

interface GraphMessage {
  id: string;
  conversationId: string;
  subject?: string;
  from?: { emailAddress?: { address?: string } };
  toRecipients?: { emailAddress?: { address?: string } }[];
  body?: { contentType?: string; content?: string };
  receivedDateTime?: string;
}

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`${name} is required to use OutlookConnector.`);
  return val;
}
