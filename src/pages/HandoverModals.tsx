import React, { useState } from 'react';
import { X, Key, RotateCcw, AlertCircle } from 'lucide-react';
import { User, RequestItem, Resource, HandoverRecord } from '../types';
import { api } from '../services/api';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: RequestItem | null;
  resource: Resource | null;
  currentUser: User | null;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  request,
  resource,
  currentUser,
}) => {
  const [beforeCondition, setBeforeCondition] = useState('');
  const [accessoriesChecked, setAccessoriesChecked] = useState<Record<string, boolean>>({});
  const [photoUrl, setPhotoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !request) return null;

  const dueTime = request.slotEnd || new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const handleCheckout = async () => {
    if (!currentUser) return;
    if (!beforeCondition.trim()) {
      setError('Please describe the initial equipment condition before handing over.');
      return;
    }

    setSubmitting(true);
    setError(null);
    const items = (resource?.accessories || []).map((item) => ({
      item,
      included: accessoriesChecked[item] !== false,
    }));

    try {
      const res = await api.recordCheckout(currentUser, request, {
        beforeCondition: beforeCondition.trim(),
        beforePhotos: photoUrl.trim() ? [photoUrl.trim()] : [],
        accessories: items,
        dueAt: dueTime,
      });

      if (res.success) {
        setBeforeCondition('');
        setPhotoUrl('');
        onClose();
      } else {
        setError(res.error || 'Check-out failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#17171B] border border-[#2C2A2F] p-6 text-left">
        <div className="flex items-center justify-between pb-3 border-b border-[#2C2A2F] mb-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-[#F4A6C0]" />
            <h3 className="text-base font-bold text-[#F5F1F2] font-title">
              Record Check-Out Condition
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

        <div className="space-y-4 text-xs">
          <div>
            <span className="text-[#B8AEB2] block">Resource</span>
            <strong className="text-[#F5F1F2] text-sm block">
              {resource?.title || request.resourceTitle}
            </strong>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-[#0D0D0F] border border-[#E0555F] text-[#E0555F] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="checkout-cond" className="text-[#B8AEB2] font-semibold block mb-1">
              Initial Condition Notes *
            </label>
            <textarea
              id="checkout-cond"
              rows={3}
              value={beforeCondition}
              onChange={(e) => setBeforeCondition(e.target.value)}
              placeholder="Document surface condition, calibration status, and any existing wear..."
              className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-xs text-[#F5F1F2] outline-none focus:border-[#F4A6C0]"
            />
          </div>

          {resource?.accessories && resource.accessories.length > 0 && (
            <div>
              <span className="text-[#B8AEB2] font-semibold block mb-1.5">
                Included Accessories Checklist
              </span>
              <div className="space-y-1.5 p-3 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F]">
                {resource.accessories.map((acc, i) => (
                  <label key={i} className="flex items-center gap-2 cursor-pointer text-[#F5F1F2]">
                    <input
                      type="checkbox"
                      defaultChecked
                      onChange={(e) =>
                        setAccessoriesChecked((prev) => ({ ...prev, [acc]: e.target.checked }))
                      }
                      className="accent-[#F4A6C0]"
                    />
                    <span>{acc}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="checkout-photo" className="text-[#B8AEB2] font-semibold block mb-1">
              Inspection Photo URL (optional)
            </label>
            <input
              id="checkout-photo"
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-xs text-[#F5F1F2] outline-none focus:border-[#F4A6C0]"
            />
          </div>

          <div className="pt-3 border-t border-[#2C2A2F] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[#B8AEB2] hover:text-[#F5F1F2] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleCheckout}
              className="px-5 py-2.5 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] font-semibold disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Recording...' : 'Confirm Check-Out'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: RequestItem | null;
  resource: Resource | null;
  handover: HandoverRecord | null;
  currentUser: User | null;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({
  isOpen,
  onClose,
  request,
  resource,
  handover,
  currentUser,
}) => {
  const [returnCondition, setReturnCondition] = useState('');
  const [issuesReported, setIssuesReported] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !request || !handover) return null;

  const handleReturn = async () => {
    if (!currentUser) return;
    if (!returnCondition.trim()) {
      setError('Please enter the return inspection condition.');
      return;
    }

    setSubmitting(true);
    setError(null);
    const items = (resource?.accessories || []).map((item) => ({
      item,
      returned: true,
    }));

    try {
      const res = await api.recordReturn(currentUser, request, handover, {
        returnCondition: returnCondition.trim(),
        returnPhotos: photoUrl.trim() ? [photoUrl.trim()] : [],
        accessoriesReturned: items,
        issuesReported: issuesReported.trim() || undefined,
      });

      if (res.success) {
        setReturnCondition('');
        setIssuesReported('');
        setPhotoUrl('');
        onClose();
      } else {
        setError(res.error || 'Failed to record return.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-[#17171B] border border-[#2C2A2F] p-6 text-left">
        <div className="flex items-center justify-between pb-3 border-b border-[#2C2A2F] mb-4">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-[#F4A6C0]" />
            <h3 className="text-base font-bold text-[#F5F1F2] font-title">
              Return Condition Inspection
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

        {error && (
          <div className="mb-4 p-2.5 rounded-lg bg-[#0D0D0F] border border-[#E0555F] text-[#E0555F] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-xs">
          <div className="p-3.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F]">
            <span className="text-[11px] font-mono-code text-[#B8AEB2] uppercase block mb-1">
              Check-Out Baseline
            </span>
            <p className="text-[#F5F1F2] mb-2">{handover.beforeCondition}</p>
            {handover.beforePhotos?.[0] && (
              <img
                src={handover.beforePhotos[0]}
                alt="Check-out baseline"
                className="w-full h-24 object-cover rounded-lg border border-[#2C2A2F]"
              />
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] space-y-2">
            <label htmlFor="return-cond" className="text-[11px] font-mono-code text-[#F4A6C0] uppercase block">
              Return Condition *
            </label>
            <textarea
              id="return-cond"
              rows={3}
              value={returnCondition}
              onChange={(e) => setReturnCondition(e.target.value)}
              placeholder="Note state after use, cleanliness, and accessories..."
              className="w-full p-2 rounded-lg bg-[#17171B] border border-[#2C2A2F] text-xs text-[#F5F1F2] outline-none focus:border-[#F4A6C0]"
            />
            <input
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="Return photo URL (optional)"
              className="w-full p-2 rounded-lg bg-[#17171B] border border-[#2C2A2F] text-xs text-[#F5F1F2] outline-none focus:border-[#F4A6C0]"
            />
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label htmlFor="return-issues" className="text-[#E0A33A] font-semibold block mb-1">
              Issues or Malfunctions Observed (optional)
            </label>
            <input
              id="return-issues"
              type="text"
              value={issuesReported}
              onChange={(e) => setIssuesReported(e.target.value)}
              placeholder="Describe any wear, error codes, or missing items..."
              className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-xs text-[#F5F1F2] outline-none focus:border-[#F4A6C0]"
            />
          </div>

          <div className="pt-3 border-t border-[#2C2A2F] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[#B8AEB2] hover:text-[#F5F1F2] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleReturn}
              className="px-5 py-2.5 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] font-semibold disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Complete Return Inspection'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
