import { Thread } from "./types";

// Seed data mirrors the sample scenarios from the backend agent
// (data/sample-emails + data/kb in the inbox-agent repo). No longer used by
// the API routes (app/api/threads/*), which now proxy to the real
// inbox-agent backend server - see AGENT_API_URL in .env.example. Kept
// around in case you want a no-backend demo mode again later.
export function getSeedThreads(): Thread[] {
  return [
    {
      id: "thread-002",
      from: "mike.t@example.com",
      subject: "TERRIBLE experience - demanding refund",
      body: "This is the third time I'm emailing about order #91002. The product arrived broken and nobody has responded in 5 days. I want a full refund of $650 immediately or I'm disputing the charge with my bank and leaving reviews everywhere.",
      receivedAt: "2026-08-14T10:02:00Z",
      classification: { category: "complaint", urgency: 92, sentiment: "angry" },
      entities: { customerName: "Mike T.", orderNumber: "91002", requirements: ["wants a refund of $650", "threatening chargeback"] },
      retrieved: [
        {
          content: "Refund requests over $500, or any return involving a damaged/defective claim, should be escalated to a human support agent rather than auto-approved.",
          source: "returns-refunds.md",
        },
      ],
      draftBody:
        "Hi Mike,\n\nI'm really sorry about the broken item and the delay in getting back to you — that's not the experience we want anyone to have. I'm flagging this for a member of our team to review right away, since refunds over $500 need a quick manual check before we process them.\n\nSomeone will follow up with you shortly.",
      draftConfidence: 0.31,
      escalation: {
        escalate: true,
        reason: 'sentiment=angry; category=complaint; high_dollar_amount ($650); keyword:"dispute the charge"',
        triggeredRules: ["sentiment=angry", "category=complaint", "high_dollar_amount", 'keyword:"dispute the charge"'],
      },
      status: "escalated",
      history: [
        { timestamp: "2026-08-14T10:02:14Z", actor: "agent", action: "Classified", detail: "complaint · urgency 92 · angry" },
        { timestamp: "2026-08-14T10:02:16Z", actor: "agent", action: "Escalated to human", detail: "4 rules triggered" },
      ],
    },
    {
      id: "thread-001",
      from: "sarah.jones@example.com",
      subject: "Where is my order #48213?",
      body: "Hi, I ordered a set of headphones last week (order #48213) and it still says processing. Can you tell me when it will ship? Thanks, Sarah",
      receivedAt: "2026-08-14T09:15:00Z",
      classification: { category: "order_status", urgency: 45, sentiment: "neutral" },
      entities: { customerName: "Sarah Jones", orderNumber: "48213", requirements: [] },
      retrieved: [
        {
          content: "Orders are processed within 24 hours on business days. You will receive a tracking number by email once your order ships.",
          source: "shipping-policy.md",
        },
      ],
      draftBody:
        "Hi Sarah,\n\nThanks for reaching out! Orders are typically processed within 24 hours on business days, and you'll get a tracking number by email as soon as it ships. If it's been longer than that, I'd recommend checking your spam folder for the tracking email — but let me know if you still don't see any movement and I'll dig into your specific order.\n\nBest,\nSupport Team",
      draftConfidence: 0.81,
      escalation: { escalate: false, reason: "No escalation rules triggered.", triggeredRules: [] },
      status: "pending_review",
      history: [
        { timestamp: "2026-08-14T09:15:09Z", actor: "agent", action: "Classified", detail: "order_status · urgency 45 · neutral" },
        { timestamp: "2026-08-14T09:15:12Z", actor: "agent", action: "Draft prepared", detail: "confidence 0.81" },
      ],
    },
    {
      id: "thread-003",
      from: "procurement@bigcorp.com",
      subject: "Enterprise plan for 500 seats",
      body: "Hello, we're evaluating your product for our 500-person team and would like to discuss Enterprise pricing and a custom contract with SSO requirements. Can someone from sales reach out?",
      receivedAt: "2026-08-14T11:30:00Z",
      classification: { category: "sales_inquiry", urgency: 55, sentiment: "positive" },
      entities: { customerName: "BigCorp Procurement", requirements: ["500 seats", "needs SSO", "custom contract"] },
      retrieved: [
        {
          content: "Enterprise pricing and custom contract questions should be routed to the sales team rather than answered automatically, since terms vary by deal size.",
          source: "pricing-faq.md",
        },
      ],
      draftBody:
        "Hi there,\n\nThanks for your interest in Enterprise! Custom contracts and SSO setups for teams this size need a conversation with our sales team rather than an automated quote, so I've flagged this for them to reach out directly.\n\nSomeone will be in touch shortly.",
      draftConfidence: 0.44,
      escalation: {
        escalate: true,
        reason: "Enterprise/custom-contract inquiry routed to sales per knowledge base policy.",
        triggeredRules: ["category=sales_inquiry+enterprise", "low_draft_confidence (0.44)"],
      },
      status: "escalated",
      history: [
        { timestamp: "2026-08-14T11:30:08Z", actor: "agent", action: "Classified", detail: "sales_inquiry · urgency 55 · positive" },
        { timestamp: "2026-08-14T11:30:11Z", actor: "agent", action: "Escalated to human", detail: "routed to sales" },
      ],
    },
    {
      id: "thread-004",
      from: "newuser22@example.com",
      subject: "How long is the free trial?",
      body: "Quick question - how many days is the free trial and do I need a credit card to start it?",
      receivedAt: "2026-08-14T12:00:00Z",
      classification: { category: "sales_inquiry", urgency: 15, sentiment: "positive" },
      entities: { customerName: "New User", requirements: ["asking about free trial terms"] },
      retrieved: [
        {
          content: "All plans include a 14-day free trial, no credit card required. You can upgrade, downgrade, or cancel at any time from account settings.",
          source: "pricing-faq.md",
        },
      ],
      draftBody:
        "Hi,\n\nGreat question! The free trial is 14 days, and no credit card is required to start — you can upgrade, downgrade, or cancel any time from account settings.\n\nLet me know if you have any other questions!\n\nBest,\nSupport Team",
      draftConfidence: 0.93,
      escalation: { escalate: false, reason: "No escalation rules triggered.", triggeredRules: [] },
      status: "sent",
      history: [
        { timestamp: "2026-08-14T12:00:06Z", actor: "agent", action: "Classified", detail: "sales_inquiry · urgency 15 · positive" },
        { timestamp: "2026-08-14T12:00:09Z", actor: "agent", action: "Draft prepared", detail: "confidence 0.93" },
        { timestamp: "2026-08-14T12:04:31Z", actor: "human", action: "Approved & sent" },
      ],
    },
  ];
}
