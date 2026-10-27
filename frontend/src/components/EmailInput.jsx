import React, { useMemo } from 'react';
import { Play, RotateCcw, Sparkles, AlertCircle, Copy, Check } from 'lucide-react';

const SAMPLE_EMAILS = [
  'support@github.com',
  'invalid-syntax-at-sign',
  'contact@google.com',
  'definitely-nonexistent-domain-999.org',
  'admin@mailinator.com',
  'hello@cloudflare.com',
  'user..double.dot@example.com',
  'support@github.com' // Intentional duplicate to showcase deduplication
].join('\n');

export default function EmailInput({
  rawText,
  setRawText,
  onVerify,
  isLoading,
  error
}) {
  // Parse entries live to calculate metrics
  const { totalEntries, uniqueCount, duplicateCount } = useMemo(() => {
    if (!rawText.trim()) {
      return { totalEntries: 0, uniqueCount: 0, duplicateCount: 0 };
    }
    // Split by newlines, commas, semicolons, or multiple spaces
    const tokens = rawText
      .split(/[\r\n,;\s]+/)
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const total = tokens.length;
    const uniqueSet = new Set(tokens.map(t => t.toLowerCase()));
    const unique = uniqueSet.size;
    const duplicates = Math.max(0, total - unique);

    return { totalEntries: total, uniqueCount: unique, duplicateCount: duplicates };
  }, [rawText]);

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isLoading && uniqueCount > 0) {
        onVerify();
      }
    }
  };

  const handleLoadSample = () => {
    setRawText(SAMPLE_EMAILS);
  };

  const handleClear = () => {
    setRawText('');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-7 max-w-4xl mx-auto transition-all">
      {/* Input header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div>
          <label htmlFor="email-textarea" className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
            <span>Paste or Enter Email Addresses</span>
          </label>
          <p className="text-xs text-slate-500 mt-0.5">
            Separated by newlines, commas, semicolons, or spaces. Max 500 emails per batch.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleLoadSample}
            disabled={isLoading}
            className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200/60 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Sample</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={isLoading || !rawText}
            className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Textarea */}
      <div className="mt-3 relative">
        <textarea
          id="email-textarea"
          rows={6}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="e.g.&#10;sarah.connor@example.com&#10;sales@company.org, press@company.org&#10;support@bad-domain-xyz.com"
          className="w-full rounded-xl border border-slate-300 p-3.5 text-sm font-mono text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all resize-y min-h-[140px] max-h-[380px]"
        />
      </div>

      {/* Input Metrics Bar */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center space-x-3">
          <span className="font-medium text-slate-700">
            Total items: <span className="font-bold text-slate-900">{totalEntries}</span>
          </span>
          <span className="text-slate-300">•</span>
          <span className="font-medium text-slate-700">
            Unique addresses: <span className="font-bold text-indigo-600">{uniqueCount}</span>
          </span>
          {duplicateCount > 0 && (
            <>
              <span className="text-slate-300">•</span>
              <span className="font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {duplicateCount} duplicate{duplicateCount > 1 ? 's' : ''} detected
              </span>
            </>
          )}
        </div>

        <span className="text-[11px] text-slate-400 hidden sm:inline">
          Tip: Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px] text-slate-600">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px] text-slate-600">Enter</kbd> to verify
        </span>
      </div>

      {/* Error display */}
      {error && (
        <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Verification Request Failed:</span> {error}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="mt-4 pt-3 flex items-center justify-end">
        <button
          type="button"
          onClick={onVerify}
          disabled={isLoading || uniqueCount === 0}
          className="inline-flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 focus:outline-none focus:ring-4 focus:ring-indigo-100 shadow-md shadow-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer w-full sm:w-auto"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Verifying ({uniqueCount} unique)...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Verify Emails {uniqueCount > 0 ? `(${uniqueCount})` : ''}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
