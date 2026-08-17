// Inlined rather than read from data/kb/*.md at runtime - see the comment
// in connectors/email/sampleMessages.ts for why. Same fix, same reason.
export const KB_DOCS: { source: string; content: string }[] = [
  {
    source: "pricing-faq.md",
    content: `# Pricing FAQ

We offer three plans: Starter ($29/mo), Pro ($99/mo), and Enterprise (custom pricing, contact sales).

All plans include a 14-day free trial, no credit card required. You can upgrade, downgrade, or cancel at any time from account settings.

Enterprise pricing and custom contract questions should be routed to the sales team rather than answered automatically, since terms vary by deal size.`,
  },
  {
    source: "returns-refunds.md",
    content: `# Returns & Refunds Policy

Items can be returned within 30 days of delivery for a full refund, provided they are unused and in original packaging.

To start a return, the customer needs their order number. Refunds are processed within 5-10 business days after we receive the returned item, back to the original payment method.

Refund requests over $500, or any return involving a damaged/defective claim, should be escalated to a human support agent rather than auto-approved.`,
  },
  {
    source: "shipping-policy.md",
    content: `# Shipping Policy

Standard shipping takes 5-7 business days within the country. Express shipping takes 1-2 business days and costs an additional $15.

Orders are processed within 24 hours on business days. You will receive a tracking number by email once your order ships.

If a package is marked delivered but you have not received it, wait 24 hours (carriers sometimes scan early) and then contact support with your order number for a replacement or refund investigation.`,
  },
];
