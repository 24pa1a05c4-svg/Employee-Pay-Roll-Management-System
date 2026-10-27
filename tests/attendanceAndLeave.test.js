/**
 * Unit Tests for Attendance & Leave Management Logic
 * Tests duplicate attendance prevention, leave overlap algorithms, and status workflows.
 */
const { getWorkingDaysInMonth, isValidDate, calculateDaysBetween } = require('../src/utils/dateUtils');

describe('Attendance & Leave Management Logic', () => {

  describe('Duplicate Attendance Prevention Logic', () => {
    // Simulated database record set
    const attendanceRecords = [
      { id: 1, employee_id: 101, attendance_date: '2026-10-01', status: 'Present' },
      { id: 2, employee_id: 101, attendance_date: '2026-10-02', status: 'Present' },
      { id: 3, employee_id: 102, attendance_date: '2026-10-01', status: 'Present' }
    ];

    function checkDuplicateAttendance(existingRecords, employeeId, date) {
      const match = existingRecords.find(
        r => r.employee_id === employeeId && r.attendance_date === date
      );
      if (match) {
        const err = new Error(`Attendance for this employee on ${date} has already been recorded.`);
        err.code = 'DUPLICATE_ATTENDANCE';
        throw err;
      }
      return true;
    }

    test('allows recording attendance for a new date or new employee', () => {
      expect(() => {
        checkDuplicateAttendance(attendanceRecords, 101, '2026-10-03');
      }).not.toThrow();

      expect(() => {
        checkDuplicateAttendance(attendanceRecords, 103, '2026-10-01');
      }).not.toThrow();
    });

    test('throws DUPLICATE_ATTENDANCE error when recording attendance for same employee and same date', () => {
      expect(() => {
        checkDuplicateAttendance(attendanceRecords, 101, '2026-10-01');
      }).toThrow('Attendance for this employee on 2026-10-01 has already been recorded.');

      try {
        checkDuplicateAttendance(attendanceRecords, 102, '2026-10-01');
      } catch (err) {
        expect(err.code).toBe('DUPLICATE_ATTENDANCE');
      }
    });
  });

  describe('Leave Request Overlap Prevention Algorithm', () => {
    // Algorithm: start_date <= existing_end AND end_date >= existing_start
    const existingApprovedLeaves = [
      { id: 1, employee_id: 201, start_date: '2026-10-10', end_date: '2026-10-14', status: 'Approved' },
      { id: 2, employee_id: 201, start_date: '2026-10-22', end_date: '2026-10-24', status: 'Pending' }
    ];

    function checkLeaveOverlap(existingLeaves, employeeId, newStart, newEnd, excludeId = null) {
      const overlaps = existingLeaves.filter(leave => {
        if (leave.employee_id !== employeeId) return false;
        if (excludeId && leave.id === excludeId) return false;
        if (!['Pending', 'Approved'].includes(leave.status)) return false;

        // Interval overlap formula: newStart <= existing.end AND newEnd >= existing.start
        return newStart <= leave.end_date && newEnd >= leave.start_date;
      });

      if (overlaps.length > 0) {
        const err = new Error(`An existing ${overlaps[0].status.toLowerCase()} leave request overlaps with ${newStart} to ${newEnd}.`);
        err.code = 'OVERLAPPING_LEAVE';
        throw err;
      }
      return true;
    }

    test('allows non-overlapping leave requests before or after existing leave', () => {
      // 5 days before existing leave (2026-10-01 to 2026-10-05)
      expect(() => {
        checkLeaveOverlap(existingApprovedLeaves, 201, '2026-10-01', '2026-10-05');
      }).not.toThrow();

      // Between leaves (2026-10-16 to 2026-10-20)
      expect(() => {
        checkLeaveOverlap(existingApprovedLeaves, 201, '2026-10-16', '2026-10-20');
      }).not.toThrow();

      // Different employee
      expect(() => {
        checkLeaveOverlap(existingApprovedLeaves, 202, '2026-10-10', '2026-10-14');
      }).not.toThrow();
    });

    test('rejects exact match overlap', () => {
      expect(() => {
        checkLeaveOverlap(existingApprovedLeaves, 201, '2026-10-10', '2026-10-14');
      }).toThrow('An existing approved leave request overlaps with 2026-10-10 to 2026-10-14.');
    });

    test('rejects partial overlap starting before and ending inside existing leave', () => {
      // 2026-10-08 to 2026-10-11 overlaps with 2026-10-10 to 2026-10-14
      expect(() => {
        checkLeaveOverlap(existingApprovedLeaves, 201, '2026-10-08', '2026-10-11');
      }).toThrow();
    });

    test('rejects partial overlap starting inside and ending after existing leave', () => {
      // 2026-10-13 to 2026-10-18 overlaps with 2026-10-10 to 2026-10-14
      expect(() => {
        checkLeaveOverlap(existingApprovedLeaves, 201, '2026-10-13', '2026-10-18');
      }).toThrow();
    });

    test('rejects encompassing overlap that fully surrounds existing leave', () => {
      // 2026-10-05 to 2026-10-18 encompasses 2026-10-10 to 2026-10-14
      expect(() => {
        checkLeaveOverlap(existingApprovedLeaves, 201, '2026-10-05', '2026-10-18');
      }).toThrow();
    });
  });

  describe('Date Utilities & Working Days Calculation', () => {
    test('calculates correct days between two dates inclusive', () => {
      expect(calculateDaysBetween('2026-10-01', '2026-10-01')).toBe(1);
      expect(calculateDaysBetween('2026-10-01', '2026-10-05')).toBe(5);
    });

    test('calculates working days excluding Sundays', () => {
      // October 2026 has 31 days. Let's verify working days count
      const workingDaysOct2026 = getWorkingDaysInMonth(10, 2026);
      expect(workingDaysOct2026).toBeGreaterThanOrEqual(26);
      expect(workingDaysOct2026).toBeLessThanOrEqual(27);
    });

    test('validates date formats', () => {
      expect(isValidDate('2026-10-15')).toBe(true);
      expect(isValidDate('not-a-date')).toBe(false);
      expect(isValidDate('')).toBe(false);
    });
  });
});
