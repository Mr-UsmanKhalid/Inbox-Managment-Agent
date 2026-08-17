// Every CRM adapter (HubSpot, Salesforce, generic REST, mock) implements
// this interface. This is the seam that lets you swap in a real CRM later
// without touching the graph/node logic - same pattern as EmailConnector.
export interface CrmCustomerRecord {
  customerId: string;
  name?: string;
  email: string;
  tier?: "free" | "standard" | "enterprise";
  lifetimeValue?: number;
  openTickets?: number;
  notes?: string;
}

export interface CrmConnector {
  /** Look up a customer by email address. Returns null if not found. */
  lookupByEmail(email: string): Promise<CrmCustomerRecord | null>;
}
