import { InboundMessage } from "../../types.js";

// Inlined rather than read from data/sample-emails/*.json at runtime.
// Serverless platforms (Vercel, etc.) trace actual import/require calls to
// decide what to include in a function's deployment bundle - a dynamic
// fs.readdirSync() on a data folder often isn't traced correctly, causing
// ENOENT crashes in production despite working fine locally. A plain TS
// constant is always bundled correctly since it's a real import.
export const SAMPLE_MESSAGES: InboundMessage[] = [
  {
    id: "msg-001",
    threadId: "thread-001",
    channel: "mock",
    from: "sarah.jones@example.com",
    to: "support@ourcompany.com",
    subject: "Where is my order #48213?",
    body: "Hi, I ordered a set of headphones last week (order #48213) and it still says processing. Can you tell me when it will ship? Thanks, Sarah",
    receivedAt: "2026-08-14T09:15:00Z",
  },
  {
    id: "msg-002",
    threadId: "thread-002",
    channel: "mock",
    from: "mike.t@example.com",
    to: "support@ourcompany.com",
    subject: "TERRIBLE experience - demanding refund",
    body: "This is the third time I'm emailing about order #91002. The product arrived broken and nobody has responded in 5 days. I want a full refund of $650 immediately or I'm disputing the charge with my bank and leaving reviews everywhere.",
    receivedAt: "2026-08-14T10:02:00Z",
  },
  {
    id: "msg-003",
    threadId: "thread-003",
    channel: "mock",
    from: "procurement@bigcorp.com",
    to: "sales@ourcompany.com",
    subject: "Enterprise plan for 500 seats",
    body: "Hello, we're evaluating your product for our 500-person team and would like to discuss Enterprise pricing and a custom contract with SSO requirements. Can someone from sales reach out?",
    receivedAt: "2026-08-14T11:30:00Z",
  },
  {
    id: "msg-004",
    threadId: "thread-004",
    channel: "mock",
    from: "newuser22@example.com",
    to: "support@ourcompany.com",
    subject: "How long is the free trial?",
    body: "Quick question - how many days is the free trial and do I need a credit card to start it?",
    receivedAt: "2026-08-14T12:00:00Z",
  },
];
