import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import nodemailer from "npm:nodemailer";

/* ---------------- HTML GENERATOR FOR PROGRESS NOTES ---------------- */
const generateProgressReportHTML = ({
  note,
  attachments = [],
  client,
  staff,
  hierarchy,
  shift
}) => {
  const formatDate = (dateStr) => 
    dateStr ? new Date(dateStr).toLocaleDateString('en-AU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) : "N/A";

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDateTime = (dateStr) => 
    dateStr ? new Date(dateStr).toLocaleString('en-AU') : "N/A";

  const attachmentsHTML = attachments.length > 0 ? `
    <div class="section">
      <h3>Attachments (${attachments.length})</h3>
      <div class="attachments-list">
        ${attachments.map(attachment => `
          <div class="attachment-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
              <polyline points="13 2 13 9 20 9"></polyline>
            </svg>
            <a href="${attachment.file_url}" target="_blank">${attachment.file_name}</a>
            <span class="file-type">${attachment.file_type?.split('/')[1]?.toUpperCase() || 'FILE'}</span>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  return `
  <!DOCTYPE html>
  <html lang="en">
<head>
<meta charset="UTF-8">
<title>Progress Note</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body { font-family: Georgia, "Times New Roman", serif; background: #f4f4f4; color: #1f2937; padding: 40px 20px; }
.container { max-width: 820px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; }
.header { background: #1E3A8A; color: #ffffff; padding: 40px; text-align: center; }
.header h1 { font-size: 28px; font-weight: 500; letter-spacing: 1px; margin-bottom: 8px; }
.header p { font-size: 14px; opacity: 0.9; }
.intro { padding: 30px 40px; font-size: 15px; line-height: 1.8; }
.section { padding: 30px 40px; border-top: 1px solid #e5e7eb; }
h2 { font-size: 20px; margin-bottom: 16px; color: #1e293b; }
h3 { font-size: 16px; margin-bottom: 12px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
.label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; }
.value { font-size: 15px; margin-top: 4px; }
.note-box { border: 1px solid #e5e7eb; padding: 20px; white-space: pre-line; line-height: 1.9; }
.attachment-item { display: flex; justify-content: space-between; border: 1px solid #e5e7eb; padding: 10px; margin-bottom: 6px; font-size: 14px; }
.attachment-item a { text-decoration: none; color: #1e40af; }
.file-type { font-size: 11px; color: #374151; }
.footer { background: #1E3A8A; color: #d1d5db; text-align: center; padding: 30px; font-size: 13px; }
.footer strong { color: #ffffff; }
</style>
</head>
<body>
<div class="container">
  <div class="header"><h1>Progress Note</h1><p>Clinical Documentation</p></div>
  <div class="intro">
    <p>Please find below the progress note documentation prepared for the client listed.</p>
    <p>Should you require any clarification regarding this report, please contact our office.</p>
  </div>
  <div class="section">
    <h2>Document Details</h2>
    <div class="grid">
      <div><div class="label">Note ID</div><div class="value">PN-${note?.id?.substring(0, 8).toUpperCase()}</div></div>
      <div><div class="label">Event Date</div><div class="value">${formatDate(note?.event_date)}</div></div>
      <div><div class="label">Created</div><div class="value">${formatDateTime(note?.created_at)}</div></div>
      <div><div class="label">Last Updated</div><div class="value">${formatDateTime(note?.updated_at)}</div></div>
    </div>
  </div>
  <div class="section">
    <h2>Client Information</h2>
    <div class="grid">
      <div><div class="label">Client Name</div><div class="value">${client?.first_name} ${client?.last_name}</div></div>
      <div><div class="label">NDIS Number</div><div class="value">${client?.ndis_number || "N/A"}</div></div>
    </div>
  </div>
  ${shift ? `
  <div class="section">
    <h2>Shift Details</h2>
    <div class="grid">
      <div><div class="label">Shift Date</div><div class="value">${formatDate(shift.shift_date)}</div></div>
      <div><div class="label">Time</div><div class="value">${formatTime(shift.start_time)} – ${formatTime(shift.end_time)}</div></div>
      <div><div class="label">Shift Type</div><div class="value">${shift.shift_type_name || "General"}</div></div>
    </div>
  </div>
  ` : ""}
  <div class="section">
    <h2>Progress Notes Summary</h2>
    <div class="note-box">${note?.shift_notes || "No notes recorded."}</div>
  </div>
  ${attachmentsHTML}
  <div class="section">
    <h2>Prepared By</h2>
    <div class="grid">
      <div><div class="label">Staff Name</div><div class="value">${staff?.name || "N/A"}</div></div>
      <div><div class="label">Email</div><div class="value">${staff?.email || "N/A"}</div></div>
      <div><div class="label">Role</div><div class="value">${staff?.role || "Staff"}</div></div>
    </div>
  </div>
  <div class="footer">
    <strong>Confidential Clinical Documentation</strong><br><br>
    Blessing Community Care Services<br><br>
    Generated on ${formatDate(new Date().toISOString())}
  </div>
</div>
</body></html>
  `;
};

serve(async (req) => {
  if (req.method === "OPTIONS") { return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" } }); }
  try {
    const { to, note, attachments = [], client, staff, hierarchy, shift, reportType = "Progress Note Report" } = await req.json();
    if (!to || !note) { return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }); }
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: Deno.env.get("EMAIL_USER"), pass: Deno.env.get("EMAIL_PASS") }, tls: { rejectUnauthorized: false } });
    const html = generateProgressReportHTML({ note, attachments, client, staff, hierarchy, shift });
    const info = await transporter.sendMail({ from: `"Blessing Community" <${Deno.env.get("EMAIL_USER")}>`, to: Array.isArray(to) ? to.join(', ') : to, subject: `${reportType} – ${client?.first_name || ''} ${client?.last_name || ''} – ${new Date(note.event_date).toLocaleDateString()}`, html });
    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  } catch (error) { return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }); }
});
