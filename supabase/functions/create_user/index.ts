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
    const { email, name, tenant_id } = await req.json();

    if (!email || !tenant_id) {
      return new Response(
        JSON.stringify({ error: "Email and Tenant ID are required" }),
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
      .eq("tenant_id", tenant_id)
      .single();

    if (staffCheckError && staffCheckError.code !== "PGRST116") {
      throw staffCheckError;
    }

    if (!staffData) {
      return new Response(
        JSON.stringify({ error: "Staff member not found in this tenant" }),
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
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: "staff",
          name: name || "",
          tenant_id: tenant_id
        },
      });

      if (createError) throw createError;
      if (!newUser.user) throw new Error("Failed to create user");
      
      userId = newUser.user.id;
    }

    /* ---------------- UPDATE STAFF TABLE ---------------- */

    const { error: updateStaffError } = await supabase
      .from("staff")
      .update({ user_id: userId })
      .eq("id", staffData.id)
      .eq("tenant_id", tenant_id);

    if (updateStaffError) {
      throw updateStaffError;
    }

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

    await transporter.sendMail({
      from: `"Blessing Community App" <${Deno.env.get("EMAIL_USER")}>`,
      to: email,
      subject: "📩 Staff Portal Invitation",
      html: `
       <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:30px;">
          <div style="max-width:600px; margin:auto; background:#fff; padding:25px; border-radius:10px;">
            <h2 style="text-align:center;">🎉 Welcome to Blessing Community App</h2>
            <p>Hello <strong>${name ?? "Team Member"}</strong>,</p>
            <p>We are pleased to inform you that you have been <strong>added as a staff member</strong>.</p>
            <p><strong>Your login credentials:</strong></p>
            <p>
              Email: ${email}<br />
              Password: <strong>${password}</strong>
            </p>
            <p style="text-align:center; color:#888;">
              If you have any questions, please contact the system administrator.<br /><br />
              <strong>Blessing Community App Team</strong>
            </p>
          </div>
        </div>
      `,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Staff invited successfully",
        userId,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
