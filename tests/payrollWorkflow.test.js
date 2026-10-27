/**
 * Unit Tests for Monthly Payroll Workflow Logic
 * Tests duplicate run prevention, status lifecycle transitions, immutability of finalized records, and reversal rules.
 */

describe('Monthly Payroll Workflow Logic', () => {

  describe('Payroll Lifecycle & Duplicate Run Prevention', () => {
    // Simulated payroll runs table
    let payrollRuns = [
      { id: 1, month: 8, year: 2026, status: 'Finalized', total_net: '425000.00' },
      { id: 2, month: 9, year: 2026, status: 'Approved', total_net: '430000.00' },
      { id: 3, month: 10, year: 2026, status: 'Draft', total_net: '435000.00' }
    ];

    function createPayrollRun(runs, { month, year, created_by }) {
      const existing = runs.find(r => r.month === month && r.year === year);
      if (existing) {
        if (existing.status === 'Finalized') {
          const err = new Error(`Payroll for ${month}/${year} is already Finalized and cannot be overwritten.`);
          err.code = 'PAYROLL_ALREADY_FINALIZED';
          throw err;
        }
        // If Draft or Pending, allow recalculation/update
        return { action: 'updated', runId: existing.id, status: 'Draft' };
      }

      const newRun = {
        id: runs.length + 1,
        month,
        year,
        status: 'Draft',
        created_by
      };
      runs.push(newRun);
      return { action: 'created', runId: newRun.id, status: 'Draft' };
    }

    test('creates new draft payroll run for an un-processed month', () => {
      const res = createPayrollRun(payrollRuns, { month: 11, year: 2026, created_by: 1 });
      expect(res.action).toBe('created');
      expect(res.status).toBe('Draft');
    });

    test('updates existing draft run when recalculated before finalization', () => {
      const res = createPayrollRun(payrollRuns, { month: 10, year: 2026, created_by: 1 });
      expect(res.action).toBe('updated');
      expect(res.runId).toBe(3);
    });

    test('strictly prevents overwriting or re-running a Finalized payroll period', () => {
      expect(() => {
        createPayrollRun(payrollRuns, { month: 8, year: 2026, created_by: 1 });
      }).toThrow('Payroll for 8/2026 is already Finalized and cannot be overwritten.');

      try {
        createPayrollRun(payrollRuns, { month: 8, year: 2026, created_by: 1 });
      } catch (err) {
        expect(err.code).toBe('PAYROLL_ALREADY_FINALIZED');
      }
    });
  });

  describe('Status Transitions & Immutability Rules', () => {
    function transitionPayrollStatus(run, newStatus, user) {
      if (run.status === 'Finalized') {
        const err = new Error('Finalized payroll records are immutable and cannot change status directly.');
        err.code = 'PAYROLL_IMMUTABLE';
        throw err;
      }

      const validTransitions = {
        'Draft': ['Pending Approval'],
        'Pending Approval': ['Approved', 'Draft'],
        'Approved': ['Finalized', 'Draft']
      };

      const allowed = validTransitions[run.status] || [];
      if (!allowed.includes(newStatus)) {
        const err = new Error(`Cannot transition payroll from ${run.status} to ${newStatus}.`);
        err.code = 'INVALID_TRANSITION';
        throw err;
      }

      // Role check: Only admin can approve or finalize
      if (['Approved', 'Finalized'].includes(newStatus) && user.role !== 'admin') {
        const err = new Error('Only authorized administrators can approve or finalize payroll.');
        err.code = 'UNAUTHORIZED';
        throw err;
      }

      run.status = newStatus;
      return run;
    }

    test('follows valid workflow lifecycle: Draft -> Pending Approval -> Approved -> Finalized', () => {
      const run = { id: 10, month: 12, year: 2026, status: 'Draft' };
      const admin = { id: 1, role: 'admin' };

      // Submit for review
      transitionPayrollStatus(run, 'Pending Approval', admin);
      expect(run.status).toBe('Pending Approval');

      // Approve
      transitionPayrollStatus(run, 'Approved', admin);
      expect(run.status).toBe('Approved');

      // Finalize
      transitionPayrollStatus(run, 'Finalized', admin);
      expect(run.status).toBe('Finalized');
    });

    test('enforces immutability once Finalized', () => {
      const finalizedRun = { id: 10, month: 12, year: 2026, status: 'Finalized' };
      const admin = { id: 1, role: 'admin' };

      expect(() => {
        transitionPayrollStatus(finalizedRun, 'Draft', admin);
      }).toThrow('Finalized payroll records are immutable and cannot change status directly.');
    });

    test('prevents non-admins from approving or finalizing', () => {
      const run = { id: 10, month: 12, year: 2026, status: 'Pending Approval' };
      const nonAdmin = { id: 2, role: 'employee' };

      expect(() => {
        transitionPayrollStatus(run, 'Approved', nonAdmin);
      }).toThrow('Only authorized administrators can approve or finalize payroll.');
    });
  });

  describe('Reversal & Adjustment Workflow with Audit Logging', () => {
    function reverseFinalizedPayroll(run, { reason, reversed_by, auditLogs = [] }) {
      if (!reason || reason.trim().length < 10) {
        throw new Error('A detailed audit justification (at least 10 characters) is required to reverse finalized payroll.');
      }

      if (run.status !== 'Finalized') {
        throw new Error('Only Finalized payroll runs can be reversed.');
      }

      // Mark run as Reversible / Draft for adjustments
      const previousState = { ...run };
      run.status = 'Draft';
      run.reversal_reason = reason;
      run.reversed_by = reversed_by.id;
      run.reversed_at = new Date().toISOString();

      auditLogs.push({
        action: 'PAYROLL_REVERSAL',
        table_name: 'payroll_runs',
        record_id: run.id,
        user_id: reversed_by.id,
        username: reversed_by.username,
        details: JSON.stringify({
          month: run.month,
          year: run.year,
          reason,
          previousState
        })
      });

      return { run, auditLogs };
    }

    test('reverses finalized payroll with mandatory audit logging and reason', () => {
      const run = { id: 5, month: 8, year: 2026, status: 'Finalized' };
      const admin = { id: 1, username: 'admin', role: 'admin' };
      const auditLogs = [];

      const result = reverseFinalizedPayroll(run, {
        reason: 'Correction of unpaid leave records for Engineering department',
        reversed_by: admin,
        auditLogs
      });

      expect(result.run.status).toBe('Draft');
      expect(result.run.reversal_reason).toContain('Correction of unpaid leave');
      expect(result.auditLogs.length).toBe(1);
      expect(result.auditLogs[0].action).toBe('PAYROLL_REVERSAL');
      expect(result.auditLogs[0].record_id).toBe(5);
    });

    test('rejects reversal if justification reason is missing or too short', () => {
      const run = { id: 5, month: 8, year: 2026, status: 'Finalized' };
      const admin = { id: 1, username: 'admin' };

      expect(() => {
        reverseFinalizedPayroll(run, { reason: 'fix it', reversed_by: admin });
      }).toThrow('A detailed audit justification (at least 10 characters) is required');
    });
  });
});
