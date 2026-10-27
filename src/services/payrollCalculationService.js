/**
 * Payroll Calculation Engine
 * Implements configurable earnings, statutory deductions, overtime, and unpaid leave deductions.
 * Uses Decimal.js for exact decimal-safe financial calculations.
 */
const { Decimal, toDecimalString } = require('../utils/currency');

/**
 * Calculate employee payroll for a given period
 * @param {Object} employeeSalaryStructure 
 * @param {Object} attendanceSummary 
 * @param {Object} options 
 * @returns {Object}
 */
function calculateEmployeePayroll(salaryStructure, attendanceSummary = {}, options = {}) {
  const workingDays = new Decimal(options.workingDays || 30);
  const bonus = new Decimal(options.bonus || 0);

  // 1. Basic Salary
  const basicSalary = new Decimal(salaryStructure.basic_salary || 0);

  // 2. House Rent Allowance (HRA)
  let hra = new Decimal(0);
  if (salaryStructure.hra_type === 'percentage') {
    const rate = new Decimal(salaryStructure.hra_value || 40).dividedBy(100);
    hra = basicSalary.times(rate);
  } else {
    hra = new Decimal(salaryStructure.hra_value || 0);
  }

  // 3. Other Allowances
  const otherAllowances = new Decimal(salaryStructure.other_allowances || 0);

  // 4. Overtime Earnings
  const overtimeHours = new Decimal(attendanceSummary.overtime_hours || 0);
  const hourlyRate = new Decimal(salaryStructure.overtime_hourly_rate || 0);
  const overtimePay = overtimeHours.times(hourlyRate);

  // --- GROSS EARNINGS ---
  const grossSalary = basicSalary
    .plus(hra)
    .plus(otherAllowances)
    .plus(bonus)
    .plus(overtimePay);

  // 5. Unpaid Leave (Loss of Pay - LWP) Deduction
  const unpaidLeaveDays = new Decimal(attendanceSummary.unpaid_leave_days || 0);
  let unpaidLeaveDeduction = new Decimal(0);
  if (unpaidLeaveDays.greaterThan(0) && workingDays.greaterThan(0)) {
    // Per-day rate calculated from Basic Salary
    const perDayBasic = basicSalary.dividedBy(workingDays);
    unpaidLeaveDeduction = perDayBasic.times(unpaidLeaveDays);
  }

  // 6. Provident Fund (PF)
  let pfDeduction = new Decimal(0);
  if (salaryStructure.pf_applicable) {
    const pfRate = new Decimal(salaryStructure.pf_rate || 12).dividedBy(100);
    pfDeduction = basicSalary.times(pfRate);
  }

  // 7. Professional Tax (PT)
  let ptDeduction = new Decimal(0);
  if (salaryStructure.pt_applicable) {
    ptDeduction = new Decimal(salaryStructure.pt_amount || 200);
  }

  // 8. Tax Deducted at Source (TDS) / Income Tax (Demo rate assumption)
  let tdsDeduction = new Decimal(0);
  if (salaryStructure.tds_rate && new Decimal(salaryStructure.tds_rate).greaterThan(0)) {
    const tdsRate = new Decimal(salaryStructure.tds_rate).dividedBy(100);
    // TDS applies to taxable gross earnings minus statutory PF
    const taxableBase = grossSalary.minus(pfDeduction);
    if (taxableBase.greaterThan(0)) {
      tdsDeduction = taxableBase.times(tdsRate);
    }
  }

  // 9. Other Custom Deductions
  const otherDeductions = new Decimal(options.otherDeductions || 0);

  // --- TOTAL DEDUCTIONS ---
  const totalDeductions = pfDeduction
    .plus(ptDeduction)
    .plus(tdsDeduction)
    .plus(unpaidLeaveDeduction)
    .plus(otherDeductions);

  // --- NET SALARY ---
  let netSalary = grossSalary.minus(totalDeductions);
  if (netSalary.isNegative()) {
    netSalary = new Decimal(0);
  }

  // Detailed line items for permanent historical record
  const lineItems = [
    {
      item_type: 'Earning',
      item_name: 'Basic Salary',
      amount: toDecimalString(basicSalary),
      is_taxable: 1,
      description: 'Monthly fixed basic pay'
    },
    {
      item_type: 'Earning',
      item_name: 'House Rent Allowance (HRA)',
      amount: toDecimalString(hra),
      is_taxable: 1,
      description: salaryStructure.hra_type === 'percentage' 
        ? `${salaryStructure.hra_value}% of Basic Salary`
        : 'Fixed monthly HRA'
    },
    {
      item_type: 'Earning',
      item_name: 'Other Allowances',
      amount: toDecimalString(otherAllowances),
      is_taxable: 1,
      description: 'Special, conveyance and medical allowances'
    }
  ];

  if (bonus.greaterThan(0)) {
    lineItems.push({
      item_type: 'Earning',
      item_name: 'Performance Bonus',
      amount: toDecimalString(bonus),
      is_taxable: 1,
      description: options.bonusReason || 'Quarterly / monthly performance bonus'
    });
  }

  if (overtimePay.greaterThan(0)) {
    lineItems.push({
      item_type: 'Earning',
      item_name: 'Overtime Earnings',
      amount: toDecimalString(overtimePay),
      is_taxable: 1,
      description: `${overtimeHours.toFixed(1)} hrs overtime @ ₹${hourlyRate.toFixed(2)}/hr`
    });
  }

  // Deductions
  if (pfDeduction.greaterThan(0)) {
    lineItems.push({
      item_type: 'Deduction',
      item_name: 'Provident Fund (PF)',
      amount: toDecimalString(pfDeduction),
      is_taxable: 0,
      description: `${salaryStructure.pf_rate || 12}% statutory employee PF contribution`
    });
  }

  if (ptDeduction.greaterThan(0)) {
    lineItems.push({
      item_type: 'Deduction',
      item_name: 'Professional Tax (PT)',
      amount: toDecimalString(ptDeduction),
      is_taxable: 0,
      description: 'State government professional tax'
    });
  }

  if (tdsDeduction.greaterThan(0)) {
    lineItems.push({
      item_type: 'Deduction',
      item_name: 'Income Tax / TDS (Demo Rate)',
      amount: toDecimalString(tdsDeduction),
      is_taxable: 0,
      description: `${salaryStructure.tds_rate}% TDS demo assumption`
    });
  }

  if (unpaidLeaveDeduction.greaterThan(0)) {
    lineItems.push({
      item_type: 'Deduction',
      item_name: 'Unpaid Leave (LWP)',
      amount: toDecimalString(unpaidLeaveDeduction),
      is_taxable: 0,
      description: `${unpaidLeaveDays.toFixed(1)} days unpaid leave (Basic / ${workingDays} * days)`
    });
  }

  if (otherDeductions.greaterThan(0)) {
    lineItems.push({
      item_type: 'Deduction',
      item_name: 'Other Authorized Deductions',
      amount: toDecimalString(otherDeductions),
      is_taxable: 0,
      description: options.otherDeductionsReason || 'Authorized voluntary deduction'
    });
  }

  return {
    workingDays: Number(workingDays),
    presentDays: Number(attendanceSummary.present_days || 0),
    paidLeaveDays: Number(attendanceSummary.paid_leave_days || 0),
    unpaidLeaveDays: Number(unpaidLeaveDays),
    overtimeHours: Number(overtimeHours),
    basicSalary: toDecimalString(basicSalary),
    grossSalary: toDecimalString(grossSalary),
    totalDeductions: toDecimalString(totalDeductions),
    netSalary: toDecimalString(netSalary),
    lineItems
  };
}

module.exports = {
  calculateEmployeePayroll
};
