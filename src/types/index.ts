/**
 * IDLETOIDEA Data Models & Entity Types
 */

export type UserRole = 'requester' | 'owner' | 'supervisor' | 'admin';

export type OwnerVerificationState = 'unverified' | 'verified' | 'flagged' | 'suspended';

export interface UserStanding {
  lateReturns: number;
  noShows: number;
  lateCancellations: number;
  incidentReports: number;
  restrictedUntil: string | null;
}

export interface User {
  id: string;
  displayName: string;
  email: string;
  phone?: string;
  role: UserRole;
  organisationName?: string;
  userTypeDescription: string;
  verificationState: OwnerVerificationState;
  standing: UserStanding;
  createdAt: string;
  updatedAt: string;
}

export type ResourceType = 'equipment' | 'workspace';
export type PriceMode = 'free' | 'paid';
export type TransferMode = 'temporary' | 'permanent';
export type RiskLevel = 'low' | 'medium' | 'high';
export type ApprovalMode = 'auto-if-low-risk' | 'owner-review' | 'supervisor-review';
export type ListingState = 'draft' | 'pending-admin-check' | 'active' | 'paused';

export interface ResourcePolicies {
  bookingCap: number;
  waitlistOfferHours: number;
  pendingExpiryHours: number;
  minNoticeHours: number;
  cancellationNoticeHours: number;
  noShowMinutes: number;
  repeatedNoShowThreshold: number;
  graceMinutes: number;
  autoExtendEnabled: boolean;
  maxExtensionMinutes: number;
}

export type SlotState = 'available' | 'held' | 'confirmed' | 'blocked';

