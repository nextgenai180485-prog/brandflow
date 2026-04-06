import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: claimsError } = await anonClient.auth.getUser();
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.user.id;

    const { campaignId, industry, brandVoice, targetAudience, businessName } = await req.json();

    if (!campaignId) {
      return new Response(JSON.stringify({ error: "campaignId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const EXA_API_KEY = Deno.env.get("EXA_API_KEY");
    if (!EXA_API_KEY) {
      return new Response(JSON.stringify({ error: "EXA_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build research query from brand context
    const searchQuery = `${industry || "beauty"} ${targetAudience || "consumers"} marketing trends social media content strategy 2026`;

    console.log("Researching:", searchQuery);

    // Call Exa API for market intelligence
    const exaResponse = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "x-api-key": EXA_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        type: "auto",
        numResults: 8,
        contents: {
          text: { maxCharacters: 500 },
          highlights: { numSentences: 2 },
        },
      }),
    });

    if (!exaResponse.ok) {
      const errText = await exaResponse.text();
      console.error("Exa API error:", exaResponse.status, errText);
      return new Response(JSON.stringify({ error: "Research API failed", details: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const exaData = await exaResponse.json();

    // Build intelligence brief from Exa results
    const trends = (exaData.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.text?.substring(0, 300) || "",
      highlights: r.highlights || [],
      publishedDate: r.publishedDate,
    }));

    // Use Lovable AI to synthesize research into actionable brief
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let intelligenceBrief: any = {
      trends,
      summary: `Found ${trends.length} relevant market signals for ${industry || "beauty"} industry`,
      recommendations: [],
    };

    if (LOVABLE_API_KEY) {
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `You are a market research analyst for a ${industry || "beauty"} business called "${businessName || "the brand"}". Analyze search results and produce a concise intelligence brief that will guide AI content generation. Output valid JSON only.`,
              },
              {
                role: "user",
                content: `Based on these market research results, create an intelligence brief for social media content creation targeting "${targetAudience || "general audience"}" with brand voice: "${brandVoice || "professional"}".

Research results:
${JSON.stringify(trends, null, 2)}

Output JSON with:
- "summary": 2-sentence market overview
- "trending_topics": array of 3-5 trending topics
- "content_angles": array of 3-5 recommended content angles
- "visual_direction": brief visual style recommendation
- "hooks": array of 3 attention-grabbing hooks
- "avoid": array of things to avoid based on market saturation`,
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "create_intelligence_brief",
                  description: "Create a structured intelligence brief from research",
                  parameters: {
                    type: "object",
                    properties: {
                      summary: { type: "string" },
                      trending_topics: { type: "array", items: { type: "string" } },
                      content_angles: { type: "array", items: { type: "string" } },
                      visual_direction: { type: "string" },
                      hooks: { type: "array", items: { type: "string" } },
                      avoid: { type: "array", items: { type: "string" } },
                    },
                    required: ["summary", "trending_topics", "content_angles", "visual_direction", "hooks", "avoid"],
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "create_intelligence_brief" } },
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            const parsed = JSON.parse(toolCall.function.arguments);
            intelligenceBrief = { ...intelligenceBrief, ...parsed };
          }
        }
      } catch (e) {
        console.error("AI synthesis error:", e);
        // Continue with raw research data
      }
    }

    // Save research to database
    const { data: research, error: insertError } = await supabase
      .from("campaign_research")
      .insert({
        campaign_id: campaignId,
        profile_id: userId,
        research_type: "market_trends",
        query: searchQuery,
        results: exaData,
        intelligence_brief: intelligenceBrief,
        provider: "exa",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save research" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ research, intelligenceBrief }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Research error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
