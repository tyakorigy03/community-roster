
# name: create_user
# url: https://lyuhhztaemndephpgjaj.supabase.co/functions/v1/create_user


```import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer";

/* ---------------- CORS ---------------- */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/* ---------------- SERVER ---------------- */

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const { email, name } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate 6-digit temporary password
    const password = Math.floor(100000 + Math.random() * 900000).toString();

    /* ---------------- SUPABASE CLIENT ---------------- */

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    /* ---------------- CHECK IF STAFF EXISTS IN DATABASE ---------------- */

    const { data: staffData, error: staffCheckError } = await supabase
      .from("staff")
      .select("id, user_id")
      .eq("email", email)
      .single();

    if (staffCheckError && staffCheckError.code !== "PGRST116") {
      // PGRST116 means no rows returned, which is fine
      throw staffCheckError;
    }

    if (!staffData) {
      return new Response(
        JSON.stringify({ error: "Staff member with this email not found in database" }),
        { status: 404, headers: corsHeaders }
      );
    }

    /* ---------------- USER CHECK & CREATE/UPDATE ---------------- */

    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) throw listError;

    const existingUser = usersData.users.find(u => u.email === email);
    let userId: string;

    if (existingUser) {
      // Reset password if user exists
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { password }
      );
      
      if (updateError) throw updateError;
      
      userId = existingUser.id;
      console.log("Updated existing user:", userId);
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: "staff",
          name: name || "",
        },
      });

      if (createError) throw createError;
      if (!newUser.user) throw new Error("Failed to create user");
      
      userId = newUser.user.id;
      console.log("Created new user:", userId);
    }

    /* ---------------- UPDATE STAFF TABLE ---------------- */

    const { error: updateStaffError } = await supabase
      .from("staff")
      .update({ user_id: userId })
      .eq("email", email);

    if (updateStaffError) {
      console.error("Failed to update staff table:", updateStaffError);
      throw updateStaffError;
    }

    console.log("Successfully updated staff table for:", email);

    /* ---------------- EMAIL SETUP ---------------- */

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: Deno.env.get("EMAIL_USER"),
        pass: Deno.env.get("EMAIL_PASS"),
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    /* ---------------- SEND EMAIL ---------------- */

    await transporter.sendMail({
      from: `"Blessing Community App" <${Deno.env.get("EMAIL_USER")}>`,
      to: email,
      subject: "📩 Staff Portal Invitation",
      html: `
       <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:30px;">
  <div style="max-width:600px; margin:auto; background:#fff; padding:25px; border-radius:10px;">
    <h2 style="text-align:center;">🎉 Welcome to Blessing Community App</h2>

    <p>Hello <strong>${name ?? "Team Member"}</strong>,</p>

    <p>
      We are pleased to inform you that you have been
      <strong>added to the Blessing Community App as a staff member</strong>.
    </p>

    <p>
      You can now access the system to:
    </p>

    <ul>
      <li>View your assigned shifts</li>
      <li>Track your work activities</li>
      <li>Submit and review your progress reports</li>
    </ul>

    <p><strong>Your login credentials:</strong></p>

    <p>
      Email: ${email}<br />
      Password: <strong>${password}</strong>
    </p>
    <p style="text-align:center; color:#888;">
      If you have any questions or need assistance, please contact the system administrator.<br /><br />
      <strong>Blessing Community App Team</strong>
    </p>
  </div>
</div>
      `,
    });

    /* ---------------- RESPONSE ---------------- */

    return new Response(
      JSON.stringify({
        success: true,
        message: "Staff invited successfully",
        userId,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Invite error:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
```  

#name: dynamic-responder
#url: https://lyuhhztaemndephpgjaj.supabase.co/functions/v1/dynamic-responder

