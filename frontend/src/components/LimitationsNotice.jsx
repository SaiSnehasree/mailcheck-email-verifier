import React from 'react';
import { AlertCircle, ShieldAlert, X, CloudOff, EyeOff, Radio } from 'lucide-react';

export default function LimitationsNotice({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-indigo-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Verification Boundaries & Honest Limitations</h3>
              <p className="text-xs text-slate-500">Why no tool can promise 100% email delivery</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs sm:text-sm text-slate-600 max-h-[72vh] overflow-y-auto leading-relaxed">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center space-x-2">
              <Radio className="w-4 h-4 text-indigo-600" />
              <span>1. Probabilistic Estimates vs Delivery Guarantees</span>
            </h4>
            <p className="text-slate-600 text-xs">
              MailCheck classifies addresses as <strong>Likely Delivered</strong>, <strong>Likely to Bounce</strong>, or <strong>Unknown</strong>. Even when an address is valid and accepted by an MX host, downstream factors (full mailboxes, anti-spam heuristics, DMARC/SPF sender policies, reputation filters) determine final delivery.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center space-x-2">
              <CloudOff className="w-4 h-4 text-amber-600" />
              <span>2. Cloud Host Port 25 Firewalls (Render / AWS / Vercel / DigitalOcean)</span>
            </h4>
            <p className="text-slate-600 text-xs">
              Almost all modern cloud hosting providers block outbound TCP port 25 to prevent spam abuse. When port 25 is unreachable, MailCheck transparently completes syntax and full DNS/MX routing checks, gracefully falling back to mark mailbox-level certainty as <strong>Unknown</strong> rather than falsely fabricating a result.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center space-x-2">
              <EyeOff className="w-4 h-4 text-rose-600" />
              <span>3. Catch-All Domains & Anti-Harvesting Defenses</span>
            </h4>
            <p className="text-slate-600 text-xs">
              Many corporate mail servers (e.g., Microsoft 365, Google Workspace, custom Postfix configurations) employ <em>Catch-All</em> behavior or silently accept all recipient probes to prevent directory harvesting. MailCheck injects random probe checks to detect catch-all configurations and flags them as <strong>Unknown</strong>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-indigo-600" />
              <span>4. Temporary DNS Errors vs Permanent Failures</span>
            </h4>
            <p className="text-slate-600 text-xs">
              A temporary network timeout or DNS server rate limit is never counted as a permanent bounce. Definite bounces are strictly reserved for invalid syntax, confirmed non-routable domains (NXDOMAIN / no mail records), or explicit 550 recipient rejections.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
