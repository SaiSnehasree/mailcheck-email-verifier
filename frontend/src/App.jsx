import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import EmailInput from './components/EmailInput';
import SummaryCards from './components/SummaryCards';
import ResultsTable from './components/ResultsTable';
import VerificationDetailsModal from './components/VerificationDetailsModal';
import LimitationsNotice from './components/LimitationsNotice';
import Footer from './components/Footer';
import { checkHealth, verifyEmails } from './services/api';

export default function App() {
  const [rawText, setRawText] = useState('');
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedEmailDetails, setSelectedEmailDetails] = useState(null);
  const [isLimitationsOpen, setIsLimitationsOpen] = useState(false);

  const resultsRef = useRef(null);

  // Check backend health on initial mount
  useEffect(() => {
    async function verifyBackend() {
      const res = await checkHealth();
      if (res && res.status === 'healthy') {
        setBackendStatus('healthy');
      } else {
        setBackendStatus('down');
      }
    }
    verifyBackend();
  }, []);

  const handleVerify = async () => {
    if (!rawText.trim()) return;

    setError(null);
    setIsLoading(true);

    try {
      // Split tokens by commas, semicolons, whitespace, newlines
      const tokens = rawText
        .split(/[\r\n,;\s]+/)
        .map(t => t.trim())
        .filter(t => t.length > 0);

      if (tokens.length === 0) {
        throw new Error('Please enter at least one valid email address.');
      }

      if (tokens.length > 500) {
        throw new Error('Please verify 500 emails or fewer at one time to avoid server timeouts.');
      }

      const response = await verifyEmails(tokens);
      setResults(response.results);
      setSummary(response.summary);
      setActiveFilter('ALL');

      // Smooth scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);

    } catch (err) {
      console.error('Verification error:', err);
      setError(err.message || 'An error occurred during verification.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Header
        backendStatus={backendStatus}
        onOpenLimitations={() => setIsLimitationsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        <Hero />

        {/* Input Form Panel */}
        <div className="px-4">
          <EmailInput
            rawText={rawText}
            setRawText={setRawText}
            onVerify={handleVerify}
            isLoading={isLoading}
            error={error}
          />
        </div>

        {/* Results Container */}
        <div ref={resultsRef} className="px-4">
          {summary && (
            <SummaryCards
              summary={summary}
              activeFilter={activeFilter}
              onFilterChange={(filter) => setActiveFilter(filter)}
            />
          )}

          {results.length > 0 && (
            <ResultsTable
              results={results}
              summary={summary}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              onSelectEmailDetails={(item) => setSelectedEmailDetails(item)}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer onOpenLimitations={() => setIsLimitationsOpen(true)} />

      {/* Diagnostics Modal */}
      {selectedEmailDetails && (
        <VerificationDetailsModal
          item={selectedEmailDetails}
          onClose={() => setSelectedEmailDetails(null)}
        />
      )}

      {/* Educational Boundaries / Limitations Modal */}
      <LimitationsNotice
        isOpen={isLimitationsOpen}
        onClose={() => setIsLimitationsOpen(false)}
      />
    </div>
  );
}