```
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
body {
  font-family: Georgia, "Times New Roman", serif;
  background: #f4f4f4;
  color: #1f2937;
  padding: 40px 20px;
}
.container {
  max-width: 820px;
  margin: 0 auto;
  background: #ffffff;
  border: 1px solid #e5e7eb;
}
.header {
  background: #1E3A8A;
  color: #ffffff;
  padding: 40px;
  text-align: center;
}
.header h1 {
  font-size: 28px;
  font-weight: 500;
  letter-spacing: 1px;
  margin-bottom: 8px;
}
.header p {
  font-size: 14px;
  opacity: 0.9;
}
.intro {
  padding: 30px 40px;
  font-size: 15px;
  line-height: 1.8;
}
.section {
  padding: 30px 40px;
  border-top: 1px solid #e5e7eb;
}
h2 {
  font-size: 20px;
  margin-bottom: 16px;
  color: #1e293b;
}
h3 {
  font-size: 16px;
  margin-bottom: 12px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
.label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #6b7280;
}
.value {
  font-size: 15px;
  margin-top: 4px;
}
.note-box {
  border: 1px solid #e5e7eb;
  padding: 20px;
  white-space: pre-line;
  line-height: 1.9;
}
.attachment-item {
  display: flex;
  justify-content: space-between;
  border: 1px solid #e5e7eb;
  padding: 10px;
  margin-bottom: 6px;
  font-size: 14px;
}
.attachment-item a {
  text-decoration: none;
  color: #1e40af;
}
.file-type {
  font-size: 11px;
  color: #374151;
}
.footer {
  background: #1E3A8A;
  color: #d1d5db;
  text-align: center;
  padding: 30px;
  font-size: 13px;
}
.footer strong {
  color: #ffffff;
}
</style>
</head>

<body>
<div class="container">

  <div class="header">
    <h1>Progress Note</h1>
    <p>Clinical Documentation</p>
  </div>

  <div class="intro">
    <p>
      Please find below the progress note documentation prepared for the client listed.
      This document is provided for professional review and record-keeping purposes.
    </p>
    <p>
      Should you require any clarification regarding this report, please contact our office.
    </p>
  </div>

  <div class="section">
    <h2>Document Details</h2>
    <div class="grid">
      <div>
        <div class="label">Note ID</div>
        <div class="value">PN-${note?.id?.substring(0, 8).toUpperCase()}</div>
      </div>
      <div>
        <div class="label">Event Date</div>
        <div class="value">${formatDate(note?.event_date)}</div>
      </div>
      <div>
        <div class="label">Created</div>
        <div class="value">${formatDateTime(note?.created_at)}</div>
      </div>
      <div>
        <div class="label">Last Updated</div>
        <div class="value">${formatDateTime(note?.updated_at)}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Client Information</h2>
    <div class="grid">
      <div>
        <div class="label">Client Name</div>
        <div class="value">${client?.first_name} ${client?.last_name}</div>
      </div>
      <div>
        <div class="label">NDIS Number</div>
        <div class="value">${client?.ndis_number || "N/A"}</div>
      </div>
    </div>
  </div>

  ${
    shift
      ? `
  <div class="section">
    <h2>Shift Details</h2>
    <div class="grid">
      <div>
        <div class="label">Shift Date</div>
        <div class="value">${formatDate(shift.shift_date)}</div>
      </div>
      <div>
        <div class="label">Time</div>
        <div class="value">${formatTime(shift.start_time)} – ${formatTime(
          shift.end_time
        )}</div>
      </div>
      <div>
        <div class="label">Shift Type</div>
        <div class="value">${shift.shift_type_name || "General"}</div>
      </div>
    </div>
  </div>
  `
      : ""
  }

  <div class="section">
    <h2>Progress Notes Summary</h2>
    <div class="note-box">
      ${note?.shift_notes || "No notes recorded."}
    </div>
  </div>

  ${attachmentsHTML}

  <div class="section">
    <h2>Prepared By</h2>
    <div class="grid">
      <div>
        <div class="label">Staff Name</div>
        <div class="value">${staff?.name || "N/A"}</div>
      </div>
      <div>
        <div class="label">Email</div>
        <div class="value">${staff?.email || "N/A"}</div>
      </div>
      <div>
        <div class="label">Role</div>
        <div class="value">${staff?.role || "Staff"}</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <strong>Confidential Clinical Documentation</strong><br><br>
    This document contains confidential information intended solely for authorised personnel.<br>
    Blessing Community Care Services<br><br>
    For enquiries, contact: <strong>Blessing community team admin</strong><br><br>
    Generated on ${formatDate(new Date().toISOString())}
  </div>

</div>
</body>
</html>
  `;
};

