import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Wrench,
  ShieldAlert,
  ExternalLink,
  Mail,
} from 'lucide-react';
import { Resource, User, Slot, EligibilityRecord } from '../types';
import { api } from '../services/api';
import { StatusChip, RiskBadge, AccessModeBadge } from '../components/StatusChip';

interface ResourceDetailPageProps {
  resourceId: string;
  currentUser: User | null;
  onBack: () => void;
  onOpenQuiz: (quizId: string, resourceId: string) => void;
  onRequestBooking: (resource: Resource, slot?: Slot) => void;
  onRequireSignIn: (resourceId: string, slotId?: string) => void;
  onRequireQuizSignIn: (quizId: string, resourceId: string) => void;
}

export const ResourceDetailPage: React.FC<ResourceDetailPageProps> = ({
  resourceId,
  currentUser,
  onBack,
  onOpenQuiz,
  onRequestBooking,
  onRequireSignIn,
  onRequireQuizSignIn,
}) => {
  const [resource, setResource] = useState<Resource | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<{
    isFullyEligible: boolean;
    standingOk: boolean;
    quizRequired: boolean;
    quizPassed: boolean;
    supervisorRequired: boolean;
    supervisorApproved: boolean;
    record: EligibilityRecord | null;
  } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getResource(resourceId)
      .then((res) => {
        if (active) setResource(res);
      })
      .catch(() => {
        if (active) setResource(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const unsubSlots = api.subscribeResourceSlots(resourceId, (list) => {
      if (active) setSlots(list);
    });

    return () => {
      active = false;
      unsubSlots();
    };
  }, [resourceId]);

  useEffect(() => {
    let active = true;
    if (!currentUser || !resource) {
      setEligibility(null);
      return;
    }
    api.getEligibility(currentUser, resource).then((elig) => {
      if (active) setEligibility(elig);
    });
    return () => {
      active = false;
    };
  }, [currentUser, resource]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-6">
        <div className="h-8 w-36 rounded bg-[#17171B] animate-pulse" />
        <div className="h-72 rounded-2xl bg-[#17171B] border border-[#2C2A2F] animate-pulse" />
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-3">
        <h2 className="text-xl font-bold text-[#F5F1F2]">Listing Not Found</h2>
        <p className="text-sm text-[#B8AEB2]">
          This equipment or workspace listing may have been removed or paused.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-[#F4A6C0] hover:underline cursor-pointer"
        >
          Back to Browse
        </button>
      </div>
    );
  }

  const selectedSlot = slots.find((s) => s.id === selectedSlotId);
  const isEligible = eligibility ? eligibility.isFullyEligible : false;

  const isUrl = (val: string) => /^https?:\/\//i.test(val.trim());

  const handlePrimaryAction = () => {
    if (!currentUser) {
      onRequireSignIn(resource.id, selectedSlotId || undefined);
      return;
    }
    onRequestBooking(resource, selectedSlot);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-mono-code text-[#B8AEB2] hover:text-[#F5F1F2] mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 text-[#F4A6C0]" />
        <span>Back to Browse</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Information Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl bg-[#17171B] border border-[#2C2A2F] p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <AccessModeBadge
                  priceMode={resource.priceMode}
                  transferMode={resource.transferMode}
                  price={resource.price}
                  currency={resource.currency}
                  priceUnit={resource.priceUnit}
                />
                <RiskBadge level={resource.riskLevel} />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#B8AEB2]">
                  Listed by {resource.organisationName || resource.ownerDisplayName}
                </span>
                <StatusChip
                  status={resource.ownerVerificationState === 'verified' ? 'verified' : 'unverified'}
                  size="sm"
                />
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-[#F5F1F2] font-title">
              {resource.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-[#B8AEB2]">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#F4A6C0]" />
                <span>{resource.location}</span>
              </span>
              <span className="font-mono-code text-[#B8AEB2]">
                {resource.category} · {resource.resourceType}
              </span>
            </div>

            {resource.bookingContactOrUrl && (
              <div className="pt-2 border-t border-[#2C2A2F] flex items-center gap-2 text-xs">
                <span className="text-[#B8AEB2]">Booking link or contact:</span>
                {isUrl(resource.bookingContactOrUrl) ? (
                  <a
                    href={resource.bookingContactOrUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#F4A6C0] hover:underline"
                  >
                    <span>{resource.bookingContactOrUrl}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[#F5F1F2]">
                    <Mail className="w-3.5 h-3.5 text-[#F4A6C0]" />
                    <span>{resource.bookingContactOrUrl}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Photo */}
          {resource.photos[0] ? (
            <div className="rounded-2xl overflow-hidden bg-[#0D0D0F] border border-[#2C2A2F] h-72 sm:h-96">
              <img
                src={resource.photos[0]}
                alt={resource.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="rounded-2xl bg-[#17171B] border border-[#2C2A2F] h-48 flex flex-col items-center justify-center text-[#B8AEB2] gap-2">
              <Wrench className="w-8 h-8 text-[#7A1F3D]" />
              <span className="text-xs font-mono-code">No photo provided by owner</span>
            </div>
          )}

          {/* Description & Details */}
          <div className="rounded-2xl bg-[#17171B] border border-[#2C2A2F] p-6 space-y-4">
            <h2 className="text-xs font-mono-code uppercase tracking-wider text-[#F4A6C0] font-bold">
              Description &amp; Specifications
            </h2>
            <p className="text-sm text-[#B8AEB2] leading-relaxed whitespace-pre-line">
              {resource.description}
            </p>

            {(resource.conditionSummary || resource.collectionPoint) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#2C2A2F] text-xs">
                {resource.conditionSummary && (
                  <div>
                    <span className="font-semibold text-[#F5F1F2] block mb-1">Condition Summary</span>
                    <p className="text-[#B8AEB2]">{resource.conditionSummary}</p>
                  </div>
                )}
                {resource.collectionPoint && (
                  <div>
                    <span className="font-semibold text-[#F5F1F2] block mb-1">Collection Point</span>
                    <p className="text-[#B8AEB2]">{resource.collectionPoint}</p>
                  </div>
                )}
              </div>
            )}

            {resource.accessories.length > 0 && (
              <div className="pt-4 border-t border-[#2C2A2F]">
                <span className="font-semibold text-[#F5F1F2] text-xs block mb-2">
                  Included Accessories
                </span>
                <div className="flex flex-wrap gap-2">
                  {resource.accessories.map((acc, i) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-1 rounded-md bg-[#0D0D0F] border border-[#2C2A2F] text-[#F5F1F2]"
                    >
                      {acc}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Safety & Policies */}
          {(resource.safetyNotes ||
            resource.ppe.length > 0 ||
            resource.prohibitedUses.length > 0 ||
            resource.returnInstructions) && (
            <div className="rounded-2xl bg-[#17171B] border border-[#2C2A2F] p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#F4A6C0]" />
                <h2 className="text-xs font-mono-code uppercase tracking-wider text-[#F4A6C0] font-bold">
                  Safety &amp; Handling Instructions
                </h2>
              </div>

              {resource.safetyNotes && (
                <div className="p-3.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-xs text-[#F5F1F2] leading-relaxed">
                  {resource.safetyNotes}
                </div>
              )}

              {(resource.prohibitedUses.length > 0 || resource.ppe.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {resource.prohibitedUses.length > 0 && (
                    <div>
                      <span className="font-semibold text-[#E0555F] block mb-1.5">
                        Prohibited Uses
                      </span>
                      <ul className="space-y-1 text-[#B8AEB2]">
                        {resource.prohibitedUses.map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {resource.ppe.length > 0 && (
                    <div>
                      <span className="font-semibold text-[#3FA776] block mb-1.5">
                        Required PPE
                      </span>
                      <ul className="space-y-1 text-[#B8AEB2]">
                        {resource.ppe.map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {resource.returnInstructions && (
                <div className="pt-3 border-t border-[#2C2A2F] text-xs text-[#B8AEB2]">
                  <strong className="text-[#F5F1F2]">Return Instructions:</strong>{' '}
                  {resource.returnInstructions}
                </div>
              )}
            </div>
          )}

          {/* Published Booking Policies */}
          <div className="rounded-2xl bg-[#17171B] border border-[#2C2A2F] p-6 space-y-3">
            <h2 className="text-xs font-mono-code uppercase tracking-wider text-[#F4A6C0] font-bold">
              Published Booking Policies
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F]">
                <span className="text-[11px] font-mono-code text-[#B8AEB2] block">Booking Cap</span>
                <span className="font-bold text-[#F5F1F2] text-sm">
                  {resource.policies.bookingCap} active max
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F]">
                <span className="text-[11px] font-mono-code text-[#B8AEB2] block">
                  Cancellation Notice
                </span>
                <span className="font-bold text-[#F5F1F2] text-sm">
                  {resource.policies.cancellationNoticeHours} hours
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F]">
                <span className="text-[11px] font-mono-code text-[#B8AEB2] block">Grace Period</span>
                <span className="font-bold text-[#F5F1F2] text-sm">
                  {resource.policies.graceMinutes} minutes
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action & Availability Sidebar */}
        <div className="space-y-6">
          {/* Eligibility Checklist */}
          <div className="rounded-2xl bg-[#17171B] border border-[#2C2A2F] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2C2A2F]">
              <h3 className="text-xs font-bold font-mono-code uppercase tracking-wider text-[#F4A6C0]">
                Eligibility Requirements
              </h3>
              <span className="text-xs text-[#B8AEB2]">
                {currentUser ? currentUser.displayName : 'Visitor'}
              </span>
            </div>

            {!currentUser ? (
              <div className="space-y-3 text-xs text-[#B8AEB2]">
                <p>
                  {resource.trainingRequired
                    ? 'This resource requires passing a safety readiness quiz before requesting access.'
                    : 'No safety quiz is required before submitting a request.'}
                </p>
                {resource.trainingRequired && resource.quizId && (
                  <button
                    type="button"
                    onClick={() => onRequireQuizSignIn(resource.quizId!, resource.id)}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] hover:border-[#F4A6C0] text-[#F5F1F2] text-xs font-semibold cursor-pointer"
                  >
                    Sign in to Take Safety Quiz
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  {eligibility?.standingOk ? (
                    <CheckCircle2 className="w-4 h-4 text-[#3FA776] shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-[#E0555F] shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold text-[#F5F1F2] block">Account Standing</span>
                    <span className="text-[#B8AEB2]">
                      {eligibility?.standingOk
                        ? 'Good standing.'
                        : 'Temporary restriction active.'}
                    </span>
                  </div>
                </div>

                {resource.trainingRequired && (
                  <div className="flex items-start gap-2.5">
                    {eligibility?.quizPassed ? (
                      <CheckCircle2 className="w-4 h-4 text-[#3FA776] shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-[#E0A33A] shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <span className="font-semibold text-[#F5F1F2] block">Safety Quiz</span>
                      <span className="text-[#B8AEB2] block">
                        {eligibility?.quizPassed
                          ? `Passed (${eligibility.record?.quizScore ?? 100}%).`
                          : 'Required before booking.'}
                      </span>
                      {!eligibility?.quizPassed && resource.quizId && (
                        <button
                          type="button"
                          onClick={() => onOpenQuiz(resource.quizId!, resource.id)}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-xs font-semibold cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#F4A6C0]" />
                          <span>Take Safety Quiz</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {(resource.riskLevel === 'high' || resource.supervisedAccess) && (
                  <div className="flex items-start gap-2.5">
                    {eligibility?.supervisorApproved ? (
                      <CheckCircle2 className="w-4 h-4 text-[#3FA776] shrink-0 mt-0.5" />
                    ) : (
                      <Clock className="w-4 h-4 text-[#E0A33A] shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-semibold text-[#F5F1F2] block">
                        Supervisor / Owner Sign-off
                      </span>
                      <span className="text-[#B8AEB2]">
                        {eligibility?.supervisorApproved
                          ? 'Certified for supervised access.'
                          : 'Pending supervisor approval.'}
                      </span>
                    </div>
                  </div>
                )}

                <div
                  className={`p-3 rounded-xl border text-xs font-medium ${
                    isEligible
                      ? 'bg-[#0D0D0F] border-[#3FA776]/60 text-[#3FA776]'
                      : 'bg-[#0D0D0F] border-[#2C2A2F] text-[#F4A6C0]'
                  }`}
                >
                  {isEligible ? 'Eligible to submit booking request' : 'Complete prerequisites above'}
                </div>
              </div>
            )}
          </div>

          {/* Availability Slots */}
          {resource.transferMode === 'temporary' ? (
            <div className="rounded-2xl bg-[#17171B] border border-[#2C2A2F] p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#2C2A2F]">
                <h3 className="text-xs font-bold font-mono-code uppercase tracking-wider text-[#F4A6C0]">
                  Available Time Slots
                </h3>
                <span className="text-xs text-[#B8AEB2]">{slots.length} listed</span>
              </div>

              {slots.length === 0 ? (
                <p className="text-xs text-[#B8AEB2] py-4 text-center">
                  No scheduled slots have been added by the owner yet.
                  {resource.bookingContactOrUrl
                    ? ' You can use the booking link or contact above.'
                    : ''}
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {slots.map((slot) => {
                    const start = new Date(slot.start);
                    const end = new Date(slot.end);
                    const isSelected = selectedSlotId === slot.id;
                    const isBlocked = slot.state === 'blocked';
                    const isBooked = slot.state === 'confirmed' || slot.state === 'held';

                    return (
                      <button
                        type="button"
                        key={slot.id}
                        disabled={isBlocked}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`w-full p-3 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#7A1F3D] border-[#F4A6C0] text-[#F5F1F2]'
                            : isBlocked
                            ? 'bg-[#0D0D0F] border-[#2C2A2F] text-[#B8AEB2]/60 cursor-not-allowed'
                            : 'bg-[#0D0D0F] border-[#2C2A2F] hover:border-[#F4A6C0]/60 text-[#F5F1F2]'
                        }`}
                      >
                        <div className="flex items-center justify-between font-mono-code font-semibold">
                          <span>
                            {start.toLocaleDateString([], {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <span className={isBooked ? 'text-[#E0A33A]' : 'text-[#3FA776]'}>
                            {isBlocked
                              ? 'Maintenance'
                              : isBooked
                              ? 'Booked (Waitlist)'
                              : 'Available'}
                          </span>
                        </div>
                        <div className="text-[#B8AEB2] mt-0.5">
                          {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                          {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-[#17171B] border border-[#2C2A2F] p-6 space-y-2">
              <h3 className="text-xs font-bold font-mono-code uppercase tracking-wider text-[#F4A6C0]">
                Permanent Handover
              </h3>
              <p className="text-xs text-[#B8AEB2] leading-relaxed">
                This resource is listed for permanent transfer ({resource.priceMode === 'free' ? 'Giveaway' : `${resource.currency || 'USD'} ${resource.price}`}).
              </p>
            </div>
          )}

          {/* Action CTA */}
          <div>
            {!currentUser ? (
              <button
                type="button"
                onClick={handlePrimaryAction}
                className="w-full py-3.5 px-4 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-sm font-semibold transition-colors cursor-pointer"
              >
                Sign in to Request Access
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePrimaryAction}
                disabled={
                  !isEligible ||
                  (resource.transferMode === 'temporary' && slots.length > 0 && !selectedSlotId)
                }
                className="w-full py-3.5 px-4 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {!isEligible
                  ? 'Complete Prerequisites First'
                  : resource.transferMode === 'temporary' && slots.length > 0 && !selectedSlotId
                  ? 'Select a Time Slot Above'
                  : selectedSlot?.state === 'confirmed' || selectedSlot?.state === 'held'
                  ? 'Join Waitlist for Slot'
                  : resource.transferMode === 'permanent'
                  ? 'Request Handover'
                  : 'Request Access & Reserve'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
