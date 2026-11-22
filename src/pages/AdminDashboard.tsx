import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  BarChart3,
  UserCheck,
  FileText,
  Search,
  AlertTriangle,
} from 'lucide-react';
import {
  User,
  UserRole,
  OwnerVerificationState,
  Resource,
  RequestItem,
  WaitlistEntry,
  Incident,
  AuditLog,
} from '../types';
import { api } from '../services/api';
import { StatusChip } from '../components/StatusChip';

interface AdminDashboardProps {
  currentUser: User | null;
  onOpenIncidentView: (incidentId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onOpenIncidentView,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [auditQuery, setAuditQuery] = useState('');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');
  const [ownerNote, setOwnerNote] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') return;
    return api.subscribeAdminData(
      (data) => {
        setUsers(data.users);
        setResources(data.resources);
        setRequests(data.requests);
        setWaitlistEntries(data.waitlistEntries);
        setIncidents(data.incidents);
        setAuditLogs(data.auditLogs);
      },
      (err) => setFeedback(err.message)
    );
  }, [currentUser]);

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-2">
        <h2 className="text-xl font-bold text-[#F5F1F2] font-title">Admin &amp; Audit</h2>
        <p className="text-sm text-[#B8AEB2]">
          Administrator permissions are required to access platform governance.
        </p>
      </div>
    );
  }

  const owners = users.filter((u) => u.role === 'owner');
  const pendingAdminListings = resources.filter((r) => r.listingState === 'pending-admin-check');
  const openIncidents = incidents.filter((i) => i.status !== 'resolved');

  const activeListings = resources.filter((r) => r.listingState === 'active').length;
  const confirmedBookings = requests.filter((r) =>
    ['confirmed', 'in-use', 'returned'].includes(r.status)
  ).length;
  const pendingRequests = requests.filter((r) => r.status === 'pending-review').length;
  const overdueCount = requests.filter((r) => r.status === 'overdue').length;

  const filteredAudit = auditLogs.filter((log) => {
    if (selectedEntityType !== 'all' && log.entityType !== selectedEntityType) return false;
    if (auditQuery.trim()) {
      const q = auditQuery.toLowerCase();
      const haystack = `${log.action} ${log.summary} ${log.actorDisplayName} ${log.reasonCode || ''}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const handleUpdateOwnerState = async (ownerId: string, newState: OwnerVerificationState) => {
    const res = await api.setOwnerVerificationState(
      currentUser,
      ownerId,
      newState,
      ownerNote.trim() || `Updated status to ${newState}`
    );
    setFeedback(res.success ? `Owner updated to ${newState}.` : res.error || 'Update failed.');
  };

  const handleUpdateUserRole = async (userId: string, newRole: UserRole) => {
    const res = await api.adminUpdateUserRole(currentUser, userId, newRole);
    setFeedback(res.success ? `User role updated to ${newRole}.` : res.error || 'Update failed.');
  };

  const handleModerateListing = async (resourceId: string, approve: boolean) => {
    const res = await api.adminCheckListing(currentUser, resourceId, approve);
    setFeedback(
      res.success
        ? approve
          ? 'Listing approved and published.'
          : 'Listing paused.'
        : res.error || 'Moderation failed.'
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left space-y-8">
      <div className="p-6 rounded-2xl bg-[#17171B] border border-[#2C2A2F] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F1F2] font-title">
            Platform Governance &amp; Audit
          </h1>
          <p className="text-xs text-[#B8AEB2] mt-1">
            Verify organization owners, moderate high-risk listings, manage roles, and inspect the audit trail.
          </p>
        </div>
        <span className="text-xs font-mono-code px-3 py-1.5 rounded-lg bg-[#0D0D0F] border border-[#2C2A2F] text-[#F4A6C0]">
          Admin: {currentUser.displayName}
        </span>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-[#17171B] border border-[#F4A6C0]/50 text-[#F5F1F2] text-xs flex justify-between">
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback(null)} className="text-[#F4A6C0] underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#F4A6C0]" />
          <h2 className="text-base font-bold text-[#F5F1F2] font-title">Live Platform Metrics</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-xl bg-[#17171B] border border-[#2C2A2F]">
            <span className="text-[11px] font-mono-code text-[#B8AEB2] uppercase block">Listings</span>
            <span className="text-xl font-bold text-[#F5F1F2] font-mono-code">{resources.length}</span>
            <span className="text-[11px] text-[#3FA776] block">{activeListings} active</span>
          </div>
          <div className="p-4 rounded-xl bg-[#17171B] border border-[#2C2A2F]">
            <span className="text-[11px] font-mono-code text-[#B8AEB2] uppercase block">Requests</span>
            <span className="text-xl font-bold text-[#F5F1F2] font-mono-code">{requests.length}</span>
            <span className="text-[11px] text-[#B8AEB2] block">{confirmedBookings} confirmed</span>
          </div>
          <div className="p-4 rounded-xl bg-[#17171B] border border-[#2C2A2F]">
            <span className="text-[11px] font-mono-code text-[#B8AEB2] uppercase block">Waitlist</span>
            <span className="text-xl font-bold text-[#F4A6C0] font-mono-code">
              {waitlistEntries.filter((w) => w.status === 'waiting').length}
            </span>
            <span className="text-[11px] text-[#B8AEB2] block">waiting</span>
          </div>
          <div className="p-4 rounded-xl bg-[#17171B] border border-[#2C2A2F]">
            <span className="text-[11px] font-mono-code text-[#B8AEB2] uppercase block">Pending</span>
            <span className="text-xl font-bold text-[#E0A33A] font-mono-code">{pendingRequests}</span>
            <span className="text-[11px] text-[#B8AEB2] block">awaiting review</span>
          </div>
          <div className="p-4 rounded-xl bg-[#17171B] border border-[#2C2A2F]">
            <span className="text-[11px] font-mono-code text-[#B8AEB2] uppercase block">Overdue</span>
            <span className="text-xl font-bold text-[#E0555F] font-mono-code">{overdueCount}</span>
            <span className="text-[11px] text-[#B8AEB2] block">returns</span>
          </div>
          <div className="p-4 rounded-xl bg-[#17171B] border border-[#2C2A2F]">
            <span className="text-[11px] font-mono-code text-[#B8AEB2] uppercase block">Incidents</span>
            <span className="text-xl font-bold text-[#F5F1F2] font-mono-code">{openIncidents.length}</span>
            <span className="text-[11px] text-[#B8AEB2] block">open cases</span>
          </div>
        </div>
      </section>

      {/* Owner Verification & High-Risk Moderation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-[#17171B] border border-[#2C2A2F] p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#2C2A2F]">
            <UserCheck className="w-5 h-5 text-[#F4A6C0]" />
            <h3 className="text-sm font-bold text-[#F5F1F2] font-title">
              Owner Verification ({owners.length})
            </h3>
          </div>

          <input
            type="text"
            value={ownerNote}
            onChange={(e) => setOwnerNote(e.target.value)}
            placeholder="Optional verification note recorded to audit log..."
            className="w-full p-2 rounded-lg bg-[#0D0D0F] border border-[#2C2A2F] text-xs text-[#F5F1F2]"
          />

          {owners.length === 0 ? (
            <p className="text-xs text-[#B8AEB2] py-4 text-center">No registered owners yet.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {owners.map((owner) => (
                <div
                  key={owner.id}
                  className="p-3.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-xs space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-[#F5F1F2] text-sm block">
                        {owner.organisationName || owner.displayName}
                      </span>
                      <span className="text-[#B8AEB2]">{owner.email}</span>
                    </div>
                    <StatusChip status={owner.verificationState} size="sm" />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateOwnerState(owner.id, 'verified')}
                      className="px-2.5 py-1 rounded-lg bg-[#17171B] border border-[#3FA776]/60 text-[#3FA776] font-semibold cursor-pointer"
                    >
                      Verify
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateOwnerState(owner.id, 'flagged')}
                      className="px-2.5 py-1 rounded-lg bg-[#17171B] border border-[#E0A33A]/60 text-[#E0A33A] font-semibold cursor-pointer"
                    >
                      Flag
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateOwnerState(owner.id, 'suspended')}
                      className="px-2.5 py-1 rounded-lg bg-[#17171B] border border-[#E0555F]/60 text-[#E0555F] font-semibold cursor-pointer"
                    >
                      Suspend
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-[#17171B] border border-[#2C2A2F] p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#2C2A2F]">
            <ShieldCheck className="w-5 h-5 text-[#F4A6C0]" />
            <h3 className="text-sm font-bold text-[#F5F1F2] font-title">
              High-Risk Listing Moderation ({pendingAdminListings.length})
            </h3>
          </div>

          {pendingAdminListings.length === 0 ? (
            <p className="text-xs text-[#B8AEB2] text-center py-6">
              No high-risk listings awaiting moderation.
            </p>
          ) : (
            <div className="space-y-3">
              {pendingAdminListings.map((resObj) => (
                <div
                  key={resObj.id}
                  className="p-3.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-xs space-y-2"
                >
                  <span className="font-bold text-[#F5F1F2] block">{resObj.title}</span>
                  <p className="text-[#B8AEB2]">{resObj.description}</p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleModerateListing(resObj.id, false)}
                      className="px-3 py-1 rounded-lg border border-[#E0555F] text-[#E0555F] font-semibold cursor-pointer"
                    >
                      Pause
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModerateListing(resObj.id, true)}
                      className="px-3 py-1 rounded-lg bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] font-semibold cursor-pointer"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User Role Management & Open Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-[#17171B] border border-[#2C2A2F] p-6 space-y-4">
          <h3 className="text-sm font-bold text-[#F5F1F2] font-title pb-2 border-b border-[#2C2A2F]">
            Registered Accounts &amp; Roles ({users.length})
          </h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {users.map((u) => (
              <div
                key={u.id}
                className="p-3 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <span className="font-semibold text-[#F5F1F2] block truncate">{u.displayName}</span>
                  <span className="text-[#B8AEB2] truncate block">{u.email}</span>
                </div>
                <select
                  aria-label={`Role for ${u.displayName}`}
                  value={u.role}
                  onChange={(e) => handleUpdateUserRole(u.id, e.target.value as UserRole)}
                  className="px-2.5 py-1 rounded-lg bg-[#17171B] border border-[#2C2A2F] text-[#F5F1F2]"
                >
                  <option value="requester">requester</option>
                  <option value="owner">owner</option>
                  <option value="supervisor">supervisor</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-[#17171B] border border-[#2C2A2F] p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#2C2A2F]">
            <AlertTriangle className="w-4 h-4 text-[#E0A33A]" />
            <h3 className="text-sm font-bold text-[#F5F1F2] font-title">
              Open Incident Inquiries ({openIncidents.length})
            </h3>
          </div>
          {openIncidents.length === 0 ? (
            <p className="text-xs text-[#B8AEB2] py-6 text-center">No open incident reports.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {openIncidents.map((inc) => (
                <div
                  key={inc.id}
                  className="p-3 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-semibold text-[#F5F1F2] block">{inc.title}</span>
                    <span className="text-[#B8AEB2]">{inc.resourceTitle}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenIncidentView(inc.id)}
                    className="px-3 py-1.5 rounded-lg bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] font-semibold cursor-pointer"
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Audit Log */}
      <div className="rounded-2xl bg-[#17171B] border border-[#2C2A2F] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2C2A2F]">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#F4A6C0]" />
            <h3 className="text-base font-bold text-[#F5F1F2] font-title">
              Append-Only Audit Trail ({filteredAudit.length})
            </h3>
          </div>

          <select
            value={selectedEntityType}
            onChange={(e) => setSelectedEntityType(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[#0D0D0F] border border-[#2C2A2F] text-xs text-[#F5F1F2]"
          >
            <option value="all">All entities</option>
            <option value="request">Requests</option>
            <option value="resource">Resources</option>
            <option value="eligibility">Eligibility</option>
            <option value="incident">Incidents</option>
            <option value="waitlist">Waitlist</option>
            <option value="handover">Handovers</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#B8AEB2]" />
          <input
            type="text"
            value={auditQuery}
            onChange={(e) => setAuditQuery(e.target.value)}
            placeholder="Filter audit trail by actor, action, or summary..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-xs text-[#F5F1F2] outline-none focus:border-[#F4A6C0]"
          />
        </div>

        <div className="divide-y divide-[#2C2A2F] max-h-96 overflow-y-auto">
          {filteredAudit.length === 0 ? (
            <p className="py-6 text-center text-xs text-[#B8AEB2]">No audit log entries yet.</p>
          ) : (
            filteredAudit.map((log) => (
              <div
                key={log.id}
                className="py-3 px-2 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono-code font-bold text-[#F5F1F2]">{log.action}</span>
                    {log.reasonCode && (
                      <span className="text-[11px] font-mono-code text-[#F4A6C0]">
                        {log.reasonCode}
                      </span>
                    )}
                    <span className="text-[11px] font-mono-code text-[#B8AEB2] uppercase">
                      {log.entityType}
                    </span>
                  </div>
                  <p className="text-[#B8AEB2]">{log.summary}</p>
                </div>

                <div className="text-left sm:text-right shrink-0 font-mono-code text-[11px] text-[#B8AEB2]">
                  <div>{new Date(log.timestamp).toLocaleString()}</div>
                  <div>
                    {log.actorDisplayName} ({log.actorRole})
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
