import React from 'react';
import { ShieldCheck, Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export default function Hero() {
  return (
    <div className="pt-8 pb-6 sm:pt-10 sm:pb-8 text-center max-w-3xl mx-auto px-4">
      {/* Transparency Tag */}
      <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold mb-4">
        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
        <span>Honest Email Verification • Zero Phony Guarantees</span>
      </div>

      {/* Main Heading */}
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
        Know which emails are <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">worth verifying.</span>
      </h1>

      {/* Subtitle with Honest Stance */}
      <p className="mt-3 sm:mt-4 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
        Layered analysis using RFC 5322 syntax compliance, DNS/MX routing records, and conservative recipient probes.
        Results are probabilistic classifications — never marketing gimmicks or 100% false guarantees.
      </p>

      {/* Quick classification legend pills */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-medium text-slate-600">
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Likely Delivered: Positive evidence</span>
        </span>
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-800 border border-rose-200">
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>Likely to Bounce: Confirmed failure</span>
        </span>
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          <span>Unknown: Catch-all / Blocked / Ambiguous</span>
        </span>
      </div>
    </div>
  );
}
