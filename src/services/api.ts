import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import {
  User,
  UserRole,
  Resource,
  Slot,
  Quiz,
  QuizQuestion,
  EligibilityRecord,
  RequestItem,
  WaitlistEntry,
  HandoverRecord,
  Incident,
  IncidentAISummary,
  AppNotification,
  AuditLog,
  DecisionReasonCode,
  BookingStatus,
  OwnerVerificationState,
  RequestType,
} from '../types';

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  reasonCode?: DecisionReasonCode | string;
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toIso(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      out[k] = v;
    }
  }
  return out as T;
}

function mapUser(data: Record<string, unknown>): User {
  return {
    ...(data as unknown as User),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function mapResource(data: Record<string, unknown>): Resource {
  return {
    ...(data as unknown as Resource),
    photos: Array.isArray(data.photos) ? (data.photos as string[]) : [],
    ppe: Array.isArray(data.ppe) ? (data.ppe as string[]) : [],
    prohibitedUses: Array.isArray(data.prohibitedUses) ? (data.prohibitedUses as string[]) : [],
    accessories: Array.isArray(data.accessories) ? (data.accessories as string[]) : [],
    assignedSupervisorIds: Array.isArray(data.assignedSupervisorIds) ? (data.assignedSupervisorIds as string[]) : [],
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function mapSlot(data: Record<string, unknown>): Slot {
  return {
    ...(data as unknown as Slot),
    waitlistCount: typeof data.waitlistCount === 'number' ? data.waitlistCount : 0,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function mapRequest(data: Record<string, unknown>): RequestItem {
  return {
    ...(data as unknown as RequestItem),
    assignedSupervisorIds: Array.isArray(data.assignedSupervisorIds) ? (data.assignedSupervisorIds as string[]) : [],
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function mapEligibility(data: Record<string, unknown>): EligibilityRecord {
  return {
    ...(data as unknown as EligibilityRecord),
    assignedSupervisorIds: Array.isArray(data.assignedSupervisorIds) ? (data.assignedSupervisorIds as string[]) : [],
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function mapWaitlist(data: Record<string, unknown>): WaitlistEntry {
  return {
    ...(data as unknown as WaitlistEntry),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function mapHandover(data: Record<string, unknown>): HandoverRecord {
  return {
    ...(data as unknown as HandoverRecord),
    assignedSupervisorIds: Array.isArray(data.assignedSupervisorIds) ? (data.assignedSupervisorIds as string[]) : [],
    beforePhotos: Array.isArray(data.beforePhotos) ? (data.beforePhotos as string[]) : [],
    returnPhotos: Array.isArray(data.returnPhotos) ? (data.returnPhotos as string[]) : [],
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function mapIncident(data: Record<string, unknown>): Incident {
  return {
    ...(data as unknown as Incident),
    assignedSupervisorIds: Array.isArray(data.assignedSupervisorIds) ? (data.assignedSupervisorIds as string[]) : [],
    evidenceRefs: Array.isArray(data.evidenceRefs) ? (data.evidenceRefs as string[]) : [],
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function mapNotification(data: Record<string, unknown>): AppNotification {
  return {
    ...(data as unknown as AppNotification),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function mapAuditLog(data: Record<string, unknown>): AuditLog {
  return {
    ...(data as unknown as AuditLog),
    timestamp: toIso(data.timestamp),
  };
}

async function writeAuditLog(params: {
  actor: User;
  action: string;
  entityType: AuditLog['entityType'];
  entityId: string;
  summary: string;
  reasonCode?: string;
}): Promise<void> {
  const logId = makeId('audit');
  const path = `auditLogs/${logId}`;
  try {
    await setDoc(
      doc(db, 'auditLogs', logId),
      stripUndefined({
        id: logId,
        actorId: params.actor.id,
        actorDisplayName: params.actor.displayName,
        actorRole: params.actor.role,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        reasonCode: params.reasonCode,
        summary: params.summary.slice(0, 800),
        timestamp: serverTimestamp(),
      })
    );
  } catch (err) {
    console.warn('Failed to write audit log:', err);
  }
}

async function createNotification(params: {
  recipientId: string;
  senderId: string;
  type: AppNotification['type'];
  title: string;
  message: string;
  relatedRecordId?: string;
}): Promise<void> {
  const notifId = makeId('notif');
  try {
    await setDoc(
      doc(db, 'notifications', notifId),
      stripUndefined({
        id: notifId,
        recipientId: params.recipientId,
        senderId: params.senderId,
        type: params.type,
        title: params.title.slice(0, 160),
        message: params.message.slice(0, 1000),
        relatedRecordId: params.relatedRecordId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  } catch (err) {
    console.warn('Failed to create notification:', err);
  }
}

class FirestoreServiceLayer {
  // 1. AUTH & USER PROFILES
  public async getUserProfile(uid: string): Promise<User | null> {
    const path = `users/${uid}`;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) return null;
      const user = mapUser(snap.data() as Record<string, unknown>);
      // Check if an admin marker exists
      try {
        const adminSnap = await getDoc(doc(db, 'admins', uid));
        if (adminSnap.exists()) {
          user.role = 'admin';
        }
      } catch {
        // Not an admin or not accessible
      }
      return user;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  }

  public async ensureUserProfile(
    fbUser: FirebaseUser,
    options?: {
      displayName?: string;
      role?: 'requester' | 'owner';
      organisationName?: string;
      userTypeDescription?: string;
      phone?: string;
    }
  ): Promise<User> {
    const existing = await this.getUserProfile(fbUser.uid);
    if (existing) {
      return existing;
    }

    const displayName =
      options?.displayName?.trim() ||
      fbUser.displayName?.trim() ||
      fbUser.email?.split('@')[0] ||
      'Member';

    const requestedRole: 'requester' | 'owner' =
      options?.role === 'owner' ? 'owner' : 'requester';

    const userTypeDescription =
      options?.userTypeDescription?.trim() ||
      (requestedRole === 'owner' ? 'Equipment Owner / Organization' : 'Maker / Requester');

    const payload = stripUndefined({
      id: fbUser.uid,
      displayName: displayName.slice(0, 120),
      email: (fbUser.email || '').slice(0, 200),
      phone: options?.phone?.trim() ? options.phone.trim().slice(0, 40) : undefined,
      role: requestedRole,
      organisationName: options?.organisationName?.trim()
        ? options.organisationName.trim().slice(0, 160)
        : undefined,
      userTypeDescription: userTypeDescription.slice(0, 160),
      verificationState: 'unverified' as OwnerVerificationState,
      standing: {
        lateReturns: 0,
        noShows: 0,
        lateCancellations: 0,
        incidentReports: 0,
        restrictedUntil: null,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const path = `users/${fbUser.uid}`;
    try {
      await setDoc(doc(db, 'users', fbUser.uid), payload);
      const created = await this.getUserProfile(fbUser.uid);
      if (created) return created;
      return {
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as User;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  }

  public async updateProfileDetails(
    uid: string,
    updates: {
      displayName?: string;
      phone?: string;
      organisationName?: string;
      userTypeDescription?: string;
    }
  ): Promise<ServiceResult<User>> {
    const path = `users/${uid}`;
    try {
      const clean = stripUndefined({
        ...(updates.displayName ? { displayName: updates.displayName.trim().slice(0, 120) } : {}),
        ...(updates.phone !== undefined ? { phone: updates.phone.trim().slice(0, 40) } : {}),
        ...(updates.organisationName !== undefined ? { organisationName: updates.organisationName.trim().slice(0, 160) } : {}),
        ...(updates.userTypeDescription ? { userTypeDescription: updates.userTypeDescription.trim().slice(0, 160) } : {}),
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'users', uid), clean);
      const refreshed = await this.getUserProfile(uid);
      return { success: true, data: refreshed || undefined };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update profile.' };
    }
  }

  // 2. PUBLIC DISCOVERY & LISTINGS
  public subscribeActiveResources(
    onData: (resources: Resource[]) => void,
    onError: (err: Error) => void
  ): Unsubscribe {
    const path = 'resources';
    const q = query(collection(db, path), where('listingState', '==', 'active'));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => mapResource(d.data() as Record<string, unknown>))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onData(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, path);
        } catch (wrapped) {
          onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    );
  }

  public filterResources(
    resources: Resource[],
    filters: {
      query?: string;
      category?: string;
      location?: string;
      resourceType?: 'equipment' | 'workspace' | 'all';
      priceMode?: 'free' | 'paid' | 'all';
      transferMode?: 'temporary' | 'permanent' | 'all';
      riskLevel?: 'low' | 'medium' | 'high' | 'all';
      onlyAvailable?: boolean;
      slotsByResource?: Record<string, Slot[]>;
    }
  ): Resource[] {
    return resources.filter((res) => {
      if (res.listingState !== 'active') return false;

      if (filters.query && filters.query.trim()) {
        const q = filters.query.toLowerCase().trim();
        const haystack = `${res.title} ${res.description} ${res.category} ${res.location} ${res.organisationName || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (filters.category && filters.category !== 'all') {
        if (res.category.toLowerCase() !== filters.category.toLowerCase()) return false;
      }

      if (filters.location && filters.location.trim()) {
        if (!res.location.toLowerCase().includes(filters.location.toLowerCase().trim())) return false;
      }

      if (filters.resourceType && filters.resourceType !== 'all' && res.resourceType !== filters.resourceType) {
        return false;
      }
      if (filters.priceMode && filters.priceMode !== 'all' && res.priceMode !== filters.priceMode) {
        return false;
      }
      if (filters.transferMode && filters.transferMode !== 'all' && res.transferMode !== filters.transferMode) {
        return false;
      }
      if (filters.riskLevel && filters.riskLevel !== 'all' && res.riskLevel !== filters.riskLevel) {
        return false;
      }

      if (filters.onlyAvailable && filters.slotsByResource) {
        if (res.transferMode === 'temporary') {
          const slots = filters.slotsByResource[res.id] || [];
          const hasOpen = slots.some((s) => s.state === 'available' && new Date(s.end) > new Date());
          if (!hasOpen) return false;
        }
      }

      return true;
    });
  }

  public async getResource(resourceId: string): Promise<Resource | null> {
    const path = `resources/${resourceId}`;
    try {
      const snap = await getDoc(doc(db, 'resources', resourceId));
      if (!snap.exists()) return null;
      return mapResource(snap.data() as Record<string, unknown>);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  }

  public subscribeResourceSlots(
    resourceId: string,
    onData: (slots: Slot[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const path = `resources/${resourceId}/slots`;
    const q = query(collection(db, path), where('isPublic', '==', true));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => mapSlot(d.data() as Record<string, unknown>))
          .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
        onData(list);
      },
      (err) => {
        if (onError) onError(err);
      }
    );
  }

  public async getSlotsForResource(resourceId: string): Promise<Slot[]> {
    const path = `resources/${resourceId}/slots`;
    try {
      const q = query(collection(db, path), where('isPublic', '==', true));
      const snap = await getDocs(q);
      return snap.docs
        .map((d) => mapSlot(d.data() as Record<string, unknown>))
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  }

  public async createListing(
    actingUser: User,
    data: {
      title: string;
      resourceType: 'equipment' | 'workspace';
      category: string;
      description: string;
      photos: string[];
      location: string;
      priceMode: 'free' | 'paid';
      transferMode: 'temporary' | 'permanent';
      price: number;
      currency?: string;
      priceUnit?: string;
      bookingContactOrUrl?: string;
      riskLevel: 'low' | 'medium' | 'high';
      trainingRequired: boolean;
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
      approvalMode: 'auto-if-low-risk' | 'owner-review' | 'supervisor-review';
      highDemand: boolean;
      policies: Resource['policies'];
      initialSlots?: { start: string; end: string }[];
      quizDraft?: {
        title: string;
        passMarkPercent: number;
        maxAttemptsPerDay: number;
        questions: QuizQuestion[];
      };
    }
  ): Promise<ServiceResult<Resource>> {
    if (actingUser.role !== 'owner' && actingUser.role !== 'admin') {
      return { success: false, error: 'Only registered owners, organizations, or administrators can publish listings.' };
    }
    if (!auth.currentUser?.emailVerified) {
      return { success: false, error: 'Please verify your email address before creating a listing.' };
    }

    const resourceId = makeId('res');
    const isUnverified = actingUser.verificationState !== 'verified';
    const isHighRisk = data.riskLevel === 'high';
    const listingState: Resource['listingState'] =
      isUnverified && isHighRisk && actingUser.role !== 'admin' ? 'pending-admin-check' : 'active';

    let quizId: string | undefined;
    if (data.trainingRequired && data.quizDraft && data.quizDraft.questions.length > 0) {
      quizId = makeId('quiz');
    }

    const payload = stripUndefined({
      id: resourceId,
      ownerId: actingUser.id,
      ownerDisplayName: actingUser.displayName,
      ownerVerificationState: actingUser.verificationState,
      organisationName: actingUser.organisationName || undefined,
      title: data.title.trim().slice(0, 160),
      resourceType: data.resourceType,
      category: data.category.trim().slice(0, 80),
      description: data.description.trim().slice(0, 2500),
      photos: data.photos.filter(Boolean).slice(0, 5),
      location: data.location.trim().slice(0, 200),
      priceMode: data.priceMode,
      transferMode: data.transferMode,
      price: data.priceMode === 'paid' ? Math.max(0, Number(data.price) || 0) : 0,
      currency: data.priceMode === 'paid' ? (data.currency || 'USD').slice(0, 8) : undefined,
      priceUnit: data.priceMode === 'paid' && data.priceUnit ? data.priceUnit.trim().slice(0, 40) : undefined,
      bookingContactOrUrl: data.bookingContactOrUrl?.trim() ? data.bookingContactOrUrl.trim().slice(0, 300) : undefined,
      riskLevel: data.riskLevel,
      trainingRequired: data.trainingRequired,
      quizId,
      supervisedAccess: data.supervisedAccess,
      allowedUsers: data.allowedUsers?.trim() ? data.allowedUsers.trim().slice(0, 300) : undefined,
      safetyNotes: data.safetyNotes?.trim() ? data.safetyNotes.trim().slice(0, 1500) : undefined,
      ppe: data.ppe.slice(0, 20),
      prohibitedUses: data.prohibitedUses.slice(0, 20),
      conditionSummary: data.conditionSummary?.trim() ? data.conditionSummary.trim().slice(0, 800) : undefined,
      accessories: data.accessories.slice(0, 20),
      collectionPoint: data.collectionPoint?.trim() ? data.collectionPoint.trim().slice(0, 300) : undefined,
      setupNotes: data.setupNotes?.trim() ? data.setupNotes.trim().slice(0, 800) : undefined,
      returnInstructions: data.returnInstructions?.trim() ? data.returnInstructions.trim().slice(0, 800) : undefined,
      approvalMode: data.approvalMode,
      highDemand: data.highDemand,
      policies: data.policies,
      assignedSupervisorIds: [],
      listingState,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await setDoc(doc(db, 'resources', resourceId), payload);

      // Create Quiz if supplied
      if (quizId && data.quizDraft) {
        await setDoc(doc(db, 'quizzes', quizId), {
          id: quizId,
          resourceId,
          ownerId: actingUser.id,
          isPublic: listingState === 'active',
          title: data.quizDraft.title.trim().slice(0, 160),
          questions: data.quizDraft.questions.slice(0, 20),
          passMarkPercent: data.quizDraft.passMarkPercent,
          maxAttemptsPerDay: data.quizDraft.maxAttemptsPerDay,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Create initial time slots if temporary transfer mode
      if (data.transferMode === 'temporary' && data.initialSlots && data.initialSlots.length > 0) {
        const isPublic = listingState === 'active';
        for (const s of data.initialSlots.slice(0, 56)) {
          const slotId = makeId('slot');
          await setDoc(doc(db, 'resources', resourceId, 'slots', slotId), {
            id: slotId,
            resourceId,
            ownerId: actingUser.id,
            isPublic,
            start: s.start,
            end: s.end,
            state: 'available',
            waitlistCount: 0,
            hasPendingWaitlist: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }

      await writeAuditLog({
        actor: actingUser,
        action: 'LISTING_CREATED',
        entityType: 'resource',
        entityId: resourceId,
        summary: `Created listing '${data.title.trim()}'. State: ${listingState}.`,
      });

      const saved = await this.getResource(resourceId);
      return { success: true, data: saved || ({ ...payload, createdAt: new Date().toISOString() } as unknown as Resource) };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to create listing.' };
    }
  }

  public async addSlotToResource(
    actingUser: User,
    resource: Resource,
    startIso: string,
    endIso: string
  ): Promise<ServiceResult<Slot>> {
    if (actingUser.id !== resource.ownerId && actingUser.role !== 'admin') {
      return { success: false, error: 'Only the listing owner or an administrator can add availability slots.' };
    }
    const slotId = makeId('slot');
    const path = `resources/${resource.id}/slots/${slotId}`;
    try {
      await setDoc(doc(db, 'resources', resource.id, 'slots', slotId), {
        id: slotId,
        resourceId: resource.id,
        ownerId: resource.ownerId,
        isPublic: resource.listingState === 'active',
        start: startIso,
        end: endIso,
        state: 'available',
        waitlistCount: 0,
        hasPendingWaitlist: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await writeAuditLog({
        actor: actingUser,
        action: 'SLOT_CREATED',
        entityType: 'resource',
        entityId: resource.id,
        summary: `Added availability slot (${startIso}) to '${resource.title}'.`,
      });
      return {
        success: true,
        data: {
          id: slotId,
          resourceId: resource.id,
          ownerId: resource.ownerId,
          isPublic: resource.listingState === 'active',
          start: startIso,
          end: endIso,
          state: 'available',
          waitlistCount: 0,
        },
      };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to add slot.' };
    }
  }

  public async blockSlot(
    actingUser: User,
    resourceId: string,
    slotId: string,
    reason: string
  ): Promise<ServiceResult<void>> {
    try {
      const resource = await this.getResource(resourceId);
      if (!resource) return { success: false, error: 'Resource not found.' };

      const slotRef = doc(db, 'resources', resourceId, 'slots', slotId);
      let cancelledRequesterId: string | null = null;
      let affectedRequestId: string | null = null;

      await runTransaction(db, async (tx) => {
        const slotSnap = await tx.get(slotRef);
        if (!slotSnap.exists()) throw new Error('Slot not found.');
        const slot = mapSlot(slotSnap.data() as Record<string, unknown>);

        if ((slot.state === 'confirmed' || slot.state === 'held') && slot.bookedRequestId) {
          const reqRef = doc(db, 'requests', slot.bookedRequestId);
          const reqSnap = await tx.get(reqRef);
          if (reqSnap.exists()) {
            const reqData = reqSnap.data() as Record<string, unknown>;
            cancelledRequesterId = String(reqData.requesterId || '');
            affectedRequestId = slot.bookedRequestId;
            tx.update(reqRef, {
              status: 'cancelled',
              decisionBy: actingUser.id,
              decisionAt: new Date().toISOString(),
              decisionReasonCode: 'REJECTED_MAINTENANCE',
              decisionNote: `Slot blocked by facility: ${reason}`,
              updatedAt: serverTimestamp(),
            });
          }
        }

        tx.update(slotRef, {
          state: 'blocked',
          blockReason: reason.slice(0, 300),
          bookedRequestId: null,
          updatedAt: serverTimestamp(),
        });
      });

      if (cancelledRequesterId && affectedRequestId) {
        await createNotification({
          recipientId: cancelledRequesterId,
          senderId: actingUser.id,
          type: 'booking_cancelled',
          title: `Booking Cancelled for Maintenance: ${resource.title}`,
          message: `Your slot on ${resource.title} was blocked for maintenance: "${reason}". Please select another open time slot.`,
          relatedRecordId: affectedRequestId,
        });
      }

      await writeAuditLog({
        actor: actingUser,
        action: 'SLOT_BLOCKED',
        entityType: 'resource',
        entityId: resourceId,
        reasonCode: 'REJECTED_MAINTENANCE',
        summary: `Slot ${slotId} on '${resource.title}' blocked: ${reason}`,
      });

      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to block slot.' };
    }
  }

  // 3. ELIGIBILITY & QUIZZES
  public async getQuiz(quizId: string): Promise<Quiz | null> {
    try {
      const snap = await getDoc(doc(db, 'quizzes', quizId));
      if (!snap.exists()) return null;
      return snap.data() as Quiz;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `quizzes/${quizId}`);
    }
  }

  public async getEligibility(user: User, resource: Resource) {
    const recordId = `${user.id}_${resource.id}`;
    let record: EligibilityRecord | null = null;
    try {
      const snap = await getDoc(doc(db, 'eligibilityRecords', recordId));
      if (snap.exists()) {
        record = mapEligibility(snap.data() as Record<string, unknown>);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `eligibilityRecords/${recordId}`);
    }

    let passMark = 80;
    if (resource.quizId) {
      const quiz = await this.getQuiz(resource.quizId);
      if (quiz) passMark = quiz.passMarkPercent;
    }

    const standingOk =
      !user.standing?.restrictedUntil || new Date(user.standing.restrictedUntil) <= new Date();
    const quizRequired = Boolean(resource.trainingRequired && resource.quizId);
    const quizPassed =
      !quizRequired || (record?.quizScore !== undefined && record.quizScore >= passMark);
    const supervisorRequired = resource.riskLevel === 'high' || resource.supervisedAccess;
    const supervisorApproved = !supervisorRequired || record?.status === 'approved';
    const isFullyEligible = standingOk && quizPassed && supervisorApproved;

    return {
      isFullyEligible,
      standingOk,
      quizRequired,
      quizPassed,
      supervisorRequired,
      supervisorApproved,
      record,
    };
  }

  public async submitQuiz(
    actingUser: User,
    resource: Resource,
    quiz: Quiz,
    answers: Record<string, number>
  ): Promise<ServiceResult<EligibilityRecord>> {
    const recordId = `${actingUser.id}_${resource.id}`;
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      let resultRecord: EligibilityRecord | null = null;

      await runTransaction(db, async (tx) => {
        const ref = doc(db, 'eligibilityRecords', recordId);
        const snap = await tx.get(ref);
        const existing = snap.exists() ? mapEligibility(snap.data() as Record<string, unknown>) : null;

        if (existing && existing.lastAttemptDate === todayStr && existing.attemptsToday >= quiz.maxAttemptsPerDay) {
          throw new Error(
            `Maximum daily attempts (${quiz.maxAttemptsPerDay}) reached. Please review the safety instructions and try again tomorrow.`
          );
        }

        let correct = 0;
        for (const q of quiz.questions) {
          if (answers[q.id] === q.correctIndex) correct++;
        }
        const score = Math.round((correct / quiz.questions.length) * 100);
        const passed = score >= quiz.passMarkPercent;
        const attemptsToday = existing && existing.lastAttemptDate === todayStr ? existing.attemptsToday + 1 : 1;
        const needsSupervisor = resource.riskLevel === 'high' || resource.supervisedAccess;
        const status: EligibilityRecord['status'] = passed
          ? needsSupervisor
            ? 'awaiting-supervisor'
            : 'approved'
          : 'failed';

        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);

        if (existing) {
          tx.update(ref, {
            quizScore: score,
            attemptsToday,
            lastAttemptDate: todayStr,
            status,
            expiresAt: expiresAt.toISOString(),
            updatedAt: serverTimestamp(),
          });
          resultRecord = {
            ...existing,
            quizScore: score,
            attemptsToday,
            lastAttemptDate: todayStr,
            status,
            expiresAt: expiresAt.toISOString(),
          };
        } else {
          const payload = {
            id: recordId,
            userId: actingUser.id,
            userDisplayName: actingUser.displayName,
            resourceId: resource.id,
            resourceTitle: resource.title,
            ownerId: resource.ownerId,
            assignedSupervisorIds: resource.assignedSupervisorIds || [],
            quizScore: score,
            attemptsToday,
            lastAttemptDate: todayStr,
            status,
            expiresAt: expiresAt.toISOString(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          tx.set(ref, payload);
          resultRecord = {
            ...payload,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
      });

      if (resultRecord) {
        const rec = resultRecord as EligibilityRecord;
        await writeAuditLog({
          actor: actingUser,
          action: rec.status === 'failed' ? 'QUIZ_FAILED' : 'QUIZ_PASSED',
          entityType: 'eligibility',
          entityId: recordId,
          summary: `Safety quiz '${quiz.title}' completed with score ${rec.quizScore}%. Status: ${rec.status}.`,
        });
        return { success: true, data: rec };
      }

      return { success: false, error: 'Failed to save assessment result.' };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Quiz submission failed.' };
    }
  }

  public async supervisorApproveEligibility(
    actingUser: User,
    eligibilityId: string,
    notes: string
  ): Promise<ServiceResult<void>> {
    try {
      const ref = doc(db, 'eligibilityRecords', eligibilityId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return { success: false, error: 'Eligibility record not found.' };
      const rec = mapEligibility(snap.data() as Record<string, unknown>);

      await updateDoc(ref, {
        status: 'approved',
        approvedBy: actingUser.id,
        approvedAt: new Date().toISOString(),
        notes: notes.slice(0, 500),
        updatedAt: serverTimestamp(),
      });

      await createNotification({
        recipientId: rec.userId,
        senderId: actingUser.id,
        type: 'request_approved',
        title: `Safety Certification Approved: ${rec.resourceTitle}`,
        message: `${actingUser.displayName} verified your safety training for ${rec.resourceTitle}. You can now submit booking requests.`,
        relatedRecordId: eligibilityId,
      });

      await writeAuditLog({
        actor: actingUser,
        action: 'SUPERVISOR_ELIGIBILITY_APPROVED',
        entityType: 'eligibility',
        entityId: eligibilityId,
        summary: `${actingUser.displayName} approved training eligibility for ${rec.userDisplayName}.`,
      });

      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to approve eligibility.' };
    }
  }

  // 4. REQUESTS, OVERLAP PREVENTION & WAITLIST
  public async submitRequest(
    actingUser: User,
    resource: Resource,
    params: {
      slotId?: string;
      slotStart?: string;
      slotEnd?: string;
      message: string;
      requestType: RequestType;
      transferTerms?: string;
    }
  ): Promise<ServiceResult<RequestItem>> {
    if (!auth.currentUser?.emailVerified) {
      return { success: false, error: 'Please verify your email address before submitting requests.' };
    }

    try {
      const eligibility = await this.getEligibility(actingUser, resource);
      if (!eligibility.standingOk) {
        return {
          success: false,
          error: 'Your account has an active restriction due to an unresolved overdue return.',
          reasonCode: 'RESTRICTED_OVERDUE',
        };
      }
      if (!eligibility.isFullyEligible) {
        let failMsg = 'Safety prerequisites must be completed before requesting access.';
        if (eligibility.quizRequired && !eligibility.quizPassed) {
          failMsg = 'Please pass the required safety assessment before requesting this resource.';
        } else if (eligibility.supervisorRequired && !eligibility.supervisorApproved) {
          failMsg = 'In-person supervisor or owner safety sign-off is required before booking.';
        }
        return {
          success: false,
          error: failMsg,
          reasonCode: 'REJECTED_TRAINING_INCOMPLETE',
        };
      }

      // Booking cap check
      const userReqSnap = await getDocs(
        query(collection(db, 'requests'), where('requesterId', '==', actingUser.id))
      );
      const activeUserBookings = userReqSnap.docs
        .map((d) => mapRequest(d.data() as Record<string, unknown>))
        .filter(
          (r) =>
            r.resourceId === resource.id &&
            ['confirmed', 'in-use', 'pending-review'].includes(r.status)
        ).length;

      const maxCap = resource.policies.bookingCap || 2;
      if (resource.highDemand && activeUserBookings >= maxCap) {
        return {
          success: false,
          error: `Booking cap reached: you already have ${activeUserBookings} active requests or bookings for this resource (limit ${maxCap}).`,
          reasonCode: 'REJECTED_CAP_REACHED',
        };
      }

      const requestId = makeId('req');
      let waitlistTriggered: WaitlistEntry | null = null;
      let createdReq: RequestItem | null = null;

      await runTransaction(db, async (tx) => {
        let slot: Slot | null = null;
        const slotRef = params.slotId ? doc(db, 'resources', resource.id, 'slots', params.slotId) : null;

        if (slotRef) {
          const slotSnap = await tx.get(slotRef);
          if (!slotSnap.exists()) {
            throw new Error('Selected time slot does not exist.');
          }
          slot = mapSlot(slotSnap.data() as Record<string, unknown>);

          if (slot.state === 'blocked') {
            throw new Error(`Slot is unavailable: ${slot.blockReason || 'Maintenance'}`);
          }

          // Confirmed or held slot -> Waitlist placement
          if (slot.state === 'confirmed' || slot.state === 'held') {
            const waitId = makeId('wait');
            const newPosition = (slot.waitlistCount || 0) + 1;
            const waitPayload = {
              id: waitId,
              resourceId: resource.id,
              resourceTitle: resource.title,
              ownerId: resource.ownerId,
              slotId: slot.id,
              userId: actingUser.id,
              userDisplayName: actingUser.displayName,
              joinedAt: new Date().toISOString(),
              status: 'waiting' as const,
              position: newPosition,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            tx.set(doc(db, 'waitlistEntries', waitId), waitPayload);
            tx.update(slotRef, {
              waitlistCount: newPosition,
              hasPendingWaitlist: true,
              updatedAt: serverTimestamp(),
            });
            waitlistTriggered = {
              ...waitPayload,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            return;
          }
        }

        const canAutoConfirm =
          resource.riskLevel === 'low' &&
          resource.approvalMode === 'auto-if-low-risk' &&
          (!slot || slot.state === 'available');

        const initialStatus: BookingStatus = canAutoConfirm ? 'confirmed' : 'pending-review';
        const reasonCode: DecisionReasonCode = canAutoConfirm ? 'APPROVED_AUTO_CONFIRMED' : 'APPROVED_ELIGIBLE';

        const reqPayload = stripUndefined({
          id: requestId,
          resourceId: resource.id,
          resourceTitle: resource.title,
          ownerId: resource.ownerId,
          assignedSupervisorIds: resource.assignedSupervisorIds || [],
          requesterId: actingUser.id,
          requesterDisplayName: actingUser.displayName,
          requestType: params.requestType,
          slotId: params.slotId,
          slotStart: params.slotStart || slot?.start,
          slotEnd: params.slotEnd || slot?.end,
          transferTerms: params.transferTerms?.trim() ? params.transferTerms.trim().slice(0, 1000) : undefined,
          status: initialStatus,
          eligibilitySnapshot: {
            userStandingOk: eligibility.standingOk,
            quizPassed: eligibility.quizPassed,
            supervisorApproved: eligibility.supervisorApproved,
            capNotExceeded: true,
            slotAvailable: true,
            details: [
              `Quiz: ${eligibility.quizPassed ? 'Verified' : 'N/A'}`,
              `Supervisor: ${eligibility.supervisorApproved ? 'Verified' : 'N/A'}`,
              `Booking cap: ${activeUserBookings + 1}/${maxCap}`,
            ],
          },
          message: params.message.trim().slice(0, 1500),
          decisionReasonCode: canAutoConfirm ? reasonCode : undefined,
          decisionNote: canAutoConfirm ? 'Auto-confirmed under low-risk booking policy.' : undefined,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        tx.set(doc(db, 'requests', requestId), reqPayload);

        if (slotRef && slot) {
          tx.update(slotRef, {
            state: canAutoConfirm ? 'confirmed' : 'held',
            bookedRequestId: requestId,
            updatedAt: serverTimestamp(),
          });
        }

        createdReq = {
          ...(reqPayload as unknown as RequestItem),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

      if (waitlistTriggered) {
        const w = waitlistTriggered as WaitlistEntry;
        await writeAuditLog({
          actor: actingUser,
          action: 'WAITLIST_PLACED',
          entityType: 'waitlist',
          entityId: w.id,
          reasonCode: 'WAITLISTED_FIRST_ELIGIBLE',
          summary: `Placed on waitlist for '${resource.title}' at position #${w.position}.`,
        });
        return {
          success: true,
          reasonCode: 'WAITLISTED_FIRST_ELIGIBLE',
          error: `This slot is currently reserved. You have been placed at position #${w.position} on the first-eligible waitlist.`,
        };
      }

      if (createdReq) {
        const reqObj = createdReq as RequestItem;
        const recipientId =
          resource.approvalMode === 'supervisor-review' && resource.assignedSupervisorIds.length > 0
            ? resource.assignedSupervisorIds[0]
            : resource.ownerId;

        await createNotification({
          recipientId,
          senderId: actingUser.id,
          type: 'request_received',
          title: `New Access Request: ${resource.title}`,
          message: `${actingUser.displayName} requested access (${params.requestType}).`,
          relatedRecordId: reqObj.id,
        });

        await writeAuditLog({
          actor: actingUser,
          action: reqObj.status === 'confirmed' ? 'REQUEST_AUTO_CONFIRMED' : 'REQUEST_SUBMITTED',
          entityType: 'request',
          entityId: reqObj.id,
          reasonCode: reqObj.decisionReasonCode,
          summary: `Submitted request for '${resource.title}'. Status: ${reqObj.status}.`,
        });

        return { success: true, data: reqObj };
      }

      return { success: false, error: 'Request could not be completed.' };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to submit request.' };
    }
  }

  public async decideRequest(
    actingUser: User,
    requestId: string,
    decision: 'approve' | 'reject' | 'need_more_info',
    reasonCode: DecisionReasonCode,
    note: string
  ): Promise<ServiceResult<void>> {
    try {
      let targetReq: RequestItem | null = null;

      await runTransaction(db, async (tx) => {
        const reqRef = doc(db, 'requests', requestId);
        const reqSnap = await tx.get(reqRef);
        if (!reqSnap.exists()) throw new Error('Request not found.');
        const reqItem = mapRequest(reqSnap.data() as Record<string, unknown>);
        targetReq = reqItem;

        const slotRef = reqItem.slotId
          ? doc(db, 'resources', reqItem.resourceId, 'slots', reqItem.slotId)
          : null;
        const slotSnap = slotRef ? await tx.get(slotRef) : null;
        const slot = slotSnap?.exists() ? mapSlot(slotSnap.data() as Record<string, unknown>) : null;

        if (decision === 'approve') {
          if (slot && slot.state === 'confirmed' && slot.bookedRequestId !== reqItem.id) {
            throw new Error('Conflict detected: another booking was already confirmed for this slot.');
          }
          if (slotRef && slot) {
            tx.update(slotRef, {
              state: 'confirmed',
              bookedRequestId: reqItem.id,
              updatedAt: serverTimestamp(),
            });
          }
          tx.update(reqRef, {
            status: 'confirmed',
            decisionBy: actingUser.id,
            decisionAt: new Date().toISOString(),
            decisionReasonCode: reasonCode || 'APPROVED_ELIGIBLE',
            decisionNote: (note || 'All requirements verified. Booking confirmed.').slice(0, 800),
            updatedAt: serverTimestamp(),
          });
        } else if (decision === 'reject') {
          if (slotRef && slot && slot.state === 'held' && slot.bookedRequestId === reqItem.id) {
            tx.update(slotRef, {
              state: 'available',
              bookedRequestId: null,
              updatedAt: serverTimestamp(),
            });
          }
          tx.update(reqRef, {
            status: 'rejected',
            decisionBy: actingUser.id,
            decisionAt: new Date().toISOString(),
            decisionReasonCode: reasonCode || 'REJECTED_OWNER_DECLINED',
            decisionNote: (note || 'Request declined.').slice(0, 800),
            updatedAt: serverTimestamp(),
          });
        } else {
          tx.update(reqRef, {
            status: 'pending-review',
            decisionReasonCode: 'NEEDS_MORE_INFO',
            decisionNote: note.slice(0, 800),
            updatedAt: serverTimestamp(),
          });
        }
      });

      if (targetReq) {
        const reqItem = targetReq as RequestItem;
        const notifType =
          decision === 'approve'
            ? 'request_approved'
            : decision === 'reject'
            ? 'request_rejected'
            : 'request_more_info';

        await createNotification({
          recipientId: reqItem.requesterId,
          senderId: actingUser.id,
          type: notifType,
          title:
            decision === 'approve'
              ? `Booking Confirmed: ${reqItem.resourceTitle}`
              : decision === 'reject'
              ? `Request Not Approved: ${reqItem.resourceTitle}`
              : `Clarification Requested: ${reqItem.resourceTitle}`,
          message: note || `Updated by ${actingUser.displayName}.`,
          relatedRecordId: reqItem.id,
        });

        await writeAuditLog({
          actor: actingUser,
          action: `REQUEST_${decision.toUpperCase()}`,
          entityType: 'request',
          entityId: reqItem.id,
          reasonCode,
          summary: `Request ${reqItem.id} marked '${decision}' by ${actingUser.displayName}.`,
        });
      }

      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Decision failed.' };
    }
  }

  public async cancelBooking(
    actingUser: User,
    requestId: string,
    reason: string
  ): Promise<ServiceResult<void>> {
    try {
      let reqSnapshot: RequestItem | null = null;
      let hasWaitlist = false;

      await runTransaction(db, async (tx) => {
        const reqRef = doc(db, 'requests', requestId);
        const reqSnap = await tx.get(reqRef);
        if (!reqSnap.exists()) throw new Error('Booking request not found.');
        const reqItem = mapRequest(reqSnap.data() as Record<string, unknown>);
        reqSnapshot = reqItem;

        const resRef = doc(db, 'resources', reqItem.resourceId);
        const resSnap = await tx.get(resRef);
        const resource = resSnap.exists() ? mapResource(resSnap.data() as Record<string, unknown>) : null;

        const now = new Date();
        const slotStart = reqItem.slotStart ? new Date(reqItem.slotStart) : null;
        const noticeHours = resource?.policies?.cancellationNoticeHours || 4;
        const isTimely = slotStart ? (slotStart.getTime() - now.getTime()) / (1000 * 60 * 60) >= noticeHours : true;

        if (reqItem.slotId) {
          const slotRef = doc(db, 'resources', reqItem.resourceId, 'slots', reqItem.slotId);
          const slotSnap = await tx.get(slotRef);
          if (slotSnap.exists()) {
            const slot = mapSlot(slotSnap.data() as Record<string, unknown>);
            hasWaitlist = (slot.waitlistCount || 0) > 0;
            tx.update(slotRef, {
              state: 'available',
              bookedRequestId: null,
              hasPendingWaitlist: hasWaitlist,
              updatedAt: serverTimestamp(),
            });
          }
        }

        tx.update(reqRef, {
          status: 'cancelled',
          cancellationReason: reason.slice(0, 600),
          isTimelyCancellation: isTimely,
          decisionReasonCode: 'CANCELLED_BY_USER',
          updatedAt: serverTimestamp(),
        });
      });

      if (reqSnapshot) {
        const r = reqSnapshot as RequestItem;
        if (hasWaitlist) {
          await createNotification({
            recipientId: r.ownerId,
            senderId: actingUser.id,
            type: 'booking_cancelled',
            title: `Slot Freed with Waitlist: ${r.resourceTitle}`,
            message: `${actingUser.displayName} cancelled a booking on ${r.resourceTitle}. Waitlisted users can now be offered the freed slot from your Owner Hub.`,
            relatedRecordId: r.id,
          });
        }

        await writeAuditLog({
          actor: actingUser,
          action: 'BOOKING_CANCELLED',
          entityType: 'request',
          entityId: r.id,
          reasonCode: 'CANCELLED_BY_USER',
          summary: `Cancelled booking for '${r.resourceTitle}'. Reason: ${reason}`,
        });
      }

      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to cancel booking.' };
    }
  }

  public async extendWaitlistOffer(
    actingUser: User,
    waitlistEntry: WaitlistEntry
  ): Promise<ServiceResult<void>> {
    try {
      const resource = await this.getResource(waitlistEntry.resourceId);
      const offerHours = resource?.policies?.waitlistOfferHours || 24;
      const offerExpiresAt = new Date(Date.now() + offerHours * 60 * 60 * 1000).toISOString();

      await runTransaction(db, async (tx) => {
        const entryRef = doc(db, 'waitlistEntries', waitlistEntry.id);
        const slotRef = doc(db, 'resources', waitlistEntry.resourceId, 'slots', waitlistEntry.slotId);
        const slotSnap = await tx.get(slotRef);
        if (!slotSnap.exists()) throw new Error('Slot not found.');
        const slot = mapSlot(slotSnap.data() as Record<string, unknown>);
        if (slot.state !== 'available') {
          throw new Error('Slot is no longer available to offer.');
        }

        tx.update(entryRef, {
          status: 'offered',
          offerExpiresAt,
          updatedAt: serverTimestamp(),
        });
        tx.update(slotRef, {
          state: 'held',
          hasPendingWaitlist: false,
          updatedAt: serverTimestamp(),
        });
      });

      await createNotification({
        recipientId: waitlistEntry.userId,
        senderId: actingUser.id,
        type: 'waitlist_offer',
        title: `Slot Offered: ${waitlistEntry.resourceTitle}`,
        message: `A slot on ${waitlistEntry.resourceTitle} is now open for you. Claim it within ${offerHours} hours from your Requests dashboard.`,
        relatedRecordId: waitlistEntry.id,
      });

      await writeAuditLog({
        actor: actingUser,
        action: 'WAITLIST_OFFER_EXTENDED',
        entityType: 'waitlist',
        entityId: waitlistEntry.id,
        reasonCode: 'WAITLISTED_FIRST_ELIGIBLE',
        summary: `Offered freed slot on '${waitlistEntry.resourceTitle}' to ${waitlistEntry.userDisplayName}.`,
      });

      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to offer waitlist slot.' };
    }
  }

  public async acceptWaitlistOffer(
    actingUser: User,
    entry: WaitlistEntry
  ): Promise<ServiceResult<RequestItem>> {
    try {
      const resource = await this.getResource(entry.resourceId);
      if (!resource) return { success: false, error: 'Resource not found.' };

      const requestId = makeId('req');
      let createdBooking: RequestItem | null = null;

      await runTransaction(db, async (tx) => {
        const entryRef = doc(db, 'waitlistEntries', entry.id);
        const entrySnap = await tx.get(entryRef);
        if (!entrySnap.exists()) throw new Error('Waitlist offer not found.');
        const freshEntry = mapWaitlist(entrySnap.data() as Record<string, unknown>);
        if (freshEntry.status !== 'offered') throw new Error('This offer is no longer active.');
        if (freshEntry.offerExpiresAt && new Date(freshEntry.offerExpiresAt) < new Date()) {
          throw new Error('This waitlist offer has expired.');
        }

        const slotRef = doc(db, 'resources', entry.resourceId, 'slots', entry.slotId);
        const slotSnap = await tx.get(slotRef);
        if (!slotSnap.exists()) throw new Error('Slot not found.');
        const slot = mapSlot(slotSnap.data() as Record<string, unknown>);

        const payload = {
          id: requestId,
          resourceId: resource.id,
          resourceTitle: resource.title,
          ownerId: resource.ownerId,
          assignedSupervisorIds: resource.assignedSupervisorIds || [],
          requesterId: actingUser.id,
          requesterDisplayName: actingUser.displayName,
          requestType: (resource.priceMode === 'free' ? 'borrow' : 'rent') as RequestType,
          slotId: slot.id,
          slotStart: slot.start,
          slotEnd: slot.end,
          status: 'confirmed' as BookingStatus,
          eligibilitySnapshot: {
            userStandingOk: true,
            quizPassed: true,
            supervisorApproved: true,
            capNotExceeded: true,
            slotAvailable: true,
            details: ['Confirmed from first-eligible waitlist offer'],
          },
          message: 'Claimed freed slot from waitlist priority offer.',
          decisionReasonCode: 'APPROVED_ELIGIBLE' as DecisionReasonCode,
          decisionNote: 'Waitlist offer accepted within claim window.',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        tx.set(doc(db, 'requests', requestId), payload);
        tx.update(entryRef, {
          status: 'accepted',
          updatedAt: serverTimestamp(),
        });
        tx.update(slotRef, {
          state: 'confirmed',
          bookedRequestId: requestId,
          hasPendingWaitlist: false,
          updatedAt: serverTimestamp(),
        });

        createdBooking = {
          ...payload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

      await writeAuditLog({
        actor: actingUser,
        action: 'WAITLIST_OFFER_ACCEPTED',
        entityType: 'request',
        entityId: requestId,
        summary: `${actingUser.displayName} accepted waitlist offer for '${resource.title}'.`,
      });

      return { success: true, data: createdBooking || undefined };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to claim waitlist offer.' };
    }
  }

  // 5. HANDOVER CHECKOUT, RETURN & EXTENSION
  public async recordCheckout(
    actingUser: User,
    request: RequestItem,
    params: {
      beforeCondition: string;
      beforePhotos: string[];
      accessories: { item: string; included: boolean }[];
      dueAt: string;
    }
  ): Promise<ServiceResult<void>> {
    const handoverId = makeId('hand');
    try {
      await runTransaction(db, async (tx) => {
        const reqRef = doc(db, 'requests', request.id);
        const reqSnap = await tx.get(reqRef);
        if (!reqSnap.exists()) throw new Error('Request not found.');
        const currentReq = mapRequest(reqSnap.data() as Record<string, unknown>);
        if (currentReq.status !== 'confirmed') {
          throw new Error('Booking must be in confirmed status to check out.');
        }

        tx.update(reqRef, {
          status: 'in-use',
          updatedAt: serverTimestamp(),
        });

        tx.set(doc(db, 'handoverRecords', handoverId), {
          id: handoverId,
          requestId: request.id,
          resourceId: request.resourceId,
          ownerId: request.ownerId,
          requesterId: request.requesterId,
          assignedSupervisorIds: request.assignedSupervisorIds || [],
          checkoutAt: new Date().toISOString(),
          checkoutBy: actingUser.id,
          beforeCondition: params.beforeCondition.trim().slice(0, 1000),
          beforePhotos: params.beforePhotos.filter(Boolean).slice(0, 5),
          accessories: params.accessories.slice(0, 20),
          dueAt: params.dueAt,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      await writeAuditLog({
        actor: actingUser,
        action: 'CHECKOUT_RECORDED',
        entityType: 'handover',
        entityId: handoverId,
        summary: `Check-out logged by ${actingUser.displayName} for '${request.resourceTitle}'.`,
      });

      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Check-out failed.' };
    }
  }

  public async recordReturn(
    actingUser: User,
    request: RequestItem,
    handover: HandoverRecord,
    params: {
      returnCondition: string;
      returnPhotos: string[];
      accessoriesReturned: { item: string; returned: boolean }[];
      issuesReported?: string;
    }
  ): Promise<ServiceResult<void>> {
    try {
      await runTransaction(db, async (tx) => {
        const reqRef = doc(db, 'requests', request.id);
        const handRef = doc(db, 'handoverRecords', handover.id);

        tx.update(reqRef, {
          status: 'returned',
          updatedAt: serverTimestamp(),
        });

        tx.update(
          handRef,
          stripUndefined({
            returnedAt: new Date().toISOString(),
            returnedRecordedBy: actingUser.id,
            returnCondition: params.returnCondition.trim().slice(0, 1000),
            returnPhotos: params.returnPhotos.filter(Boolean).slice(0, 5),
            accessoriesReturned: params.accessoriesReturned.slice(0, 20),
            issuesReported: params.issuesReported?.trim() ? params.issuesReported.trim().slice(0, 1000) : undefined,
            updatedAt: serverTimestamp(),
          })
        );

        if (request.slotId) {
          const slotRef = doc(db, 'resources', request.resourceId, 'slots', request.slotId);
          const slotSnap = await tx.get(slotRef);
          if (slotSnap.exists()) {
            const slot = mapSlot(slotSnap.data() as Record<string, unknown>);
            tx.update(slotRef, {
              state: 'available',
              bookedRequestId: null,
              hasPendingWaitlist: (slot.waitlistCount || 0) > 0,
              updatedAt: serverTimestamp(),
            });
          }
        }
      });

      await createNotification({
        recipientId: request.requesterId,
        senderId: actingUser.id,
        type: 'return_recorded',
        title: `Return Completed: ${request.resourceTitle}`,
        message: 'Equipment return inspection has been recorded.',
        relatedRecordId: request.id,
      });

      await writeAuditLog({
        actor: actingUser,
        action: 'RETURN_RECORDED',
        entityType: 'handover',
        entityId: handover.id,
        summary: `Return inspection logged by ${actingUser.displayName}. Condition: "${params.returnCondition.trim()}"`,
      });

      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Return inspection failed.' };
    }
  }

  public async requestExtension(
    actingUser: User,
    request: RequestItem,
    resource: Resource,
    handover: HandoverRecord | undefined,
    minutes: number
  ): Promise<ServiceResult<string>> {
    try {
      if (resource.riskLevel === 'low' && resource.policies.autoExtendEnabled && handover) {
        const newDue = new Date(new Date(handover.dueAt).getTime() + minutes * 60 * 1000).toISOString();
        await updateDoc(doc(db, 'handoverRecords', handover.id), {
          dueAt: newDue,
          updatedAt: serverTimestamp(),
        });
        await writeAuditLog({
          actor: actingUser,
          action: 'EXTENSION_AUTO_APPROVED',
          entityType: 'request',
          entityId: request.id,
          summary: `Extended due time by ${minutes} minutes under low-risk policy.`,
        });
        return { success: true, data: `Session extended by ${minutes} minutes.` };
      }

      await createNotification({
        recipientId: resource.ownerId,
        senderId: actingUser.id,
        type: 'extension_decision',
        title: `Extension Requested: ${resource.title}`,
        message: `${actingUser.displayName} requested a ${minutes}-minute extension.`,
        relatedRecordId: request.id,
      });

      return { success: true, data: 'Extension request sent to the resource owner.' };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Extension request failed.' };
    }
  }

  // 6. INCIDENTS
  public async createIncident(
    actingUser: User,
    request: RequestItem,
    params: {
      reportedAgainstUserId: string;
      reportedAgainstDisplayName: string;
      title: string;
      description: string;
      evidenceRefs: string[];
    }
  ): Promise<ServiceResult<Incident>> {
    const incidentId = makeId('inc');
    const payload = {
      id: incidentId,
      resourceId: request.resourceId,
      resourceTitle: request.resourceTitle,
      requestId: request.id,
      ownerId: request.ownerId,
      assignedSupervisorIds: request.assignedSupervisorIds || [],
      reportedBy: actingUser.id,
      reportedByDisplayName: actingUser.displayName,
      reportedAgainstUserId: params.reportedAgainstUserId,
      reportedAgainstDisplayName: params.reportedAgainstDisplayName,
      title: params.title.trim().slice(0, 160),
      description: params.description.trim().slice(0, 2000),
      evidenceRefs: params.evidenceRefs.filter(Boolean).slice(0, 5),
      status: 'awaiting-response' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'incidents', incidentId), payload);

      await createNotification({
        recipientId: params.reportedAgainstUserId,
        senderId: actingUser.id,
        type: 'incident_opened',
        title: `Condition Inquiry Opened: ${params.title.trim()}`,
        message: 'A usage or condition report has been submitted for your session. You may submit your statement.',
        relatedRecordId: incidentId,
      });

      await writeAuditLog({
        actor: actingUser,
        action: 'INCIDENT_REPORTED',
        entityType: 'incident',
        entityId: incidentId,
        summary: `Opened condition inquiry '${params.title.trim()}'.`,
      });

      return {
        success: true,
        data: {
          ...payload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to create incident report.' };
    }
  }

  public async respondToIncident(
    actingUser: User,
    incidentId: string,
    responseText: string
  ): Promise<ServiceResult<void>> {
    try {
      await updateDoc(doc(db, 'incidents', incidentId), {
        response: responseText.trim().slice(0, 2000),
        respondedAt: new Date().toISOString(),
        status: 'under-review',
        updatedAt: serverTimestamp(),
      });

      await writeAuditLog({
        actor: actingUser,
        action: 'INCIDENT_RESPONSE_SUBMITTED',
        entityType: 'incident',
        entityId: incidentId,
        summary: `${actingUser.displayName} submitted a response statement.`,
      });

      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to submit response.' };
    }
  }

  public async saveIncidentAISummary(
    incidentId: string,
    aiSummary: IncidentAISummary
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'incidents', incidentId), {
        aiSummary,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Could not persist advisory summary:', err);
    }
  }

  public async resolveIncident(
    actingUser: User,
    incident: Incident,
    decision: string,
    rationale: string
  ): Promise<ServiceResult<void>> {
    try {
      await updateDoc(doc(db, 'incidents', incident.id), {
        status: 'resolved',
        decision: decision.trim().slice(0, 800),
        decisionReason: rationale.trim().slice(0, 1200),
        resolvedBy: actingUser.id,
        resolvedAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      });

      await createNotification({
        recipientId: incident.reportedAgainstUserId,
        senderId: actingUser.id,
        type: 'incident_updated',
        title: `Incident Resolved: ${incident.title}`,
        message: `Outcome: ${decision}. Rationale: ${rationale}`,
        relatedRecordId: incident.id,
      });

      await writeAuditLog({
        actor: actingUser,
        action: 'INCIDENT_RESOLVED',
        entityType: 'incident',
        entityId: incident.id,
        summary: `Resolved by ${actingUser.displayName}. Decision: ${decision}`,
      });

      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to resolve incident.' };
    }
  }

  // 7. ADMIN MODERATION & GOVERNANCE
  public async setOwnerVerificationState(
    actingUser: User,
    ownerId: string,
    newState: OwnerVerificationState,
    note: string
  ): Promise<ServiceResult<void>> {
    try {
      await updateDoc(doc(db, 'users', ownerId), {
        verificationState: newState,
        updatedAt: serverTimestamp(),
      });

      // Also sync ownerVerificationState on their resources
      const resSnap = await getDocs(
        query(collection(db, 'resources'), where('ownerId', '==', ownerId))
      );
      for (const rDoc of resSnap.docs) {
        await updateDoc(rDoc.ref, {
          ownerVerificationState: newState,
          ...(newState === 'suspended' ? { listingState: 'paused' } : {}),
          updatedAt: serverTimestamp(),
        });
      }

      await writeAuditLog({
        actor: actingUser,
        action: 'OWNER_SPOT_CHECK',
        entityType: 'admin',
        entityId: ownerId,
        summary: `Set owner verification state to '${newState}'. Note: ${note}`,
      });

      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update owner verification.' };
    }
  }

  public async adminUpdateUserRole(
    actingUser: User,
    targetUserId: string,
    newRole: UserRole
  ): Promise<ServiceResult<void>> {
    try {
      await updateDoc(doc(db, 'users', targetUserId), {
        role: newRole,
        updatedAt: serverTimestamp(),
      });

      await writeAuditLog({
        actor: actingUser,
        action: 'USER_ROLE_UPDATED',
        entityType: 'admin',
        entityId: targetUserId,
        summary: `Admin ${actingUser.displayName} updated user role to '${newRole}'.`,
      });

      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update user role.' };
    }
  }

  public async adminCheckListing(
    actingUser: User,
    resourceId: string,
    approve: boolean
  ): Promise<ServiceResult<void>> {
    try {
      const resource = await this.getResource(resourceId);
      if (!resource) return { success: false, error: 'Resource not found.' };

      const nextState = approve ? 'active' : 'paused';
      await updateDoc(doc(db, 'resources', resourceId), {
        listingState: nextState,
        updatedAt: serverTimestamp(),
      });

      // Update slots public visibility
      const slotsSnap = await getDocs(collection(db, 'resources', resourceId, 'slots'));
      for (const sDoc of slotsSnap.docs) {
        await updateDoc(sDoc.ref, {
          isPublic: approve,
          updatedAt: serverTimestamp(),
        });
      }

      if (resource.quizId) {
        await updateDoc(doc(db, 'quizzes', resource.quizId), {
          isPublic: approve,
          updatedAt: serverTimestamp(),
        });
      }

      await writeAuditLog({
        actor: actingUser,
        action: approve ? 'LISTING_ADMIN_APPROVED' : 'LISTING_ADMIN_PAUSED',
        entityType: 'resource',
        entityId: resourceId,
        summary: `Admin ${approve ? 'approved' : 'paused'} listing '${resource.title}'.`,
      });

      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Moderation action failed.' };
    }
  }

  // 8. REAL-TIME SUBSCRIPTIONS FOR AUTHENTICATED DASHBOARDS
  public subscribeNotifications(
    userId: string,
    onData: (items: AppNotification[]) => void
  ): Unsubscribe {
    const q = query(collection(db, 'notifications'), where('recipientId', '==', userId));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => mapNotification(d.data() as Record<string, unknown>))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onData(list);
      },
      (err) => {
        console.warn('Notifications listener error:', err);
      }
    );
  }

  public async markNotificationRead(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        readAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Failed to mark notification read:', err);
    }
  }

  public subscribeUserRequests(
    userId: string,
    onData: (items: RequestItem[]) => void,
    onError: (err: Error) => void
  ): Unsubscribe {
    const q = query(collection(db, 'requests'), where('requesterId', '==', userId));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => mapRequest(d.data() as Record<string, unknown>))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onData(list);
      },
      (err) => onError(err)
    );
  }

  public subscribeOwnerRequests(
    ownerId: string,
    onData: (items: RequestItem[]) => void,
    onError: (err: Error) => void
  ): Unsubscribe {
    const q = query(collection(db, 'requests'), where('ownerId', '==', ownerId));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => mapRequest(d.data() as Record<string, unknown>))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onData(list);
      },
      (err) => onError(err)
    );
  }

  public subscribeOwnerResources(
    ownerId: string,
    onData: (items: Resource[]) => void,
    onError: (err: Error) => void
  ): Unsubscribe {
    const q = query(collection(db, 'resources'), where('ownerId', '==', ownerId));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => mapResource(d.data() as Record<string, unknown>))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onData(list);
      },
      (err) => onError(err)
    );
  }

  public subscribeUserWaitlist(
    userId: string,
    onData: (items: WaitlistEntry[]) => void
  ): Unsubscribe {
    const q = query(collection(db, 'waitlistEntries'), where('userId', '==', userId));
    return onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => mapWaitlist(d.data() as Record<string, unknown>))
        .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
      onData(list);
    });
  }

  public subscribeOwnerWaitlist(
    ownerId: string,
    onData: (items: WaitlistEntry[]) => void
  ): Unsubscribe {
    const q = query(collection(db, 'waitlistEntries'), where('ownerId', '==', ownerId));
    return onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => mapWaitlist(d.data() as Record<string, unknown>))
        .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
      onData(list);
    });
  }

  public subscribeHandoversByField(
    field: 'requesterId' | 'ownerId',
    userId: string,
    onData: (items: HandoverRecord[]) => void
  ): Unsubscribe {
    const q = query(collection(db, 'handoverRecords'), where(field, '==', userId));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => mapHandover(d.data() as Record<string, unknown>));
      onData(list);
    });
  }

  public subscribeSupervisorData(
    supervisorId: string,
    onData: (data: {
      eligibilityRecords: EligibilityRecord[];
      requests: RequestItem[];
      handovers: HandoverRecord[];
      incidents: Incident[];
    }) => void
  ): Unsubscribe {
    let eligibilityRecords: EligibilityRecord[] = [];
    let requests: RequestItem[] = [];
    let handovers: HandoverRecord[] = [];
    let incidents: Incident[] = [];

    const emit = () => onData({ eligibilityRecords, requests, handovers, incidents });

    const u1 = onSnapshot(
      query(collection(db, 'eligibilityRecords'), where('assignedSupervisorIds', 'array-contains', supervisorId)),
      (snap) => {
        eligibilityRecords = snap.docs.map((d) => mapEligibility(d.data() as Record<string, unknown>));
        emit();
      }
    );
    const u2 = onSnapshot(
      query(collection(db, 'requests'), where('assignedSupervisorIds', 'array-contains', supervisorId)),
      (snap) => {
        requests = snap.docs.map((d) => mapRequest(d.data() as Record<string, unknown>));
        emit();
      }
    );
    const u3 = onSnapshot(
      query(collection(db, 'handoverRecords'), where('assignedSupervisorIds', 'array-contains', supervisorId)),
      (snap) => {
        handovers = snap.docs.map((d) => mapHandover(d.data() as Record<string, unknown>));
        emit();
      }
    );
    const u4 = onSnapshot(
      query(collection(db, 'incidents'), where('assignedSupervisorIds', 'array-contains', supervisorId)),
      (snap) => {
        incidents = snap.docs.map((d) => mapIncident(d.data() as Record<string, unknown>));
        emit();
      }
    );

    return () => {
      u1();
      u2();
      u3();
      u4();
    };
  }

  public subscribeAdminData(
    onData: (data: {
      users: User[];
      resources: Resource[];
      requests: RequestItem[];
      waitlistEntries: WaitlistEntry[];
      incidents: Incident[];
      auditLogs: AuditLog[];
    }) => void,
    onError: (err: Error) => void
  ): Unsubscribe {
    let users: User[] = [];
    let resources: Resource[] = [];
    let requests: RequestItem[] = [];
    let waitlistEntries: WaitlistEntry[] = [];
    let incidents: Incident[] = [];
    let auditLogs: AuditLog[] = [];

    const emit = () => onData({ users, resources, requests, waitlistEntries, incidents, auditLogs });

    const u1 = onSnapshot(collection(db, 'users'), (snap) => {
      users = snap.docs.map((d) => mapUser(d.data() as Record<string, unknown>));
      emit();
    }, onError);
    const u2 = onSnapshot(collection(db, 'resources'), (snap) => {
      resources = snap.docs.map((d) => mapResource(d.data() as Record<string, unknown>));
      emit();
    }, onError);
    const u3 = onSnapshot(collection(db, 'requests'), (snap) => {
      requests = snap.docs.map((d) => mapRequest(d.data() as Record<string, unknown>));
      emit();
    }, onError);
    const u4 = onSnapshot(collection(db, 'waitlistEntries'), (snap) => {
      waitlistEntries = snap.docs.map((d) => mapWaitlist(d.data() as Record<string, unknown>));
      emit();
    }, onError);
    const u5 = onSnapshot(collection(db, 'incidents'), (snap) => {
      incidents = snap.docs.map((d) => mapIncident(d.data() as Record<string, unknown>));
      emit();
    }, onError);
    const u6 = onSnapshot(
      query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc')),
      (snap) => {
        auditLogs = snap.docs.map((d) => mapAuditLog(d.data() as Record<string, unknown>));
        emit();
      },
      onError
    );

    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
      u6();
    };
  }

  public async getTimelineData(requestId: string): Promise<{
    request: RequestItem | null;
    resource: Resource | null;
    handover: HandoverRecord | null;
    incident: Incident | null;
  }> {
    const reqSnap = await getDoc(doc(db, 'requests', requestId));
    const request = reqSnap.exists() ? mapRequest(reqSnap.data() as Record<string, unknown>) : null;
    const resource = request ? await this.getResource(request.resourceId) : null;

    let handover: HandoverRecord | null = null;
    try {
      const hSnap = await getDocs(
        query(collection(db, 'handoverRecords'), where('requestId', '==', requestId))
      );
      if (!hSnap.empty) handover = mapHandover(hSnap.docs[0].data() as Record<string, unknown>);
    } catch {
      // Ignore if unauthorized
    }

    let incident: Incident | null = null;
    try {
      const iSnap = await getDocs(
        query(collection(db, 'incidents'), where('requestId', '==', requestId))
      );
      if (!iSnap.empty) incident = mapIncident(iSnap.docs[0].data() as Record<string, unknown>);
    } catch {
      // Ignore if unauthorized
    }

    return { request, resource, handover, incident };
  }

  public async getIncidentById(incidentId: string): Promise<{
    incident: Incident | null;
    handover: HandoverRecord | null;
  }> {
    const snap = await getDoc(doc(db, 'incidents', incidentId));
    if (!snap.exists()) return { incident: null, handover: null };
    const incident = mapIncident(snap.data() as Record<string, unknown>);

    let handover: HandoverRecord | null = null;
    try {
      const hSnap = await getDocs(
        query(collection(db, 'handoverRecords'), where('requestId', '==', incident.requestId))
      );
      if (!hSnap.empty) handover = mapHandover(hSnap.docs[0].data() as Record<string, unknown>);
    } catch {
      // Ignore
    }

    return { incident, handover };
  }
}

export const api = new FirestoreServiceLayer();
