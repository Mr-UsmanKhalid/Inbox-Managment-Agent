import { CrmConnector, CrmCustomerRecord } from "./types.js";

/**
 * Generic REST CRM connector - talks to ANY internal REST API or CRM that
 * exposes a "look up customer by email" endpoint, e.g.:
 *   - An internal REST API (your own customer service)
 *   - HubSpot's CRM API (https://api.hubapi.com/crm/v3/objects/contacts/search)
 *   - Salesforce REST API (via a lookup/SOQL query wrapped in your own proxy)
 *
 * Configure via env vars - no code changes needed for a different backend
 * as long as it returns JSON shaped like { field: value }:
 *   CRM_BASE_URL       e.g. https://api.yourcompany.com or https://api.hubapi.com
 *   CRM_LOOKUP_PATH    path template, {email} gets URL-encoded and substituted,
 *                      e.g. /v1/customers?email={email}
 *   CRM_API_KEY        sent as `Authorization: Bearer <key>` if set
 *
 * If your CRM's response shape differs from CrmCustomerRecord, adjust
 * `mapResponse()` below - that's the one seam you're likely to need to
 * touch per-CRM.
 */
export class RestCrmConnector implements CrmConnector {
  private baseUrl: string;
  private lookupPath: string;
  private apiKey?: string;

  constructor(config?: { baseUrl?: string; lookupPath?: string; apiKey?: string }) {
    this.baseUrl = config?.baseUrl ?? requireEnv("CRM_BASE_URL");
    this.lookupPath = config?.lookupPath ?? process.env.CRM_LOOKUP_PATH ?? "/customers?email={email}";
    this.apiKey = config?.apiKey ?? process.env.CRM_API_KEY;
  }

  async lookupByEmail(email: string): Promise<CrmCustomerRecord | null> {
    const path = this.lookupPath.replace("{email}", encodeURIComponent(email));
    const url = `${this.baseUrl.replace(/\/$/, "")}${path}`;

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
    });

    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`CRM lookup failed: ${res.status} ${res.statusText} for ${url}`);
    }

    const data = await res.json();
    return this.mapResponse(data, email);
  }

  /** Adjust this to match your CRM's actual response shape. */
  private mapResponse(data: unknown, email: string): CrmCustomerRecord | null {
    if (!data) return null;
    // Handles both a bare object and a `{ results: [...] }` / `{ data: [...] }`
    // wrapper, which covers most REST CRM list-style responses.
    const record = Array.isArray((data as { results?: unknown[] }).results)
      ? (data as { results: Record<string, unknown>[] }).results[0]
      : Array.isArray((data as { data?: unknown[] }).data)
      ? (data as { data: Record<string, unknown>[] }).data[0]
      : (data as Record<string, unknown>);

    if (!record) return null;

    return {
      customerId: String(record.id ?? record.customerId ?? email),
      name: (record.name as string) ?? (record.fullName as string),
      email,
      tier: (record.tier as CrmCustomerRecord["tier"]) ?? undefined,
      lifetimeValue: typeof record.lifetimeValue === "number" ? record.lifetimeValue : undefined,
      openTickets: typeof record.openTickets === "number" ? record.openTickets : undefined,
      notes: (record.notes as string) ?? undefined,
    };
  }
}

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`${name} is required to use the REST CRM connector.`);
  return val;
}
