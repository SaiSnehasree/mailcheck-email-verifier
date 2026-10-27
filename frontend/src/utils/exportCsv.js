/**
 * Escapes CSV field according to RFC 4180
 * @param {string|number|boolean} field
 * @returns {string}
 */
function escapeCsv(field) {
  if (field === null || field === undefined) return '""';
  const str = String(field).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Exports verification results to a formatted CSV file
 * @param {Array} results
 */
export function exportToCsv(results) {
  if (!results || results.length === 0) return;

  const headers = [
    'Original Email',
    'Normalized Email',
    'Status',
    'Reason Code',
    'Syntax Valid',
    'Syntax Details',
    'Domain Valid',
    'Has MX Records',
    'MX Records',
    'Fallback to A/AAAA',
    'Is Disposable',
    'Domain Details',
    'SMTP Attempted',
    'SMTP Success',
    'Is Catch-All',
    'SMTP Code',
    'SMTP Details',
    'Is Duplicate',
    'Explanation',
    'Checked At'
  ];

  const rows = results.map(r => [
    escapeCsv(r.original_email),
    escapeCsv(r.normalized_email),
    escapeCsv(r.status),
    escapeCsv(r.reason_code),
    escapeCsv(r.syntax?.valid),
    escapeCsv(r.syntax?.details),
    escapeCsv(r.domain?.valid),
    escapeCsv(r.domain?.has_mx),
    escapeCsv((r.domain?.mx_records || []).join('; ')),
    escapeCsv(r.domain?.fallback_a),
    escapeCsv(r.domain?.is_disposable),
    escapeCsv(r.domain?.details),
    escapeCsv(r.smtp?.attempted),
    escapeCsv(r.smtp?.success === null ? 'N/A' : r.smtp?.success),
    escapeCsv(r.smtp?.catch_all === null ? 'N/A' : r.smtp?.catch_all),
    escapeCsv(r.smtp?.response_code || 'N/A'),
    escapeCsv(r.smtp?.details),
    escapeCsv(r.is_duplicate),
    escapeCsv(r.explanation),
    escapeCsv(r.checked_at)
  ]);

  const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows.map(row => row.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const now = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `mailcheck_results_${now}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports complete verification data as formatted JSON
 * @param {Array} results
 * @param {Object} summary
 */
export function exportToJson(results, summary) {
  if (!results || results.length === 0) return;

  const exportData = {
    exported_at: new Date().toISOString(),
    summary,
    results
  };

  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(exportData, null, 2)
  )}`;
  const now = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const link = document.createElement('a');
  link.setAttribute('href', jsonString);
  link.setAttribute('download', `mailcheck_report_${now}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