/* ---------------- EDGE FUNCTION ---------------- */
serve(async (req) => {
  // Handle preflight CORS request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const {
      to,
      note,
      attachments = [],
      client,
      staff,
      hierarchy,
      shift,
      reportType = "Progress Note Report"
    } = await req.json();

    if (!to || !note) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "yakinnsanzumuhire@gmail.com",
        pass: "bnme dmhq lwgr hvcp",
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const html = generateProgressReportHTML({
      note,
      attachments,
      client,
      staff,
      hierarchy,
      shift
    });

    const info = await transporter.sendMail({
      from: `"Blessing Community" <yakinnsanzumuhire@gmail.com>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: `${reportType} – ${client?.first_name || ''} ${client?.last_name || ''} – ${formatDate(note.event_date)}`,
      html,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: info.messageId,
        sentTo: Array.isArray(to) ? to : [to]
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error sending progress report:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  }
});

// Helper function
const formatDate = (dateStr) => 
  dateStr ? new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }) : "N/A";

  ```

  #name : publish-roster
  #url : https://lyuhhztaemndephpgjaj.supabase.co/functions/v1/publish-roster

  ```
  import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer";

/* ---------------- CORS ---------------- */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/* ---------------- HELPER FUNCTIONS ---------------- */

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
};

const formatTime = (timeString: string): string => {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

const calculateDuration = (startTime: string, endTime: string, breakMinutes: number = 0): string => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startDecimal = startHour + startMin / 60;
  const endDecimal = endHour + endMin / 60;
  const breakHours = breakMinutes / 60;
  
  const totalHours = endDecimal - startDecimal - breakHours;
  const hours = Math.floor(totalHours);
  const minutes = Math.round((totalHours - hours) * 60);
  
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

const getWeekDateRange = (shifts: any[]): string => {
  if (shifts.length === 0) return '';
  
  const dates = shifts.map(s => new Date(s.shift_date)).sort((a, b) => a.getTime() - b.getTime());
  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return `${months[firstDate.getMonth()]} ${firstDate.getDate()} - ${months[lastDate.getMonth()]} ${lastDate.getDate()}, ${lastDate.getFullYear()}`;
};

/* ---------------- EMAIL TEMPLATE ---------------- */

const generateRosterEmail = (staffName: string, shifts: any[], weekRange: string): string => {
  const totalHours = shifts.reduce((total, shift) => {
    const [startHour, startMin] = shift.start_time.split(':').map(Number);
    const [endHour, endMin] = shift.end_time.split(':').map(Number);
    const startDecimal = startHour + startMin / 60;
    const endDecimal = endHour + endMin / 60;
    const breakHours = (shift.break_minutes || 0) / 60;
    return total + (endDecimal - startDecimal - breakHours);
  }, 0);

  const shiftsHtml = shifts
    .sort((a, b) => new Date(a.shift_date).getTime() - new Date(b.shift_date).getTime())
    .map((shift, index) => {
      const isEven = index % 2 === 0;
      const clientName = shift.client_name || 'Not specified';
      const shiftType = shift.shift_type_name || 'Standard Shift';
      
      return `
        <tr style="background-color: ${isEven ? '#f9fafb' : '#ffffff'};">
          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">
              ${formatDate(shift.shift_date)}
            </div>
            <div style="font-size: 12px; color: #6b7280;">
              ${new Date(shift.shift_date).toLocaleDateString('en-US', { weekday: 'long' })}
            </div>
          </td>
          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 500; color: #374151; margin-bottom: 4px;">
              ${formatTime(shift.start_time)} - ${formatTime(shift.end_time)}
            </div>
            <div style="font-size: 12px; color: #6b7280;">
              ${calculateDuration(shift.start_time, shift.end_time, shift.break_minutes)}
              ${shift.break_minutes > 0 ? ` (${shift.break_minutes}m break)` : ''}
            </div>
          </td>
          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 500; color: #374151; margin-bottom: 4px;">
              ${clientName}
            </div>
            <div style="font-size: 12px; color: #6b7280;">
              ${shiftType}
            </div>
          </td>
          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: center;">
            <span style="display: inline-block; padding: 4px 12px; background-color: ${
              shift.status === 'completed' ? '#dcfce7' : 
              shift.status === 'cancelled' ? '#fee2e2' : 
              '#dbeafe'
            }; color: ${
              shift.status === 'completed' ? '#166534' : 
              shift.status === 'cancelled' ? '#991b1b' : 
              '#1e40af'
            }; border-radius: 9999px; font-size: 12px; font-weight: 500; text-transform: capitalize;">
              ${shift.status || 'Scheduled'}
            </span>
          </td>
        </tr>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Weekly Roster</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 700px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Header with Gradient -->
    <div style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
        📅 Weekly Roster Published
      </h1>
      <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">
        ${weekRange}
      </p>
    </div>

    <!-- Greeting Section -->
    <div style="padding: 30px;">
      <h2 style="margin: 0 0 8px 0; color: #111827; font-size: 22px; font-weight: 600;">
        Hello ${staffName}! 👋
      </h2>
      <p style="margin: 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
        Your roster for the upcoming week has been published. Below are your scheduled shifts.
      </p>
    </div>

    <!-- Summary Cards -->
    <div style="padding: 0 30px 30px 30px;">
      <div style="display: flex; gap: 16px;">
        <div style="flex: 1; background-color: #eff6ff; border-radius: 12px; padding: 20px; text-align: center;">
          <div style="font-size: 32px; font-weight: 700; color: #2563eb; margin-bottom: 4px;">
            ${shifts.length}
          </div>
          <div style="font-size: 13px; color: #60a5fa; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
            Total Shifts
          </div>
        </div>
        
        <div style="flex: 1; background-color: #f0fdf4; border-radius: 12px; padding: 20px; text-align: center;">
          <div style="font-size: 32px; font-weight: 700; color: #16a34a; margin-bottom: 4px;">
            ${Math.round(totalHours * 10) / 10}
          </div>
          <div style="font-size: 13px; color: #4ade80; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
            Total Hours
          </div>
        </div>
      </div>
    </div>

    <!-- Shifts Table -->
    <div style="padding: 0 30px 30px 30px;">
      <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: 600;">
        Your Scheduled Shifts
      </h3>
      
      <div style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">
                Date
              </th>
              <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">
                Time
              </th>
              <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">
                Client / Type
              </th>
              <th style="padding: 12px 16px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            ${shiftsHtml}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Important Notes -->
    <div style="padding: 0 30px 30px 30px;">
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px;">
        <h4 style="margin: 0 0 8px 0; color: #92400e; font-size: 14px; font-weight: 600; display: flex; align-items: center;">
          ⚠️ Important Notes
        </h4>
        <ul style="margin: 0; padding-left: 20px; color: #78350f; font-size: 13px; line-height: 1.6;">
          <li style="margin-bottom: 4px;">Arrive 10 minutes before your shift start time</li>
          <li style="margin-bottom: 4px;">Contact your supervisor immediately if you cannot attend a shift</li>
          <li>Check your email regularly for any roster updates</li>
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">
        Questions or concerns about your roster?
      </p>
      <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 13px;">
        Contact Blessing community team admin
      </p>
      
      <div style="border-top: 1px solid #e5e7eb; margin-top: 20px; padding-top: 20px;">
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
          © ${new Date().getFullYear()} Blessing Community App. All rights reserved.
        </p>
        <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 11px;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    </div>

  </div>
</body>
</html>
  `;
};

/* ---------------- SERVER ---------------- */

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const { startDate, endDate } = await req.json();

    if (!startDate || !endDate) {
      return new Response(
        JSON.stringify({ error: "Start date and end date are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    /* ---------------- SUPABASE CLIENT ---------------- */

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    /* ---------------- FETCH SHIFTS FOR THE WEEK ---------------- */

    const { data: shifts, error: shiftsError } = await supabase
      .from("shifts")
      .select(`
        *,
        staff:staff_id(id, name, email),
        client:client_id(first_name, last_name),
        shift_type:shift_type_id(name)
      `)
      .gte('shift_date', startDate)
      .lte('shift_date', endDate)
      .not('staff_id', 'is', null);

    if (shiftsError) throw shiftsError;

    if (!shifts || shifts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No shifts found for this week",
          emailsSent: 0 
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    /* ---------------- GROUP SHIFTS BY STAFF ---------------- */

    const shiftsByStaff = new Map();
    
    shifts.forEach(shift => {
      if (!shift.staff || !shift.staff.email) return;
      
      const staffId = shift.staff.id;
      if (!shiftsByStaff.has(staffId)) {
        shiftsByStaff.set(staffId, {
          name: shift.staff.name,
          email: shift.staff.email,
          shifts: []
        });
      }
      
      shiftsByStaff.get(staffId).shifts.push({
        shift_date: shift.shift_date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        break_minutes: shift.break_minutes || 0,
        status: shift.status,
        client_name: shift.client 
          ? `${shift.client.first_name} ${shift.client.last_name}`
          : null,
        shift_type_name: shift.shift_type?.name || null
      });
    });

    /* ---------------- EMAIL SETUP ---------------- */

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: Deno.env.get("EMAIL_USER"),
        pass: Deno.env.get("EMAIL_PASS"),
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    /* ---------------- SEND EMAILS TO ALL STAFF ---------------- */

    const weekRange = getWeekDateRange(shifts);
    let emailsSent = 0;
    const errors = [];

    for (const [staffId, staffData] of shiftsByStaff) {
      try {
        await transporter.sendMail({
          from: `"Blessing Community App" <${Deno.env.get("EMAIL_USER")}>`,
          to: staffData.email,
          subject: `📅 Your Weekly Roster - ${weekRange}`,
          html: generateRosterEmail(staffData.name, staffData.shifts, weekRange),
        });

        emailsSent++;
        console.log(`Email sent to ${staffData.name} (${staffData.email})`);
      } catch (error) {
        console.error(`Failed to send email to ${staffData.email}:`, error);
        errors.push({
          email: staffData.email,
          name: staffData.name,
          error: error.message
        });
      }
    }

    /* ---------------- UPDATE ROSTER STATUS ---------------- */

    // You can optionally create a roster_publications table to track when rosters are published
    const { error: publishError } = await supabase
      .from("roster_publications")
      .insert([{
        start_date: startDate,
        end_date: endDate,
        published_at: new Date().toISOString(),
        emails_sent: emailsSent,
        total_staff: shiftsByStaff.size
      }]);

    if (publishError) {
      console.warn("Could not log roster publication:", publishError);
      // Don't throw error, just log it
    }

    /* ---------------- RESPONSE ---------------- */

    return new Response(
      JSON.stringify({
        success: true,
        message: `Roster published successfully to ${emailsSent} staff member${emailsSent !== 1 ? 's' : ''}`,
        emailsSent,
        totalStaff: shiftsByStaff.size,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error("Publish roster error:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to publish roster",
        details: error.message
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
```

# name : report-incident
#url : https://lyuhhztaemndephpgjaj.supabase.co/functions/v1/report-incident

```
// Supabase Edge Function: report-incident
// Deploy: supabase functions deploy report-incident

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import nodemailer from "npm:nodemailer";

interface IncidentEmailData {
  to: string | string[]; // Can be single email or array of emails
  incident: {
    id: string;
    incident_date: string;
    incident_time?: string;
    location?: string;
    rating?: string;
    summary?: string;
    description?: string;
    antecedent?: string;
    deescalation?: string;
    prn_approved?: string;
    prn_provided?: string;
    prn_notes?: string;
    physical_intervention?: string;
    physical_intervention_type?: string;
    physical_intervention_duration?: string;
    client_injured?: string;
    staff_injured?: string;
    follow_up_required?: string;
    management_contacted?: string;
    police_event_number?: string;
    witnesses?: string;
    subject?: string;
  };
  client: {
    first_name: string;
    last_name: string;
    ndis_number?: string;
    date_of_birth?: string;
    address_line?: string;
    phone_number?: string;
  };
  hierarchy: {
    code?: string;
    name: string;
    description?: string;
  };
  createdBy?: {
    name: string;
    email?: string;
    role?: string;
  };
  incidentTypes?: Array<{ name: string; description?: string }>;
  emergencyAssistance?: Array<{ name: string; details?: string }>;
  attachments?: Array<{
    file_name: string;
    file_url: string;
    file_size?: number;
  }>;
}

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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
    case "low":
      return "#4caf50";
    case "medium":
      return "#ff9800";
    case "high":
      return "#ff5722";
    case "critical":
      return "#f44336";
    default:
      return "#9e9e9e";
  }
};

const generateEmailHTML = (data: IncidentEmailData) => {
  const { incident, client, hierarchy, createdBy, incidentTypes, emergencyAssistance, attachments } = data;

  // Incident Types HTML
  const incidentTypesHTML =
    incidentTypes && incidentTypes.length > 0
      ? `
        <h3 style="color:#333;border-bottom:2px solid #1976d2;padding-bottom:8px;margin-top:24px">Incident Classification</h3>
        <div style="display:grid;grid-gap:8px">
          ${incidentTypes
            .map(
              (type) => `
            <div style="background:#ffebee;border:1px solid #ef5350;border-radius:6px;padding:12px">
              <strong style="color:#c62828">${type.name}</strong>
              ${type.description ? `<div style="font-size:13px;color:#d32f2f;margin-top:4px">${type.description}</div>` : ""}
            </div>
          `
            )
            .join("")}
        </div>
      `
      : "";

  // Emergency Assistance HTML
  const emergencyAssistanceHTML =
    emergencyAssistance && emergencyAssistance.length > 0
      ? `
        <h3 style="color:#333;border-bottom:2px solid #1976d2;padding-bottom:8px;margin-top:24px">Emergency Assistance</h3>
        <div style="display:grid;grid-gap:8px">
          ${emergencyAssistance
            .map(
              (assist) => `
            <div style="background:#e3f2fd;border:1px solid #2196f3;border-radius:6px;padding:12px">
              <strong style="color:#1565c0">${assist.name}</strong>
              ${assist.details ? `<div style="font-size:13px;color:#1976d2;margin-top:4px">${assist.details}</div>` : ""}
            </div>
          `
            )
            .join("")}
        </div>
      `
      : "";

  // Attachments HTML
  const attachmentLinksHTML =
    attachments && attachments.length > 0
      ? `
        <h3 style="color:#333;border-bottom:2px solid #1976d2;padding-bottom:8px;margin-top:24px">Supporting Evidence</h3>
        <ul style="padding-left:16px;list-style:none">
          ${attachments
            .map(
              (a) => `
            <li style="margin-bottom:8px">
              <a href="${a.file_url}" target="_blank" style="color:#1976d2;text-decoration:none">
                📎 ${a.file_name}
              </a>
              ${a.file_size ? `<span style="color:#666;font-size:12px;margin-left:8px">(${(a.file_size / 1024).toFixed(0)} KB)</span>` : ""}
            </li>
          `
            )
            .join("")}
        </ul>
      `
      : "";

  // PRN Section HTML
  const prnSectionHTML =
    incident.prn_approved || incident.prn_provided || incident.prn_notes
      ? `
        <h3 style="color:#333;border-bottom:2px solid #1976d2;padding-bottom:8px;margin-top:24px">PRN Medication</h3>
        <table width="100%" cellpadding="8" style="border-collapse:collapse">
          ${incident.prn_approved ? `<tr><td style="background:#f5f5f5;border-bottom:1px solid #ddd"><b>PRN Approved</b></td><td style="border-bottom:1px solid #ddd">${incident.prn_approved.toUpperCase()}</td></tr>` : ""}
          ${incident.prn_provided ? `<tr><td style="background:#f5f5f5;border-bottom:1px solid #ddd"><b>PRN Provided</b></td><td style="border-bottom:1px solid #ddd">${incident.prn_provided.toUpperCase()}</td></tr>` : ""}
          ${incident.prn_notes ? `<tr><td style="background:#f5f5f5;border-bottom:1px solid #ddd"><b>PRN Notes</b></td><td style="border-bottom:1px solid #ddd">${incident.prn_notes}</td></tr>` : ""}
        </table>
      `
      : "";

  // Physical Intervention HTML
  const physicalInterventionHTML =
    incident.physical_intervention
      ? `
        <h3 style="color:#333;border-bottom:2px solid #1976d2;padding-bottom:8px;margin-top:24px">Physical Intervention – Restrictive Practice</h3>
        <table width="100%" cellpadding="8" style="border-collapse:collapse">
          <tr><td style="background:#f5f5f5;border-bottom:1px solid #ddd"><b>Physical Hold Used</b></td><td style="border-bottom:1px solid #ddd">${incident.physical_intervention.toUpperCase()}</td></tr>
          ${
            incident.physical_intervention === "yes"
              ? `
            ${incident.physical_intervention_type ? `<tr><td style="background:#f5f5f5;border-bottom:1px solid #ddd"><b>Type of Restraint</b></td><td style="border-bottom:1px solid #ddd">${incident.physical_intervention_type}</td></tr>` : ""}
            ${incident.physical_intervention_duration ? `<tr><td style="background:#f5f5f5;border-bottom:1px solid #ddd"><b>Duration</b></td><td style="border-bottom:1px solid #ddd">${incident.physical_intervention_duration}</td></tr>` : ""}
            ${incident.client_injured ? `<tr><td style="background:#f5f5f5;border-bottom:1px solid #ddd"><b>Client Injured</b></td><td style="border-bottom:1px solid #ddd">${incident.client_injured.toUpperCase()}</td></tr>` : ""}
            ${incident.staff_injured ? `<tr><td style="background:#f5f5f5;border-bottom:1px solid #ddd"><b>Staff Injured</b></td><td style="border-bottom:1px solid #ddd">${incident.staff_injured.toUpperCase()}</td></tr>` : ""}
          `
              : ""
          }
        </table>
      `
      : "";

  // Follow Up HTML
  const followUpHTML =
    incident.follow_up_required || incident.management_contacted
      ? `
        <h3 style="color:#333;border-bottom:2px solid #1976d2;padding-bottom:8px;margin-top:24px">Follow Up Actions</h3>
        <table width="100%" cellpadding="8" style="border-collapse:collapse">
          ${incident.follow_up_required ? `<tr><td style="background:#f5f5f5;border-bottom:1px solid #ddd"><b>Follow Up Required</b></td><td style="border-bottom:1px solid #ddd">${incident.follow_up_required.toUpperCase()}</td></tr>` : ""}
          ${incident.management_contacted ? `<tr><td style="background:#f5f5f5;border-bottom:1px solid #ddd"><b>Management Contacted</b></td><td style="border-bottom:1px solid #ddd">${incident.management_contacted.toUpperCase()}</td></tr>` : ""}
        </table>
      `
      : "";

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f6f8">
    <div style="max-width:720px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
      
      <!-- Header -->
      <div style="background:linear-gradient(135deg, #1976d2 0%, #1565c0 100%);color:#fff;padding:32px 24px;text-align:center">
        <h1 style="margin:0;font-size:28px;font-weight:bold">NDIS Incident Report</h1>
        <p style="margin:8px 0 0;font-size:14px;opacity:0.9">Blessing Community Support Services</p>
      </div>

      <!-- Info Bar -->
      <div style="background:#f5f5f5;padding:12px 24px;border-bottom:1px solid #e0e0e0;font-size:13px;color:#666">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap">
          <span><strong>Incident ID:</strong> ${incident.id?.substring(0, 13) || "N/A"}</span>
          <span><strong>Date:</strong> ${formatDate(incident.incident_date)}</span>
          ${incident.incident_time ? `<span><strong>Time:</strong> ${formatTime(incident.incident_time)}</span>` : ""}
        </div>
      </div>

      <!-- Main Content -->
      <div style="padding:24px;color:#333">
        <p style="margin-top:0">Dear NDIS Compliance Team,</p>

        <p>
          Please find below a formal incident report submitted via the
          Blessing Community Incident Management System.
        </p>

        <!-- Client Details -->
        <h3 style="color:#333;border-bottom:2px solid #1976d2;padding-bottom:8px;margin-top:24px">Client Details</h3>
        <table width="100%" cellpadding="8" style="border-collapse:collapse">
          <tr><td style="background:#f5f5f5;border-bottom:1px solid #ddd;width:40%"><b>Name</b></td><td style="border-bottom:1px solid #ddd">${client.first_name} ${client.last_name}</td></tr>
          ${client.ndis_number ? `<tr><td style="background:#f5f5f5;border-bottom:1px solid #ddd"><b>NDIS Number</b></td><td style="border-bottom:1px solid #ddd;font-family:monospace">${client.ndis_number}</td></tr>` : ""}
          ${client.date_of_birth ? `<tr><td style="background:#f5f5f5;border-bottom:1px solid #ddd"><b>Date of Birth</b></td><td style="border-bottom:1px solid #ddd">${formatDate(client.date_of_birth)}</td></tr>` : ""}
          ${client.phone_number ? `<tr><td style="background:#f5f5f5;border-bottom:1px solid #ddd"><b>Phone</b></td><td style="border-bottom:1px solid #ddd">${client.phone_number}</td></tr>` : ""}
          ${client.address_line ? `<tr><td style="background:#f5f5f5;border-bottom:1px solid #ddd"><b>Address</b></td><td style="border-bottom:1px solid #ddd">${client.address_line}</td></tr>` : ""}
        </table>

        <!-- Incident Details -->
        <h3 style="color:#333;border-bottom:2px solid #1976d2;padding-bottom:8px;margin-top:24px">Incident Details</h3>
        <table width="100%" cellpadding="8" style="border-collapse:collapse">
          <tr><td style="background:#f5f5f5;border-bottom:1px solid #ddd;width:40%"><b>Incident ID</b></td><td style="border-bottom:1px solid #ddd;font-family:monospace">${incident.id}</td></tr>
          <tr><td style="background:#f5f5f5;border-bottom:1px solid #ddd"><b>Date</b></td><td style="border-bottom:1px solid #ddd">${formatDate(incident.incident_date)}</td></tr>
          ${incident.incident_time ? `<tr><td style="background:#f5f5f5;border-bottom:1px solid #ddd"><b>Time</b></td><td style="border-bottom:1px solid #ddd">${formatTime(incident.incident_time)}</td></tr>` : ""}
          ${incident.location ? `<tr><td style="background:#f5f5f5;border-bottom:1px solid #ddd"><b>Location</b></td><td style="border-bottom:1px solid #ddd">${incident.location}</td></tr>` : ""}
          <tr><td style="background:#f5f5f5;border-bottom:1px solid #ddd"><b>Hierarchy</b></td><td style="border-bottom:1px solid #ddd"><strong>${hierarchy.name}</strong> ${hierarchy.code ? `(${hierarchy.code})` : ""}</td></tr>
          ${incident.rating ? `<tr><td style="background:#f5f5f5;border-bottom:1px solid #ddd"><b>Severity Rating</b></td><td style="border-bottom:1px solid #ddd"><span style="display:inline-block;background:${getSeverityColor(incident.rating)};color:#fff;padding:4px 12px;border-radius:4px;font-weight:bold;font-size:12px">${incident.rating.toUpperCase()}</span></td></tr>` : ""}
          ${incident.witnesses ? `<tr><td style="background:#f5f5f5;border-bottom:1px solid #ddd"><b>Witnesses</b></td><td style="border-bottom:1px solid #ddd">${incident.witnesses}</td></tr>` : ""}
          ${incident.police_event_number ? `<tr><td style="background:#f5f5f5;border-bottom:1px solid #ddd"><b>Police Event Number</b></td><td style="border-bottom:1px solid #ddd;font-family:monospace">${incident.police_event_number}</td></tr>` : ""}
        </table>

        <!-- Incident Classification -->
        ${incidentTypesHTML}

        <!-- Emergency Assistance -->
        ${emergencyAssistanceHTML}

        <!-- Incident Summary -->
        ${
          incident.summary
            ? `
          <h3 style="color:#333;border-bottom:2px solid #1976d2;padding-bottom:8px;margin-top:24px">Incident Summary</h3>
          <div style="background:#e3f2fd;border-left:4px solid #2196f3;padding:16px;border-radius:4px">
            <p style="margin:0;line-height:1.6">${incident.summary}</p>
          </div>
        `
            : ""
        }

        <!-- Antecedent -->
        ${
          incident.antecedent
            ? `
          <h3 style="color:#333;border-bottom:2px solid #1976d2;padding-bottom:8px;margin-top:24px">Antecedent (What was happening before)</h3>
          <div style="background:#fff3e0;border-left:4px solid #ff9800;padding:16px;border-radius:4px">
            <p style="margin:0;line-height:1.6">${incident.antecedent}</p>
          </div>
        `
            : ""
        }

        <!-- Incident Description -->
        ${
          incident.description
            ? `
          <h3 style="color:#333;border-bottom:2px solid #1976d2;padding-bottom:8px;margin-top:24px">Detailed Incident Description</h3>
          <div style="background:#ffebee;border-left:4px solid #f44336;padding:16px;border-radius:4px">
            <p style="margin:0;line-height:1.6">${incident.description}</p>
          </div>
        `
            : ""
        }

        <!-- De-escalation Outcome -->
        ${
          incident.deescalation
            ? `
          <h3 style="color:#333;border-bottom:2px solid #1976d2;padding-bottom:8px;margin-top:24px">De-escalation Process & Outcome</h3>
          <div style="background:#e8f5e9;border-left:4px solid #4caf50;padding:16px;border-radius:4px">
            <p style="margin:0;line-height:1.6">${incident.deescalation}</p>
          </div>
        `
            : ""
        }

        <!-- PRN Section -->
        ${prnSectionHTML}

        <!-- Physical Intervention -->
        ${physicalInterventionHTML}

        <!-- Follow Up -->
        ${followUpHTML}

        <!-- Supporting Evidence -->
        ${attachmentLinksHTML}

        <!-- Compliance Statement -->
        <div style="background:#f5f5f5;border-radius:6px;padding:16px;margin-top:32px">
          <p style="margin:0 0 16px;font-style:italic;color:#666">
            This report has been completed in accordance with organisational
            and NDIS reporting requirements.
          </p>

          <table width="100%" cellpadding="4">
            <tr>
              <td style="width:50%;vertical-align:top">
                <strong style="color:#333">Completed By:</strong><br/>
                <span style="color:#666">${createdBy?.name || "Unknown"}</span><br/>
                <span style="color:#888;font-size:13px">${createdBy?.role || "Staff"}</span>
              </td>
              <td style="width:50%;vertical-align:top">
                <strong style="color:#333">Organisation:</strong><br/>
                <span style="color:#666">Blessing Community</span><br/>
                <span style="color:#888;font-size:13px">Support Services</span>
              </td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Footer -->
      <div style="background:#263238;color:#90a4ae;padding:20px;text-align:center;font-size:12px">
        <p style="margin:0">© ${new Date().getFullYear()} Blessing Community Support Services. All rights reserved.</p>
        <p style="margin:8px 0 0;font-size:11px;opacity:0.8">CONFIDENTIAL – For authorized personnel only</p>
      </div>
    </div>
  </body>
  </html>
  `;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { 
      status: 405,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }

  try {
    const data: IncidentEmailData = await req.json();

    if (!data.to || !data.incident || !data.client) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Missing required fields: to, incident, client" 
        }),
        {
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          },
        }
      );
    }

    // Convert single email to array for uniform processing
    const recipients = Array.isArray(data.to) ? data.to : [data.to];

    // Generate HTML email
    const htmlContent = generateEmailHTML(data);

    // Prepare subject line
    const subject = `NDIS Incident Report – ${data.incident.rating?.toUpperCase() || "Incident"} – ${data.client.first_name} ${data.client.last_name}`;

    // Create nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "yakinnsanzumuhire@gmail.com",
        pass: "bnme dmhq lwgr hvcp", // App password
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Send email to all recipients
    const info = await transporter.sendMail({
      from: '"Blessing Community" <yakinnsanzumuhire@gmail.com>',
      to: recipients.join(', '),
      subject: subject,
      html: htmlContent,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email sent successfully to ${recipients.length} recipient(s)`,
        recipients: recipients,
        messageId: info.messageId,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error sending incident email:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to send incident email",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
```

# name : sendemail
# url : https://lyuhhztaemndephpgjaj.supabase.co/functions/v1/smooth-endpoint

```
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req: Request) => {
  try {
    // const body = await req.json();

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${"re_ioLrSQZe_GcHkdcsopAtn9q1PHh5feegH"}`, // Set your API key in Supabase secrets
      },
      body: JSON.stringify({
        from: "yakinnsanzumuhire@gmail.com",
        to: 'amilhakim830@gmail.com', // recipient email from request
        subject: "Hello World",
        text: "Hello World from Supabase Edge Function!",
      }),
    });

    const data = await response.json();

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

