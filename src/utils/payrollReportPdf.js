// Add these imports at the top of your PayrollPage.jsx file
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { exportFile } from "./exportHelpers";

/**
 * Generate and download Payroll Report PDF
 */
export const generatePayrollReportPDF = async ({
  payrollData,
  dateRange,
  totalAmount,
  totalHours,
  stats
}) => {
  const doc = new jsPDF("p", "mm", "a4");
  // ... (rest of the generation logic remains the same)
  
  // (Assuming generation logic continues from the original file)
  // I will only replace the end part where doc.save is called.
  // Wait, I need to provide the full content or a contiguous block.
  // The original file is about 291 lines.
  // I'll replace from the imports to the end.
  let y = 18;

  /* =====================
     SPACING HELPERS
  ====================== */
  const space = (amount = 6) => {
    y += amount;
  };

  /* =====================
     SECTION HEADER
  ====================== */
  const section = (title) => {
    space(4); // space before section
    doc.setFillColor(240, 240, 240);
    doc.rect(14, y - 6, 182, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(title, 16, y);
    y += 8;
  };

  /* =====================
     LABEL + VALUE
  ====================== */
  const field = (label, value, xLabel = 14, xValue = 60) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${label}:`, xLabel, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value ?? "N/A"), xValue, y);
    y += 6;
  };

  /* =====================
     HEADER
  ====================== */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("PAYROLL REPORT", 14, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const periodText = `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`;
  doc.text(`Period: ${periodText}`, 14, y);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 120, y);
  y += 12;

  /* =====================
     SUMMARY STATISTICS
  ====================== */
  section("Summary Statistics");
  
  const summaryData = [
    ["Total Staff", payrollData.length],
    ["Total Hours", `${totalHours.toFixed(2)} hours`],
    ["Gross Pay", `$${totalAmount.toFixed(2)}`],
    ["Average Hours per Staff", `${(totalHours / payrollData.length || 0).toFixed(2)} hours`],
    ["Average Pay per Staff", `$${(totalAmount / payrollData.length || 0).toFixed(2)}`]
  ];
  
  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: summaryData,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [66, 133, 244] },
    margin: { left: 14, right: 14 }
  });
  y = doc.lastAutoTable.finalY;
  space(8);

  /* =====================
     PAYROLL DETAILS TABLE
  ====================== */
  section("Payroll Details by Staff");
  
  if (payrollData.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.text("No payroll data available for this period", 14, y);
    y += 10;
  } else {
    const payrollTableData = payrollData.map((record, index) => [
      index + 1,
      record.staff_name,
      record.role,
      `${record.billable_hours?.toFixed(2) || 0}h`,
      `$${record.hourly_rate}/hr`,
      `$${record.gross_pay?.toFixed(2) || '0.00'}`
    ]);
    
    autoTable(doc, {
      startY: y,
      head: [["#", "Staff Name", "Role", "Hours", "Rate", "Total Pay"]],
      body: payrollTableData,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [66, 133, 244] },
      columnStyles: {
        0: { cellWidth: 10 }, // #
        1: { cellWidth: 45 }, // Staff Name
        2: { cellWidth: 30 }, // Role
        3: { cellWidth: 25 }, // Hours
        4: { cellWidth: 30 }, // Rate
        5: { cellWidth: 35 }  // Total Pay
      },
      margin: { left: 14, right: 14 }
    });
    y = doc.lastAutoTable.finalY;
  }
  space(12);

  /* =====================
     STAFF PAYMENT BREAKDOWN
  ====================== */
  if (payrollData.length > 0) {
    section("Individual Staff Breakdown");
    
    payrollData.forEach((record, index) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      
      // Staff header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`${index + 1}. ${record.staff_name}`, 14, y);
      y += 6;
      
      // Staff details
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      
      field("Role", record.role, 20, 40);
      field("Email", record.email, 20, 40);
      field("Phone", record.phone, 20, 40);
      field("Hours Worked", `${record.billable_hours?.toFixed(2) || 0} hours`, 20, 50);
      field("Hourly Rate", `$${record.hourly_rate}`, 20, 45);
      field("Total Pay", `$${record.gross_pay?.toFixed(2) || '0.00'}`, 20, 40);
      
      // Calculation breakdown
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Calculation:", 20, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.text(`${record.billable_hours?.toFixed(2) || 0} hours × $${record.hourly_rate}/hour = $${record.gross_pay?.toFixed(2) || '0.00'}`, 25, y);
      y += 5;
      
      space(10);
    });
  }

  /* =====================
     PAYMENT SUMMARY BY ROLE
  ====================== */
  if (payrollData.length > 0) {
    section("Summary by Role");
    
    // Group by role
    const roleSummary = {};
    payrollData.forEach(record => {
      const role = record.role || 'Other';
      if (!roleSummary[role]) {
        roleSummary[role] = {
          count: 0,
          totalHours: 0,
          totalPay: 0
        };
      }
      roleSummary[role].count++;
      roleSummary[role].totalHours += record.billable_hours || 0;
      roleSummary[role].totalPay += record.gross_pay || 0;
    });
    
    const roleData = Object.entries(roleSummary).map(([role, data]) => [
      role,
      data.count,
      `${data.totalHours.toFixed(2)}h`,
      `$${data.totalPay.toFixed(2)}`,
      `$${(data.totalPay / data.count || 0).toFixed(2)}`
    ]);
    
    autoTable(doc, {
      startY: y,
      head: [["Role", "Staff Count", "Total Hours", "Total Pay", "Avg/Staff"]],
      body: roleData,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [66, 133, 244] },
      margin: { left: 14, right: 14 }
    });
    y = doc.lastAutoTable.finalY;
    space(12);
  }

  /* =====================
     NOTES AND REMARKS
  ====================== */
  if (y > 220) {
    doc.addPage();
    y = 20;
  }
  
  section("Notes and Remarks");
  
  const notes = [
    "1. This report includes all completed shifts within the specified period",
    "2. Hours are calculated based on clock-in/clock-out times",
    "3. Rates are applied according to staff pay rate assignments",
    "4. All amounts are in Australian Dollars (AUD)",
    "5. Report includes gross pay before deductions",
    "6. For detailed shift breakdown, refer to individual shift records"
  ];
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  notes.forEach((note, index) => {
    doc.text(note, 16, y);
    y += 5;
  });
  space(8);

  /* =====================
     SIGNATURE AREA
  ====================== */
  section("Approval");
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Prepared by: ________________________", 14, y);
  doc.text("Date: ________________________", 120, y);
  y += 12;
  
  doc.text("Approved by: ________________________", 14, y);
  doc.text("Date: ________________________", 120, y);
  y += 12;
  
  doc.text("Finance Department: ________________________", 14, y);
  doc.text("Date: ________________________", 120, y);

  /* =====================
     FOOTER
  ====================== */
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    "CONFIDENTIAL – Payroll information for internal use only",
    105,
    282,
    { align: "center" }
  );

  /* =====================
     DOWNLOAD
  ====================== */
  const startDateFormatted = dateRange.start.replace(/-/g, '');
  const endDateFormatted = dateRange.end.replace(/-/g, '');
  const fileName = `Payroll_Report_${startDateFormatted}_to_${endDateFormatted}.pdf`;

  const pdfBlob = doc.output("blob");
  await exportFile(pdfBlob, fileName);
};

/* =====================
   HELPER FUNCTION FOR DATE FORMATTING
====================== */
const formatDate = (dateString, short = false) => {
  const date = new Date(dateString + 'T00:00:00');
  if (short) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};