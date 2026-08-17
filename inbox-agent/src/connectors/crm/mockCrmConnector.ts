import { CrmConnector, CrmCustomerRecord } from "./types.js";

// Deterministic mock so the pipeline is fully testable offline, same
// pattern as MockEmailConnector. Keyed by email so the demo data lines up
// with data/sample-emails/*.json.
const MOCK_RECORDS: Record<string, CrmCustomerRecord> = {
  "sarah.jones@example.com": {
    customerId: "cus_1001",
    name: "Sarah Jones",
    email: "sarah.jones@example.com",
    tier: "standard",
    lifetimeValue: 240,
    openTickets: 0,
  },
  "mike.t@example.com": {
    customerId: "cus_1002",
    name: "Mike T.",
    email: "mike.t@example.com",
    tier: "standard",
    lifetimeValue: 1100,
    openTickets: 2,
    notes: "Previous complaint about shipping delay, resolved with a discount code.",
  },
  "procurement@bigcorp.com": {
    customerId: "cus_2001",
    name: "BigCorp Procurement",
    email: "procurement@bigcorp.com",
    tier: "enterprise",
    lifetimeValue: 0,
    openTickets: 0,
    notes: "Not yet a customer - inbound sales lead.",
  },
};

export class MockCrmConnector implements CrmConnector {
  async lookupByEmail(email: string): Promise<CrmCustomerRecord | null> {
    return MOCK_RECORDS[email.toLowerCase()] ?? null;
  }
}
