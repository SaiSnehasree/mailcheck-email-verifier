import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  FileSpreadsheet,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Info,
  ExternalLink,
  Layers
} from 'lucide-react';
import { exportToCsv, exportToJson } from '../utils/exportCsv';

export default function ResultsTable({
  results = [],
  summary,
  activeFilter,
  setActiveFilter,
  onSelectEmailDetails
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedEmail, setCopiedEmail] = useState(null);
  const [sortField, setSortField] = useState('index');
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [expandedRow, setExpandedRow] = useState(null);

  // Copy email helper
  const handleCopy = (email, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 1800);
  };

  // Filter & Search
  const filteredResults = useMemo(() => {
    return results.filter((item) => {
      // Status filter
      if (activeFilter !== 'ALL' && item.status !== activeFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesEmail = item.original_email.toLowerCase().includes(query) ||
                             item.normalized_email.toLowerCase().includes(query);
        const matchesExplanation = item.explanation.toLowerCase().includes(query);
        const matchesReason = item.reason_code.toLowerCase().includes(query);
        if (!matchesEmail && !matchesExplanation && !matchesReason) {
          return false;
        }
      }
      return true;
    });
  }, [results, activeFilter, searchQuery]);

  // Sorting
  const sortedResults = useMemo(() => {
    const list = [...filteredResults];
    if (sortField === 'index') {
      return sortAsc ? list : list.reverse();
    }
    list.sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredResults, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedResults.length / pageSize));
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedResults.slice(start, start + pageSize);
  }, [sortedResults, currentPage, pageSize]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'likely_delivered':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Likely Delivered</span>
          </span>
        );
      case 'likely_to_bounce':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>Likely to Bounce</span>
          </span>
        );
      case 'unknown':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>Unknown</span>
          </span>
        );
    }
  };

  if (!results || results.length === 0) return null;

  return (
    <div className="max-w-6xl mx-auto mt-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by email, explanation, or reason..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Right: Actions (Filter pills + Exports) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter dropdown on mobile, tabs on desktop */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium text-slate-600">
            {['ALL', 'likely_delivered', 'likely_to_bounce', 'unknown'].map((filter) => {
              const labelMap = {
                ALL: 'All',
                likely_delivered: 'Delivered',
                likely_to_bounce: 'Bounce',
                unknown: 'Unknown'
              };
              const isActive = activeFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => {
                    setActiveFilter(filter);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 font-bold shadow-xs'
                      : 'hover:text-slate-900'
                  }`}
                >
                  {labelMap[filter]}
                </button>
              );
            })}
          </div>

          {/* Export buttons */}
          <button
            type="button"
            onClick={() => exportToCsv(results)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
            title="Download formatted CSV of all verification results"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => exportToJson(results, summary)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
            title="Download complete technical report in JSON"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>JSON Report</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th
                onClick={() => toggleSort('original_email')}
                className="py-3 px-4 cursor-pointer hover:text-slate-800"
              >
                <div className="flex items-center space-x-1">
                  <span>Email Address</span>
                  <ChevronsUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('status')}
                className="py-3 px-4 cursor-pointer hover:text-slate-800"
              >
                <div className="flex items-center space-x-1">
                  <span>Status</span>
                  <ChevronsUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4">Syntax Check</th>
              <th className="py-3 px-4">Domain / MX</th>
              <th className="py-3 px-4">SMTP Evidence</th>
              <th className="py-3 px-4">Explanation</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {paginatedResults.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No matching email records found</p>
                  <p className="text-slate-400 text-xs mt-0.5">Try adjusting your search query or status filter.</p>
                </td>
              </tr>
            ) : (
              paginatedResults.map((item, idx) => {
                const globalIndex = (currentPage - 1) * pageSize + idx + 1;
                const isExpanded = expandedRow === item.original_email + idx;

                return (
                  <React.Fragment key={idx}>
                    <tr
                      className={`hover:bg-slate-50/70 transition-colors ${
                        item.is_duplicate ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                        {globalIndex}
                      </td>

                      {/* Email address */}
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">
                        <div className="flex items-center space-x-2">
                          <span className="truncate max-w-[220px] sm:max-w-[280px]" title={item.original_email}>
                            {item.original_email}
                          </span>
                          {item.is_duplicate && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                              dup
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Syntax */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {item.syntax?.valid ? (
                          <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>Valid RFC</span>
                          </span>
                        ) : (
                          <span className="text-rose-700 font-semibold flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            <span>Invalid</span>
                          </span>
                        )}
                      </td>

                      {/* Domain / MX */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {item.domain?.valid ? (
                          <span className="text-slate-700 font-medium">
                            {item.domain.has_mx
                              ? `MX Active (${item.domain.mx_records?.length || 1})`
                              : 'A/AAAA Route'}
                          </span>
                        ) : (
                          <span className="text-rose-600 font-medium">No Mail Route</span>
                        )}
                        {item.domain?.is_disposable && (
                          <span className="ml-1 text-[10px] text-orange-600 font-semibold bg-orange-50 px-1 py-0.2 rounded border border-orange-200">
                            temp
                          </span>
                        )}
                      </td>

                      {/* SMTP Evidence */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {!item.smtp?.attempted ? (
                          <span className="text-slate-400 italic">Not probed</span>
                        ) : item.smtp.success === true ? (
                          <span className="text-emerald-600 font-semibold">
                            {item.smtp.catch_all ? 'Catch-All' : 'Accepted (250)'}
                          </span>
                        ) : item.smtp.success === false ? (
                          <span className="text-rose-600 font-semibold">
                            Rejected ({item.smtp.response_code || '5xx'})
                          </span>
                        ) : (
                          <span className="text-amber-600 font-semibold">
                            Inconclusive
                          </span>
                        )}
                      </td>

                      {/* Explanation */}
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={item.explanation}>
                        {item.explanation}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            type="button"
                            onClick={(e) => handleCopy(item.original_email, e)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Copy email to clipboard"
                          >
                            {copiedEmail === item.original_email ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => onSelectEmailDetails(item)}
                            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="View deep technical diagnostics"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-3">
        <div className="flex items-center space-x-2">
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>of {sortedResults.length} records</span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-slate-500">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
