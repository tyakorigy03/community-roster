import jsPDF from "jspdf";
import { exportFile } from "./exportHelpers";

export const generateProgressNotePDF = async (note, attachments = []) => {
  const doc = new jsPDF("p", "mm", "a4");
  let y = 20;

  /* =====================
     STYLE HELPERS
  ====================== */
  const sectionHeader = (title) => {
    doc.setFillColor(240, 240, 240);
    doc.rect(14, y - 6, 182, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(title, 16, y);
    y += 8;
  };

  const field = (label, value) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${label}:`, 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value || "-"), 65, y);
    y += 6;
  };

  const divider = () => {
    doc.setDrawColor(200);
    doc.line(14, y, 196, y);
    y += 6;
  };

  /* =====================
     REPORT HEADER
  ====================== */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("PROGRESS NOTE REPORT", 14, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Report ID: ${note.id}`,
    14,
    y
  );
  doc.text(
    `Generated: ${new Date().toLocaleString()}`,
    130,
    y
  );
  y += 10;

  /* =====================
     CLIENT DETAILS
  ====================== */
  sectionHeader("Client Information");
  field("First Name", note.client?.first_name);
  field("Last Name", note.client?.last_name);
  field("NDIS Number", note.client?.ndis_number);
  field("Phone", note.client?.phone);
  field("Address", note.client?.address);
  divider();

  /* =====================
     PROVIDER DETAILS
  ====================== */
  sectionHeader("Service Provider");
  field("Provider Name", note.hierarchy?.name);
  field("Provider Code", note.hierarchy?.code);
  field("Description", note.hierarchy?.description);
  divider();

  /* =====================
     SHIFT DETAILS
  ====================== */
  sectionHeader("Shift Details");
  field("Shift Date", note.shift_date);
  field("Start Time", note.shift_start_time);
  field("End Time", note.shift_end_time);
  field("Shift Type", note.shift_type?.name);
  divider();

  /* =====================
     PROGRESS NOTE
  ====================== */
  sectionHeader("Progress Note");
  field("Event Date", note.event_date);
  field("Subject", note.subject);

  doc.setFont("helvetica", "bold");
  doc.text("Notes:", 14, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  const noteText = doc.splitTextToSize(note.shift_notes || "-", 180);
  doc.text(noteText, 14, y);
  y += noteText.length * 5 + 6;

  /* =====================
     KEY AREAS
  ====================== */
  sectionHeader("Key Areas Addressed");
  note.key_areas?.forEach((area) => {
    doc.text(`• ${area}`, 18, y);
    y += 5;
  });
  y += 3;
  divider();

  /* =====================
     ATTACHMENTS (CLICKABLE)
  ====================== */
  sectionHeader("Attachments");
  if (!attachments.length) {
    doc.text("No attachments provided.", 14, y);
    y += 6;
  } else {
    attachments.forEach((file, index) => {
      const label = `${index + 1}. ${file.file_name}`;
      doc.setTextColor(0, 0, 255);
      doc.textWithLink(label, 14, y, { url: file.file_url });
      doc.setTextColor(0, 0, 0);

      doc.setFontSize(9);
      doc.text(
        `Type: ${file.file_type} | Size: ${Math.round(file.file_size / 1024)} KB`,
        18,
        y + 4
      );
      y += 10;
    });
  }

  divider();

  /* =====================
     FOOTER
  ====================== */
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    "Created by : blessing community roster app .",
    14,
    285
  );

  /* =====================
     DOWNLOAD
  ====================== */
  const pdfBlob = doc.output("blob");
  await exportFile(pdfBlob, `progress-note-${note.id}.pdf`);
};
