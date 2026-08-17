import { CrmConnector } from "./types.js";
import { MockCrmConnector } from "./mockCrmConnector.js";

// CRM_PROVIDER=rest (requires CRM_BASE_URL) | mock or unset -> deterministic
// offline mock, same zero-setup default as the vector store and email
// connector.
let shared: CrmConnector | null = null;

export async function getCrmConnector(): Promise<CrmConnector> {
  if (shared) return shared;

  const provider = (process.env.CRM_PROVIDER || "mock").toLowerCase();

  if (provider === "rest") {
    const { RestCrmConnector } = await import("./restCrmConnector.js");
    shared = new RestCrmConnector();
  } else {
    shared = new MockCrmConnector();
  }

  return shared;
}
