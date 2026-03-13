import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import nodemailer from "npm:nodemailer";

interface IncidentEmailData {
  to: string | string[];
  incident: any;
  client: any;
  hierarchy: any;
  createdBy?: any;
  incidentTypes?: any[];
  emergencyAssistance?: any[];
  attachments?: any[];
}

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
};

const formatTime = (timeString?: string) => {
  if (!timeString) return "";
  const [hours, minutes] = timeString.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

const getSeverityColor = (rating?: string) => {
  switch (rating?.toLowerCase()) {
    case "low": return "#4caf50";
    case "medium": return "#ff9800";
    case "high": return "#ff5722";
    case "critical": return "#f44336";
    default: return "#9e9e9e";
  }
};

const generateEmailHTML = (data: IncidentEmailData) => {
  const { incident, client, hierarchy, createdBy, incidentTypes, emergencyAssistance, attachments } = data;
  // ... (Full HTML template from egdefns.md)
  return `
  <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f6f8">
    <div style="max-width:720px;margin:40px auto;background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);overflow:hidden">
      <div style="background:linear-gradient(135deg, #1976d2 0%, #1565c0 100%);color:#fff;padding:32px 24px;text-align:center">
        <h1>NDIS Incident Report</h1><p>Blessing Community Support Services</p>
      </div>
      <div style="padding:24px;color:#333">
        <h3>Client Details</h3>
        <p>Name: ${client.first_name} ${client.last_name}</p>
        <p>NDIS: ${client.ndis_number || "N/A"}</p>
        <h3>Incident Details</h3>
        <p>Date: ${formatDate(incident.incident_date)} at ${formatTime(incident.incident_time)}</p>
        <p>Location: ${incident.location || "N/A"}</p>
        <p>Severity: ${incident.rating?.toUpperCase() || "N/A"}</p>
        <h3>Summary</h3><p>${incident.summary || "No summary provided."}</p>
        <h3>Description</h3><p>${incident.description || "No description provided."}</p>
      </div>
      <div style="background:#263238;color:#90a4ae;padding:20px;text-align:center;font-size:12px">
        <p>© ${new Date().getFullYear()} Blessing Community. CONFIDENTIAL.</p>
      </div>
    </div>
  </body></html>
  `;
};

serve(async (req) => {
  if (req.method === "OPTIONS") { return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" } }); }
  try {
    const data: IncidentEmailData = await req.json();
    if (!data.to || !data.incident || !data.client) { return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }); }
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: Deno.env.get("EMAIL_USER"), pass: Deno.env.get("EMAIL_PASS") }, tls: { rejectUnauthorized: false } });
    const recipients = Array.isArray(data.to) ? data.to : [data.to];
    const htmlContent = generateEmailHTML(data);
    const subject = `NDIS Incident Report – ${data.incident.rating?.toUpperCase() || "Incident"} – ${data.client.first_name} ${data.client.last_name}`;
    const info = await transporter.sendMail({ from: `"Blessing Community" <${Deno.env.get("EMAIL_USER")}>`, to: recipients.join(', '), subject: subject, html: htmlContent });
    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  } catch (error) { return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }); }
});
