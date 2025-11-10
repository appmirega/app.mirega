// supabase/functions/create-user/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Helper para respuestas JSON consistentes
function json(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

serve(async (req) => {
  try {
    // Solo permitimos POST
    if (req.method !== "POST") {
      return json(
        { success: false, error: "Method not allowed" },
        405,
      );
    }

    // 1) OBTENER CONFIGURACIÓN

    // URL del proyecto:
    // - Primero intentamos SUPABASE_URL (variable reservada del entorno)
    // - Si por alguna razón no está, usamos PROJECT_URL (que ya creaste como secret)
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL") ??
      Deno.env.get("PROJECT_URL") ??
      "";

    // Service Role Key:
    // - SUPABASE_SERVICE_ROLE_KEY si existiera
    // - o SERVICE_ROLE_KEY (secret que creaste con el service_role real)
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("SERVICE_ROLE_KEY") ??
      "";

    if (!supabaseUrl || !serviceRoleKey) {
      // Log sólo para depuración en Supabase (no se muestra al usuario)
      console.error("create-user: missing env vars", {
        hasSupabaseUrl: !!Deno.env.get("SUPABASE_URL"),
        hasProjectUrl: !!Deno.env.get("PROJECT_URL"),
        hasSupabaseServiceRoleKey: !!Deno.env.get(
          "SUPABASE_SERVICE_ROLE_KEY",
        ),
        hasServiceRoleKey: !!Deno.env.get("SERVICE_ROLE_KEY"),
      });

      return json(
        {
          success: false,
          error:
            "Server configuration error. Missing SUPABASE_URL/PROJECT_URL or SERVICE_ROLE_KEY.",
        },
        500,
      );
    }

    // Cliente admin con la service role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 2) LEER BODY
    const body = await req.json().catch(() => null);
    if (!body) {
      return json(
        { success: false, error: "Invalid JSON body" },
        400,
      );
    }

    const { email, password, full_name, phone, role } = body;

    if (!email || !password) {
      return json(
        {
          success: false,
          error: "email y password son obligatorios",
        },
        400,
      );
    }

    // 3) CREAR USUARIO
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name ?? "",
        phone: phone ?? "",
        role: role ?? "client",
      },
    });

    if (error || !data?.user) {
      console.error("create-user: error creando usuario", error);
      return json(
        {
          success: false,
          error:
            error?.message ??
            "No se pudo crear el usuario",
        },
        500,
      );
    }

    // 4) OK
    return json(
      { success: true, user: data.user },
      200,
    );
  } catch (err) {
    console.error("create-user: unexpected error", err);
    return json(
      {
        success: false,
        error: "Unexpected server error",
      },
      500,
    );
  }
});
