import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", };

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
  const totalHours = (endHour + endMin / 60) - (startHour + startMin / 60) - (breakMinutes / 60);
  const hours = Math.floor(totalHours);
  const minutes = Math.round((totalHours - hours) * 60);
  return hours === 0 ? `${minutes}m` : (minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`);
};

const getWeekDateRange = (shifts: any[]): string => {
  if (shifts.length === 0) return '';
  const dates = shifts.map(s => new Date(s.shift_date)).sort((a, b) => a.getTime() - b.getTime());
  const firstDate = dates[0], lastDate = dates[dates.length - 1];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[firstDate.getMonth()]} ${firstDate.getDate()} - ${months[lastDate.getMonth()]} ${lastDate.getDate()}, ${lastDate.getFullYear()}`;
};

const generateRosterEmail = (staffName: string, shifts: any[], weekRange: string): string => {
  const totalHours = shifts.reduce((total, shift) => {
    const [sh, sm] = shift.start_time.split(':').map(Number), [eh, em] = shift.end_time.split(':').map(Number);
    return total + (eh + em / 60) - (sh + sm / 60) - (shift.break_minutes || 0) / 60;
  }, 0);

  const shiftsHtml = shifts.sort((a, b) => new Date(a.shift_date).getTime() - new Date(b.shift_date).getTime()).map((shift, index) => `
    <tr style="background-color: ${index % 2 === 0 ? '#f9fafb' : '#ffffff'};">
      <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;"><b>${formatDate(shift.shift_date)}</b></td>
      <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">${formatTime(shift.start_time)} - ${formatTime(shift.end_time)}</td>
      <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">${shift.client_name || 'N/A'}</td>
      <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: center;">${shift.status || 'Scheduled'}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f3f4f6;padding:20px;">
    <div style="max-width:700px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
      <div style="background:linear-gradient(135deg, #2563eb, #7c3aed);padding:40px;text-align:center;color:#fff">
        <h1>Weekly Roster Published</h1><p>${weekRange}</p>
      </div>
      <div style="padding:30px">
        <h2>Hello ${staffName}! 👋</h2><p>Your roster for the upcoming week has been published.</p>
        <table style="width:100%;border-collapse:collapse;margin-top:20px">
          <thead><tr style="background:#f9fafb"><th>Date</th><th>Time</th><th>Client</th><th>Status</th></tr></thead>
          <tbody>${shiftsHtml}</tbody>
        </table>
        <p style="margin-top:20px">Total Hours: ${Math.round(totalHours * 10) / 10}</p>
      </div>
    </div>
  </body></html>`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  try {
    const { startDate, endDate, tenant_id } = await req.json();
    if (!startDate || !endDate || !tenant_id) return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: corsHeaders });
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: shifts, error: shiftsError } = await supabase.from("shifts").select(`*, staff:staff_id(id, name, email), client:client_id(first_name, last_name), shift_type:shift_type_id(name)`).eq('tenant_id', tenant_id).gte('shift_date', startDate).lte('shift_date', endDate).not('staff_id', 'is', null);
    if (shiftsError) throw shiftsError;
    if (!shifts || shifts.length === 0) return new Response(JSON.stringify({ success: true, emailsSent: 0 }), { status: 200, headers: corsHeaders });

    const shiftsByStaff = new Map();
    shifts.forEach(shift => {
      if (!shift.staff?.email) return;
      if (!shiftsByStaff.has(shift.staff.id)) shiftsByStaff.set(shift.staff.id, { name: shift.staff.name, email: shift.staff.email, shifts: [] });
      shiftsByStaff.get(shift.staff.id).shifts.push({ shift_date: shift.shift_date, start_time: shift.start_time, end_time: shift.end_time, break_minutes: shift.break_minutes || 0, status: shift.status, client_name: shift.client ? `${shift.client.first_name} ${shift.client.last_name}` : null, shift_type_name: shift.shift_type?.name || null });
    });

    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: Deno.env.get("EMAIL_USER"), pass: Deno.env.get("EMAIL_PASS") } });
    const weekRange = getWeekDateRange(shifts);
    let emailsSent = 0;
    for (const [id, staff] of shiftsByStaff) {
      await transporter.sendMail({ from: `"Blessing Community App" <${Deno.env.get("EMAIL_USER")}>`, to: staff.email, subject: `📅 Your Weekly Roster - ${weekRange}`, html: generateRosterEmail(staff.name, staff.shifts, weekRange) });
      emailsSent++;
    }

    await supabase.from("roster_publications").insert([{ start_date: startDate, end_date: endDate, published_at: new Date().toISOString(), emails_sent: emailsSent, total_staff: shiftsByStaff.size, tenant_id }]);
    return new Response(JSON.stringify({ success: true, emailsSent }), { status: 200, headers: corsHeaders });
  } catch (error) { return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders }); }
});
