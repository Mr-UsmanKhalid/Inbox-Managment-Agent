function statusFromFinalAction(finalAction) {
    switch (finalAction) {
        case "escalate":
            return "escalated";
        case "send":
            return "sent";
        case "save_draft":
        default:
            // Agent produced a draft but auto-send is off - a human still needs
            // to review it, so this lands in the review queue rather than
            // "draft_saved" (which is reserved for a human explicitly saving one
            // for later via the dashboard).
            return "pending_review";
    }
}
export function threadFromAgentState(message, result) {
    const history = [];
    if (result.classification) {
        history.push({
            timestamp: new Date().toISOString(),
            actor: "agent",
            action: "Classified",
            detail: `${result.classification.category} · urgency ${result.classification.urgency} · ${result.classification.sentiment}`,
        });
    }
    if (result.escalation?.escalate) {
        history.push({
            timestamp: new Date().toISOString(),
            actor: "agent",
            action: "Escalated to human",
            detail: `${result.escalation.triggeredRules.length} rule(s) triggered`,
        });
    }
    else if (result.draft) {
        history.push({
            timestamp: new Date().toISOString(),
            actor: "agent",
            action: "Draft prepared",
            detail: `confidence ${result.draft.confidence}`,
        });
    }
    return {
        id: message.threadId,
        from: message.from,
        subject: message.subject,
        body: message.body,
        receivedAt: message.receivedAt,
        classification: {
            category: result.classification?.category ?? "general",
            urgency: result.classification?.urgency ?? 0,
            sentiment: result.classification?.sentiment ?? "neutral",
        },
        entities: {
            customerName: result.entities?.customerName,
            orderNumber: result.entities?.orderNumber,
            requirements: result.entities?.requirements ?? [],
        },
        retrieved: (result.retrieved ?? []).map((r) => ({ content: r.content, source: r.source })),
        draftBody: result.draft?.body ?? "",
        draftConfidence: result.draft?.confidence ?? 0,
        escalation: result.escalation ?? { escalate: false, reason: "No escalation rules triggered.", triggeredRules: [] },
        status: statusFromFinalAction(result.finalAction),
        history,
    };
}
