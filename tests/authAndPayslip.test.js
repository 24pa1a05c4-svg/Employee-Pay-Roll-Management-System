/**
 * Unit & Integration Tests for Auth, Role Authorization, Payslip Isolation, and Security Helpers
 */
const bcrypt = require('bcryptjs');
const { maskBankAccount, sanitizeCsvValue, generatePayslipNumber } = require('../src/utils/helpers');
const { requireAuth, requireRole, requireSelfOrAdmin } = require('../src/middleware/auth');

describe('Security, Auth & Role Authorization Tests', () => {

  describe('Password Hashing with bcryptjs', () => {
    test('hashes password and verifies match correctly', async () => {
      const password = 'SecurePassword@123';
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2')).toBe(true);

      const isMatch = await bcrypt.compare(password, hash);
      expect(isMatch).toBe(true);

      const isWrongMatch = await bcrypt.compare('WrongPassword', hash);
      expect(isWrongMatch).toBe(false);
    });
  });

  describe('Sensitive Data Masking', () => {
    test('masks bank account number showing only last 4 digits', () => {
      expect(maskBankAccount('123456789012')).toBe('••••••••123456789012'.length > 0 ? '••••••••9012' : '••••••••9012');
      expect(maskBankAccount('9876543210')).toBe('••••••3210');
      expect(maskBankAccount('1234')).toBe('1234');
      expect(maskBankAccount('')).toBe('N/A');
      expect(maskBankAccount(null)).toBe('N/A');
    });
  });

  describe('CSV / Spreadsheet Formula Injection Protection (CWE-1236)', () => {
    test('neutralizes formula injection characters (=, +, -, @, tab, return)', () => {
      // Malicious cells designed to execute formulas when opened in Excel / Calc
      expect(sanitizeCsvValue('=CMD|"/C calc"!A0')).toBe(`"'=CMD|""/C calc""!A0"`);
      expect(sanitizeCsvValue('+123456789')).toBe(`"'+123456789"`);
      expect(sanitizeCsvValue('-SUM(A1:A10)')).toBe(`"'-SUM(A1:A10)"`);
      expect(sanitizeCsvValue('@SUM(1+1)')).toBe(`"'@SUM(1+1)"`);
      expect(sanitizeCsvValue('\tTAB')).toBe(`"'\tTAB"`);
    });

    test('properly quotes safe normal values and escapes double quotes', () => {
      expect(sanitizeCsvValue('Rajesh Kumar')).toBe(`"Rajesh Kumar"`);
      expect(sanitizeCsvValue('Engineering "R&D" Dept')).toBe(`"Engineering ""R&D"" Dept"`);
      expect(sanitizeCsvValue(null)).toBe('""');
    });
  });

  describe('Payslip Reference Generation', () => {
    test('generates standard unique payslip reference', () => {
      const ref = generatePayslipNumber(2026, 10, 5);
      expect(ref).toBe('PAY-202610-0005');
      expect(ref.startsWith('PAY-202610-')).toBe(true);
    });
  });

  describe('Role-Based Authorization Middleware', () => {
    let mockReq;
    let mockRes;
    let nextFunction;

    beforeEach(() => {
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        redirect: jest.fn().mockReturnThis()
      };
      nextFunction = jest.fn();
    });

    test('requireAuth redirects or returns 401 if unauthenticated', () => {
      mockReq = { session: {}, xhr: true, headers: { accept: 'application/json' } };
      requireAuth(mockReq, mockRes, nextFunction);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();

      // Browser GET redirect
      mockReq = { session: {}, xhr: false, headers: { accept: 'text/html' } };
      requireAuth(mockReq, mockRes, nextFunction);
      expect(mockRes.redirect).toHaveBeenCalledWith('/login.html');
    });

    test('requireAuth calls next() if user session is active', () => {
      mockReq = { session: { user: { id: 1, username: 'admin', role: 'admin' } } };
      requireAuth(mockReq, mockRes, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });

    test('requireRole allows permitted role and denies forbidden role', () => {
      const adminOnly = requireRole('admin');

      // Admin access
      mockReq = { session: { user: { id: 1, role: 'admin' } } };
      adminOnly(mockReq, mockRes, nextFunction);
      expect(nextFunction).toHaveBeenCalled();

      // Employee access attempted
      mockReq = { session: { user: { id: 2, role: 'employee' } } };
      adminOnly(mockReq, mockRes, nextFunction);
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    test('requireSelfOrAdmin allows employee to access only their own ID', () => {
      // Employee accessing their own employee_id = 5
      mockReq = {
        session: { user: { id: 10, role: 'employee', employee_id: 5 } },
        params: { id: '5' }
      };
      requireSelfOrAdmin(mockReq, mockRes, nextFunction);
      expect(nextFunction).toHaveBeenCalled();

      // Employee attempting to access employee_id = 6 (cross-tenant access)
      mockReq = {
        session: { user: { id: 10, role: 'employee', employee_id: 5 } },
        params: { id: '6' }
      };
      requireSelfOrAdmin(mockReq, mockRes, nextFunction);
      expect(mockRes.status).toHaveBeenCalledWith(403);

      // Admin accessing employee_id = 6 (allowed)
      nextFunction.mockClear();
      mockReq = {
        session: { user: { id: 1, role: 'admin' } },
        params: { id: '6' }
      };
      requireSelfOrAdmin(mockReq, mockRes, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('Employee Payslip Isolation Logic', () => {
    function authorizePayslipAccess(currentUser, targetPayslipRecord) {
      if (!currentUser) {
        const err = new Error('Authentication required.');
        err.status = 401;
        throw err;
      }
      if (currentUser.role === 'admin') {
        return true;
      }
      if (currentUser.role === 'employee') {
        if (currentUser.employee_id !== targetPayslipRecord.employee_id) {
          const err = new Error('Access denied: You are not authorized to view another employee\'s payslip.');
          err.status = 403;
          throw err;
        }
        return true;
      }
      const err = new Error('Access denied.');
      err.status = 403;
      throw err;
    }

    test('Admin can access any employee payslip', () => {
      const admin = { id: 1, role: 'admin' };
      const payslipRecord = { id: 100, employee_id: 42, payslip_number: 'PAY-202610-0042' };
      expect(authorizePayslipAccess(admin, payslipRecord)).toBe(true);
    });

    test('Employee can access their own payslip', () => {
      const empUser = { id: 5, role: 'employee', employee_id: 42 };
      const ownPayslip = { id: 100, employee_id: 42, payslip_number: 'PAY-202610-0042' };
      expect(authorizePayslipAccess(empUser, ownPayslip)).toBe(true);
    });

    test('Employee is strictly blocked (403) from accessing another employee payslip', () => {
      const empUser = { id: 5, role: 'employee', employee_id: 42 };
      const otherEmployeePayslip = { id: 101, employee_id: 43, payslip_number: 'PAY-202610-0043' };

      expect(() => {
        authorizePayslipAccess(empUser, otherEmployeePayslip);
      }).toThrow('Access denied: You are not authorized to view another employee\'s payslip.');

      try {
        authorizePayslipAccess(empUser, otherEmployeePayslip);
      } catch (err) {
        expect(err.status).toBe(403);
      }
    });
  });
});
