import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Generate and download Incident Report PDF with ALL incident fields
 */
export const generateIncidentReportPDF = ({
  incident,
  client,
  hierarchy,
  createdBy,
  incidentTypes = [],
  emergencyAssistance = [],
  attachments = []
}) => {
  const doc = new jsPDF("p", "mm", "a4");
  let y = 18;

  /* =====================
     SPACING HELPERS
  ====================== */
  const space = (amount = 6) => {
    y += amount;
  };

  const checkPageBreak = (neededSpace = 20) => {
    if (y + neededSpace > 280) {
      doc.addPage();
      y = 18;
    }
  };

  /* =====================
     SECTION HEADER
  ====================== */
  const section = (title) => {
    checkPageBreak(15);
    space(4);
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
  const field = (label, value) => {
    checkPageBreak(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${label}:`, 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value ?? "N/A"), 60, y);
    y += 6;
  };

  /* =====================
     TEXT BLOCK (for long text)
  ====================== */
  const textBlock = (title, content) => {
    if (!content) return;
    
    checkPageBreak(20);
    section(title);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const text = doc.splitTextToSize(content, 180);
    
    text.forEach((line, index) => {
      checkPageBreak(8);
      doc.text(line, 14, y);
      y += 6;
    });
    
    space(4);
  };

  /* =====================
     HEADER
  ====================== */
  doc.setFillColor(25, 118, 210); // Blue header
  doc.rect(0, 0, 210, 30, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("NDIS INCIDENT REPORT", 105, 12, { align: "center" });
  
  doc.setFontSize(11);
  doc.text("Blessing Community Support Services", 105, 20, { align: "center" });
  
  doc.setTextColor(0, 0, 0);
  y = 40;

  // Report Info Bar
  doc.setFillColor(245, 245, 245);
  doc.rect(14, y - 6, 182, 10, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Incident ID: ${incident?.id?.substring(0, 13) ?? "-"}`, 16, y);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-AU')}`, 140, y);
  y += 12;

  /* =====================
     CLIENT INFORMATION
  ====================== */
  section("Client Details");
  field("Name", `${client?.first_name ?? ""} ${client?.last_name ?? ""}`);
  field("NDIS Number", client?.ndis_number);
  field("Date of Birth", client?.date_of_birth);
  field("Phone", client?.phone_number);
  field("Address", client?.address_line);

  /* =====================
     INCIDENT DETAILS
  ====================== */
  section("Incident Details");
  field("Incident ID", incident?.id?.substring(0, 20));
  field("Event Date", incident?.event_date);
  field("Incident Date", incident?.incident_date);
  field("Incident Time", incident?.incident_time);
  field("Location", incident?.location);
  field("Witnesses", incident?.witnesses);
  
  if (incident?.police_event_number) {
    field("Police Event Number", incident.police_event_number);
  }
  
  // Severity with color
  checkPageBreak(10);
  doc.setFont("helvetica", "bold");
  doc.text("Severity Rating:", 14, y);
  
  const severity = incident?.incident_rating?.toLowerCase();
  let severityColor;
  switch(severity) {
    case 'low': severityColor = [76, 175, 80]; break;
    case 'medium': severityColor = [255, 193, 7]; break;
    case 'high': severityColor = [255, 152, 0]; break;
    case 'critical': severityColor = [244, 67, 54]; break;
    default: severityColor = [158, 158, 158];
  }
  
  doc.setFillColor(...severityColor);
  doc.rect(58, y - 4, 30, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text((severity || 'N/A').toUpperCase(), 60, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  /* =====================
     HIERARCHY
  ====================== */
  section("Hierarchy Classification");
  field("Name", hierarchy?.name);
  field("Code", hierarchy?.code);
  if (hierarchy?.description) {
    field("Description", hierarchy.description);
  }

  /* =====================
     INCIDENT TYPES (TABLE)
  ====================== */
  if (incidentTypes.length > 0) {
    checkPageBreak(30);
    section("Incident Classification");
    autoTable(doc, {
      startY: y,
      head: [["Type", "Description"]],
      body: incidentTypes.map(t => [
        t?.name ?? "",
        t?.description ?? "No description"
      ]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [244, 67, 54], textColor: 255 },
      margin: { left: 14, right: 14 }
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  /* =====================
     EMERGENCY ASSISTANCE (TABLE)
  ====================== */
  if (emergencyAssistance.length > 0) {
    checkPageBreak(30);
    section("Emergency Assistance");
    autoTable(doc, {
      startY: y,
      head: [["Service", "Details"]],
      body: emergencyAssistance.map(e => [
        e?.name ?? "",
        e?.details ?? "N/A"
      ]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [33, 150, 243], textColor: 255 },
      margin: { left: 14, right: 14 }
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  /* =====================
     NARRATIVE SECTIONS
  ====================== */
  textBlock("Incident Summary", incident?.incident_summary);
  textBlock("Antecedent - What was happening before", incident?.antecedent);
  textBlock("Detailed Incident Description", incident?.incident_description);
  textBlock("De-escalation Process & Outcome", incident?.deescalation_outcome);

  /* =====================
     PRN MEDICATION
  ====================== */
  section("PRN Medication");
  field("PRN Approved", incident?.prn_approved?.toUpperCase() || "N/A");
  field("PRN Provided", incident?.prn_provided?.toUpperCase() || "N/A");
  if (incident?.prn_notes) {
    checkPageBreak(15);
    doc.setFont("helvetica", "bold");
    doc.text("PRN Notes:", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const prnText = doc.splitTextToSize(incident.prn_notes, 180);
    prnText.forEach(line => {
      checkPageBreak(8);
      doc.text(line, 14, y);
      y += 6;
    });
    space(4);
  }

  /* =====================
     PHYSICAL INTERVENTION
  ====================== */
  section("Physical Intervention – Restrictive Practice");
  field("Physical Hold Used", incident?.physical_intervention?.toUpperCase() || "N/A");
  
  if (incident?.physical_intervention === 'yes') {
    if (incident?.physical_intervention_type) {
      field("Type of Restraint", incident.physical_intervention_type);
    }
    if (incident?.physical_intervention_duration) {
      field("Duration", incident.physical_intervention_duration);
    }
    if (incident?.client_injured) {
      field("Client Injured", incident.client_injured.toUpperCase());
    }
    if (incident?.staff_injured) {
      field("Staff Injured", incident.staff_injured.toUpperCase());
    }
  }

  /* =====================
     FOLLOW UP
  ====================== */
  section("Follow Up Actions");
  field("Follow Up Required", incident?.follow_up_required?.toUpperCase() || "N/A");
  field("Management Contacted", incident?.management_contacted?.toUpperCase() || "N/A");

  /* =====================
     ATTACHMENTS (CLICKABLE LINKS)
  ====================== */
  if (attachments.length > 0) {
    checkPageBreak(20);
    section("Supporting Evidence");
    attachments.forEach((file, index) => {
      checkPageBreak(8);
      doc.setTextColor(33, 150, 243);
      doc.setFont("helvetica", "normal");
      doc.textWithLink(
        `${index + 1}. ${file?.file_name ?? "Attachment"}`,
        14,
        y,
        { url: file?.file_url }
      );
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.text(`(${(file?.file_size / 1024).toFixed(0)} KB)`, 16, y + 4);
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      y += 8;
    });
    space(4);
  }

  /* =====================
     REPORTED BY
  ====================== */
  checkPageBreak(30);
  section("Report Completion Details");
  
  doc.setFillColor(250, 250, 250);
  doc.rect(14, y, 182, 25, "F");
  
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Completed By:", 18, y);
  doc.setFont("helvetica", "normal");
  doc.text(createdBy?.name || "Unknown", 60, y);
  
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Role:", 18, y);
  doc.setFont("helvetica", "normal");
  doc.text(createdBy?.role || "Staff", 60, y);
  
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Email:", 18, y);
  doc.setFont("helvetica", "normal");
  doc.text(createdBy?.email || "N/A", 60, y);
  
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Organisation:", 18, y);
  doc.setFont("helvetica", "normal");
  doc.text("Blessing Community Support Services", 60, y);
  
  y += 8;

  /* =====================
     COMPLIANCE STATEMENT
  ====================== */
  checkPageBreak(15);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const complianceText = doc.splitTextToSize(
    "This report has been completed in accordance with organisational and NDIS reporting requirements.",
    180
  );
  complianceText.forEach(line => {
    checkPageBreak(6);
    doc.text(line, 14, y);
    y += 5;
  });

  /* =====================
     FOOTER ON ALL PAGES
  ====================== */
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      "CONFIDENTIAL – For authorized personnel only",
      105,
      287,
      { align: "center" }
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      105,
      292,
      { align: "center" }
    );
    doc.text(
      `© ${new Date().getFullYear()} Blessing Community Support Services`,
      105,
      297,
      { align: "center" }
    );
  }

  /* =====================
     DOWNLOAD
  ====================== */
  const fileName = `Incident_Report_${incident?.id?.substring(0, 8) || "unknown"}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};