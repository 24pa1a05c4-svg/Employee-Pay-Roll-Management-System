/**
 * CSV Export Service
 * Formats report rows into CSV with built-in Spreadsheet Formula Injection (CSV Injection) protection.
 */
const { sanitizeCsvValue } = require('../utils/helpers');

/**
 * Generate sanitized CSV text from headers and row objects
 * @param {Array<string>} headers Column display labels
 * @param {Array<string>} keys Property keys in row objects
 * @param {Array<Object>} rows Data rows
 * @returns {string}
 */
function generateCsv(headers, keys, rows) {
  const headerLine = headers.map(h => sanitizeCsvValue(h)).join(',');
  const rowLines = rows.map(row => {
    return keys.map(key => {
      const val = row[key];
      return sanitizeCsvValue(val);
    }).join(',');
  });

  return [headerLine, ...rowLines].join('\r\n');
}

module.exports = {
  generateCsv
};
