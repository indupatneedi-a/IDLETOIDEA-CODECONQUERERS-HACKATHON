import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ShieldAlert,
} from 'lucide-react';
import {
  User,
  RiskLevel,
  PriceMode,
  TransferMode,
  ApprovalMode,
  Resource,
  QuizQuestion,
} from '../types';
import { api } from '../services/api';

interface CreateListingPageProps {
  currentUser: User | null;
  onBack: () => void;
  onSuccess: (resourceId: string) => void;
  onNavigateLogin: () => void;
}

export const CreateListingPage: React.FC<CreateListingPageProps> = ({
  currentUser,
  onBack,
  onSuccess,
  onNavigateLogin,
}) => {
  const [title, setTitle] = useState('');
  const [resourceType, setResourceType] = useState<'equipment' | 'workspace'>('equipment');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [bookingContactOrUrl, setBookingContactOrUrl] = useState('');

  const [priceMode, setPriceMode] = useState<PriceMode>('free');
  const [transferMode, setTransferMode] = useState<TransferMode>('temporary');
  const [price, setPrice] = useState<string>('');
  const [currency, setCurrency] = useState('USD');
  const [priceUnit, setPriceUnit] = useState('hour');

  const [riskLevel, setRiskLevel] = useState<RiskLevel>('low');
  const [trainingRequired, setTrainingRequired] = useState(false);
  const [supervisedAccess, setSupervisedAccess] = useState(false);
  const [allowedUsers, setAllowedUsers] = useState('');
  const [safetyNotes, setSafetyNotes] = useState('');
  const [ppe, setPpe] = useState('');
  const [prohibitedUses, setProhibitedUses] = useState('');
  const [conditionSummary, setConditionSummary] = useState('');
  const [accessories, setAccessories] = useState('');
  const [collectionPoint, setCollectionPoint] = useState('');
  const [setupNotes, setSetupNotes] = useState('');
  const [returnInstructions, setReturnInstructions] = useState('');

  const [approvalMode, setApprovalMode] = useState<ApprovalMode>('owner-review');
  const [highDemand, setHighDemand] = useState(false);
  const [bookingCap, setBookingCap] = useState(2);
  const [cancellationNoticeHours, setCancellationNoticeHours] = useState(4);
  const [graceMinutes, setGraceMinutes] = useState(15);

  // Availability slot generator state
  const [slotDate, setSlotDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [slotStartTime, setSlotStartTime] = useState('09:00');
  const [slotEndTime, setSlotEndTime] = useState('12:00');
  const [initialSlots, setInitialSlots] = useState<{ start: string; end: string }[]>([]);

  // Optional Safety Quiz Builder state
  const [quizTitle, setQuizTitle] = useState('');
  const [passMarkPercent, setPassMarkPercent] = useState(80);
  const [maxAttemptsPerDay, setMaxAttemptsPerDay] = useState(3);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newOptions, setNewOptions] = useState(['', '', '']);
  const [newCorrectIndex, setNewCorrectIndex] = useState(0);
  const [newExplanation, setNewExplanation] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdResource, setCreatedResource] = useState<Resource | null>(null);

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-[#F5F1F2] font-title">Sign in to list equipment</h2>
        <p className="text-sm text-[#B8AEB2]">
          Register or sign in with an Organization / Owner account to publish tools or workspaces.
        </p>
        <button
          type="button"
          onClick={onNavigateLogin}
          className="px-5 py-2.5 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-sm font-semibold cursor-pointer"
        >
          Go to Sign in
        </button>
      </div>
    );
  }

  if (currentUser.role !== 'owner' && currentUser.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-left space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-mono-code text-[#B8AEB2] hover:text-[#F5F1F2] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#F4A6C0]" />
          <span>Back</span>
        </button>
        <div className="p-6 rounded-2xl bg-[#17171B] border border-[#2C2A2F] space-y-3">
          <div className="flex items-center gap-2 text-[#E0A33A]">
            <ShieldAlert className="w-5 h-5" />
            <h2 className="text-lg font-bold text-[#F5F1F2]">Organization / Owner Account Required</h2>
          </div>
          <p className="text-sm text-[#B8AEB2] leading-relaxed">
            Your current account role is <strong className="text-[#F5F1F2]">{currentUser.role}</strong>. To publish equipment or workspaces, create an account as an <strong className="text-[#F5F1F2]">Organization / Owner</strong> or ask your platform administrator to grant Owner permissions.
          </p>
        </div>
      </div>
    );
  }

  const handleAddSlot = () => {
    setErrorMessage(null);
    if (!slotDate || !slotStartTime || !slotEndTime) return;
    const startDt = new Date(`${slotDate}T${slotStartTime}`);
    const endDt = new Date(`${slotDate}T${slotEndTime}`);
    if (isNaN(startDt.getTime()) || isNaN(endDt.getTime()) || endDt <= startDt) {
      setErrorMessage('Slot end time must be after start time.');
      return;
    }
    setInitialSlots((prev) => [
      ...prev,
      { start: startDt.toISOString(), end: endDt.toISOString() },
    ]);
  };

  const handleAddQuestion = () => {
    setErrorMessage(null);
    const cleanedOptions = newOptions.map((o) => o.trim()).filter(Boolean);
    if (!newQuestionText.trim() || cleanedOptions.length < 2) {
      setErrorMessage('Provide a question and at least 2 answer choices.');
      return;
    }
    const safeCorrectIdx = Math.min(newCorrectIndex, cleanedOptions.length - 1);
    setQuizQuestions((prev) => [
      ...prev,
      {
        id: `q_${Date.now()}_${prev.length}`,
        text: newQuestionText.trim(),
        options: cleanedOptions,
        correctIndex: safeCorrectIdx,
        explanation: newExplanation.trim() || 'Follow the posted safety instructions for this equipment.',
      },
    ]);
    setNewQuestionText('');
    setNewOptions(['', '', '']);
    setNewCorrectIndex(0);
    setNewExplanation('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim() || !category.trim() || !description.trim() || !location.trim()) {
      setErrorMessage('Please fill in title, category, description, and location.');
      return;
    }

    if (photoUrl.trim() && !/^https?:\/\//i.test(photoUrl.trim())) {
      setErrorMessage('Photo URL must start with http:// or https://');
      return;
    }

    if (trainingRequired && quizQuestions.length === 0) {
      setErrorMessage('Please add at least one safety quiz question when safety training is required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createListing(currentUser, {
        title: title.trim(),
        resourceType,
        category: category.trim(),
        description: description.trim(),
        photos: photoUrl.trim() ? [photoUrl.trim()] : [],
        location: location.trim(),
        priceMode,
        transferMode,
        price: priceMode === 'paid' ? Math.max(0, Number(price) || 0) : 0,
        currency: priceMode === 'paid' ? currency : undefined,
        priceUnit: priceMode === 'paid' ? priceUnit : undefined,
        bookingContactOrUrl: bookingContactOrUrl.trim() || undefined,
        riskLevel,
        trainingRequired,
        supervisedAccess,
        allowedUsers: allowedUsers.trim() || undefined,
        safetyNotes: safetyNotes.trim() || undefined,
        ppe: ppe.split(',').map((s) => s.trim()).filter(Boolean),
        prohibitedUses: prohibitedUses.split(',').map((s) => s.trim()).filter(Boolean),
        conditionSummary: conditionSummary.trim() || undefined,
        accessories: accessories.split(',').map((s) => s.trim()).filter(Boolean),
        collectionPoint: collectionPoint.trim() || undefined,
        setupNotes: setupNotes.trim() || undefined,
        returnInstructions: returnInstructions.trim() || undefined,
        approvalMode,
        highDemand,
        policies: {
          bookingCap: Math.max(1, bookingCap),
          waitlistOfferHours: 24,
          pendingExpiryHours: 48,
          minNoticeHours: 2,
          cancellationNoticeHours: Math.max(0, cancellationNoticeHours),
          noShowMinutes: 15,
          repeatedNoShowThreshold: 2,
          graceMinutes: Math.max(0, graceMinutes),
          autoExtendEnabled: riskLevel === 'low',
          maxExtensionMinutes: 60,
        },
        initialSlots: transferMode === 'temporary' ? initialSlots : undefined,
        quizDraft:
          trainingRequired && quizQuestions.length > 0
            ? {
                title: quizTitle.trim() || `${title.trim()} Safety Check`,
                passMarkPercent,
                maxAttemptsPerDay,
                questions: quizQuestions,
              }
            : undefined,
      });

      if (res.success && res.data) {
        setCreatedResource(res.data);
      } else {
        setErrorMessage(res.error || 'Failed to publish listing.');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unexpected error saving listing.');
    } finally {
      setSubmitting(false);
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
        <span>Back</span>
      </button>

      <div className="p-6 rounded-2xl bg-[#17171B] border border-[#2C2A2F]">
        <h1 className="text-2xl font-bold text-[#F5F1F2] font-title">
          List Equipment or Creative Workspace
        </h1>
        <p className="text-xs text-[#B8AEB2] mt-1">
          Enter accurate equipment specifications, safety prerequisites, and availability slots.
        </p>
      </div>

      {createdResource ? (
        <div className="p-8 rounded-2xl bg-[#17171B] border border-[#3FA776]/60 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-[#3FA776] mx-auto" />
          <h2 className="text-xl font-bold text-[#F5F1F2]">
            {createdResource.listingState === 'pending-admin-check'
              ? 'Listing Submitted for Verification'
              : 'Listing Published'}
          </h2>
          <p className="text-sm text-[#B8AEB2] max-w-md mx-auto leading-relaxed">
            {createdResource.listingState === 'pending-admin-check'
              ? 'High-risk listings from unverified owner accounts require administrator review before becoming publicly bookable.'
              : 'Your resource is now live and visible to visitors browsing the catalog.'}
          </p>
          <button
            type="button"
            onClick={() => onSuccess(createdResource.id)}
            className="px-6 py-2.5 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-sm font-semibold cursor-pointer"
          >
            View Listing
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-2xl bg-[#17171B] border border-[#2C2A2F] space-y-6"
        >
          {errorMessage && (
            <div className="p-3 rounded-xl bg-[#0D0D0F] border border-[#E0555F] text-[#E0555F] text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Core Details */}
          <div className="space-y-4">
            <h2 className="text-xs font-mono-code uppercase tracking-wider text-[#F4A6C0] font-bold">
              1. Core Details
            </h2>

            <div>
              <label htmlFor="res-title" className="text-xs text-[#B8AEB2] font-medium block mb-1">
                Equipment or Workspace Name *
              </label>
              <input
                id="res-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter equipment or workspace name"
                className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-sm text-[#F5F1F2] outline-none focus:border-[#F4A6C0]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="res-type" className="text-xs text-[#B8AEB2] font-medium block mb-1">
                  Resource Type *
                </label>
                <select
                  id="res-type"
                  value={resourceType}
                  onChange={(e) => setResourceType(e.target.value as 'equipment' | 'workspace')}
                  className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-sm text-[#F5F1F2] outline-none focus:border-[#F4A6C0]"
                >
                  <option value="equipment">Physical Equipment / Machine</option>
                  <option value="workspace">Workspace / Lab Bench</option>
                </select>
              </div>

              <div>
                <label htmlFor="res-cat" className="text-xs text-[#B8AEB2] font-medium block mb-1">
                  Category *
                </label>
                <input
                  id="res-cat"
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. 3D Printing, Laser & CNC, Electronics"
                  className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-sm text-[#F5F1F2] outline-none focus:border-[#F4A6C0]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="res-desc" className="text-xs text-[#B8AEB2] font-medium block mb-1">
                Description *
              </label>
              <textarea
                id="res-desc"
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe capabilities, workspace specs, compatible materials, and limitations..."
                className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-sm text-[#F5F1F2] outline-none focus:border-[#F4A6C0]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="res-loc" className="text-xs text-[#B8AEB2] font-medium block mb-1">
                  Location *
                </label>
                <input
                  id="res-loc"
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, building, or workshop room"
                  className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-sm text-[#F5F1F2] outline-none focus:border-[#F4A6C0]"
                />
              </div>

              <div>
                <label htmlFor="res-photo" className="text-xs text-[#B8AEB2] font-medium block mb-1">
                  Photo URL (optional)
                </label>
                <input
                  id="res-photo"
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-sm text-[#F5F1F2] outline-none focus:border-[#F4A6C0]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="res-contact" className="text-xs text-[#B8AEB2] font-medium block mb-1">
                Booking link or contact (optional)
              </label>
              <input
                id="res-contact"
                type="text"
                value={bookingContactOrUrl}
                onChange={(e) => setBookingContactOrUrl(e.target.value)}
                placeholder="External booking URL, email, or phone number"
                className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-sm text-[#F5F1F2] outline-none focus:border-[#F4A6C0]"
              />
            </div>
          </div>

          {/* 2. Access & Pricing */}
          <div className="space-y-4 pt-5 border-t border-[#2C2A2F]">
            <h2 className="text-xs font-mono-code uppercase tracking-wider text-[#F4A6C0] font-bold">
              2. Access &amp; Transfer Mode
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="res-price-mode" className="text-xs text-[#B8AEB2] font-medium block mb-1">
                  Pricing
                </label>
                <select
                  id="res-price-mode"
                  value={priceMode}
                  onChange={(e) => setPriceMode(e.target.value as PriceMode)}
                  className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-sm text-[#F5F1F2]"
                >
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              <div>
                <label htmlFor="res-transfer-mode" className="text-xs text-[#B8AEB2] font-medium block mb-1">
                  Transfer Mode
                </label>
                <select
                  id="res-transfer-mode"
                  value={transferMode}
                  onChange={(e) => setTransferMode(e.target.value as TransferMode)}
                  className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-sm text-[#F5F1F2]"
                >
                  <option value="temporary">Temporary (Scheduled Time Slots)</option>
                  <option value="permanent">Permanent (Giveaway / Sale Handover)</option>
                </select>
              </div>
            </div>

            {priceMode === 'paid' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="res-currency" className="text-xs text-[#B8AEB2] font-medium block mb-1">
                    Currency
                  </label>
                  <select
                    id="res-currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-sm text-[#F5F1F2]"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                    <option value="CAD">CAD</option>
                    <option value="AUD">AUD</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="res-price" className="text-xs text-[#B8AEB2] font-medium block mb-1">
                    Amount
                  </label>
                  <input
                    id="res-price"
                    type="number"
                    min="0"
                    step="any"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0"
                    className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-sm text-[#F5F1F2]"
                  />
                </div>
                {transferMode === 'temporary' && (
                  <div>
                    <label htmlFor="res-unit" className="text-xs text-[#B8AEB2] font-medium block mb-1">
                      Billing Unit
                    </label>
                    <select
                      id="res-unit"
                      value={priceUnit}
                      onChange={(e) => setPriceUnit(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-sm text-[#F5F1F2]"
                    >
                      <option value="hour">per hour</option>
                      <option value="session">per session</option>
                      <option value="day">per day</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Availability Slots (for Temporary) */}
          {transferMode === 'temporary' && (
            <div className="space-y-4 pt-5 border-t border-[#2C2A2F]">
              <h2 className="text-xs font-mono-code uppercase tracking-wider text-[#F4A6C0] font-bold">
                3. Initial Availability Slots (optional)
              </h2>
              <p className="text-xs text-[#B8AEB2]">
                Add one or more open time slots now, or add them later from your Owner Hub.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label htmlFor="slot-date" className="text-xs text-[#B8AEB2] block mb-1">
                    Date
                  </label>
                  <input
                    id="slot-date"
                    type="date"
                    value={slotDate}
                    onChange={(e) => setSlotDate(e.target.value)}
                    className="w-full p-2 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-xs text-[#F5F1F2]"
                  />
                </div>
                <div>
                  <label htmlFor="slot-start" className="text-xs text-[#B8AEB2] block mb-1">
                    Start time
                  </label>
                  <input
                    id="slot-start"
                    type="time"
                    value={slotStartTime}
                    onChange={(e) => setSlotStartTime(e.target.value)}
                    className="w-full p-2 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-xs text-[#F5F1F2]"
                  />
                </div>
                <div>
                  <label htmlFor="slot-end" className="text-xs text-[#B8AEB2] block mb-1">
                    End time
                  </label>
                  <input
                    id="slot-end"
                    type="time"
                    value={slotEndTime}
                    onChange={(e) => setSlotEndTime(e.target.value)}
                    className="w-full p-2 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-xs text-[#F5F1F2]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddSlot}
                  className="py-2 px-4 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] hover:border-[#F4A6C0] text-xs font-semibold text-[#F5F1F2] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#F4A6C0]" />
                  <span>Add Slot</span>
                </button>
              </div>

              {initialSlots.length > 0 && (
                <div className="space-y-1.5">
                  {initialSlots.map((s, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0D0D0F] border border-[#2C2A2F] text-xs text-[#F5F1F2]"
                    >
                      <span className="font-mono-code">
                        {new Date(s.start).toLocaleString()} – {new Date(s.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        type="button"
                        onClick={() => setInitialSlots((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-[#E0555F] hover:underline cursor-pointer"
                        aria-label="Remove slot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. Safety & Risk Classification */}
          <div className="space-y-4 pt-5 border-t border-[#2C2A2F]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-mono-code uppercase tracking-wider text-[#F4A6C0] font-bold">
                4. Safety &amp; Eligibility Requirements
              </h2>
              <span className="text-xs text-[#E0A33A]">
                High-risk listings from unverified owners undergo Admin verification
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="res-risk" className="text-xs text-[#B8AEB2] font-medium block mb-1">
                  Risk Level
                </label>
                <select
                  id="res-risk"
                  value={riskLevel}
                  onChange={(e) => {
                    const r = e.target.value as RiskLevel;
                    setRiskLevel(r);
                    if (r === 'medium') {
                      setTrainingRequired(true);
                    } else if (r === 'high') {
                      setTrainingRequired(true);
                      setSupervisedAccess(true);
                      setApprovalMode('supervisor-review');
                    }
                  }}
                  className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-sm text-[#F5F1F2]"
                >
                  <option value="low">Low risk (general access)</option>
                  <option value="medium">Medium risk (safety quiz recommended)</option>
                  <option value="high">High risk (quiz + supervisor sign-off)</option>
                </select>
              </div>

              <div>
                <label htmlFor="res-approval" className="text-xs text-[#B8AEB2] font-medium block mb-1">
                  Approval Mode
                </label>
                <select
                  id="res-approval"
                  value={approvalMode}
                  disabled={riskLevel === 'high'}
                  onChange={(e) => setApprovalMode(e.target.value as ApprovalMode)}
                  className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-sm text-[#F5F1F2] disabled:opacity-60"
                >
                  <option value="auto-if-low-risk">Auto-confirm if low-risk &amp; eligible</option>
                  <option value="owner-review">Owner review required</option>
                  <option value="supervisor-review">Supervisor review required</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 text-xs text-[#F5F1F2]">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={trainingRequired}
                  onChange={(e) => setTrainingRequired(e.target.checked)}
                  className="accent-[#F4A6C0]"
                />
                <span>Require safety readiness quiz before booking</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={supervisedAccess}
                  onChange={(e) => setSupervisedAccess(e.target.checked)}
                  className="accent-[#F4A6C0]"
                />
                <span>Require supervisor in-person sign-off</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={highDemand}
                  onChange={(e) => setHighDemand(e.target.checked)}
                  className="accent-[#F4A6C0]"
                />
                <span>Enforce active booking cap (high demand)</span>
              </label>
            </div>

            {trainingRequired && (
              <div className="p-4 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] space-y-4">
                <h3 className="text-xs font-mono-code uppercase text-[#F4A6C0] font-semibold">
                  Safety Quiz Configuration
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="quiz-title" className="text-xs text-[#B8AEB2] block mb-1">
                      Quiz Title
                    </label>
                    <input
                      id="quiz-title"
                      type="text"
                      value={quizTitle}
                      onChange={(e) => setQuizTitle(e.target.value)}
                      placeholder="e.g. Laser Safety Check"
                      className="w-full p-2 rounded-lg bg-[#17171B] border border-[#2C2A2F] text-xs text-[#F5F1F2]"
                    />
                  </div>
                  <div>
                    <label htmlFor="quiz-pass" className="text-xs text-[#B8AEB2] block mb-1">
                      Pass Mark (%)
                    </label>
                    <input
                      id="quiz-pass"
                      type="number"
                      min="1"
                      max="100"
                      value={passMarkPercent}
                      onChange={(e) => setPassMarkPercent(Number(e.target.value))}
                      className="w-full p-2 rounded-lg bg-[#17171B] border border-[#2C2A2F] text-xs text-[#F5F1F2]"
                    />
                  </div>
                  <div>
                    <label htmlFor="quiz-attempts" className="text-xs text-[#B8AEB2] block mb-1">
                      Daily Attempts Limit
                    </label>
                    <input
                      id="quiz-attempts"
                      type="number"
                      min="1"
                      max="10"
                      value={maxAttemptsPerDay}
                      onChange={(e) => setMaxAttemptsPerDay(Number(e.target.value))}
                      className="w-full p-2 rounded-lg bg-[#17171B] border border-[#2C2A2F] text-xs text-[#F5F1F2]"
                    />
                  </div>
                </div>

                {quizQuestions.length > 0 && (
                  <div className="space-y-2">
                    {quizQuestions.map((q, i) => (
                      <div
                        key={q.id}
                        className="p-2.5 rounded-lg bg-[#17171B] border border-[#2C2A2F] flex items-start justify-between gap-2 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-[#F5F1F2]">
                            Q{i + 1}: {q.text}
                          </p>
                          <p className="text-[#3FA776] mt-0.5">
                            Correct: {q.options[q.correctIndex]}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setQuizQuestions((prev) => prev.filter((item) => item.id !== q.id))
                          }
                          className="text-[#E0555F] cursor-pointer"
                          aria-label="Delete question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t border-[#2C2A2F]">
                  <input
                    type="text"
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    placeholder="Question prompt..."
                    className="w-full p-2 rounded-lg bg-[#17171B] border border-[#2C2A2F] text-xs text-[#F5F1F2]"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {newOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="correct-opt"
                          checked={newCorrectIndex === idx}
                          onChange={() => setNewCorrectIndex(idx)}
                          title="Mark as correct option"
                          className="accent-[#3FA776]"
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const next = [...newOptions];
                            next[idx] = e.target.value;
                            setNewOptions(next);
                          }}
                          placeholder={`Option ${idx + 1}`}
                          className="w-full p-1.5 rounded-lg bg-[#17171B] border border-[#2C2A2F] text-xs text-[#F5F1F2]"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newExplanation}
                      onChange={(e) => setNewExplanation(e.target.value)}
                      placeholder="Brief safety explanation (shown after answering)"
                      className="flex-1 p-2 rounded-lg bg-[#17171B] border border-[#2C2A2F] text-xs text-[#F5F1F2]"
                    />
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="px-4 py-2 rounded-lg bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Question</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="res-safety" className="text-xs text-[#B8AEB2] font-medium block mb-1">
                Safety Notes (optional)
              </label>
              <textarea
                id="res-safety"
                rows={2}
                value={safetyNotes}
                onChange={(e) => setSafetyNotes(e.target.value)}
                placeholder="Key safety checks or operating limits..."
                className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-sm text-[#F5F1F2]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="res-ppe" className="text-xs text-[#B8AEB2] font-medium block mb-1">
                  Required PPE (comma-separated)
                </label>
                <input
                  id="res-ppe"
                  type="text"
                  value={ppe}
                  onChange={(e) => setPpe(e.target.value)}
                  placeholder="e.g. Safety glasses, Nitrile gloves"
                  className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-sm text-[#F5F1F2]"
                />
              </div>
              <div>
                <label htmlFor="res-prohibited" className="text-xs text-[#B8AEB2] font-medium block mb-1">
                  Prohibited Uses (comma-separated)
                </label>
                <input
                  id="res-prohibited"
                  type="text"
                  value={prohibitedUses}
                  onChange={(e) => setProhibitedUses(e.target.value)}
                  placeholder="e.g. Unattended operation"
                  className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-sm text-[#F5F1F2]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="res-accessories" className="text-xs text-[#B8AEB2] font-medium block mb-1">
                  Included Accessories (comma-separated)
                </label>
                <input
                  id="res-accessories"
                  type="text"
                  value={accessories}
                  onChange={(e) => setAccessories(e.target.value)}
                  placeholder="e.g. Power cable, Hex keys"
                  className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-sm text-[#F5F1F2]"
                />
              </div>
              <div>
                <label htmlFor="res-collection" className="text-xs text-[#B8AEB2] font-medium block mb-1">
                  Collection / Handover Point
                </label>
                <input
                  id="res-collection"
                  type="text"
                  value={collectionPoint}
                  onChange={(e) => setCollectionPoint(e.target.value)}
                  placeholder="e.g. Front desk or Bay B"
                  className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-sm text-[#F5F1F2]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="res-cap" className="text-xs text-[#B8AEB2] font-medium block mb-1">
                  Active Booking Cap
                </label>
                <input
                  id="res-cap"
                  type="number"
                  min="1"
                  value={bookingCap}
                  onChange={(e) => setBookingCap(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-sm text-[#F5F1F2]"
                />
              </div>
              <div>
                <label htmlFor="res-cancel" className="text-xs text-[#B8AEB2] font-medium block mb-1">
                  Cancellation Notice (Hours)
                </label>
                <input
                  id="res-cancel"
                  type="number"
                  min="0"
                  value={cancellationNoticeHours}
                  onChange={(e) => setCancellationNoticeHours(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-sm text-[#F5F1F2]"
                />
              </div>
              <div>
                <label htmlFor="res-grace" className="text-xs text-[#B8AEB2] font-medium block mb-1">
                  Return Grace Period (Mins)
                </label>
                <input
                  id="res-grace"
                  type="number"
                  min="0"
                  value={graceMinutes}
                  onChange={(e) => setGraceMinutes(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-sm text-[#F5F1F2]"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#2C2A2F] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 text-sm text-[#B8AEB2] hover:text-[#F5F1F2] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-sm font-semibold disabled:opacity-50 transition-colors cursor-pointer"
            >
              {submitting ? 'Publishing...' : 'Publish Listing'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
