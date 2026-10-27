/**
 * General Security & Formatting Helpers
 */

/**
 * Mask sensitive bank account number (displays only last 4 digits)
 * @param {string} accountNum 
 * @returns {string}
 */
function maskBankAccount(accountNum) {
  if (!accountNum) return 'N/A';
  const clean = String(accountNum).trim();
  if (clean.length <= 4) return clean;
  const lastFour = clean.slice(-4);
  const maskedPrefix = '•'.repeat(Math.min(clean.length - 4, 10));
  return `${maskedPrefix}${lastFour}`;
}

/**
 * Sanitize cell values for CSV export to prevent CSV / Spreadsheet Formula Injection (CWE-1236)
 * Prefixes cells starting with '=', '+', '-', '@', '\t', '\r' with an apostrophe (').
 * @param {any} val 
 * @returns {string}
 */
function sanitizeCsvValue(val) {
  if (val === null || val === undefined) return '""';
  let str = String(val);

  // If starts with dangerous spreadsheet formula triggers, prefix with '
  if (/^[=\+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape internal quotes by doubling them
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generate a unique Payslip Reference Number
 * Format: PAY-YYYYMM-XXXX
 * @param {number} year 
 * @param {number} month 
 * @param {number} employeeId 
 * @returns {string}
 */
function generatePayslipNumber(year, month, employeeId) {
  const m = String(month).padStart(2, '0');
  const idStr = String(employeeId).padStart(4, '0');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `PAY-${year}${m}-${idStr}`;
}

/**
 * Generate next Employee Code (e.g. EMP-2026-001)
 * @param {number} sequence 
 * @returns {string}
 */
function generateEmployeeCode(sequence = 1) {
  const year = new Date().getFullYear();
  const seqStr = String(sequence).padStart(3, '0');
  return `EMP-${year}-${seqStr}`;
}

module.exports = {
  maskBankAccount,
  sanitizeCsvValue,
  generatePayslipNumber,
  generateEmployeeCode
};
