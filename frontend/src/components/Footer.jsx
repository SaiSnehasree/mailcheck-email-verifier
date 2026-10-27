import React from 'react';
import { Shield, Lock, EyeOff } from 'lucide-react';

export default function Footer({ onOpenLimitations }) {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white py-10 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-8 border-b border-slate-100">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-slate-800 font-bold">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>Zero-Storage Privacy</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              We never store, log, or persist your email lists to disk or databases. All verification runs in transient memory and is discarded immediately.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-slate-800 font-bold">
              <Lock className="w-4 h-4 text-indigo-600" />
              <span>Never Sends Messages</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Our engine performs only conservative protocol handshakes up to recipient commands. We never issue DATA commands or dispatch real emails.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-slate-800 font-bold">
              <EyeOff className="w-4 h-4 text-indigo-600" />
              <span>Honest Deliverability</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              MailCheck delivers truthful diagnostic classifications. Final delivery is subject to sender domain reputation and mailbox inbox controls.{' '}
              <button
                onClick={onOpenLimitations}
                className="text-indigo-600 hover:underline font-semibold"
              >
                Learn more
              </button>
            </p>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
          <p>© {new Date().getFullYear()} MailCheck. Built for high-integrity email verification.</p>
          <div className="flex items-center space-x-4">
            <span>FastAPI + React + Tailwind</span>
            <span>•</span>
            <span>RFC 5322 & RFC 5321</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
