import React from 'react';
import { ArrowLeft, Info, FileText, Shield, Mail } from 'lucide-react';

export type StaticPageType = 'about' | 'terms' | 'privacy' | 'contact';

interface StaticPagesProps {
  page: StaticPageType;
  onBack: () => void;
}

export const StaticPages: React.FC<StaticPagesProps> = ({ page, onBack }) => {
  const renderContent = () => {
    switch (page) {
      case 'about':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-[#F4A6C0]">
              <Info className="w-5 h-5" />
              <h1 className="text-2xl sm:text-3xl font-bold text-[#F5F1F2] font-title">About IDLETOIDEA</h1>
            </div>
            <p className="text-sm text-[#B8AEB2] leading-relaxed">
              IDLETOIDEA is a makerspace equipment and workspace sharing platform built to connect tool owners and organizations with makers who need reliable access to specialized machinery and creative benches.
            </p>
            <div className="p-4 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-xs text-[#B8AEB2] space-y-2">
              <p className="font-mono-code text-[#E0A33A]">
                [Editable placeholder — replace with your organization&apos;s mission and background]
              </p>
              <p>
                Add your organization overview, participating workshops, operating hours, and equipment governance policies here before launching publicly.
              </p>
            </div>
          </div>
        );
      case 'terms':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-[#F4A6C0]">
              <FileText className="w-5 h-5" />
              <h1 className="text-2xl sm:text-3xl font-bold text-[#F5F1F2] font-title">Terms of Use</h1>
            </div>
            <div className="p-4 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-xs text-[#B8AEB2] space-y-2">
              <p className="font-mono-code text-[#E0A33A]">
                [Editable placeholder — replace with your organization&apos;s legal terms]
              </p>
              <p>
                Insert your workshop liability waivers, safety compliance requirements, cancellation rules, and equipment care responsibilities reviewed by your legal counsel.
              </p>
            </div>
            <ul className="list-disc pl-5 text-sm text-[#B8AEB2] space-y-1.5">
              <li>Users must follow all owner-specified safety guidelines and PPE rules.</li>
              <li>Bookings are subject to eligibility verification and owner or supervisor review.</li>
              <li>Condition inspections are logged at check-out and return.</li>
            </ul>
          </div>
        );
      case 'privacy':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-[#F4A6C0]">
              <Shield className="w-5 h-5" />
              <h1 className="text-2xl sm:text-3xl font-bold text-[#F5F1F2] font-title">Privacy Policy</h1>
            </div>
            <div className="p-4 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-xs text-[#B8AEB2] space-y-2">
              <p className="font-mono-code text-[#E0A33A]">
                [Editable placeholder — replace with your organization&apos;s privacy notice]
              </p>
              <p>
                IDLETOIDEA stores authentication details, booking requests, safety quiz eligibility records, handover logs, and incident reports in Firebase Authentication and Cloud Firestore strictly for platform operation.
              </p>
            </div>
            <p className="text-sm text-[#B8AEB2] leading-relaxed">
              Update this section with your data controller contact information, data retention schedule, and regional privacy disclosures (e.g., GDPR/CCPA) as applicable.
            </p>
          </div>
        );
      case 'contact':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-[#F4A6C0]">
              <Mail className="w-5 h-5" />
              <h1 className="text-2xl sm:text-3xl font-bold text-[#F5F1F2] font-title">Contact</h1>
            </div>
            <div className="p-4 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-xs text-[#B8AEB2] space-y-2">
              <p className="font-mono-code text-[#E0A33A]">
                [Editable placeholder — replace with your support email, address, and hours]
              </p>
              <p>
                Support email, physical workshop address, and emergency lab contact details should be configured by your platform administrator before going live.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 text-left space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-mono-code text-[#B8AEB2] hover:text-[#F5F1F2] cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 text-[#F4A6C0]" />
        <span>Back to Browse</span>
      </button>

      <div className="rounded-2xl bg-[#17171B] border border-[#2C2A2F] p-6 sm:p-8">
        {renderContent()}
      </div>
    </div>
  );
};
