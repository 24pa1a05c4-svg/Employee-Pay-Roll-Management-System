/**
 * Indian Date Formatting and Payroll Period Utilities
 */

/**
 * Format a Date object or ISO string to Indian Date format (DD/MM/YYYY)
 * @param {Date|string} dateInput 
 * @returns {string}
 */
function formatDateIndian(dateInput) {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Format a Date object or ISO string to standard YYYY-MM-DD for SQL/HTML inputs
 * @param {Date|string} dateInput 
 * @returns {string}
 */
function formatDateISO(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${year}-${month}-${day}`;
}

/**
 * Get full Month Name from month number (1 - 12)
 * @param {number} monthNum 
 * @returns {string}
 */
function getMonthName(monthNum) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNum - 1] || '';
}

/**
 * Calculate total days in a given month and year
 * @param {number} month (1-12)
 * @param {number} year 
 * @returns {number}
 */
function getDaysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

/**
 * Calculate working days (excluding Sundays by default) for a month
 * @param {number} month 
 * @param {number} year 
 * @returns {number}
 */
function calculateDefaultWorkingDays(month, year) {
  const totalDays = getDaysInMonth(month, year);
  let workingDays = 0;
  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, month - 1, day);
    // Exclude Sunday (0)
    if (d.getDay() !== 0) {
      workingDays++;
    }
  }
  return workingDays;
}

/**
 * Check if a string is a valid date
 * @param {string} dateStr 
 * @returns {boolean}
 */
function isValidDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim());
}

/**
 * Calculate days between two dates inclusive
 * @param {string|Date} startDate 
 * @param {string|Date} endDate 
 * @returns {number}
 */
function calculateDaysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // inclusive
}

module.exports = {
  formatDateIndian,
  formatDateISO,
  getMonthName,
  getDaysInMonth,
  calculateDefaultWorkingDays,
  getWorkingDaysInMonth: calculateDefaultWorkingDays,
  isValidDate,
  calculateDaysBetween
};
