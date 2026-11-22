import React from 'react';
import {
  CheckCircle2,
  Clock,
  ListOrdered,
  XCircle,
  AlertTriangle,
  Ban,
  Wrench,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  ShieldCheck,
  Tag,
  Key,
} from 'lucide-react';
import { BookingStatus, RiskLevel } from '../types';

interface StatusChipProps {
  status:
    | BookingStatus
    | 'available'
    | 'maintenance'
    | 'restricted'
    | 'verified'
    | 'unverified-owner'
    | 'unverified'
    | 'pending-admin-check'
    | 'active'
    | 'paused'
    | 'flagged'
    | 'suspended';
  size?: 'sm' | 'md';
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, size = 'md' }) => {
  const isSm = size === 'sm';
  const sizeClasses = isSm ? 'text-[11px] px-2 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5';
  const iconCls = isSm ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0';

  switch (status) {
    case 'available':
    case 'active':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-[#17171B] border border-[#3FA776]/50 text-[#3FA776] ${sizeClasses}`}
        >
          <CheckCircle2 className={iconCls} />
          <span>{status === 'active' ? 'Active' : 'Available'}</span>
        </span>
      );
    case 'confirmed':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-[#17171B] border border-[#3FA776]/60 text-[#3FA776] ${sizeClasses}`}
        >
          <CheckCircle2 className={iconCls} />
          <span>Confirmed</span>
        </span>
      );
    case 'pending-review':
    case 'pending-admin-check':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-[#17171B] border border-[#E0A33A]/50 text-[#E0A33A] ${sizeClasses}`}
        >
          <Clock className={iconCls} />
          <span>{status === 'pending-admin-check' ? 'Pending Verification' : 'Pending Review'}</span>
        </span>
      );
    case 'waitlisted':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-[#17171B] border border-[#F4A6C0]/40 text-[#F4A6C0] ${sizeClasses}`}
        >
          <ListOrdered className={iconCls} />
          <span>Waitlisted</span>
        </span>
      );
    case 'offered':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-[#7A1F3D] border border-[#F4A6C0]/60 text-[#F5F1F2] ${sizeClasses}`}
        >
          <Sparkles className={iconCls} />
          <span>Slot Offered</span>
        </span>
      );
    case 'in-use':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-[#7A1F3D] border border-[#F4A6C0]/40 text-[#F5F1F2] ${sizeClasses}`}
        >
          <Key className={iconCls} />
          <span>In Use</span>
        </span>
      );
    case 'returned':
    case 'transfer-complete':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-[#1E1E24] border border-[#2C2A2F] text-[#B8AEB2] ${sizeClasses}`}
        >
          <RotateCcw className={iconCls} />
          <span>{status === 'transfer-complete' ? 'Transfer Complete' : 'Returned'}</span>
        </span>
      );
    case 'overdue':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-[#17171B] border border-[#E0555F] text-[#E0555F] ${sizeClasses}`}
        >
          <AlertTriangle className={iconCls} />
          <span>Overdue</span>
        </span>
      );
    case 'maintenance':
    case 'paused':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-[#17171B] border border-[#E0A33A]/50 text-[#E0A33A] ${sizeClasses}`}
        >
          <Wrench className={iconCls} />
          <span>{status === 'paused' ? 'Paused' : 'Maintenance'}</span>
        </span>
      );
    case 'restricted':
    case 'suspended':
    case 'flagged':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-[#17171B] border border-[#E0555F]/70 text-[#E0555F] ${sizeClasses}`}
        >
          <ShieldAlert className={iconCls} />
          <span className="capitalize">{status}</span>
        </span>
      );
    case 'rejected':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-[#17171B] border border-[#E0555F]/60 text-[#E0555F] ${sizeClasses}`}
        >
          <XCircle className={iconCls} />
          <span>Rejected</span>
        </span>
      );
    case 'cancelled':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-[#17171B] border border-[#2C2A2F] text-[#B8AEB2] ${sizeClasses}`}
        >
          <Ban className={iconCls} />
          <span>Cancelled</span>
        </span>
      );
    case 'verified':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-[#17171B] border border-[#F4A6C0]/40 text-[#F4A6C0] ${sizeClasses}`}
        >
          <ShieldCheck className={iconCls} />
          <span>Verified</span>
        </span>
      );
    case 'unverified-owner':
    case 'unverified':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-[#17171B] border border-[#E0A33A]/50 text-[#E0A33A] ${sizeClasses}`}
        >
          <AlertTriangle className={iconCls} />
          <span>Unverified</span>
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-[#17171B] border border-[#2C2A2F] text-[#B8AEB2] ${sizeClasses}`}
        >
          <Tag className={iconCls} />
          <span>{status}</span>
        </span>
      );
  }
};

export const RiskBadge: React.FC<{ level: RiskLevel }> = ({ level }) => {
  switch (level) {
    case 'low':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#17171B] text-[#3FA776] border border-[#3FA776]/40">
          <CheckCircle2 className="w-3 h-3" />
          <span>Low Risk</span>
        </span>
      );
    case 'medium':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#17171B] text-[#E0A33A] border border-[#E0A33A]/40">
          <Clock className="w-3 h-3" />
          <span>Medium Risk</span>
        </span>
      );
    case 'high':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#17171B] text-[#F4A6C0] border border-[#F4A6C0]/40">
          <ShieldAlert className="w-3 h-3 text-[#F4A6C0]" />
          <span>High Risk</span>
        </span>
      );
  }
};

export const AccessModeBadge: React.FC<{
  priceMode: 'free' | 'paid';
  transferMode: 'temporary' | 'permanent';
  price: number;
  currency?: string;
  priceUnit?: string;
}> = ({ priceMode, transferMode, price, currency = 'USD', priceUnit }) => {
  let label = '';
  if (priceMode === 'free' && transferMode === 'temporary') {
    label = 'Borrow · Free';
  } else if (priceMode === 'paid' && transferMode === 'temporary') {
    label = price > 0 ? `Rent · ${currency} ${price}${priceUnit ? `/${priceUnit}` : ''}` : 'Rent · Paid';
  } else if (priceMode === 'free' && transferMode === 'permanent') {
    label = 'Giveaway · Free';
  } else {
    label = price > 0 ? `Sale · ${currency} ${price}` : 'Sale · Paid';
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#F4A6C0]">
      <span>{label}</span>
    </span>
  );
};