export interface Slot {
  id: string;
  resourceId: string;
  ownerId: string;
  isPublic: boolean;
  start: string;
  end: string;
  state: SlotState;
  blockReason?: string;
  bookedRequestId?: string;
  waitlistCount: number;
  hasPendingWaitlist?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Resource {
  id: string;
  ownerId: string;
  ownerDisplayName: string;
  ownerVerificationState: OwnerVerificationState;
  organisationName?: string;
  title: string;
  resourceType: ResourceType;
  category: string;
  description: string;
  photos: string[];
  location: string;
  priceMode: PriceMode;
  transferMode: TransferMode;
  price: number;
  currency?: string;
  priceUnit?: string;
  bookingContactOrUrl?: string;
  riskLevel: RiskLevel;
  trainingRequired: boolean;
  quizId?: string;
  supervisedAccess: boolean;
  allowedUsers?: string;
  safetyNotes?: string;
  ppe: string[];
  prohibitedUses: string[];
  conditionSummary?: string;
  accessories: string[];
  collectionPoint?: string;
  setupNotes?: string;
  returnInstructions?: string;
  approvalMode: ApprovalMode;
  highDemand: boolean;
  policies: ResourcePolicies;
  availabilitySlots?: Slot[];
  assignedSupervisorIds: string[];
  listingState: ListingState;
  createdAt: string;
  updatedAt?: string;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  resourceId: string;
  ownerId: string;
  isPublic: boolean;
  title: string;
  questions: QuizQuestion[];
  passMarkPercent: number;
  maxAttemptsPerDay: number;
  createdAt?: string;
  updatedAt?: string;
}

export type EligibilityStatus =
  | 'not-started'
  | 'passed'
  | 'failed'
  | 'awaiting-supervisor'
  | 'approved'
  | 'rejected'
  | 'expired';

export interface EligibilityRecord {
  id: string;
  userId: string;
  userDisplayName: string;
  resourceId: string;
  resourceTitle: string;
  ownerId: string;
  assignedSupervisorIds: string[];
  quizScore?: number;
  attemptsToday: number;
  lastAttemptDate: string;
  status: EligibilityStatus;
  approvedBy?: string;
  approvedAt?: string;
  expiresAt: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type RequestType = 'borrow' | 'rent' | 'giveaway' | 'sale';

export type BookingStatus =
  | 'draft'
  | 'pending-review'
  | 'confirmed'
  | 'in-use'
  | 'returned'
  | 'rejected'
  | 'cancelled'
  | 'expired'
  | 'waitlisted'
  | 'offered'
  | 'overdue'
  | 'handover-recorded'
  | 'transfer-complete';

export type DecisionReasonCode =
  | 'APPROVED_ELIGIBLE'
  | 'APPROVED_AUTO_CONFIRMED'
  | 'REJECTED_TRAINING_INCOMPLETE'
  | 'REJECTED_SLOT_UNAVAILABLE'
  | 'REJECTED_CAP_REACHED'
  | 'REJECTED_MAINTENANCE'
  | 'REJECTED_OWNER_DECLINED'
  | 'WAITLISTED_FIRST_ELIGIBLE'
  | 'NEEDS_MORE_INFO'
  | 'EXPIRED_NO_REVIEW'
  | 'RESTRICTED_OVERDUE'
  | 'CANCELLED_BY_USER';

export interface RequestEligibilitySnapshot {
  userStandingOk: boolean;
  quizPassed: boolean;
  supervisorApproved: boolean;
  capNotExceeded: boolean;
  slotAvailable: boolean;
  details: string[];
}

export interface RequestItem {
  id: string;
  resourceId: string;
  resourceTitle: string;
  ownerId: string;
  assignedSupervisorIds: string[];
  requesterId: string;
  requesterDisplayName: string;
  requestType: RequestType;
  slotId?: string;
  slotStart?: string;
  slotEnd?: string;
  transferTerms?: string;
  status: BookingStatus;
  eligibilitySnapshot: RequestEligibilitySnapshot;
  message: string;
  createdAt: string;
  updatedAt?: string;
  decisionBy?: string;
  decisionAt?: string;
  decisionReasonCode?: DecisionReasonCode;
  decisionNote?: string;
  expiresAt?: string;
  cancellationReason?: string;
  isTimelyCancellation?: boolean;
}

export type WaitlistStatus = 'waiting' | 'offered' | 'accepted' | 'expired' | 'left';

export interface WaitlistEntry {
  id: string;
  resourceId: string;
  resourceTitle: string;
  ownerId: string;
  slotId: string;
  userId: string;
  userDisplayName: string;
  joinedAt: string;
  status: WaitlistStatus;
  offerExpiresAt?: string;
  position: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface HandoverRecord {
  id: string;
  requestId: string;
  resourceId: string;
  ownerId: string;
  requesterId: string;
  assignedSupervisorIds: string[];
  checkoutAt: string;
  checkoutBy: string;
  beforeCondition: string;
  beforePhotos: string[];
  accessories: { item: string; included: boolean }[];
  dueAt: string;
  returnedAt?: string;
  returnedRecordedBy?: string;
  returnCondition?: string;
  returnPhotos?: string[];
  accessoriesReturned?: { item: string; returned: boolean }[];
  issuesReported?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type IncidentStatus = 'open' | 'awaiting-response' | 'under-review' | 'resolved';

export interface IncidentAISummary {
  reportedAllegations: string[];
  verifiedFacts: string[];
  missingInformation: string[];
  timeline: string[];
  generatedAt: string;
  editedBy?: string;
  isAI: true;
}

export interface Incident {
  id: string;
  resourceId: string;
  resourceTitle: string;
  requestId: string;
  ownerId: string;
  assignedSupervisorIds: string[];
  reportedBy: string;
  reportedByDisplayName: string;
  reportedAgainstUserId: string;
  reportedAgainstDisplayName: string;
  title: string;
  description: string;
  evidenceRefs: string[];
  status: IncidentStatus;
  response?: string;
  respondedAt?: string;
  aiSummary?: IncidentAISummary;
  decision?: string;
  decisionReason?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  escalatedToAdmin?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  senderId: string;
  type:
    | 'request_received'
    | 'request_approved'
    | 'request_rejected'
    | 'request_more_info'
    | 'waitlist_offer'
    | 'booking_reminder'
    | 'return_reminder'
    | 'booking_cancelled'
    | 'overdue_warning'
    | 'restriction_applied'
    | 'restriction_lifted'
    | 'return_recorded'
    | 'incident_opened'
    | 'incident_updated'
    | 'extension_decision'
    | 'permanent_transfer';
  title: string;
  message: string;
  relatedRecordId?: string;
  readAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorDisplayName: string;
  actorRole: UserRole;
  action: string;
  entityType: 'resource' | 'request' | 'eligibility' | 'incident' | 'waitlist' | 'handover' | 'admin';
  entityId: string;
  reasonCode?: string;
  summary: string;
  timestamp: string;
}

export type PendingIntent =
  | { type: 'create-listing' }
  | { type: 'request-booking'; resourceId: string; slotId?: string }
  | { type: 'take-quiz'; quizId: string; resourceId: string }
  | { type: 'navigate'; screen: string };
