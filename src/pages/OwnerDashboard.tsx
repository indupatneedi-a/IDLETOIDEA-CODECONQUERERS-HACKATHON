import React, { useState, useEffect } from 'react';
import {
  Plus,
  Clock,
  Wrench,
  ArrowRight,
  Calendar,
  Key,
  RotateCcw,
  ListOrdered,
} from 'lucide-react';
import {
  User,
  RequestItem,
  Resource,
  Slot,
  WaitlistEntry,
  HandoverRecord,
  DecisionReasonCode,
} from '../types';
import { api } from '../services/api';
import { StatusChip } from '../components/StatusChip';

interface OwnerDashboardProps {
  currentUser: User | null;
  onNavigateToCreateListing: () => void;
  onViewTimeline: (requestId: string) => void;
  onSelectResource: (resourceId: string) => void;
  onOpenCheckoutModal: (request: RequestItem, resource: Resource | null) => void;
  onOpenReturnModal: (request: RequestItem, resource: Resource | null, handover: HandoverRecord | null) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  currentUser,
  onNavigateToCreateListing,
  onViewTimeline,
  onSelectResource,
  onOpenCheckoutModal,
  onOpenReturnModal,
}) => {
  const [myListings, setMyListings] = useState<Resource[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [handovers, setHandovers] = useState<HandoverRecord[]>([]);
  const [slotsByResource, setSlotsByResource] = useState<Record<string, Slot[]>>({});
  const [loading, setLoading] = useState(true);

  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Add/Block slot state
  const [slotModalResId, setSlotModalResId] = useState<string | null>(null);
  const [slotActionMode, setSlotActionMode] = useState<'add' | 'block'>('add');
  const [newSlotDate, setNewSlotDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [newSlotStart, setNewSlotStart] = useState('10:00');
  const [newSlotEnd, setNewSlotEnd] = useState('12:00');
  const [slotToBlock, setSlotToBlock] = useState('');
  const [blockReason, setBlockReason] = useState('');

  useEffect(() => {
    if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'admin')) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const u1 = api.subscribeOwnerResources(
      currentUser.id,
      (list) => {
        setMyListings(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    const u2 = api.subscribeOwnerRequests(currentUser.id, setRequests, () => {});
    const u3 = api.subscribeOwnerWaitlist(currentUser.id, setWaitlist);
    const u4 = api.subscribeHandoversByField('ownerId', currentUser.id, setHandovers);

    return () => {
      u1();
      u2();
      u3();
      u4();
    };
  }, [currentUser]);

  const refreshResourceSlots = async (resourceId: string) => {
    try {
      const slots = await api.getSlotsForResource(resourceId);
      setSlotsByResource((prev) => ({ ...prev, [resourceId]: slots }));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    myListings.forEach((res) => {
      if (res.transferMode === 'temporary') {
        refreshResourceSlots(res.id);
      }
    });
  }, [myListings]);

  if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'admin')) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-2">
        <h2 className="text-xl font-bold text-[#F5F1F2] font-title">Owner Hub</h2>
        <p className="text-sm text-[#B8AEB2]">
          Sign in with an Organization / Owner account to manage listings and booking requests.
        </p>
      </div>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === 'pending-review');
  const activeBookings = requests.filter((r) => r.status === 'confirmed' || r.status === 'in-use');

  // Waitlist entries for slots that are now available with waiting candidates
  const waitingEntries = waitlist.filter((w) => w.status === 'waiting');

  const handleDecision = async (
    requestId: string,
    decision: 'approve' | 'reject' | 'need_more_info'
  ) => {
    let reasonCode: DecisionReasonCode = 'APPROVED_ELIGIBLE';
    if (decision === 'reject') reasonCode = 'REJECTED_OWNER_DECLINED';
    if (decision === 'need_more_info') reasonCode = 'NEEDS_MORE_INFO';

    const res = await api.decideRequest(
      currentUser,
      requestId,
      decision,
      reasonCode,
      decisionNote.trim() ||
        (decision === 'approve'
          ? 'Approved by resource owner.'
          : decision === 'reject'
          ? 'Declined by resource owner.'
          : 'Please provide additional details.')
    );

    if (res.success) {
      setSelectedReviewId(null);
      setDecisionNote('');
      setFeedback({ type: 'ok', text: `Request updated (${decision}).` });
    } else {
      setFeedback({ type: 'err', text: res.error || 'Decision failed.' });
    }
  };

  const handleOfferWaitlist = async (entry: WaitlistEntry) => {
    const res = await api.extendWaitlistOffer(currentUser, entry);
    if (res.success) {
      setFeedback({
        type: 'ok',
        text: `Offered freed slot to ${entry.userDisplayName}.`,
      });
      await refreshResourceSlots(entry.resourceId);
    } else {
      setFeedback({ type: 'err', text: res.error || 'Could not extend waitlist offer.' });
    }
  };

  const handleAddSlotSubmit = async (resObj: Resource) => {
    const startDt = new Date(`${newSlotDate}T${newSlotStart}`);
    const endDt = new Date(`${newSlotDate}T${newSlotEnd}`);
    if (isNaN(startDt.getTime()) || isNaN(endDt.getTime()) || endDt <= startDt) {
      setFeedback({ type: 'err', text: 'End time must be after start time.' });
      return;
    }
    const res = await api.addSlotToResource(
      currentUser,
      resObj,
      startDt.toISOString(),
      endDt.toISOString()
    );
    if (res.success) {
      setSlotModalResId(null);
      setFeedback({ type: 'ok', text: 'New time slot added.' });
      await refreshResourceSlots(resObj.id);
    } else {
      setFeedback({ type: 'err', text: res.error || 'Failed to add slot.' });
    }
  };

  const handleBlockSlotSubmit = async (resourceId: string) => {
    if (!slotToBlock) return;
    const res = await api.blockSlot(
      currentUser,
      resourceId,
      slotToBlock,
      blockReason.trim() || 'Maintenance'
    );
    if (res.success) {
      setSlotModalResId(null);
      setSlotToBlock('');
      setBlockReason('');
      setFeedback({ type: 'ok', text: 'Slot blocked for maintenance.' });
      await refreshResourceSlots(resourceId);
    } else {
      setFeedback({ type: 'err', text: res.error || 'Failed to block slot.' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left space-y-8">
      <div className="p-6 rounded-2xl bg-[#17171B] border border-[#2C2A2F] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-[#F5F1F2] font-title">Owner Hub</h1>
            <StatusChip
              status={currentUser.verificationState === 'verified' ? 'verified' : 'unverified'}
              size="sm"
            />
          </div>
          <p className="text-xs text-[#B8AEB2]">
            {currentUser.organisationName || currentUser.displayName} · Review booking requests, manage slots, and record handovers.
          </p>
        </div>

        <button
          type="button"
          onClick={onNavigateToCreateListing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-xs font-semibold cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-[#F4A6C0]" />
          <span>List Equipment</span>
        </button>
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
            className="underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Pending Requests */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#E0A33A]" />
          <h2 className="text-base font-bold text-[#F5F1F2] font-title">
            Pending Access Requests ({pendingRequests.length})
          </h2>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#17171B] border border-[#2C2A2F] text-center text-xs text-[#B8AEB2]">
            No requests waiting for review.
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((req) => {
              const isSelected = selectedReviewId === req.id;
              return (
                <div
                  key={req.id}
                  className="p-5 rounded-2xl bg-[#17171B] border border-[#2C2A2F] space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#2C2A2F]">
                    <div>
                      <span className="text-xs font-mono-code text-[#F4A6C0]">{req.resourceTitle}</span>
                      <h3 className="text-sm font-bold text-[#F5F1F2] mt-0.5">
                        Requester: {req.requesterDisplayName}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusChip status={req.status} size="sm" />
                      <button
                        type="button"
                        onClick={() => onViewTimeline(req.id)}
                        className="text-xs font-mono-code text-[#F4A6C0] hover:underline cursor-pointer"
                      >
                        Timeline
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#B8AEB2]">
                    <strong className="text-[#F5F1F2]">Message:</strong> {req.message}
                  </p>

                  {isSelected ? (
                    <div className="p-4 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] space-y-3">
                      <label className="text-xs text-[#F5F1F2] font-semibold block">
                        Decision Note (visible to requester &amp; audit log)
                      </label>
                      <input
                        type="text"
                        value={decisionNote}
                        onChange={(e) => setDecisionNote(e.target.value)}
                        placeholder="Reason or instructions..."
                        className="w-full p-2.5 rounded-lg bg-[#17171B] border border-[#2C2A2F] text-xs text-[#F5F1F2] outline-none"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDecision(req.id, 'approve')}
                          className="px-4 py-2 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-xs font-semibold cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecision(req.id, 'reject')}
                          className="px-4 py-2 rounded-xl bg-[#17171B] border border-[#E0555F] text-[#E0555F] text-xs font-semibold cursor-pointer"
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecision(req.id, 'need_more_info')}
                          className="px-4 py-2 rounded-xl bg-[#17171B] border border-[#2C2A2F] text-[#F5F1F2] text-xs cursor-pointer"
                        >
                          Request Info
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedReviewId(null)}
                          className="ml-auto text-xs text-[#B8AEB2] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReviewId(req.id);
                        setDecisionNote('');
                      }}
                      className="py-2 px-4 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] hover:border-[#F4A6C0] text-[#F5F1F2] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Review Request</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#F4A6C0]" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Active Handovers */}
      {activeBookings.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-[#F4A6C0]" />
            <h2 className="text-base font-bold text-[#F5F1F2] font-title">
              Confirmed &amp; Active Handovers ({activeBookings.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeBookings.map((req) => {
              const resObj = myListings.find((r) => r.id === req.resourceId) || null;
              const handover = handovers.find((h) => h.requestId === req.id) || null;

              return (
                <div
                  key={req.id}
                  className="p-5 rounded-2xl bg-[#17171B] border border-[#2C2A2F] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#F5F1F2]">{req.resourceTitle}</span>
                    <StatusChip status={req.status} size="sm" />
                  </div>
                  <p className="text-xs text-[#B8AEB2]">
                    Maker: <strong className="text-[#F5F1F2]">{req.requesterDisplayName}</strong>
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-[#2C2A2F]">
                    <button
                      type="button"
                      onClick={() => onViewTimeline(req.id)}
                      className="text-xs text-[#F4A6C0] hover:underline cursor-pointer"
                    >
                      Timeline
                    </button>
                    {req.status === 'confirmed' ? (
                      <button
                        type="button"
                        onClick={() => onOpenCheckoutModal(req, resObj)}
                        className="px-4 py-1.5 rounded-lg bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-xs font-semibold cursor-pointer"
                      >
                        Record Check-Out
                      </button>
                    ) : (
                      handover && (
                        <button
                          type="button"
                          onClick={() => onOpenReturnModal(req, resObj, handover)}
                          className="px-4 py-1.5 rounded-lg bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Record Return</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Waitlist Priority Offers */}
      {waitingEntries.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-[#F4A6C0]" />
            <h2 className="text-base font-bold text-[#F5F1F2] font-title">
              Waitlist Queue ({waitingEntries.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {waitingEntries.map((entry) => {
              const slots = slotsByResource[entry.resourceId] || [];
              const targetSlot = slots.find((s) => s.id === entry.slotId);
              const slotOpen = targetSlot?.state === 'available';

              return (
                <div
                  key={entry.id}
                  className="p-4 rounded-2xl bg-[#17171B] border border-[#2C2A2F] flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-bold text-[#F5F1F2] block">{entry.resourceTitle}</span>
                    <span className="text-[#B8AEB2]">
                      #{entry.position} · {entry.userDisplayName}
                    </span>
                  </div>
                  {slotOpen ? (
                    <button
                      type="button"
                      onClick={() => handleOfferWaitlist(entry)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] font-semibold cursor-pointer"
                    >
                      Offer Freed Slot
                    </button>
                  ) : (
                    <span className="font-mono-code text-[#B8AEB2]">Slot currently held</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* My Listings */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-[#F5F1F2] font-title">
          My Listings ({myListings.length})
        </h2>

        {loading ? (
          <div className="h-32 rounded-2xl bg-[#17171B] border border-[#2C2A2F] animate-pulse" />
        ) : myListings.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#17171B] border border-[#2C2A2F] text-center space-y-3">
            <p className="text-sm text-[#B8AEB2]">You have not published any equipment or workspaces yet.</p>
            <button
              type="button"
              onClick={onNavigateToCreateListing}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#F4A6C0]" />
              <span>List your equipment</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myListings.map((resObj) => {
              const slots = slotsByResource[resObj.id] || [];
              return (
                <div
                  key={resObj.id}
                  className="p-5 rounded-2xl bg-[#17171B] border border-[#2C2A2F] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono-code text-[#B8AEB2]">{resObj.category}</span>
                    <StatusChip status={resObj.listingState} size="sm" />
                  </div>

                  <h3 className="text-base font-bold text-[#F5F1F2]">{resObj.title}</h3>
                  <p className="text-xs text-[#B8AEB2] line-clamp-2">{resObj.description}</p>

                  <div className="pt-2 border-t border-[#2C2A2F] flex flex-wrap items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => onSelectResource(resObj.id)}
                      className="text-[#F4A6C0] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>View Listing</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    {resObj.transferMode === 'temporary' && (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSlotModalResId(resObj.id);
                            setSlotActionMode('add');
                          }}
                          className="text-[#F5F1F2] hover:text-[#F4A6C0] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Calendar className="w-3.5 h-3.5 text-[#F4A6C0]" />
                          <span>Add Slot</span>
                        </button>
                        {slots.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSlotModalResId(resObj.id);
                              setSlotActionMode('block');
                              setSlotToBlock(slots[0].id);
                            }}
                            className="text-[#E0A33A] hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span>Block Slot</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {slotModalResId === resObj.id && (
                    <div className="p-3.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-xs space-y-2.5">
                      {slotActionMode === 'add' ? (
                        <>
                          <span className="font-semibold text-[#F5F1F2] block">
                            Add Availability Slot
                          </span>
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="date"
                              value={newSlotDate}
                              onChange={(e) => setNewSlotDate(e.target.value)}
                              className="p-1.5 rounded bg-[#17171B] border border-[#2C2A2F] text-[#F5F1F2]"
                            />
                            <input
                              type="time"
                              value={newSlotStart}
                              onChange={(e) => setNewSlotStart(e.target.value)}
                              className="p-1.5 rounded bg-[#17171B] border border-[#2C2A2F] text-[#F5F1F2]"
                            />
                            <input
                              type="time"
                              value={newSlotEnd}
                              onChange={(e) => setNewSlotEnd(e.target.value)}
                              className="p-1.5 rounded bg-[#17171B] border border-[#2C2A2F] text-[#F5F1F2]"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSlotModalResId(null)}
                              className="px-3 py-1 text-[#B8AEB2] cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddSlotSubmit(resObj)}
                              className="px-3 py-1.5 rounded bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] font-semibold cursor-pointer"
                            >
                              Save Slot
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="font-semibold text-[#E0A33A] block">
                            Block Slot for Maintenance
                          </span>
                          <select
                            value={slotToBlock}
                            onChange={(e) => setSlotToBlock(e.target.value)}
                            className="w-full p-2 rounded bg-[#17171B] border border-[#2C2A2F] text-[#F5F1F2]"
                          >
                            {slots.map((s) => (
                              <option key={s.id} value={s.id}>
                                {new Date(s.start).toLocaleString()} ({s.state})
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={blockReason}
                            onChange={(e) => setBlockReason(e.target.value)}
                            placeholder="Maintenance reason..."
                            className="w-full p-2 rounded bg-[#17171B] border border-[#2C2A2F] text-[#F5F1F2]"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSlotModalResId(null)}
                              className="px-3 py-1 text-[#B8AEB2] cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBlockSlotSubmit(resObj.id)}
                              className="px-3 py-1.5 rounded bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] font-semibold cursor-pointer"
                            >
                              Confirm Block
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
