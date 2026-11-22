import { Resource, Incident, HandoverRecord } from '../types';

export interface MatchResult {
  resource: Resource;
  reason: string;
  isAiSuggested: boolean;
}

export interface IncidentSummaryResult {
  reportedAllegations: string[];
  verifiedFacts: string[];
  missingInformation: string[];
  timeline: string[];
  isFallback: boolean;
}

class AIService {
  /**
   * 'Find My Match'
   * Pre-filters active resources in code first, then requests structured JSON recommendations from server proxy.
   * Falls back to keyword matching if the server endpoint is unavailable.
   */
  public async findMyMatch(
    resources: Resource[],
    projectDescription: string,
    budgetMax?: number
  ): Promise<{ results: MatchResult[]; isFallback: boolean }> {
    const eligiblePool = resources.filter((r) => {
      if (r.listingState !== 'active') return false;
      if (budgetMax !== undefined && budgetMax > 0 && r.price > budgetMax) return false;
      return true;
    });

    if (eligiblePool.length === 0) {
      return { results: [], isFallback: false };
    }

    try {
      const candidatePayload = eligiblePool.map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        price: r.price,
        riskLevel: r.riskLevel,
        description: r.description,
        location: r.location,
      }));

      const res = await fetch('/api/ai/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectDescription,
          eligibleResources: candidatePayload,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.results) && json.results.length > 0) {
          const matched: MatchResult[] = [];
          for (const item of json.results) {
            const found = eligiblePool.find((r) => r.id === item.resourceId);
            if (found) {
              matched.push({
                resource: found,
                reason: item.reason || 'Matches the capabilities described for your project.',
                isAiSuggested: true,
              });
            }
          }
          if (matched.length > 0) {
            return { results: matched.slice(0, 3), isFallback: false };
          }
        }
      }
    } catch (err) {
      console.warn('Server AI match unavailable, using keyword fallback:', err);
    }

    const keywords = projectDescription
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    const scored = eligiblePool.map((r) => {
      let score = 0;
      const combined = `${r.title} ${r.category} ${r.description} ${r.location}`.toLowerCase();
      keywords.forEach((k) => {
        if (combined.includes(k)) score += 2;
      });
      return { resource: r, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const topResults = scored.slice(0, 3).map((s) => ({
      resource: s.resource,
      reason: `Matched by keyword overlap with ${s.resource.category} capabilities.`,
      isAiSuggested: false,
    }));

    return { results: topResults, isFallback: true };
  }

  /**
   * 'Summarise This Incident'
   * Neutral summary strictly separating reported allegations from verified facts.
   */
  public async summariseIncident(
    incident: Incident,
    handover?: HandoverRecord | null
  ): Promise<IncidentSummaryResult> {
    const payload = {
      incidentDescription: incident.description,
      namedUserResponse: incident.response || 'No response submitted yet.',
      handoverCheckoutCondition: handover?.beforeCondition || 'No check-out condition record found.',
      handoverReturnCondition: handover?.returnCondition || 'No return inspection logged yet.',
      accessoriesReturned: handover?.accessoriesReturned || [],
      issuesReported: handover?.issuesReported || 'None',
    };

    try {
      const res = await fetch('/api/ai/summarize-incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentPayload: payload }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.summary && json.summary.reportedAllegations && json.summary.verifiedFacts) {
          return {
            reportedAllegations: json.summary.reportedAllegations,
            verifiedFacts: json.summary.verifiedFacts,
            missingInformation: json.summary.missingInformation || [],
            timeline: json.summary.timeline || [],
            isFallback: false,
          };
        }
      }
    } catch (e) {
      console.warn('Server AI summarizer unavailable, using structured fallback:', e);
    }

    return {
      reportedAllegations: [
        incident.description,
        incident.response ? `Named user statement: "${incident.response}"` : 'Awaiting named user response.',
      ],
      verifiedFacts: [
        handover?.beforeCondition
          ? `Check-out condition: ${handover.beforeCondition}`
          : 'No check-out condition record available.',
        handover?.returnCondition
          ? `Return condition: ${handover.returnCondition}`
          : 'No return condition record available.',
      ],
      missingInformation: [
        'Additional session context or operator observations needed during review.',
      ],
      timeline: [
        `Report opened on ${new Date(incident.createdAt).toLocaleDateString()}`,
        incident.respondedAt
          ? `Response submitted on ${new Date(incident.respondedAt).toLocaleDateString()}`
          : 'Awaiting response from named user',
      ],
      isFallback: true,
    };
  }
}

export const aiService = new AIService();
