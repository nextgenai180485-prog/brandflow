import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: authError } = await anonClient.auth.getUser();
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { assetId, memoryType, patterns } = await req.json();

    if (!assetId || !memoryType || !Array.isArray(patterns) || patterns.length === 0) {
      return new Response(JSON.stringify({ error: "assetId, memoryType, and patterns[] required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["approval", "rejection"].includes(memoryType)) {
      return new Response(JSON.stringify({ error: "memoryType must be 'approval' or 'rejection'" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ category: string; value: string; frequency: number; flagged_do_not_use: boolean }> = [];

    for (const pattern of patterns) {
      const { category, value, context: ctx } = pattern;
      if (!category || !value) continue;

      // Upsert: increment frequency if pattern already exists
      const { data: existing } = await supabase
        .from("brand_memory")
        .select("id, frequency")
        .eq("profile_id", userId)
        .eq("memory_type", memoryType)
        .eq("pattern_category", category)
        .eq("pattern_value", value)
        .maybeSingle();

      let newFrequency = 1;
      if (existing) {
        newFrequency = existing.frequency + 1;
        await supabase
          .from("brand_memory")
          .update({
            frequency: newFrequency,
            last_seen_at: new Date().toISOString(),
            context: ctx || {},
          })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("brand_memory")
          .insert({
            profile_id: userId,
            memory_type: memoryType,
            pattern_category: category,
            pattern_value: value,
            context: ctx || {},
          });
      }

      // Auto-flag do_not_use after 5+ rejections
      const flaggedDoNotUse = memoryType === "rejection" && newFrequency >= 5;

      results.push({
        category,
        value,
        frequency: newFrequency,
        flagged_do_not_use: flaggedDoNotUse,
      });

      if (flaggedDoNotUse) {
        console.log(`[Brand Memory] ⚠️ Pattern flagged as DO NOT USE: ${category}="${value}" (${newFrequency} rejections)`);
      }
    }

    console.log(`[Brand Memory] Recorded ${results.length} ${memoryType} patterns for asset ${assetId}`);

    return new Response(JSON.stringify({ success: true, recorded: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[Learn from Feedback] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
