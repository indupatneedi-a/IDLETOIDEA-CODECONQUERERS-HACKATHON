import React, { useEffect, useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { User, RequestItem, Resource, HandoverRecord, Incident } from '../types';
import { StatusChip } from '../components/StatusChip';

interface TimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string | null;
  currentUser: User | null;
}

export const TimelineModal: React.FC<TimelineModalProps> = ({
  isOpen,
  onClose,
  requestId,
  currentUser,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    request: RequestItem | null;
    resource: Resource | null;
    handover: HandoverRecord | null;
    incident: Incident | null;
  }>({ request: null, resource: null, handover: null, incident: null });

  useEffect(() => {
    if (!isOpen || !requestId) return;
    let active = true;
    setLoading(true);
    api
      .getTimelineData(requestId)
      .then((res) => {
        if (active) setData(res);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, requestId]);

  if (!isOpen || !requestId) return null;

  const { request, resource, handover, incident } = data;

  const isAuthorizedToViewEvidence =
    currentUser &&
    (currentUser.id === request?.requesterId ||
      currentUser.id === resource?.ownerId ||
      resource?.assignedSupervisorIds.includes(currentUser.id) ||
      currentUser.role === 'admin');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-[#17171B] border border-[#2C2A2F] p-6 text-left">
        <div className="flex items-center justify-between pb-3 border-b border-[#2C2A2F] mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono-code text-[#F4A6C0] uppercase tracking-wider">
                Transaction Timeline
              </span>
              {request && <StatusChip status={request.status} size="sm" />}
            </div>
            <h3 className="text-base font-bold text-[#F5F1F2] font-title mt-0.5">
              {resource?.title || request?.resourceTitle || 'Booking Record'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#B8AEB2] hover:text-[#F5F1F2] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-xs flex items-center justify-between text-[#B8AEB2] mb-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#F4A6C0] shrink-0" />
            <span>
              Inspection records and incident statements are visible only to transaction parties and reviewers.
            </span>
          </div>
          <span className="text-[11px] font-mono-code text-[#F4A6C0] shrink-0 ml-2">
            {isAuthorizedToViewEvidence ? 'Authorized' : 'Restricted'}
          </span>
        </div>

        {loading ? (
          <div className="py-10 text-center text-xs text-[#B8AEB2]">Loading timeline...</div>
        ) : !request ? (
          <div className="py-10 text-center text-xs text-[#B8AEB2]">Booking record unavailable.</div>
        ) : (
          <div className="space-y-6 max-h-96 overflow-y-auto pr-2">
            <div className="relative pl-6 border-l-2 border-[#2C2A2F] space-y-1">
              <div className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full bg-[#F4A6C0]" />
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#F5F1F2]">Request Submitted</span>
                <span className="font-mono-code text-[#B8AEB2] text-[11px]">
                  {new Date(request.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-[#B8AEB2]">{request.message}</p>
            </div>

            {request.decisionAt && (
              <div className="relative pl-6 border-l-2 border-[#2C2A2F] space-y-1">
                <div className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full bg-[#3FA776]" />
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#F5F1F2]">Review Decision</span>
                  <span className="font-mono-code text-[#B8AEB2] text-[11px]">
                    {new Date(request.decisionAt).toLocaleString()}
                  </span>
                </div>
                {request.decisionReasonCode && (
                  <div className="text-xs text-[#3FA776] font-mono-code">
                    {request.decisionReasonCode}
                  </div>
                )}
                {request.decisionNote && (
                  <p className="text-xs text-[#B8AEB2]">{request.decisionNote}</p>
                )}
              </div>
            )}

            {handover && (
              <div className="relative pl-6 border-l-2 border-[#2C2A2F] space-y-2">
                <div className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full bg-[#F4A6C0]" />
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#F5F1F2]">Check-Out Recorded</span>
                  <span className="font-mono-code text-[#B8AEB2] text-[11px]">
                    {new Date(handover.checkoutAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-[#B8AEB2]">
                  Initial condition: {handover.beforeCondition}
                </p>
                {isAuthorizedToViewEvidence && handover.beforePhotos?.[0] && (
                  <img
                    src={handover.beforePhotos[0]}
                    alt="Check-out"
                    className="w-20 h-14 object-cover rounded-lg border border-[#2C2A2F]"
                  />
                )}
              </div>
            )}

            {handover?.returnedAt && (
              <div className="relative pl-6 border-l-2 border-[#2C2A2F] space-y-2">
                <div className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full bg-[#3FA776]" />
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#F5F1F2]">Return Inspection Logged</span>
                  <span className="font-mono-code text-[#B8AEB2] text-[11px]">
                    {new Date(handover.returnedAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-[#B8AEB2]">
                  Return condition: {handover.returnCondition}
                </p>
                {handover.issuesReported && (
                  <p className="text-xs text-[#E0A33A]">
                    Issues noted: {handover.issuesReported}
                  </p>
                )}
                {isAuthorizedToViewEvidence && handover.returnPhotos?.[0] && (
                  <img
                    src={handover.returnPhotos[0]}
                    alt="Return"
                    className="w-20 h-14 object-cover rounded-lg border border-[#2C2A2F]"
                  />
                )}
              </div>
            )}

            {incident && (
              <div className="relative pl-6 border-l-2 border-[#E0555F] space-y-2">
                <div className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full bg-[#E0555F]" />
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#E0555F]">
                    Condition Inquiry ({incident.title})
                  </span>
                  <span className="font-mono-code text-[#B8AEB2] text-[11px]">
                    {new Date(incident.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-[#B8AEB2]">{incident.description}</p>
                {incident.response && (
                  <p className="text-xs text-[#3FA776]">Response: {incident.response}</p>
                )}
                {incident.decision && (
                  <div className="p-2.5 rounded-lg bg-[#0D0D0F] border border-[#3FA776]/50 text-[#3FA776] text-xs">
                    <strong>Resolution:</strong> {incident.decision}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="pt-4 mt-4 border-t border-[#2C2A2F] text-center">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-[#0D0D0F] hover:bg-[#1E1E24] border border-[#2C2A2F] text-[#F5F1F2] text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