```
# name : swift-action
# url : https://lyuhhztaemndephpgjaj.supabase.co/functions/v1/swift-action

``` 
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const url = new URL(req.url);
    
    // Get parameters from query string
    const publicId = url.searchParams.get('id');
    const filename = url.searchParams.get('filename') || 'document.pdf';

    if (!publicId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: id' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Cloudinary configuration (use environment variables in production)
    const CLOUDINARY_CONFIG = {
      cloudName: Deno.env.get('CLOUDINARY_CLOUD_NAME') || 'dazbtduwj',
      apiKey: Deno.env.get('CLOUDINARY_API_KEY') || '452643948933454',
      apiSecret: Deno.env.get('CLOUDINARY_API_SECRET') || '3mDCuyiWBwaZAGzS7pVgCaXPazk',
    };

    // Generate signed download URL
    const downloadUrl = await generateCloudinaryDownloadUrl(
      publicId,
      filename,
      CLOUDINARY_CONFIG
    );

    // Redirect to the download URL
    return new Response(null, {
      status: 302,
      headers: {
        'Location': downloadUrl,
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});

async function generateCloudinaryDownloadUrl(
  publicId: string,
  filename: string,
  config: { cloudName: string; apiKey: string; apiSecret: string }
): Promise<string> {
  const timestamp = Math.round(Date.now() / 1000);

  // Parameters to sign - must include ALL params except api_key and signature
  const paramsToSign = {
    attachment: 'true',
    public_id: publicId,
    target_filename: filename,
    timestamp: timestamp.toString(),
    type: 'upload',
  };

  // Sort parameters alphabetically and create string to sign
  const sortedParams = Object.keys(paramsToSign)
    .sort()
    .map(key => `${key}=${paramsToSign[key as keyof typeof paramsToSign]}`)
    .join('&');

  // Append API secret to the end
  const stringToSign = `${sortedParams}${config.apiSecret}`;

  console.log('String to sign:', stringToSign);

  // Generate SHA-1 signature using Web Crypto API
  const encoder = new TextEncoder();
  const data = encoder.encode(stringToSign);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Build the final URL
  const url = `https://api.cloudinary.com/v1_1/${config.cloudName}/image/download?` +
    `api_key=${config.apiKey}&` +
    `attachment=true&` +
    `public_id=${publicId}&` +
    `target_filename=${encodeURIComponent(filename)}&` +
    `timestamp=${timestamp}&` +
    `type=upload&` +
    `signature=${signature}`;

  return url;
}
