/**
 * Real Gmail connector - STUB.
 *
 * To make this functional:
 *   1. npm install googleapis
 *   2. Set up a Google Cloud project, enable the Gmail API, create OAuth
 *      credentials (or a service account with domain-wide delegation for
 *      a Workspace inbox).
 *   3. Store refresh token / credentials in env vars or a secrets manager.
 *   4. Implement each method below using the Gmail API:
 *        - fetchNewMessages -> users.messages.list (q: "is:unread") + .get
 *        - fetchThreadHistory -> users.threads.get
 *        - saveDraft -> users.drafts.create
 *        - sendReply -> users.messages.send
 *        - markEscalated -> users.messages.modify (add a Gmail label, e.g. "Escalated")
 *
 * For push notifications instead of polling, wire up Gmail's watch() API
 * with a Pub/Sub topic, and have n8n's webhook trigger call fetchNewMessages
 * for the specific message id received.
 */
export class GmailConnector {
    credentials;
    constructor(credentials) {
        this.credentials = credentials;
    }
    async fetchNewMessages() {
        throw new Error("GmailConnector.fetchNewMessages not implemented - see class docstring.");
    }
    async fetchThreadHistory(threadId) {
        throw new Error("GmailConnector.fetchThreadHistory not implemented - see class docstring.");
    }
    async saveDraft(threadId, body) {
        throw new Error("GmailConnector.saveDraft not implemented - see class docstring.");
    }
    async sendReply(threadId, to, body) {
        throw new Error("GmailConnector.sendReply not implemented - see class docstring.");
    }
    async markEscalated(threadId, reason) {
        throw new Error("GmailConnector.markEscalated not implemented - see class docstring.");
    }
}
