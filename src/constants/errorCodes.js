/**
 * System error code registry
 * Extracted from DevSettings.jsx inline HTML table
 */

export const ERROR_CODES = [
  { code: 'NB-E001', description: 'Authentication failure or session expired', severity: 'high' },
  { code: 'NB-E002', description: 'Insufficient permissions for requested operation', severity: 'high' },
  { code: 'NB-E003', description: 'Database read/write operation failed', severity: 'critical' },
  { code: 'NB-E004', description: 'File upload exceeded size limit or format rejected', severity: 'medium' },
  { code: 'NB-E005', description: 'Email dispatch service unavailable', severity: 'medium' },
  { code: 'NB-E006', description: 'Payment gateway timeout or rejection', severity: 'high' },
  { code: 'NB-E007', description: 'Rate limit exceeded for API endpoint', severity: 'medium' },
  { code: 'NB-E008', description: 'Resource not found or has been deleted', severity: 'low' },
  { code: 'NB-E009', description: 'Network connectivity lost during operation', severity: 'high' },
  { code: 'NB-E010', description: 'Internal system error — contact development team', severity: 'critical' },
];

/**
 * Get severity color class for an error code
 * @param {string} severity
 * @returns {string} Tailwind color class
 */
export const getSeverityColor = (severity) => {
  switch (severity) {
    case 'critical': return 'text-red-500';
    case 'high': return 'text-orange-500';
    case 'medium': return 'text-yellow-500';
    case 'low': return 'text-blue-400';
    default: return 'text-gray-400';
  }
};
