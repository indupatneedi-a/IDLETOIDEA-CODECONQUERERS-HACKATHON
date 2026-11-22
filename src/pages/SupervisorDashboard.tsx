import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Key,
  RotateCcw,
  AlertTriangle,
  UserCheck,
  Camera,
} from 'lucide-react';
import {
  User,
  EligibilityRecord,
  HandoverRecord,
  RequestItem,
  Incident,
  Resource,
} from '../types';
import { api } from '../services/api';
import { StatusChip } from '../components/StatusChip';

interface SupervisorDashboardProps {
  currentUser: User | null;
  resources: Resource[];
  onViewTimeline: (requestId: string) => void;
  onOpenCheckoutModal: (request: RequestItem, resource: Resource | null) => void;
  onOpenReturnModal: (request: RequestItem, resource: Resource | null, handover: HandoverRecord | null) => void;
  onOpenIncidentView: (incidentId: string) => void;
}

export const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({
  currentUser,
  resources,
  onViewTimeline,
  onOpenCheckoutModal,
  onOpenReturnModal,
  onOpenIncidentView,
}) => {
  const [eligibilityRecords, setEligibilityRecords] = useState<EligibilityRecord[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [handovers, setHandovers] = useState<HandoverRecord[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  const [selectedEligId, setSelectedEligId] = useState<string | null>(null);
  const [approvalNote, setApprovalNote] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser || (currentUser.role !== 'supervisor' && currentUser.role !== 'admin')) {
      return;
    }

    if (currentUser.role === 'admin') {
      return api.subscribeAdminData(
        (d) => {
          setRequests(d.requests);
          setIncidents(d.incidents);
        },
        () => {}
      );
    }

    return api.subscribeSupervisorData(currentUser.id, (d) => {
      setEligibilityRecords(d.eligibilityRecords);
      setRequests(d.requests);
      setHandovers(d.handovers);
      setIncidents(d.incidents);
    });
  }, [currentUser]);

  if (!currentUser || (currentUser.role !== 'supervisor' && currentUser.role !== 'admin')) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-2">
        <h2 className="text-xl font-bold text-[#F5F1F2] font-title">Supervisor Queue</h2>
        <p className="text-sm text-[#B8AEB2]">
          Supervisor or Admin permissions are required to view safety approvals and handover inspections.
        </p>
      </div>
    );
  }

  const pendingApprovals = eligibilityRecords.filter((e) => e.status === 'awaiting-supervisor');
  const pendingCheckouts = requests.filter((r) => r.status === 'confirmed');
  const inUseSessions = requests.filter((r) => r.status === 'in-use' || r.status === 'overdue');
  const openIncidents = incidents.filter((i) => i.status !== 'resolved');

  const handleApproveEligibility = async (eligId: string) => {
    const res = await api.supervisorApproveEligibility(
      currentUser,
      eligId,
      approvalNote.trim() || 'In-person safety orientation verified.'
    );
    if (res.success) {
      setSelectedEligId(null);
      setApprovalNote('');
      setFeedback('Safety certification approved.');
    } else {
      setFeedback(res.error || 'Failed to approve certification.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left space-y-8">
      <div className="p-6 rounded-2xl bg-[#17171B] border border-[#2C2A2F] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F1F2] font-title">
            Safety &amp; Supervisor Queue
          </h1>
          <p className="text-xs text-[#B8AEB2] mt-1">
            Verify high-risk equipment training, record check-out/return handovers, and review incident inquiries.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#0D0D0F] px-3.5 py-2 rounded-xl border border-[#2C2A2F] text-xs font-mono-code text-[#F4A6C0]">
          <ShieldCheck className="w-4 h-4" />
          <span>{currentUser.displayName}</span>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-[#17171B] border border-[#3FA776] text-[#3FA776] text-xs flex justify-between">
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback(null)} className="underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Training Approvals */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-[#F4A6C0]" />
          <h2 className="text-base font-bold text-[#F5F1F2] font-title">
            Safety Sign-Off Approvals ({pendingApprovals.length})
          </h2>
        </div>

        {pendingApprovals.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#17171B] border border-[#2C2A2F] text-center text-xs text-[#B8AEB2]">
            No safety certifications waiting for sign-off.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingApprovals.map((elig) => (
              <div
                key={elig.id}
                className="p-5 rounded-2xl bg-[#17171B] border border-[#2C2A2F] space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#2C2A2F]">
                  <span className="font-bold text-[#F5F1F2] text-sm">{elig.userDisplayName}</span>
                  <span className="text-xs font-mono-code text-[#3FA776]">
                    Quiz: {elig.quizScore ?? 0}%
                  </span>
                </div>
                <p className="text-xs text-[#B8AEB2]">
                  Resource: <strong className="text-[#F5F1F2]">{elig.resourceTitle}</strong>
                </p>

                {selectedEligId === elig.id ? (
                  <div className="p-3 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] space-y-2">
                    <input
                      type="text"
                      value={approvalNote}
                      onChange={(e) => setApprovalNote(e.target.value)}
                      placeholder="Certification sign-off note..."
                      className="w-full p-2 rounded bg-[#17171B] border border-[#2C2A2F] text-xs text-[#F5F1F2]"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedEligId(null)}
                        className="px-2.5 py-1 text-xs text-[#B8AEB2] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveEligibility(elig.id)}
                        className="px-4 py-1.5 rounded-lg bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-xs font-semibold cursor-pointer"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedEligId(elig.id)}
                    className="w-full py-2 px-3 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-xs font-semibold cursor-pointer"
                  >
                    Approve Safety Certification
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pending Check-outs */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-[#F4A6C0]" />
          <h2 className="text-base font-bold text-[#F5F1F2] font-title">
            Pending Check-Outs ({pendingCheckouts.length})
          </h2>
        </div>

        {pendingCheckouts.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#17171B] border border-[#2C2A2F] text-center text-xs text-[#B8AEB2]">
            No confirmed bookings awaiting check-out.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingCheckouts.map((req) => {
              const resObj = resources.find((r) => r.id === req.resourceId) || null;
              return (
                <div
                  key={req.id}
                  className="p-5 rounded-2xl bg-[#17171B] border border-[#2C2A2F] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#F5F1F2] text-sm">{req.resourceTitle}</span>
                    <StatusChip status={req.status} size="sm" />
                  </div>
                  <p className="text-xs text-[#B8AEB2]">
                    Requester: <strong className="text-[#F5F1F2]">{req.requesterDisplayName}</strong>
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-[#2C2A2F]">
                    <button
                      type="button"
                      onClick={() => onViewTimeline(req.id)}
                      className="text-xs font-mono-code text-[#F4A6C0] hover:underline cursor-pointer"
                    >
                      Timeline
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenCheckoutModal(req, resObj)}
                      className="py-1.5 px-4 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Record Check-Out</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Active Returns */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-[#F4A6C0]" />
          <h2 className="text-base font-bold text-[#F5F1F2] font-title">
            In-Use Sessions ({inUseSessions.length})
          </h2>
        </div>

        {inUseSessions.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#17171B] border border-[#2C2A2F] text-center text-xs text-[#B8AEB2]">
            No active sessions in progress.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inUseSessions.map((req) => {
              const resObj = resources.find((r) => r.id === req.resourceId) || null;
              const handover = handovers.find((h) => h.requestId === req.id) || null;
              return (
                <div
                  key={req.id}
                  className="p-5 rounded-2xl bg-[#17171B] border border-[#2C2A2F] space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#2C2A2F]">
                    <span className="font-bold text-[#F5F1F2] text-sm">{req.resourceTitle}</span>
                    <StatusChip status={req.status} size="sm" />
                  </div>
                  <p className="text-xs text-[#B8AEB2]">
                    User: <strong className="text-[#F5F1F2]">{req.requesterDisplayName}</strong>
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-[#2C2A2F]">
                    <button
                      type="button"
                      onClick={() => onViewTimeline(req.id)}
                      className="text-xs font-mono-code text-[#F4A6C0] hover:underline cursor-pointer"
                    >
                      Timeline
                    </button>
                    {handover && (
                      <button
                        type="button"
                        onClick={() => onOpenReturnModal(req, resObj, handover)}
                        className="py-1.5 px-4 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Inspect Return</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Open Incidents */}
      <section className="rounded-2xl bg-[#17171B] border border-[#2C2A2F] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#E0A33A]" />
            <h2 className="text-base font-bold text-[#F5F1F2] font-title">
              Open Condition Inquiries ({openIncidents.length})
            </h2>
          </div>
          <span className="text-xs text-[#B8AEB2]">Unreviewed reports until finalized</span>
        </div>

        {openIncidents.length === 0 ? (
          <p className="text-xs text-[#B8AEB2]">No open inquiries.</p>
        ) : (
          <div className="space-y-3">
            {openIncidents.map((inc) => (
              <div
                key={inc.id}
                className="p-4 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] flex items-center justify-between gap-4"
              >
                <div>
                  <span className="text-xs font-bold text-[#F5F1F2] block">{inc.title}</span>
                  <span className="text-[11px] text-[#B8AEB2]">
                    {inc.resourceTitle} · {inc.status}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenIncidentView(inc.id)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-xs font-semibold cursor-pointer"
                >
                  Review Case
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
