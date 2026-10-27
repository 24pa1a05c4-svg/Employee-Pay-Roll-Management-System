/**
 * Professional PDF Payslip Generation using PDFKit
 * Generates high-quality A4 payslips with full itemized breakdown
 */
const PDFDocument = require('pdfkit');
const { formatCurrency } = require('../utils/currency');
const { formatDateIndian, getMonthName } = require('../utils/dateUtils');
const { maskBankAccount } = require('../utils/helpers');

/**
 * Generate a PDF stream or buffer for a payroll record
 * @param {Object} data 
 * @param {Object} companyInfo 
 * @returns {PDFDocument}
 */
function createPayslipPdf(data, companyInfo = {}) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    info: {
      Title: `Payslip_${data.payslip_number}`,
      Author: companyInfo.name || 'TechNova Solutions Pvt. Ltd.',
      Subject: `Salary Payslip for ${data.employee_name}`
    }
  });

  const primaryNavy = '#1A365D';
  const secondaryBlue = '#2B6CB0';
  const lightGray = '#F7FAFC';
  const borderGray = '#CBD5E0';
  const textDark = '#2D3748';
  const textMuted = '#718096';

  const monthName = getMonthName(data.month);
  const periodText = `${monthName} ${data.year}`;

  // 1. Header Box
  doc.rect(40, 40, 515, 75).fill(primaryNavy);

  // Company Name & Title
  doc.fillColor('#FFFFFF')
     .fontSize(18)
     .font('Helvetica-Bold')
     .text(companyInfo.name || 'TechNova Solutions Pvt. Ltd.', 55, 52);

  doc.fontSize(9)
     .font('Helvetica')
     .text(companyInfo.address || 'Plot 42, Hitech City, Madhapur, Hyderabad, Telangana - 500081', 55, 74)
     .text(`Email: ${companyInfo.email || 'payroll@technova.example.com'}  |  Phone: ${companyInfo.phone || '+91 40 4567 8900'}`, 55, 88);

  // Payslip Badge (Right aligned in header)
  doc.rect(435, 50, 110, 40).fill(secondaryBlue);
  doc.fillColor('#FFFFFF')
     .fontSize(11)
     .font('Helvetica-Bold')
     .text('SALARY PAYSLIP', 440, 58, { width: 100, align: 'center' })
     .fontSize(9)
     .font('Helvetica')
     .text(periodText, 440, 72, { width: 100, align: 'center' });

  // 2. Metadata / Payslip Reference Bar
  doc.rect(40, 120, 515, 24).fill('#EBF8FF');
  doc.fillColor(primaryNavy)
     .fontSize(9)
     .font('Helvetica-Bold')
     .text(`Payslip Ref: ${data.payslip_number}`, 50, 127)
     .text(`Generated On: ${formatDateIndian(new Date())}`, 380, 127, { align: 'right', width: 165 });

  // 3. Employee Information Grid
  let y = 155;
  doc.rect(40, y, 515, 80).stroke(borderGray);

  // Column 1
  doc.fillColor(textMuted).fontSize(8).font('Helvetica').text('Employee Name:', 50, y + 10);
  doc.fillColor(textDark).fontSize(9).font('Helvetica-Bold').text(data.employee_name || '-', 135, y + 10);

  doc.fillColor(textMuted).fontSize(8).font('Helvetica').text('Employee ID:', 50, y + 26);
  doc.fillColor(textDark).fontSize(9).font('Helvetica-Bold').text(data.employee_code || '-', 135, y + 26);

  doc.fillColor(textMuted).fontSize(8).font('Helvetica').text('Department:', 50, y + 42);
  doc.fillColor(textDark).fontSize(9).font('Helvetica-Bold').text(data.department_name || '-', 135, y + 42);

  doc.fillColor(textMuted).fontSize(8).font('Helvetica').text('Designation:', 50, y + 58);
  doc.fillColor(textDark).fontSize(9).font('Helvetica-Bold').text(data.designation_title || '-', 135, y + 58);

  // Column 2
  const col2X = 310;
  doc.fillColor(textMuted).fontSize(8).font('Helvetica').text('Total Working Days:', col2X, y + 10);
  doc.fillColor(textDark).fontSize(9).font('Helvetica-Bold').text(String(data.working_days || 30), col2X + 110, y + 10);

  doc.fillColor(textMuted).fontSize(8).font('Helvetica').text('Days Present:', col2X, y + 26);
  doc.fillColor(textDark).fontSize(9).font('Helvetica-Bold').text(String(data.present_days || 0), col2X + 110, y + 26);

  doc.fillColor(textMuted).fontSize(8).font('Helvetica').text('Paid / Unpaid Leaves:', col2X, y + 42);
  doc.fillColor(textDark).fontSize(9).font('Helvetica-Bold').text(`${data.paid_leave_days || 0} Paid / ${data.unpaid_leave_days || 0} Unpaid`, col2X + 110, y + 42);

  doc.fillColor(textMuted).fontSize(8).font('Helvetica').text('Bank Account:', col2X, y + 58);
  doc.fillColor(textDark).fontSize(9).font('Helvetica-Bold').text(maskBankAccount(data.bank_account_number), col2X + 110, y + 58);

  // 4. Earnings and Deductions Table
  y = 250;
  const tableWidth = 515;
  const halfWidth = 255;

  // Header row
  doc.rect(40, y, halfWidth, 22).fill(secondaryBlue);
  doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold')
     .text('EARNINGS', 50, y + 6)
     .text('AMOUNT (INR)', 40 + halfWidth - 85, y + 6);

  doc.rect(40 + halfWidth + 5, y, halfWidth, 22).fill(secondaryBlue);
  doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold')
     .text('DEDUCTIONS', 40 + halfWidth + 15, y + 6)
     .text('AMOUNT (INR)', 40 + tableWidth - 85, y + 6);

  // Separate line items into earnings and deductions
  const earnings = (data.lineItems || []).filter(item => item.item_type === 'Earning');
  const deductions = (data.lineItems || []).filter(item => item.item_type === 'Deduction');

  const maxRows = Math.max(earnings.length, deductions.length, 5);
  let rowY = y + 22;
  const rowHeight = 22;

  for (let i = 0; i < maxRows; i++) {
    const isEven = i % 2 === 0;
    const bg = isEven ? '#FFFFFF' : lightGray;

    // Left cell (Earnings)
    doc.rect(40, rowY, halfWidth, rowHeight).fill(bg);
    doc.rect(40, rowY, halfWidth, rowHeight).stroke(borderGray);

    if (earnings[i]) {
      doc.fillColor(textDark).fontSize(8.5).font('Helvetica')
         .text(earnings[i].item_name, 50, rowY + 6, { width: 130, ellipsis: true });
      doc.fillColor(textDark).fontSize(8.5).font('Helvetica-Bold')
         .text(formatCurrency(earnings[i].amount, false), 40 + halfWidth - 85, rowY + 6, { width: 75, align: 'right' });
    }

    // Right cell (Deductions)
    doc.rect(40 + halfWidth + 5, rowY, halfWidth, rowHeight).fill(bg);
    doc.rect(40 + halfWidth + 5, rowY, halfWidth, rowHeight).stroke(borderGray);

    if (deductions[i]) {
      doc.fillColor(textDark).fontSize(8.5).font('Helvetica')
         .text(deductions[i].item_name, 40 + halfWidth + 15, rowY + 6, { width: 130, ellipsis: true });
      doc.fillColor(textDark).fontSize(8.5).font('Helvetica-Bold')
         .text(formatCurrency(deductions[i].amount, false), 40 + tableWidth - 85, rowY + 6, { width: 75, align: 'right' });
    }

    rowY += rowHeight;
  }

  // Totals Row
  doc.rect(40, rowY, halfWidth, 24).fill('#E2E8F0');
  doc.fillColor(primaryNavy).fontSize(9).font('Helvetica-Bold')
     .text('GROSS EARNINGS', 50, rowY + 7)
     .text(`INR ${formatCurrency(data.gross_salary, false)}`, 40 + halfWidth - 110, rowY + 7, { width: 100, align: 'right' });

  doc.rect(40 + halfWidth + 5, rowY, halfWidth, 24).fill('#E2E8F0');
  doc.fillColor(primaryNavy).fontSize(9).font('Helvetica-Bold')
     .text('TOTAL DEDUCTIONS', 40 + halfWidth + 15, rowY + 7)
     .text(`INR ${formatCurrency(data.total_deductions, false)}`, 40 + tableWidth - 110, rowY + 7, { width: 100, align: 'right' });

  // 5. Net Salary Highlight Banner
  rowY += 35;
  doc.rect(40, rowY, 515, 45).fill('#EBF8FF');
  doc.rect(40, rowY, 515, 45).stroke(secondaryBlue);

  doc.fillColor(primaryNavy).fontSize(11).font('Helvetica-Bold')
     .text('NET SALARY PAYABLE:', 55, rowY + 16);

  doc.fillColor('#2B6CB0').fontSize(16).font('Helvetica-Bold')
     .text(`INR ${formatCurrency(data.net_salary, false)}`, 220, rowY + 14);

  doc.fillColor(textMuted).fontSize(8).font('Helvetica')
     .text('(Net Salary = Gross Earnings - Total Deductions)', 40, rowY + 30, { align: 'right', width: 505 });

  // 6. Statutory & Tax Disclaimer (As specified in prompt)
  rowY += 58;
  doc.rect(40, rowY, 515, 34).fill('#FFFBEB');
  doc.rect(40, rowY, 515, 34).stroke('#FCD34D');
  doc.fillColor('#92400E').fontSize(7.5).font('Helvetica')
     .text('Note: This payslip is an official electronic computer-generated document. Statutory deductions including PF and TDS rates are based on configured company payroll policy and demo assumptions. For queries, contact HR / Finance department.', 48, rowY + 6, { width: 495 });

  // 7. Signature Box
  rowY += 65;
  doc.fillColor(textMuted).fontSize(8).font('Helvetica')
     .text('Employer Authorized Signature', 60, rowY + 35)
     .text('Employee Signature', 400, rowY + 35);

  doc.moveTo(50, rowY + 30).lineTo(200, rowY + 30).stroke(borderGray);
  doc.moveTo(380, rowY + 30).lineTo(530, rowY + 30).stroke(borderGray);

  // Footer
  doc.fillColor(textMuted).fontSize(8).font('Helvetica')
     .text(`Confidential - For ${data.employee_name} only | ${companyInfo.name || 'TechNova Solutions Pvt. Ltd.'}`, 40, 770, { align: 'center', width: 515 });

  return doc;
}

module.exports = {
  createPayslipPdf
};
