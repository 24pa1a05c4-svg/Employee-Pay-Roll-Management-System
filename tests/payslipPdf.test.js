/**
 * Unit Test for PDF Payslip Generation via PDFKit
 */
const { createPayslipPdf } = require('../src/services/payslipPdfService');

describe('PDF Payslip Service', () => {
  const samplePayslipData = {
    payslip_number: 'PAY-202610-0001',
    employee_code: 'EMP-2026-001',
    employee_name: 'Rajesh Kumar',
    department_name: 'Engineering',
    designation_title: 'Senior Software Engineer',
    month: 10,
    year: 2026,
    working_days: 30,
    present_days: 22,
    paid_leave_days: 2,
    unpaid_leave_days: 0,
    basic_salary: '75000.00',
    gross_salary: '115000.00',
    total_deductions: '14350.00',
    net_salary: '100650.00',
    payment_status: 'Paid',
    bank_name: 'HDFC Bank',
    bank_account_number: '123456789012',
    bank_ifsc: 'HDFC0001234',
    pan_number: 'ABCDE1234F',
    lineItems: [
      { item_type: 'Earning', item_name: 'Basic Salary', amount: '75000.00', description: 'Monthly basic' },
      { item_type: 'Earning', item_name: 'House Rent Allowance (HRA)', amount: '30000.00', description: '40% of basic' },
      { item_type: 'Earning', item_name: 'Other Allowances', amount: '10000.00', description: 'Special allowance' },
      { item_type: 'Deduction', item_name: 'Provident Fund (PF)', amount: '9000.00', description: '12% PF' },
      { item_type: 'Deduction', item_name: 'Professional Tax (PT)', amount: '200.00', description: 'PT' },
      { item_type: 'Deduction', item_name: 'TDS / Income Tax', amount: '5150.00', description: 'Demo TDS' }
    ]
  };

  const sampleCompanyInfo = {
    name: 'TechNova Solutions Pvt. Ltd.',
    address: 'Plot 42, Hitech City, Madhapur, Hyderabad, Telangana - 500081',
    email: 'payroll@technova.example.com',
    phone: '+91 40 4567 8900'
  };

  test('generates valid PDF document with %PDF header', (done) => {
    const doc = createPayslipPdf(samplePayslipData, sampleCompanyInfo);

    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      expect(pdfBuffer.length).toBeGreaterThan(1000); // Realistic PDF size
      const header = pdfBuffer.slice(0, 5).toString('ascii');
      expect(header).toBe('%PDF-'); // Standard PDF header
      done();
    });

    doc.end();
  });
});
