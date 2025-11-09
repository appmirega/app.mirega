import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/Bolt Database-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("Environment check:", {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseServiceRoleKey,
      url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : "missing"
    });

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Server configuration error",
          details: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
          debug: {
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseServiceRoleKey
          }
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired token", details: userError?.message }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: callerProfile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !callerProfile) {
      console.error("Profile error:", profileError);
      return new Response(
        JSON.stringify({ success: false, error: "Caller profile not found", details: profileError?.message }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!["developer", "admin"].includes(callerProfile.role)) {
      return new Response(
        JSON.stringify({ success: false, error: "Insufficient permissions", details: `Role ${callerProfile.role} cannot create users` }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { email, password, full_name, phone, role } = await req.json();

    if (!email || !password || !full_name || !role) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields", details: "email, password, full_name, and role are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (callerProfile.role === "admin" && role === "developer") {
      return new Response(
        JSON.stringify({ success: false, error: "Admins cannot create developers" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Creating user:", { email, role });

    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });

    if (authError || !authData?.user) {
      console.error("Create user error:", authError);
      return new Response(
        JSON.stringify({ success: false, error: authError?.message || "Failed to create user", details: authError }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const newUserId = authData.user.id;
    console.log("User created:", newUserId);

    const { error: profileInsertError } = await supabaseClient
      .from("profiles")
      .insert({
        id: newUserId,
        email,
        role,
        full_name,
        phone: phone || null,
        is_active: true,
      });

    if (profileInsertError) {
      console.error("Profile insert error:", profileInsertError);
      return new Response(
        JSON.stringify({ success: false, error: profileInsertError.message, details: profileInsertError }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Profile created for:", newUserId);

    try {
      await supabaseClient.from("audit_logs").insert({
        action: "create_user",
        actor_id: user.id,
        target_id: newUserId,
        details: JSON.stringify({ email, role, created_by: user.email }),
      });
    } catch (auditError) {
      console.warn("Audit log failed:", auditError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUserId,
          email,
          full_name,
          role,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
        details: error.toString(),
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
