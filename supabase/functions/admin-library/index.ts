import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_TABLES = ["video_templates", "character_library", "ad_reference_library", "image_templates", "hooks"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) throw new Error("Unauthorized");

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Use service role for admin operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { action, table, id, data, is_active } = await req.json();

    if (!ALLOWED_TABLES.includes(table)) {
      throw new Error(`Invalid table: ${table}`);
    }

    // Read-only actions (list) are allowed for any authenticated user
    // Write actions require admin role
    const WRITE_ACTIONS = ["create", "update", "toggle", "delete"];
    if (WRITE_ACTIONS.includes(action)) {
      const { data: roleData, error: roleError } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError || !roleData) {
        throw new Error("Forbidden: admin role required");
      }
    }

    let result;

    switch (action) {
      case "list": {
        const { data: items, error } = await adminClient
          .from(table)
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        result = { items };
        break;
      }

      case "create": {
        const { data: created, error } = await adminClient
          .from(table)
          .insert(data)
          .select()
          .single();
        if (error) throw error;
        result = { item: created };
        break;
      }

      case "update": {
        if (!id) throw new Error("ID required for update");
        const { data: updated, error } = await adminClient
          .from(table)
          .update(data)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        result = { item: updated };
        break;
      }

      case "toggle": {
        if (!id) throw new Error("ID required for toggle");
        const { error } = await adminClient
          .from(table)
          .update({ is_active })
          .eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "delete": {
        if (!id) throw new Error("ID required for delete");
        const { error } = await adminClient
          .from(table)
          .delete()
          .eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("admin-library error:", e);
    const status = e.message === "Unauthorized" ? 401 : e.message?.startsWith("Forbidden") ? 403 : 400;
    return new Response(JSON.stringify({ error: e.message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
