// supabase/functions/create-user/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    // Solo permitir POST
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // 🔐 LEER VARIABLES DESDE SECRETS DE EDGE FUNCTIONS
    // Deben existir en: Supabase -> Edge Functions -> Secrets
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(
        "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en Edge Function Secrets",
      );
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Server configuration error: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Cliente ADMIN (usa service_role, SOLO en backend)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Leer body seguro
    const text = await req.text();
    let body: any = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error("JSON inválido recibido en create-user:", text);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid JSON body",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { email, password, full_name, phone, role } = body;

    if (!email || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "email y password son obligatorios",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Crear usuario en Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || "",
        phone: phone || "",
        role: role || "client",
      },
    });

    if (error || !data?.user) {
      console.error("Error creando usuario:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error?.message || "No se pudo crear el usuario",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // OK ✅
    return new Response(
      JSON.stringify({
        success: true,
        user: data.user,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Excepción en create-user:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Unexpected server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});

