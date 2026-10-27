/**
 * Decimal-safe Currency Utilities using Decimal.js
 * Formats numbers into Indian Rupee format (Lakhs & Crores: ##,##,###.##)
 */
const Decimal = require('decimal.js');

// Configure Decimal precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Format any number or decimal into Indian Rupee string (₹ X,XX,XXX.XX)
 * @param {number|string|Decimal} amount 
 * @param {boolean} includeSymbol 
 * @returns {string}
 */
function formatCurrency(amount, includeSymbol = true) {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return includeSymbol ? '₹0.00' : '0.00';
  }

  const dec = new Decimal(amount).toDecimalPlaces(2);
  const parts = dec.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  const isNegative = integerPart.startsWith('-');
  if (isNegative) {
    integerPart = integerPart.substring(1);
  }

  // Indian number grouping: last 3 digits, then groups of 2 digits
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  const result = (isNegative ? '-' : '') + formattedInteger + '.' + decimalPart;

  return includeSymbol ? `₹${result}` : result;
}

/**
 * Convert value to safe 2-decimal rounded string for MySQL DECIMAL columns
 * @param {number|string|Decimal} val 
 * @returns {string}
 */
function toDecimalString(val) {
  try {
    return new Decimal(val || 0).toDecimalPlaces(2).toFixed(2);
  } catch {
    return '0.00';
  }
}

/**
 * Create a Decimal instance
 * @param {number|string|Decimal} val 
 * @returns {Decimal}
 */
function dec(val) {
  return new Decimal(val || 0);
}

module.exports = {
  Decimal,
  formatCurrency,
  formatINR: formatCurrency,
  toDecimalString,
  dec
};
