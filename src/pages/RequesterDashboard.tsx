import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Key,
  RotateCcw,
  FileText,
  ListOrdered,
  Ban,
  FastForward,
  ShieldAlert,
  Clock,
  X,
} from 'lucide-react';
import {
  User,
  RequestItem,
  WaitlistEntry,
  HandoverRecord,
  Resource,
} from '../types';
import { api } from '../services/api';
import { StatusChip } from '../components/StatusChip';

interface RequesterDashboardProps {
  currentUser: User | null;
  resources: Resource[];
  onViewTimeline: (requestId: string) => void;
  onOpenReturnModal: (request: RequestItem, resource: Resource | null, handover: HandoverRecord | null) => void;
  onNavigateToDiscover: () => void;
}

export const RequesterDashboard: React.FC<RequesterDashboardProps> = ({
  currentUser,
  resources,
  onViewTimeline,
  onOpenReturnModal,
  onNavigateToDiscover,
}) => {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [handovers, setHandovers] = useState<HandoverRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [extensionRequestId, setExtensionRequestId] = useState<string | null>(null);
  const [extensionMinutes, setExtensionMinutes] = useState(30);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Incident modal state
  const [incidentReq, setIncidentReq] = useState<RequestItem | null>(null);
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentDesc, setIncidentDesc] = useState('');
  const [submittingIncident, setSubmittingIncident] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const u1 = api.subscribeUserRequests(
      currentUser.id,
      (list) => {
        setRequests(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    const u2 = api.subscribeUserWaitlist(currentUser.id, setWaitlist);
    const u3 = api.subscribeHandoversByField('requesterId', currentUser.id, setHandovers);

    return () => {
      u1();
      u2();
      u3();
    };
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-2">
        <h2 className="text-xl font-bold text-[#F5F1F2] font-title">My Requests</h2>
        <p className="text-sm text-[#B8AEB2]">Please sign in to view your bookings and waitlist entries.</p>
      </div>
    );
  }

  const activeBookings = requests.filter((r) => r.status === 'in-use' || r.status === 'overdue');
  const upcomingBookings = requests.filter((r) => r.status === 'confirmed');
  const pendingRequests = requests.filter((r) => r.status === 'pending-review');
  const pastBookings = requests.filter((r) =>
    ['returned', 'rejected', 'cancelled', 'transfer-complete'].includes(r.status)
  );

  const handleCancelSubmit = async (requestId: string) => {
    if (!cancelReason.trim()) return;
    const res = await api.cancelBooking(currentUser, requestId, cancelReason);
    if (res.success) {
      setCancellingRequestId(null);
      setCancelReason('');
      setFeedback({ type: 'ok', text: 'Booking cancelled.' });
    } else {
      setFeedback({ type: 'err', text: res.error || 'Failed to cancel booking.' });
    }
  };

  const handleClaimWaitlistOffer = async (entry: WaitlistEntry) => {
    const res = await api.acceptWaitlistOffer(currentUser, entry);
    if (res.success) {
      setFeedback({ type: 'ok', text: 'Waitlist slot claimed and confirmed.' });
    } else {
      setFeedback({ type: 'err', text: res.error || 'Unable to claim waitlist offer.' });
    }
  };

  const handleRequestExtension = async (req: RequestItem) => {
    const resObj = resources.find((r) => r.id === req.resourceId);
    if (!resObj) return;
    const handover = handovers.find((h) => h.requestId === req.id);
    const res = await api.requestExtension(currentUser, req, resObj, handover, extensionMinutes);
    if (res.success) {
      setFeedback({ type: 'ok', text: res.data || 'Extension processed.' });
      setExtensionRequestId(null);
    } else {
      setFeedback({ type: 'err', text: res.error || 'Extension failed.' });
    }
  };

  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentReq || !incidentTitle.trim() || !incidentDesc.trim()) return;
    setSubmittingIncident(true);
    const resObj = resources.find((r) => r.id === incidentReq.resourceId);
    try {
      const res = await api.createIncident(currentUser, incidentReq, {
        reportedAgainstUserId: incidentReq.ownerId,
        reportedAgainstDisplayName: resObj?.ownerDisplayName || 'Resource Owner',
        title: incidentTitle.trim(),
        description: incidentDesc.trim(),
        evidenceRefs: [],
      });
      if (res.success) {
        setIncidentReq(null);
        setIncidentTitle('');
        setIncidentDesc('');
        setFeedback({ type: 'ok', text: 'Issue report submitted for review.' });
      } else {
        setFeedback({ type: 'err', text: res.error || 'Failed to submit report.' });
      }
    } finally {
      setSubmittingIncident(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left space-y-8">
      <div className="p-6 rounded-2xl bg-[#17171B] border border-[#2C2A2F] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F1F2] font-title">
            Welcome, {currentUser.displayName}
          </h1>
          <p className="text-xs text-[#B8AEB2] mt-1">
            Track your active sessions, upcoming reservations, and waitlist positions.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-[#0D0D0F] p-3 rounded-xl border border-[#2C2A2F] text-xs">
          <div>
            <span className="text-[11px] font-mono-code text-[#B8AEB2] block">Account Standing</span>
            <span
              className={`font-semibold ${
                currentUser.standing.restrictedUntil ? 'text-[#E0555F]' : 'text-[#3FA776]'
              }`}
            >
              {currentUser.standing.restrictedUntil ? 'Restricted' : 'Good Standing'}
            </span>
          </div>
          {currentUser.standing.restrictedUntil ? (
            <ShieldAlert className="w-5 h-5 text-[#E0555F]" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-[#3FA776]" />
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            feedback.type === 'ok'
              ? 'bg-[#17171B] border-[#3FA776] text-[#3FA776]'
              : 'bg-[#17171B] border-[#E0555F] text-[#E0555F]'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Active Sessions */}
      {activeBookings.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-[#F4A6C0]" />
            <h2 className="text-base font-bold text-[#F5F1F2] font-title">
              Active Sessions ({activeBookings.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeBookings.map((req) => {
              const resObj = resources.find((r) => r.id === req.resourceId) || null;
              const handover = handovers.find((h) => h.requestId === req.id) || null;
              const isOverdue =
                req.status === 'overdue' ||
                (handover ? new Date() > new Date(handover.dueAt) : false);

              return (
                <div
                  key={req.id}
                  className={`p-5 rounded-2xl bg-[#17171B] border space-y-3 ${
                    isOverdue ? 'border-[#E0555F]' : 'border-[#2C2A2F]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <StatusChip status={isOverdue ? 'overdue' : req.status} />
                    <button
                      type="button"
                      onClick={() => onViewTimeline(req.id)}
                      className="text-xs font-mono-code text-[#F4A6C0] hover:underline cursor-pointer"
                    >
                      View Timeline →
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-[#F5F1F2]">
                    {resObj?.title || req.resourceTitle}
                  </h3>

                  {handover && (
                    <div className="text-xs text-[#B8AEB2] space-y-1">
                      <div>Checked out: {new Date(handover.checkoutAt).toLocaleString()}</div>
                      <div>
                        Due:{' '}
                        <span className={isOverdue ? 'text-[#E0555F] font-semibold' : 'text-[#F5F1F2]'}>
                          {new Date(handover.dueAt).toLocaleString()}
                        </span>
                      </div>
                      <div>Initial condition: {handover.beforeCondition}</div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-[#2C2A2F] flex flex-wrap items-center gap-2">
                    {handover && (
                      <button
                        type="button"
                        onClick={() => onOpenReturnModal(req, resObj, handover)}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Record Return</span>
                      </button>
                    )}

                    {!isOverdue && resObj?.policies.autoExtendEnabled && (
                      <button
                        type="button"
                        onClick={() => setExtensionRequestId(req.id)}
                        className="py-2 px-3 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] hover:border-[#F4A6C0] text-[#F5F1F2] text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                      >
                        <FastForward className="w-3.5 h-3.5 text-[#F4A6C0]" />
                        <span>Extend</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setIncidentReq(req)}
                      className="py-2 px-3 rounded-xl bg-[#0D0D0F] border border-[#E0555F]/50 text-[#E0555F] text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Report Issue</span>
                    </button>
                  </div>

                  {extensionRequestId === req.id && (
                    <div className="p-3 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-xs space-y-2">
                      <span className="text-[#F5F1F2] font-semibold block">Extension length</span>
                      <div className="flex items-center gap-2">
                        {[15, 30, 60].map((mins) => (
                          <button
                            type="button"
                            key={mins}
                            onClick={() => setExtensionMinutes(mins)}
                            className={`px-2.5 py-1 rounded text-xs cursor-pointer ${
                              extensionMinutes === mins
                                ? 'bg-[#7A1F3D] text-[#F5F1F2] font-semibold'
                                : 'bg-[#17171B] text-[#B8AEB2]'
                            }`}
                          >
                            +{mins}m
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleRequestExtension(req)}
                          className="ml-auto px-3 py-1 rounded bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-xs font-semibold cursor-pointer"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Waitlist */}
      {waitlist.filter((w) => w.status === 'waiting' || w.status === 'offered').length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-[#F4A6C0]" />
            <h2 className="text-base font-bold text-[#F5F1F2] font-title">Waitlist Entries</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {waitlist
              .filter((w) => w.status === 'waiting' || w.status === 'offered')
              .map((entry) => {
                const isOffered = entry.status === 'offered';
                return (
                  <div
                    key={entry.id}
                    className={`p-4 rounded-2xl bg-[#17171B] border space-y-2 ${
                      isOffered ? 'border-[#F4A6C0]' : 'border-[#2C2A2F]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <StatusChip status={isOffered ? 'offered' : 'waitlisted'} size="sm" />
                      <span className="text-xs font-mono-code text-[#B8AEB2]">
                        Position #{entry.position}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-[#F5F1F2]">{entry.resourceTitle}</h3>
                    <p className="text-xs text-[#B8AEB2]">
                      {isOffered
                        ? 'A slot became available for you. Accept before your claim window expires.'
                        : 'You will be notified if this slot becomes available.'}
                    </p>
                    {isOffered && (
                      <div className="pt-2 border-t border-[#2C2A2F] flex items-center justify-between">
                        <span className="text-[11px] font-mono-code text-[#B8AEB2]">
                          Expires:{' '}
                          {entry.offerExpiresAt
                            ? new Date(entry.offerExpiresAt).toLocaleString()
                            : 'Within 24h'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleClaimWaitlistOffer(entry)}
                          className="py-1.5 px-4 rounded-lg bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-xs font-semibold cursor-pointer"
                        >
                          Claim Slot
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {/* Upcoming Confirmed */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#F4A6C0]" />
          <h2 className="text-base font-bold text-[#F5F1F2] font-title">
            Upcoming Confirmed Bookings ({upcomingBookings.length})
          </h2>
        </div>

        {loading ? (
          <div className="h-32 rounded-2xl bg-[#17171B] border border-[#2C2A2F] animate-pulse" />
        ) : upcomingBookings.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#17171B] border border-[#2C2A2F] text-center space-y-3">
            <p className="text-sm text-[#B8AEB2]">No upcoming confirmed bookings.</p>
            <button
              type="button"
              onClick={onNavigateToDiscover}
              className="text-xs text-[#F4A6C0] hover:underline cursor-pointer"
            >
              Browse equipment &amp; spaces →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingBookings.map((req) => {
              const resObj = resources.find((r) => r.id === req.resourceId);
              return (
                <div
                  key={req.id}
                  className="p-5 rounded-2xl bg-[#17171B] border border-[#2C2A2F] space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <StatusChip status={req.status} />
                    <button
                      type="button"
                      onClick={() => onViewTimeline(req.id)}
                      className="text-xs font-mono-code text-[#F4A6C0] hover:underline cursor-pointer"
                    >
                      Timeline →
                    </button>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-[#F5F1F2]">{req.resourceTitle}</h3>
                    {req.slotStart && (
                      <p className="text-xs text-[#B8AEB2] font-mono-code mt-0.5">
                        {new Date(req.slotStart).toLocaleDateString()} ·{' '}
                        {new Date(req.slotStart).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        –{' '}
                        {req.slotEnd
                          ? new Date(req.slotEnd).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </p>
                    )}
                  </div>

                  {resObj?.collectionPoint && (
                    <div className="p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-xs text-[#B8AEB2]">
                      Collection point: <strong className="text-[#F5F1F2]">{resObj.collectionPoint}</strong>
                    </div>
                  )}

                  {cancellingRequestId === req.id ? (
                    <div className="pt-2 border-t border-[#2C2A2F] space-y-2">
                      <label className="text-xs text-[#E0555F] font-semibold block">
                        Reason for cancellation
                      </label>
                      <input
                        type="text"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Provide a brief cancellation reason..."
                        className="w-full p-2 rounded-lg bg-[#0D0D0F] border border-[#2C2A2F] text-xs text-[#F5F1F2]"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setCancellingRequestId(null)}
                          className="px-3 py-1 text-xs text-[#B8AEB2] cursor-pointer"
                        >
                          Keep
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelSubmit(req.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-xs font-semibold cursor-pointer"
                        >
                          Confirm Cancellation
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-[#2C2A2F] flex items-center justify-between text-xs">
                      <span className="text-[#B8AEB2]">
                        Notice policy: {resObj?.policies.cancellationNoticeHours ?? 4}h
                      </span>
                      <button
                        type="button"
                        onClick={() => setCancellingRequestId(req.id)}
                        className="text-[#E0555F] hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Cancel booking</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Pending & History */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-[#17171B] border border-[#2C2A2F] p-5 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-[#2C2A2F]">
            <Clock className="w-4 h-4 text-[#E0A33A]" />
            <h3 className="text-sm font-bold text-[#F5F1F2] font-title">
              Pending Review ({pendingRequests.length})
            </h3>
          </div>

          {pendingRequests.length === 0 ? (
            <p className="py-4 text-center text-xs text-[#B8AEB2]">No pending requests.</p>
          ) : (
            pendingRequests.map((req) => (
              <div
                key={req.id}
                className="p-3.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#F5F1F2]">{req.resourceTitle}</span>
                  <StatusChip status={req.status} size="sm" />
                </div>
                <p className="text-[#B8AEB2]">{req.message}</p>
                <div className="flex items-center justify-between pt-1 text-[11px] text-[#B8AEB2] font-mono-code">
                  <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                  <button
                    type="button"
                    onClick={() => onViewTimeline(req.id)}
                    className="text-[#F4A6C0] hover:underline cursor-pointer"
                  >
                    Timeline
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="rounded-2xl bg-[#17171B] border border-[#2C2A2F] p-5 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-[#2C2A2F]">
            <FileText className="w-4 h-4 text-[#F4A6C0]" />
            <h3 className="text-sm font-bold text-[#F5F1F2] font-title">
              Past History ({pastBookings.length})
            </h3>
          </div>

          {pastBookings.length === 0 ? (
            <p className="py-4 text-center text-xs text-[#B8AEB2]">No past bookings yet.</p>
          ) : (
            pastBookings.map((req) => (
              <div
                key={req.id}
                className="p-3.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#F5F1F2]">{req.resourceTitle}</span>
                  <StatusChip status={req.status} size="sm" />
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px] text-[#B8AEB2] font-mono-code">
                  <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIncidentReq(req)}
                      className="text-[#E0A33A] hover:underline cursor-pointer"
                    >
                      Report issue
                    </button>
                    <button
                      type="button"
                      onClick={() => onViewTimeline(req.id)}
                      className="text-[#F4A6C0] hover:underline cursor-pointer"
                    >
                      Timeline
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Incident Report Modal */}
      {incidentReq && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#17171B] border border-[#2C2A2F] p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#2C2A2F]">
              <h3 className="text-base font-bold text-[#F5F1F2] font-title">
                Report Equipment Issue
              </h3>
              <button
                type="button"
                onClick={() => setIncidentReq(null)}
                className="text-[#B8AEB2] hover:text-[#F5F1F2] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReportIncident} className="space-y-3 text-xs">
              <div>
                <label htmlFor="inc-title" className="text-[#B8AEB2] block mb-1">
                  Summary Title *
                </label>
                <input
                  id="inc-title"
                  type="text"
                  required
                  value={incidentTitle}
                  onChange={(e) => setIncidentTitle(e.target.value)}
                  placeholder="Brief title of issue observed"
                  className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-[#F5F1F2]"
                />
              </div>
              <div>
                <label htmlFor="inc-desc" className="text-[#B8AEB2] block mb-1">
                  Description *
                </label>
                <textarea
                  id="inc-desc"
                  rows={3}
                  required
                  value={incidentDesc}
                  onChange={(e) => setIncidentDesc(e.target.value)}
                  placeholder="Describe what happened or the condition issue noticed..."
                  className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-[#F5F1F2]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIncidentReq(null)}
                  className="px-4 py-2 text-[#B8AEB2] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingIncident}
                  className="px-4 py-2 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] font-semibold cursor-pointer"
                >
                  {submittingIncident ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
