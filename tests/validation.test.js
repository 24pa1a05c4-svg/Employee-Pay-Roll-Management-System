/**
 * Unit Tests for Input Validation Logic
 * Tests employee data validation, leave dates, salary structures, and department constraints.
 */

describe('Input Validation & Sanitization Tests', () => {

  describe('Employee Input Validation', () => {
    function validateEmployeeInput(data) {
      const errors = [];

      if (!data.first_name || data.first_name.trim().length === 0) {
        errors.push({ field: 'first_name', message: 'First name is required.' });
      }

      if (!data.last_name || data.last_name.trim().length === 0) {
        errors.push({ field: 'last_name', message: 'Last name is required.' });
      }

      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push({ field: 'email', message: 'Valid email address is required.' });
      }

      if (!data.phone || !/^\+?[0-9\s\-]{10,15}$/.test(data.phone)) {
        errors.push({ field: 'phone', message: 'Valid phone number is required (10-15 digits).' });
      }

      if (!data.department_id || isNaN(Number(data.department_id))) {
        errors.push({ field: 'department_id', message: 'Valid department selection is required.' });
      }

      if (!data.designation_id || isNaN(Number(data.designation_id))) {
        errors.push({ field: 'designation_id', message: 'Valid designation selection is required.' });
      }

      if (!data.joining_date || !/^\d{4}-\d{2}-\d{2}$/.test(data.joining_date)) {
        errors.push({ field: 'joining_date', message: 'Valid joining date in YYYY-MM-DD format is required.' });
      }

      const basicSalary = Number(data.basic_salary);
      if (isNaN(basicSalary) || basicSalary <= 0) {
        errors.push({ field: 'basic_salary', message: 'Basic salary must be a positive number.' });
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    }

    test('accepts valid employee details', () => {
      const validEmployee = {
        first_name: 'Pooja',
        last_name: 'Sharma',
        email: 'pooja.sharma@technova.example.com',
        phone: '+91 9876543210',
        department_id: 1,
        designation_id: 2,
        joining_date: '2025-06-01',
        basic_salary: '65000.00'
      };

      const result = validateEmployeeInput(validEmployee);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('rejects missing or malformed fields', () => {
      const invalidEmployee = {
        first_name: '',
        last_name: '',
        email: 'invalid-email-format',
        phone: '123',
        department_id: 'abc',
        designation_id: null,
        joining_date: '01/01/2026',
        basic_salary: '-5000'
      };

      const result = validateEmployeeInput(invalidEmployee);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(8);

      const fieldsWithErrors = result.errors.map(e => e.field);
      expect(fieldsWithErrors).toContain('first_name');
      expect(fieldsWithErrors).toContain('email');
      expect(fieldsWithErrors).toContain('basic_salary');
      expect(fieldsWithErrors).toContain('joining_date');
    });
  });

  describe('Leave Request Input Validation', () => {
    function validateLeaveInput(data) {
      const errors = [];
      const validTypes = ['Paid', 'Casual', 'Sick', 'Unpaid', 'Maternity', 'Paternity'];

      if (!validTypes.includes(data.leave_type)) {
        errors.push({ field: 'leave_type', message: 'Valid leave type is required.' });
      }

      if (!data.start_date || !/^\d{4}-\d{2}-\d{2}$/.test(data.start_date)) {
        errors.push({ field: 'start_date', message: 'Valid start date in YYYY-MM-DD format is required.' });
      }

      if (!data.end_date || !/^\d{4}-\d{2}-\d{2}$/.test(data.end_date)) {
        errors.push({ field: 'end_date', message: 'Valid end date in YYYY-MM-DD format is required.' });
      }

      if (data.start_date && data.end_date && data.end_date < data.start_date) {
        errors.push({ field: 'end_date', message: 'End date cannot be earlier than start date.' });
      }

      if (!data.reason || data.reason.trim().length < 5) {
        errors.push({ field: 'reason', message: 'A reason with at least 5 characters is required.' });
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    }

    test('accepts valid leave request', () => {
      const validLeave = {
        leave_type: 'Sick',
        start_date: '2026-10-15',
        end_date: '2026-10-17',
        reason: 'Viral fever and doctor recommended rest'
      };

      const result = validateLeaveInput(validLeave);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('rejects inverted date ranges where end_date is before start_date', () => {
      const invertedLeave = {
        leave_type: 'Casual',
        start_date: '2026-10-20',
        end_date: '2026-10-18', // Earlier than start
        reason: 'Personal errands'
      };

      const result = validateLeaveInput(invertedLeave);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('earlier than start date'))).toBe(true);
    });

    test('rejects invalid leave types and short reason', () => {
      const invalidLeave = {
        leave_type: 'VacationWithoutPayUnknown',
        start_date: '2026-10-20',
        end_date: '2026-10-20',
        reason: 'hi'
      };

      const result = validateLeaveInput(invalidLeave);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(2);
    });
  });

  describe('Salary Structure Configuration Validation', () => {
    function validateSalaryStructure(data) {
      const errors = [];

      const basic = Number(data.basic_salary);
      if (isNaN(basic) || basic <= 0) {
        errors.push({ field: 'basic_salary', message: 'Basic salary must be greater than zero.' });
      }

      if (!['percentage', 'fixed'].includes(data.hra_type)) {
        errors.push({ field: 'hra_type', message: 'HRA type must be percentage or fixed.' });
      }

      const hraVal = Number(data.hra_value);
      if (isNaN(hraVal) || hraVal < 0) {
        errors.push({ field: 'hra_value', message: 'HRA value cannot be negative.' });
      }

      if (data.hra_type === 'percentage' && hraVal > 100) {
        errors.push({ field: 'hra_value', message: 'HRA percentage cannot exceed 100%.' });
      }

      const pfRate = Number(data.pf_rate);
      if (isNaN(pfRate) || pfRate < 0 || pfRate > 30) {
        errors.push({ field: 'pf_rate', message: 'PF rate must be between 0% and 30%.' });
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    }

    test('accepts realistic Indian corporate salary configuration', () => {
      const validConfig = {
        basic_salary: '75000.00',
        hra_type: 'percentage',
        hra_value: '40.00',
        other_allowances: '12000.00',
        pf_applicable: 1,
        pf_rate: '12.00',
        pt_applicable: 1,
        pt_amount: '200.00',
        tds_rate: '5.00'
      };

      const result = validateSalaryStructure(validConfig);
      expect(result.isValid).toBe(true);
    });

    test('rejects negative salary or impossible percentages', () => {
      const invalidConfig = {
        basic_salary: '-500',
        hra_type: 'percentage',
        hra_value: '150', // Exceeds 100%
        pf_rate: '50'     // Exceeds 30%
      };

      const result = validateSalaryStructure(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(3);
    });
  });
});
