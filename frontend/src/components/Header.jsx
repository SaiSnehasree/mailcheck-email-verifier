import React from 'react';
import { MailCheck as MailCheckIcon, Shield, Activity, ExternalLink, HelpCircle } from 'lucide-react';

export default function Header({ backendStatus, onOpenLimitations }) {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <MailCheckIcon className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight text-slate-900">Mail<span className="text-indigo-600">Check</span></span>
              <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-indigo-200/60">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">Production-Grade Email Intelligence</p>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Health indicator */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                backendStatus === 'healthy' ? 'bg-emerald-400' : 'bg-amber-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                backendStatus === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}></span>
            </span>
            <span className="text-slate-600 font-medium hidden md:inline">
              Engine: {backendStatus === 'healthy' ? 'Operational' : 'Connecting...'}
            </span>
          </div>

          {/* Limitations & Transparency Button */}
          <button
            onClick={onOpenLimitations}
            className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-100"
            title="Read verification boundaries and limitations"
          >
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">How It Works</span>
          </button>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors px-3 py-1.5 rounded-lg border border-slate-200"
          >
            <Shield className="w-3.5 h-3.5 text-slate-500" />
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
}
