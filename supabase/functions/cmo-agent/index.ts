import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CMO_REACTIVE_PROMPT = `### ROLE: The "Shadow CMO" — Reactive Co-Pilot
You are an elite Marketing Strategist analyzing the user's campaign setup in real-time.
You have access to their brand DNA (crawled data) and must provide sharp, data-backed strategic guidance.

**RULES:**
- Be specific to their brand data. Never generic.
- Reference specific findings from their website crawl.
- Explain the *psychological trigger* behind every recommendation.
- Use the "Swiss-Grid" Safe Mode design protocol (60-30-10 Color Rule, Typography Lockdown, Hero Composition).
- Maximum 3 sentences per field. Be punchy and actionable.`;

serve(async (req) => {
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
    const { data: claimsData, error: claimsError } = await anonClient.auth.getUser();
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { brandProfile, selectedPlatforms, selectedContentTypes, campaignTitle, campaignGoal } = await req.json();

    const platformList = selectedPlatforms?.map((p: any) => `${p.platform} (${p.format})`).join(", ") || "none selected";
    const contentList = selectedContentTypes?.join(", ") || "none selected";

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: CMO_REACTIVE_PROMPT },
          {
            role: "user",
            content: `The user is building a campaign. Provide reactive strategic guidance.

**BRAND DNA:**
${JSON.stringify(brandProfile, null, 2)}

**CURRENT SELECTIONS:**
- Campaign: "${campaignTitle || "Untitled"}"
- Goal: ${campaignGoal || "conversion"}
- Platforms: ${platformList}
- Content Types: ${contentList}

Analyze their selections against their brand DNA and provide strategic guidance.`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "provide_strategy",
            description: "Provide reactive strategic CMO guidance based on current campaign selections",
            parameters: {
              type: "object",
              properties: {
                detected_strategy: { type: "string", description: "The detected strategy name, e.g. 'The Authority Wedge'" },
                reasoning: { type: "string", description: "2-3 sentence strategic reasoning. Reference specific brand data." },
                visual_lock: { type: "string", description: "The visual protocol to use, e.g. 'Swiss-Grid (High Contrast)'" },
                intent: { type: "string", description: "The detected intent: 'Conversion' or 'Awareness'" },
                platform_adjustment: { type: "string", description: "Any platform-specific adjustment recommendation" },
                content_blueprint: { type: "string", description: "The content generation blueprint based on selections" },
              },
              required: ["detected_strategy", "reasoning", "visual_lock", "intent"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "provide_strategy" } },
      }),
    });

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      console.error("[CMO-Agent] AI error:", err);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "CMO analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const strategy = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ strategy }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "No strategy generated" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("CMO Agent error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
