/**
 * Unit Tests for Payroll Calculation Engine
 * Validates decimal-safe calculations for earnings, statutory deductions, overtime, and unpaid leave (LWP).
 */
const { calculateEmployeePayroll } = require('../src/services/payrollCalculationService');
const { Decimal, toDecimalString, formatINR } = require('../src/utils/currency');

describe('Payroll Calculation Engine', () => {

  describe('Standard Salary Calculations without Leave or Overtime', () => {
    const salaryStructure = {
      basic_salary: '50000.00',
      hra_type: 'percentage',
      hra_value: '40.00', // 40% of Basic = 20,000.00
      other_allowances: '10000.00',
      pf_applicable: 1,
      pf_rate: '12.00', // 12% of Basic = 6,000.00
      pt_applicable: 1,
      pt_amount: '200.00',
      tds_rate: '5.00', // 5% demo TDS on (Gross - PF)
      overtime_hourly_rate: '300.00'
    };

    const attendanceSummary = {
      present_days: 22,
      paid_leave_days: 2,
      unpaid_leave_days: 0,
      overtime_hours: 0
    };

    const options = {
      workingDays: 30,
      bonus: 0
    };

    test('calculates correct Gross, Deductions, and Net Salary', () => {
      const result = calculateEmployeePayroll(salaryStructure, attendanceSummary, options);

      // Basic: 50,000.00
      // HRA (40%): 20,000.00
      // Other Allowances: 10,000.00
      // Gross: 50,000 + 20,000 + 10,000 = 80,000.00
      expect(result.grossSalary).toBe('80000.00');

      // Deductions:
      // PF (12% of 50,000): 6,000.00
      // PT: 200.00
      // Taxable Base: 80,000 - 6,000 = 74,000.00
      // TDS (5% of 74,000): 3,700.00
      // Total Deductions: 6,000 + 200 + 3,700 = 9,900.00
      expect(result.totalDeductions).toBe('9900.00');

      // Net Salary: 80,000 - 9,900 = 70,100.00
      expect(result.netSalary).toBe('70100.00');
    });

    test('generates complete snapshot of line items', () => {
      const result = calculateEmployeePayroll(salaryStructure, attendanceSummary, options);

      expect(Array.isArray(result.lineItems)).toBe(true);
      const basicItem = result.lineItems.find(i => i.item_name === 'Basic Salary');
      const hraItem = result.lineItems.find(i => i.item_name === 'House Rent Allowance (HRA)');
      const pfItem = result.lineItems.find(i => i.item_name === 'Provident Fund (PF)');
      const ptItem = result.lineItems.find(i => i.item_name === 'Professional Tax (PT)');
      const tdsItem = result.lineItems.find(i => i.item_name.includes('TDS'));

      expect(basicItem.amount).toBe('50000.00');
      expect(hraItem.amount).toBe('20000.00');
      expect(pfItem.amount).toBe('6000.00');
      expect(ptItem.amount).toBe('200.00');
      expect(tdsItem.amount).toBe('3700.00');
    });
  });

  describe('Unpaid Leave (Loss of Pay - LWP) Deductions', () => {
    const salaryStructure = {
      basic_salary: '60000.00',
      hra_type: 'percentage',
      hra_value: '40.00', // 24,000.00
      other_allowances: '6000.00',
      pf_applicable: 1,
      pf_rate: '12.00', // 7,200.00
      pt_applicable: 1,
      pt_amount: '200.00',
      tds_rate: '0.00',
      overtime_hourly_rate: '0.00'
    };

    test('deducts per-day basic salary for unpaid leave days', () => {
      // 30 working days in month, 3 unpaid leave days
      // Per day basic = 60,000 / 30 = 2,000.00
      // 3 days LWP = 2,000 * 3 = 6,000.00
      const attendanceSummary = {
        present_days: 19,
        paid_leave_days: 0,
        unpaid_leave_days: 3,
        overtime_hours: 0
      };

      const options = { workingDays: 30, bonus: 0 };
      const result = calculateEmployeePayroll(salaryStructure, attendanceSummary, options);

      const lwpItem = result.lineItems.find(i => i.item_name.includes('Unpaid Leave'));
      expect(lwpItem).toBeDefined();
      expect(lwpItem.amount).toBe('6000.00');

      // Gross = 60,000 + 24,000 + 6,000 = 90,000.00
      expect(result.grossSalary).toBe('90000.00');

      // Total Deductions = PF (7,200) + PT (200) + LWP (6,000) = 13,400.00
      expect(result.totalDeductions).toBe('13400.00');

      // Net Salary = 90,000 - 13,400 = 76,600.00
      expect(result.netSalary).toBe('76600.00');
    });

    test('zero unpaid days causes zero LWP deduction', () => {
      const attendanceSummary = { unpaid_leave_days: 0 };
      const result = calculateEmployeePayroll(salaryStructure, attendanceSummary, { workingDays: 30 });
      const lwpItem = result.lineItems.find(i => i.item_name.includes('Unpaid Leave'));
      expect(lwpItem).toBeUndefined();
    });
  });

  describe('Overtime and Performance Bonus Additions', () => {
    const salaryStructure = {
      basic_salary: '45000.00',
      hra_type: 'fixed',
      hra_value: '15000.00',
      other_allowances: '5000.00',
      pf_applicable: 0,
      pt_applicable: 0,
      tds_rate: '0.00',
      overtime_hourly_rate: '250.00'
    };

    test('adds overtime pay and bonus to Gross Salary', () => {
      // Overtime: 8 hours @ ₹250/hr = ₹2,000.00
      // Bonus: ₹5,000.00
      // Base Gross: 45,000 + 15,000 + 5,000 = 65,000.00
      // Total Gross: 65,000 + 2,000 + 5,000 = 72,000.00
      const attendanceSummary = {
        overtime_hours: 8,
        unpaid_leave_days: 0
      };

      const options = {
        workingDays: 30,
        bonus: 5000.00,
        bonusReason: 'Festival Bonus'
      };

      const result = calculateEmployeePayroll(salaryStructure, attendanceSummary, options);

      expect(result.grossSalary).toBe('72000.00');
      expect(result.netSalary).toBe('72000.00'); // No deductions

      const otItem = result.lineItems.find(i => i.item_name === 'Overtime Earnings');
      expect(otItem).toBeDefined();
      expect(otItem.amount).toBe('2000.00');

      const bonusItem = result.lineItems.find(i => i.item_name === 'Performance Bonus');
      expect(bonusItem).toBeDefined();
      expect(bonusItem.amount).toBe('5000.00');
      expect(bonusItem.description).toBe('Festival Bonus');
    });
  });

  describe('Decimal-Safe Precision & Rounding', () => {
    test('avoids floating point drift on fractions', () => {
      // 0.1 + 0.2 in standard JS IEEE-754 = 0.30000000000000004
      const d1 = new Decimal('0.1');
      const d2 = new Decimal('0.2');
      const sum = d1.plus(d2);
      expect(toDecimalString(sum)).toBe('0.30');

      // Division: 10000 / 30 = 333.333333333... rounded to 2 decimals = 333.33
      const perDay = new Decimal('10000.00').dividedBy(30);
      expect(toDecimalString(perDay)).toBe('333.33');
    });

    test('formats Indian Rupees correctly', () => {
      expect(formatINR(70100)).toBe('₹70,100.00');
      expect(formatINR('1250000.50')).toBe('₹12,50,000.50');
      expect(formatINR(0)).toBe('₹0.00');
    });

    test('floors negative net salary to zero if deductions exceed gross', () => {
      const salaryStructure = {
        basic_salary: '10000.00',
        hra_type: 'fixed',
        hra_value: '0.00',
        other_allowances: '0.00',
        pf_applicable: 0,
        pt_applicable: 0,
        tds_rate: '0.00'
      };

      const options = {
        workingDays: 30,
        otherDeductions: '25000.00' // Excess deductions
      };

      const result = calculateEmployeePayroll(salaryStructure, {}, options);
      expect(result.grossSalary).toBe('10000.00');
      expect(result.totalDeductions).toBe('25000.00');
      expect(result.netSalary).toBe('0.00');
    });
  });
});
