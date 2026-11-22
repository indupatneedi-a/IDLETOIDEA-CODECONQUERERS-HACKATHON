import React, { useState } from 'react';
import { X, CheckCircle2, Clock, ListOrdered } from 'lucide-react';
import { Resource, Slot, User, RequestItem } from '../types';
import { api } from '../services/api';
import { StatusChip } from '../components/StatusChip';

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: Resource | null;
  slot?: Slot;
  currentUser: User | null;
  onNavigateToDashboard: () => void;
}

export const RequestModal: React.FC<RequestModalProps> = ({
  isOpen,
  onClose,
  resource,
  slot,
  currentUser,
  onNavigateToDashboard,
}) => {
  const [message, setMessage] = useState('');
  const [ackRules, setAckRules] = useState(false);
  const [transferTerms, setTransferTerms] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState<RequestItem | null>(null);
  const [waitlistInfo, setWaitlistInfo] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !resource) return null;

  const isPermanent = resource.transferMode === 'permanent';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!ackRules) {
      setErrorMessage('You must acknowledge the published safety and usage policies.');
      return;
    }
    if (!message.trim()) {
      setErrorMessage('Please describe your intended use.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const requestType =
      resource.transferMode === 'permanent'
        ? resource.priceMode === 'free'
          ? 'giveaway'
          : 'sale'
        : resource.priceMode === 'free'
        ? 'borrow'
        : 'rent';

    try {
      const res = await api.submitRequest(currentUser, resource, {
        slotId: slot?.id,
        slotStart: slot?.start,
        slotEnd: slot?.end,
        message: message.trim(),
        requestType,
        transferTerms: isPermanent ? transferTerms.trim() : undefined,
      });

      if (res.success && res.data) {
        setSubmittedRequest(res.data);
      } else if (res.reasonCode === 'WAITLISTED_FIRST_ELIGIBLE') {
        setWaitlistInfo(res.error || 'Placed on waitlist.');
      } else {
        setErrorMessage(res.error || 'Failed to submit request.');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDone = () => {
    setSubmittedRequest(null);
    setWaitlistInfo(null);
    setMessage('');
    setAckRules(false);
    onClose();
    onNavigateToDashboard();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#17171B] border border-[#2C2A2F] p-6 text-left">
        <div className="flex items-center justify-between pb-3 border-b border-[#2C2A2F]">
          <div>
            <h3 className="text-base font-bold text-[#F5F1F2] font-title">
              {isPermanent ? 'Permanent Handover Request' : 'Equipment Access Request'}
            </h3>
            <p className="text-xs text-[#B8AEB2]">{resource.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#B8AEB2] hover:text-[#F5F1F2] cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedRequest ? (
          <div className="py-6 space-y-4 text-center">
            {submittedRequest.status === 'confirmed' ? (
              <CheckCircle2 className="w-10 h-10 text-[#3FA776] mx-auto" />
            ) : (
              <Clock className="w-10 h-10 text-[#E0A33A] mx-auto" />
            )}

            <h4 className="text-lg font-bold text-[#F5F1F2]">
              {submittedRequest.status === 'confirmed'
                ? 'Booking Confirmed'
                : 'Request Submitted for Review'}
            </h4>

            <div className="inline-block">
              <StatusChip status={submittedRequest.status} />
            </div>

            <p className="text-xs text-[#B8AEB2] max-w-sm mx-auto leading-relaxed">
              {submittedRequest.decisionNote ||
                'Your request has been sent to the owner review queue.'}
            </p>

            <button
              type="button"
              onClick={handleDone}
              className="w-full py-2.5 px-4 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-xs font-semibold cursor-pointer"
            >
              Go to My Requests
            </button>
          </div>
        ) : waitlistInfo ? (
          <div className="py-6 space-y-4 text-center">
            <ListOrdered className="w-10 h-10 text-[#F4A6C0] mx-auto" />
            <h4 className="text-base font-bold text-[#F5F1F2]">Added to Waitlist</h4>
            <p className="text-xs text-[#B8AEB2] leading-relaxed max-w-sm mx-auto">
              {waitlistInfo}
            </p>
            <button
              type="button"
              onClick={handleDone}
              className="w-full py-2.5 px-4 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-xs font-semibold cursor-pointer"
            >
              View in My Requests
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {slot && (
              <div className="p-3 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-xs">
                <span className="text-[#B8AEB2] block">Selected Time Slot</span>
                <div className="text-sm font-bold text-[#F5F1F2] font-mono-code mt-0.5">
                  {new Date(slot.start).toLocaleDateString()} ·{' '}
                  {new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                  –{' '}
                  {new Date(slot.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )}

            {isPermanent && (
              <div>
                <label htmlFor="req-terms" className="text-xs text-[#B8AEB2] font-medium block mb-1">
                  Intended Project Use
                </label>
                <textarea
                  id="req-terms"
                  rows={2}
                  value={transferTerms}
                  onChange={(e) => setTransferTerms(e.target.value)}
                  placeholder="Describe how your project will use this resource..."
                  className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-xs text-[#F5F1F2] outline-none focus:border-[#F4A6C0]"
                />
              </div>
            )}

            <div>
              <label htmlFor="req-msg" className="text-xs text-[#B8AEB2] font-medium block mb-1">
                Message to Owner *
              </label>
              <textarea
                id="req-msg"
                rows={3}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share what you plan to work on and any relevant experience..."
                className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-xs text-[#F5F1F2] outline-none focus:border-[#F4A6C0]"
              />
            </div>

            {resource.priceMode === 'paid' && (
              <div className="p-3 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-xs flex items-center justify-between">
                <span className="text-[#B8AEB2]">Listed Rate</span>
                <span className="font-mono-code font-bold text-[#F4A6C0]">
                  {resource.currency || 'USD'} {resource.price}{' '}
                  {resource.priceUnit ? `/ ${resource.priceUnit}` : ''}
                </span>
              </div>
            )}

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] cursor-pointer text-xs text-[#B8AEB2]">
              <input
                type="checkbox"
                checked={ackRules}
                onChange={(e) => setAckRules(e.target.checked)}
                className="mt-0.5 accent-[#F4A6C0]"
              />
              <span>
                I agree to follow all safety guidelines, PPE rules, and the{' '}
                {resource.policies.cancellationNoticeHours}h cancellation notice policy, and to record check-out and return condition.
              </span>
            </label>

            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-[#0D0D0F] border border-[#E0555F] text-[#E0555F] text-xs">
                {errorMessage}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-[#B8AEB2] hover:text-[#F5F1F2] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
