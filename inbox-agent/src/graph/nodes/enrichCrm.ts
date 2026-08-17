import { AgentState } from "../../types.js";
import { getCrmConnector } from "../../connectors/crm/index.js";
import { isMockMode } from "../../llm.js";

/**
 * Looks up the sender in the CRM and folds what we find into
 * entities.otherEntities, so the draft node's prompt (and the dashboard)
 * can see account tier / lifetime value / open tickets without every
 * downstream node needing to know about the CRM connector directly.
 *
 * Runs after extract (we need the email address, which we already have
 * from the inbound message) and before draft/escalate, since account tier
 * and ticket history are exactly the kind of thing that should push a
 * reply toward "escalate to a human" - e.g. an enterprise account or
 * someone with repeat open tickets.
 */
export async function enrichCrmNode(state: AgentState): Promise<Partial<AgentState>> {
  const { message, entities } = state;

  const crm = await getCrmConnector();
  const record = await crm.lookupByEmail(message.from);

  if (!record) {
    return {
      auditTrail: [
        {
          timestamp: new Date().toISOString(),
          threadId: message.threadId,
          messageId: message.id,
          step: "enrichCrm",
          data: { found: false },
        },
      ],
    };
  }

  const enrichedEntities = {
    ...entities,
    customerName: entities?.customerName ?? record.name,
    otherEntities: {
      ...(entities?.otherEntities ?? {}),
      crmCustomerId: record.customerId,
      crmTier: record.tier ?? "unknown",
      crmLifetimeValue: record.lifetimeValue != null ? String(record.lifetimeValue) : "unknown",
      crmOpenTickets: record.openTickets != null ? String(record.openTickets) : "unknown",
      ...(record.notes ? { crmNotes: record.notes } : {}),
    },
  };

  return {
    entities: enrichedEntities,
    auditTrail: [
      {
        timestamp: new Date().toISOString(),
        threadId: message.threadId,
        messageId: message.id,
        step: "enrichCrm",
        data: { found: true, tier: record.tier, mock: isMockMode() },
      },
    ],
  };
}
