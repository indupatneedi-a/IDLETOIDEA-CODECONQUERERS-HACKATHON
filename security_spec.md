# IDLETOIDEA Security Specification (Phase 0)

## 1. Data Invariants
1. **Zero-PII Leak**: `/users/{userId}` documents (which store `email` and optional `phone`) are readable ONLY by the document owner (`request.auth.uid == userId`) or a verified Admin. Never readable via blanket `isSignedIn()`.
2. **No Self-Assigned Privilege Escalation**: Newly registered users can only create `/users/{uid}` with `role` in `['requester', 'owner']` and `verificationState == 'unverified'`. Users cannot modify `role`, `verificationState`, or `standing` on their own profile.
3. **Public Active Catalog Only**: Unauthenticated visitors may browse (`get`/`list`) ONLY `resources` where `listingState == 'active'`, public `slots`, and public `quizzes`. Draft, paused, and pending-admin-check resources remain invisible to non-owners/non-admins.
4. **Master Gate Relational Integrity**: Subcollection `/resources/{resourceId}/slots/{slotId}` validates parent resource existence on create (`exists(/databases/$(database)/documents/resources/$(resourceId))`) and owner identity (`get(...).data.ownerId == request.auth.uid`).
5. **Booking Ownership & Slot Locking**: Only verified users can create `requests` for themselves (`requesterId == request.auth.uid`) referencing an existing `resourceId`. Confirmed or held slots cannot be overwritten by unrelated users.
6. **Terminal State Locking**: Once a `RequestItem` reaches a terminal state (`returned`, `rejected`, `cancelled`, `expired`, `transfer-complete`) or an `Incident` reaches `resolved`, non-admin clients cannot mutate it.
7. **Append-Only Audit Trail**: `auditLogs` allows creation ONLY when `actorId == request.auth.uid`; updates and deletes are unconditionally denied (`allow update, delete: if false`).
8. **Temporal Integrity**: `createdAt`, `updatedAt`, and `auditLogs.timestamp` must equal server `request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Yield `PERMISSION_DENIED`)
1. **Role Self-Promotion on Signup**: User creates `/users/{uid}` with `role: "admin"` or `role: "supervisor"`. -> Denied by `isValidNewUser()` (`role in ['requester', 'owner']`).
2. **Role Escalation on Update**: Requester updates `/users/{uid}` changing `role` to `"admin"` or `"owner"`. -> Denied by `affectedKeys().hasOnly(...)` excluding `role`.
3. **Ghost Field Shadow Update**: Owner updates `/resources/{id}` adding `{ isFeaturedBySystem: true }`. -> Denied by `hasOnly(...)` key allowlist in `isValidResource()`.
4. **PII Harvesting List Query**: Signed-in requester runs `getDocs(collection(db, 'users'))`. -> Denied by `allow list: if isAdmin();`.
5. **Email Spoof Admin Bypass**: User with `email_verified: false` claims admin email in token. -> Denied by `request.auth.token.email_verified == true` inside `isAdmin()` and `isVerifiedUser()`.
6. **ID Poisoning**: Client writes `/resources/a...<1500chars>...` -> Denied by `isValidId(resourceId)` (`size() <= 128` + regex).
7. **Client Timestamp Forgery**: Client creates request with `createdAt: "2020-01-01T00:00:00Z"`. -> Denied by `incoming().createdAt == request.time`.
8. **Orphaned Slot Creation**: Attacker creates `/resources/nonexistent-id/slots/slot-1`. -> Denied by parent `exists(...)` check.
9. **Request Identity Spoofing**: User A submits a booking request with `requesterId: "user-B"`. -> Denied by `incoming().requesterId == request.auth.uid`.
10. **Audit Log Tampering**: Owner or supervisor attempts `updateDoc` or `deleteDoc` on `/auditLogs/{logId}`. -> Denied by `allow update, delete: if false;`.
11. **Terminal State Re-opening**: Requester updates a `cancelled` or `returned` request back to `confirmed`. -> Denied by terminal state lock `!(existing().status in ['returned', 'rejected', 'cancelled', 'expired', 'transfer-complete'])`.
12. **Incident Evidence Snooping**: Unrelated signed-in user reads `/incidents/{incidentId}` where they are neither `reportedBy`, `reportedAgainstUserId`, `ownerId`, assigned supervisor, nor admin. -> Denied by incident `allow get, list` gate.
