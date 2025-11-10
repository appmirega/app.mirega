// supabase/functions/create-user/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    // Solo permitir POST
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } },
      );
    }

    // 1️⃣ LEER CONFIG DESDE VARIABLES
    // Intentamos primero las oficiales de Supabase
    // y si no existen usamos las PERSONALIZADAS que creaste.
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL") || Deno.env.get("PROJECT_URL");
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Entorno inválido en create-user:", {
        has_SUPABASE_URL: !!Deno.env.get("SUPABASE_URL"),
        has_PROJECT_URL: !!Deno.env.get("PROJECT_URL"),
        has_SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get(
          "SUPABASE_SERVICE_ROLE_KEY",
        ),
        has_SERVICE_ROLE_KEY: !!Deno.env.get("SERVICE_ROLE_KEY"),
      });

      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Server configuration error: missing service role or project URL",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // 2️⃣ Cliente ADMIN con service_role (solo backend)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3️⃣ Parsear body de forma segura
    const rawBody = await req.text();
    let body: any = {};
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch (_err) {
      console.error("JSON inválido recibido en create-user:", rawBody);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const { email, password, full_name, phone, role } = body;

    if (!email || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "email y password son obligatorios",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // 4️⃣ Crear usuario en Auth
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
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // 5️⃣ OK
    return new Response(
      JSON.stringify({ success: true, user: data.user }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Excepción en create-user:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Unexpected server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
