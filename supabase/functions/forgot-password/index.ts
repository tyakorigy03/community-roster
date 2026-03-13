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
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate 6-digit temporary password (PIN)
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();

    /* ---------------- SUPABASE CLIENT ---------------- */

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    /* ---------------- FIND USER BY EMAIL ---------------- */

    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) throw listError;

    const existingUser = usersData.users.find(u => u.email === email);

    if (!existingUser) {
      // For security reasons, don't reveal if the user exists or not
      return new Response(
        JSON.stringify({ success: true, message: "If the email is registered, a new PIN has been sent." }),
        { status: 200, headers: corsHeaders }
      );
    }

    /* ---------------- UPDATE PASSWORD ---------------- */

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      { password: newPin }
    );
    
    if (updateError) throw updateError;

    /* ---------------- EMAIL SETUP (Using Env Vars) ---------------- */

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

    const userName = existingUser.user_metadata?.name || "Team Member";

    await transporter.sendMail({
      from: `"Blessing Community App" <${Deno.env.get("EMAIL_USER")}>`,
      to: email,
      subject: "🔒 Password Reset Request",
      html: `
       <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:30px;">
          <div style="max-width:600px; margin:auto; background:#fff; padding:25px; border-radius:10px;">
            <h2 style="text-align:center;">Password Reset</h2>
            <p>Hello <strong>${userName}</strong>,</p>
            <p>We received a request to reset your password for the Blessing Community App.</p>
            <p><strong>Your new temporary PIN is:</strong></p>
            <div style="background:#f1f5f9; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <h1 style="margin: 0; color: #2563eb; letter-spacing: 5px;">${newPin}</h1>
            </div>
            <p>Please use this PIN to log in. You can change it once you access the Staff Portal.</p>
            <p style="color:#64748b; font-size: 12px; margin-top: 30px;">
              If you did not request this reset, please contact your administrator immediately.
            </p>
            <p style="text-align:center; color:#888; font-size: 13px; margin-top: 30px;">
              <strong>Blessing Community App Team</strong>
            </p>
          </div>
        </div>
      `,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "If the email is registered, a new PIN has been sent.",
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
