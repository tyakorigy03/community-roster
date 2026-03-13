import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ---------------- CORS ---------------- */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/* ---------------- CONFIG ---------------- */

const DEMO_TENANT_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const DEMO_PASSWORD = "DemoAccess2026";

/**
 * Accounts to provision on the demo tenant.
 * These emails are fake @example.com addresses that exist in the staff table.
 */
const DEMO_ACCOUNTS = [
  { email: "demo.admin@example.com",     name: "Demo Admin",     role: "admin" },
  { email: "sarah.mitchell@example.com", name: "Sarah Mitchell", role: "staff" },
  { email: "james.walker@example.com",   name: "James Walker",   role: "staff" },
];

/* ---------------- SERVER ---------------- */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    /* Guard: Only allow POST with a simple secret header to prevent abuse */
    const authHeader = req.headers.get("x-seed-secret");
    if (authHeader !== "seed-demo-2026") {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results: Array<{ email: string; status: string; userId?: string; error?: string }> = [];

    for (const account of DEMO_ACCOUNTS) {
      try {
        /* 1. Check if auth user already exists */
        const { data: usersData } = await supabase.auth.admin.listUsers();
        const existingUser = usersData?.users?.find(u => u.email === account.email);

        let userId: string;

        if (existingUser) {
          /* Reset password for existing user */
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            existingUser.id,
            { password: DEMO_PASSWORD }
          );
          if (updateError) throw updateError;
          userId = existingUser.id;
        } else {
          /* Create new auth user — no email confirmation needed, no email sent */
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: account.email,
            password: DEMO_PASSWORD,
            email_confirm: true,  // Mark as confirmed without sending an email
            user_metadata: {
              name: account.name,
              role: account.role,
              tenant_id: DEMO_TENANT_ID,
            },
          });

          if (createError) throw createError;
          if (!newUser.user) throw new Error("Failed to create user");
          userId = newUser.user.id;
        }

        /* 2. Link auth user_id to the matching staff record */
        const { error: linkError } = await supabase
          .from("staff")
          .update({ user_id: userId })
          .eq("email", account.email)
          .eq("tenant_id", DEMO_TENANT_ID);

        if (linkError) {
          console.error(`Failed to link staff for ${account.email}:`, linkError);
        }

        results.push({ email: account.email, status: existingUser ? "updated" : "created", userId });

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({ email: account.email, status: "error", error: message });
      }
    }

    const allOk = results.every(r => r.status !== "error");

    return new Response(
      JSON.stringify({
        success: allOk,
        message: allOk
          ? "All demo auth accounts are ready."
          : "Some accounts had errors. Check the results.",
        credentials: {
          password: DEMO_PASSWORD,
          note: "All accounts use the same password. Share these with App Store reviewers.",
          accounts: DEMO_ACCOUNTS.map(a => ({ email: a.email, role: a.role })),
        },
        results,
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("seed-demo-auth error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
