import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Sparkles,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import { Incident, HandoverRecord, User } from '../types';
import { api } from '../services/api';
import { aiService, IncidentSummaryResult } from '../services/ai';

interface IncidentViewProps {
  incidentId: string;
  currentUser: User | null;
  onBack: () => void;
}

export const IncidentView: React.FC<IncidentViewProps> = ({
  incidentId,
  currentUser,
  onBack,
}) => {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [handover, setHandover] = useState<HandoverRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const [responseText, setResponseText] = useState('');
  const [aiSummary, setAiSummary] = useState<IncidentSummaryResult | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [decisionText, setDecisionText] = useState('');
  const [decisionRationale, setDecisionRationale] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadIncident = async () => {
    setLoading(true);
    try {
      const res = await api.getIncidentById(incidentId);
      setIncident(res.incident);
      setHandover(res.handover);
      if (res.incident?.aiSummary) {
        setAiSummary({
          reportedAllegations: res.incident.aiSummary.reportedAllegations,
          verifiedFacts: res.incident.aiSummary.verifiedFacts,
          missingInformation: res.incident.aiSummary.missingInformation,
          timeline: res.incident.aiSummary.timeline,
          isFallback: false,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncident();
  }, [incidentId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="h-64 rounded-2xl bg-[#17171B] border border-[#2C2A2F] animate-pulse" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-2">
        <h3 className="text-lg font-bold text-[#F5F1F2]">Incident record not found</h3>
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-[#F4A6C0] hover:underline cursor-pointer"
        >
          Go back
        </button>
      </div>
    );
  }

  const isNamedUser = currentUser?.id === incident.reportedAgainstUserId;
  const isAuthorizedReviewer =
    currentUser &&
    (currentUser.id === incident.ownerId ||
      currentUser.role === 'supervisor' ||
      currentUser.role === 'admin');

  const handleRunAISummary = async () => {
    setIsGeneratingAI(true);
    try {
      const summary = await aiService.summariseIncident(incident, handover);
      setAiSummary(summary);
      if (isAuthorizedReviewer && !summary.isFallback) {
        await api.saveIncidentAISummary(incident.id, {
          reportedAllegations: summary.reportedAllegations,
          verifiedFacts: summary.verifiedFacts,
          missingInformation: summary.missingInformation,
          timeline: summary.timeline,
          generatedAt: new Date().toISOString(),
          isAI: true,
        });
      }
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !responseText.trim()) return;
    const res = await api.respondToIncident(currentUser, incident.id, responseText);
    if (res.success) {
      setFeedback('Response recorded.');
      await loadIncident();
    } else {
      setFeedback(res.error || 'Failed to submit response.');
    }
  };

  const handleResolve = async () => {
    if (!currentUser || !decisionText.trim()) {
      setFeedback('Please enter a decision outcome.');
      return;
    }
    setIsResolving(true);
    try {
      const res = await api.resolveIncident(
        currentUser,
        incident,
        decisionText.trim(),
        decisionRationale.trim() || 'Reviewed by authorized staff.'
      );
      if (res.success) {
        setFeedback('Incident resolved and recorded.');
        await loadIncident();
      } else {
        setFeedback(res.error || 'Failed to resolve incident.');
      }
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-left space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-mono-code text-[#B8AEB2] hover:text-[#F5F1F2] cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 text-[#F4A6C0]" />
        <span>Return</span>
      </button>

      <div className="p-4 rounded-2xl bg-[#17171B] border border-[#E0A33A]/60 text-[#E0A33A] flex items-start gap-3">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide">
            Unreviewed Report — Pending Human Review
          </h2>
          <p className="text-xs text-[#B8AEB2] leading-relaxed mt-0.5">
            Reported allegations are separated from verified handover records until finalized by an authorized human reviewer.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-[#17171B] border border-[#F4A6C0]/50 text-xs text-[#F5F1F2]">
          {feedback}
        </div>
      )}

      <div className="p-6 rounded-2xl bg-[#17171B] border border-[#2C2A2F] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#2C2A2F]">
          <div>
            <span className="text-xs font-mono-code text-[#F4A6C0] uppercase">
              Case #{incident.id}
            </span>
            <h1 className="text-xl font-bold text-[#F5F1F2] font-title mt-0.5">
              {incident.title}
            </h1>
          </div>
          <span className="px-3 py-1 rounded-md bg-[#0D0D0F] border border-[#2C2A2F] text-xs font-mono-code text-[#F5F1F2] uppercase">
            {incident.status}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F]">
            <span className="text-[11px] text-[#B8AEB2] uppercase font-mono-code block">Resource</span>
            <span className="font-semibold text-[#F5F1F2]">{incident.resourceTitle}</span>
          </div>
          <div className="p-3 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F]">
            <span className="text-[11px] text-[#B8AEB2] uppercase font-mono-code block">Reported By</span>
            <span className="font-semibold text-[#F5F1F2]">{incident.reportedByDisplayName}</span>
          </div>
          <div className="p-3 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F]">
            <span className="text-[11px] text-[#B8AEB2] uppercase font-mono-code block">Named Party</span>
            <span className="font-semibold text-[#F5F1F2]">{incident.reportedAgainstDisplayName}</span>
          </div>
        </div>

        <div>
          <span className="text-xs font-semibold text-[#F5F1F2] block mb-1">Report Details</span>
          <p className="text-xs text-[#B8AEB2] leading-relaxed p-3.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F]">
            {incident.description}
          </p>
        </div>
      </div>

      {/* Response Section */}
      <div className="p-6 rounded-2xl bg-[#17171B] border border-[#2C2A2F] space-y-3">
        <h3 className="text-xs font-bold font-mono-code uppercase tracking-wider text-[#F4A6C0]">
          Party Response
        </h3>
        {incident.response ? (
          <div className="p-4 rounded-xl bg-[#0D0D0F] border border-[#3FA776]/50 text-xs text-[#F5F1F2]">
            {incident.response}
          </div>
        ) : isNamedUser ? (
          <form onSubmit={handleSendResponse} className="space-y-3">
            <textarea
              rows={3}
              required
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Provide your statement regarding this session..."
              className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-xs text-[#F5F1F2] outline-none focus:border-[#F4A6C0]"
            />
            <button
              type="submit"
              className="py-2 px-5 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-xs font-semibold cursor-pointer"
            >
              Submit Response
            </button>
          </form>
        ) : (
          <p className="text-xs text-[#B8AEB2]">Awaiting response from {incident.reportedAgainstDisplayName}.</p>
        )}
      </div>

      {/* AI Neutral Summary */}
      <div className="p-6 rounded-2xl bg-[#17171B] border border-[#2C2A2F] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#F4A6C0]" />
            <div>
              <h3 className="text-sm font-bold text-[#F5F1F2] font-title">
                Neutral Case Summary
              </h3>
              <p className="text-xs text-[#B8AEB2]">
                Separates reported allegations from logged handover facts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono-code px-2.5 py-1 rounded-md bg-[#0D0D0F] text-[#F4A6C0] border border-[#2C2A2F]">
              AI-generated, advisory only
            </span>
            <button
              type="button"
              onClick={handleRunAISummary}
              disabled={isGeneratingAI}
              className="py-1.5 px-3.5 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-xs font-semibold text-[#F5F1F2] cursor-pointer"
            >
              {isGeneratingAI ? 'Generating...' : aiSummary ? 'Refresh Summary' : 'Generate Summary'}
            </button>
          </div>
        </div>

        {aiSummary && (
          <div className="space-y-4 pt-3 border-t border-[#2C2A2F] text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F]">
                <span className="font-bold text-[#E0555F] block mb-1.5 uppercase font-mono-code text-[11px]">
                  Reported Allegations
                </span>
                <ul className="space-y-1 text-[#B8AEB2]">
                  {aiSummary.reportedAllegations.map((a, i) => (
                    <li key={i}>• {a}</li>
                  ))}
                </ul>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F]">
                <span className="font-bold text-[#3FA776] block mb-1.5 uppercase font-mono-code text-[11px]">
                  Logged Handover Facts
                </span>
                <ul className="space-y-1 text-[#B8AEB2]">
                  {aiSummary.verifiedFacts.map((f, i) => (
                    <li key={i}>• {f}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Human Resolution */}
      {isAuthorizedReviewer && incident.status !== 'resolved' && (
        <div className="p-6 rounded-2xl bg-[#17171B] border border-[#2C2A2F] space-y-4">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#F4A6C0]" />
            <h3 className="text-sm font-bold text-[#F5F1F2] font-title">
              Record Human Resolution
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label htmlFor="res-decision" className="text-[#F5F1F2] font-semibold block mb-1">
                Decision / Outcome *
              </label>
              <input
                id="res-decision"
                type="text"
                value={decisionText}
                onChange={(e) => setDecisionText(e.target.value)}
                placeholder="State the final human decision..."
                className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-xs text-[#F5F1F2] outline-none focus:border-[#F4A6C0]"
              />
            </div>

            <div>
              <label htmlFor="res-rationale" className="text-[#F5F1F2] font-semibold block mb-1">
                Investigation Rationale
              </label>
              <textarea
                id="res-rationale"
                rows={2}
                value={decisionRationale}
                onChange={(e) => setDecisionRationale(e.target.value)}
                placeholder="Explain the evidence reviewed..."
                className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-xs text-[#F5F1F2] outline-none focus:border-[#F4A6C0]"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={isResolving}
                onClick={handleResolve}
                className="py-2.5 px-6 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                {isResolving ? 'Saving...' : 'Finalize Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}

      {incident.status === 'resolved' && incident.decision && (
        <div className="p-5 rounded-2xl bg-[#17171B] border border-[#3FA776] text-xs space-y-1">
          <span className="font-bold text-[#3FA776] uppercase font-mono-code block">
            Final Resolution
          </span>
          <p className="text-[#F5F1F2] font-semibold">{incident.decision}</p>
          {incident.decisionReason && <p className="text-[#B8AEB2]">{incident.decisionReason}</p>}
        </div>
      )}
    </div>
  );
};
