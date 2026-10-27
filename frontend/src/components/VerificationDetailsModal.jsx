import React from 'react';
import { X, CheckCircle2, XCircle, AlertTriangle, Shield, Server, Terminal, Copy, Check } from 'lucide-react';

export default function VerificationDetailsModal({ item, onClose }) {
  if (!item) return null;

  const [copied, setCopied] = React.useState(false);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(item, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const getStatusDisplay = () => {
    switch (item.status) {
      case 'likely_delivered':
        return {
          title: 'Likely Delivered',
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: CheckCircle2,
          iconColor: 'text-emerald-600'
        };
      case 'likely_to_bounce':
        return {
          title: 'Likely to Bounce',
          badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
          icon: XCircle,
          iconColor: 'text-rose-600'
        };
      case 'unknown':
      default:
        return {
          title: 'Unknown / Inconclusive',
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: AlertTriangle,
          iconColor: 'text-amber-600'
        };
    }
  };

  const statusInfo = getStatusDisplay();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center space-x-2.5">
            <div className={`p-1.5 rounded-lg border ${statusInfo.badgeClass}`}>
              <StatusIcon className={`w-4 h-4 ${statusInfo.iconColor}`} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Email Diagnostics</h3>
              <p className="text-xs font-mono text-slate-500 truncate max-w-[280px]">
                {item.original_email}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={handleCopyJson}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-xs flex items-center space-x-1"
              title="Copy JSON Diagnostics"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
          {/* Status & Explanation Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Classification</span>
              <span className={`px-2.5 py-0.5 rounded-full font-bold border text-[11px] ${statusInfo.badgeClass}`}>
                {statusInfo.title}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Reason Code</span>
              <span className="font-mono font-semibold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                {item.reason_code}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200/60">
              <span className="text-slate-500 block mb-0.5 font-medium">Evaluation Note:</span>
              <p className="text-slate-700 leading-relaxed">{item.explanation}</p>
            </div>
          </div>

          {/* Layer 1: Syntax */}
          <div className="border border-slate-200 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between font-bold text-slate-800">
              <span className="flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                <span>Layer 1 — Syntax & RFC 5322</span>
              </span>
              <span className={item.syntax?.valid ? 'text-emerald-600' : 'text-rose-600'}>
                {item.syntax?.valid ? 'Passed' : 'Failed'}
              </span>
            </div>
            <p className="text-slate-600">{item.syntax?.details}</p>
            {item.normalized_email && (
              <p className="font-mono text-[11px] text-slate-500 pt-1">
                Normalized: <span className="text-slate-800">{item.normalized_email}</span>
              </p>
            )}
          </div>

          {/* Layer 2: DNS & Mail Routing */}
          <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between font-bold text-slate-800">
              <span className="flex items-center space-x-1.5">
                <Server className="w-3.5 h-3.5 text-indigo-600" />
                <span>Layer 2 — DNS & Mail Routing</span>
              </span>
              <span className={item.domain?.valid ? 'text-emerald-600' : 'text-rose-600'}>
                {item.domain?.valid ? 'Resolvable' : 'Non-Routable'}
              </span>
            </div>
            <p className="text-slate-600">{item.domain?.details}</p>

            {item.domain?.mx_records && item.domain.mx_records.length > 0 && (
              <div className="mt-2 bg-slate-50 rounded-lg p-2 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Discovered Mail Exchangers (MX)
                </span>
                <div className="space-y-1">
                  {item.domain.mx_records.map((mx, idx) => (
                    <div key={idx} className="font-mono text-[11px] text-slate-700 truncate">
                      • {mx}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Layer 3: Conservative SMTP Handshake */}
          <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between font-bold text-slate-800">
              <span className="flex items-center space-x-1.5">
                <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                <span>Layer 3 — Conservative SMTP Probe</span>
              </span>
              <span className="text-slate-700">
                {!item.smtp?.attempted
                  ? 'Bypassed'
                  : item.smtp.success === true
                  ? 'Accepted'
                  : item.smtp.success === false
                  ? 'Rejected'
                  : 'Inconclusive'}
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed">{item.smtp?.details}</p>
            {item.smtp?.catch_all && (
              <div className="p-2 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 text-[11px]">
                <strong>Catch-All Domain Notice:</strong> The mail server accepts arbitrary incoming addresses. Mailbox existence cannot be proven without sending an actual email.
              </div>
            )}
          </div>

          <p className="text-[10px] text-slate-400 text-center italic">
            Inspected at: {new Date(item.checked_at).toLocaleString()}
          </p>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
