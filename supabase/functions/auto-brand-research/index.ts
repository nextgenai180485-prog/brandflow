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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
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
    const userId = claimsData.user.id;

    const { websiteUrl, businessName, industry, targetAudience, brandVoice } = await req.json();

    if (!websiteUrl) {
      return new Response(JSON.stringify({ error: "websiteUrl is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const EXA_API_KEY = Deno.env.get("EXA_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const domain = websiteUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const brandName = businessName || "the brand";
    const brandIndustry = industry || "beauty";

    console.log(`[AutoResearch] Starting brand research for ${domain}`);

    // ── Phase 1: Direct Website Fetch ──────────────────────────
    let directWebsiteContent: string | null = null;
    try {
      const siteResp = await fetch(`https://${domain}`, {
        headers: { "User-Agent": "BrandflowBot/1.0 (brand analysis)" },
        signal: AbortSignal.timeout(10000),
      });
      if (siteResp.ok) {
        const html = await siteResp.text();
        directWebsiteContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 4000);
        console.log(`[AutoResearch] Fetched ${directWebsiteContent.length} chars from ${domain}`);
      }
    } catch (e) {
      console.error("[AutoResearch] Direct website fetch failed:", e);
    }

    // ── Phase 2: Exa Competitor Search ─────────────────────────
    let competitorResults: any[] = [];
    if (EXA_API_KEY) {
      try {
        const compResp = await fetch("https://api.exa.ai/search", {
          method: "POST",
          headers: { "x-api-key": EXA_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `top ${brandIndustry} brands competitors ${targetAudience || "consumers"} social media 2026`,
            type: "auto",
            numResults: 6,
            contents: { text: { maxCharacters: 400 }, highlights: { numSentences: 2 } },
          }),
        });
        if (compResp.ok) {
          const compData = await compResp.json();
          competitorResults = (compData.results || []).map((r: any) => ({
            title: r.title, url: r.url,
            snippet: r.text?.substring(0, 400) || "",
          }));
        } else { await compResp.text(); }
      } catch (e) {
        console.error("[AutoResearch] Competitor search error:", e);
      }
    }

    // ── Phase 3: AI Synthesis → Brand Profile ──────────────────
    let brandProfile: any = {
      summary: `Analyzed ${domain}. Found ${competitorResults.length} competitor signals.`,
      brand_voice_detected: brandVoice || "professional",
      visual_style: "modern, clean",
      target_audience_detected: targetAudience || "general consumers",
      competitors: competitorResults.slice(0, 5).map((r: any) => ({ name: r.title, url: r.url })),
      key_themes: [],
      color_palette_suggestion: null,
    };

    if (LOVABLE_API_KEY && directWebsiteContent) {
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `You are a brand strategist. Analyze the website content and produce a brand profile. Output valid JSON only.`,
              },
              {
                role: "user",
                content: `Analyze this website content from ${domain} and extract the brand identity:

WEBSITE CONTENT:
${directWebsiteContent.substring(0, 3000)}

COMPETITOR DATA:
${JSON.stringify(competitorResults.slice(0, 4), null, 2)}

Output JSON with:
- "summary": 2-3 sentence brand overview
- "brand_voice_detected": tone/voice style (e.g. "Bold & Luxurious", "Professional & Warm")
- "visual_style": detected visual aesthetic
- "target_audience_detected": who the brand targets
- "competitors": array of {name, strength} — top 3
- "key_themes": array of 3-5 key brand themes/messages
- "color_palette_suggestion": {primary, secondary, accent} hex codes if detectable, null if not
- "content_pillars": array of 3-4 recommended content pillars for social media`,
              },
            ],
            tools: [{
              type: "function",
              function: {
                name: "create_brand_profile",
                description: "Create a structured brand profile from website analysis",
                parameters: {
                  type: "object",
                  properties: {
                    summary: { type: "string" },
                    brand_voice_detected: { type: "string" },
                    visual_style: { type: "string" },
                    target_audience_detected: { type: "string" },
                    competitors: { type: "array", items: { type: "object", properties: { name: { type: "string" }, strength: { type: "string" } } } },
                    key_themes: { type: "array", items: { type: "string" } },
                    color_palette_suggestion: { type: "object", properties: { primary: { type: "string" }, secondary: { type: "string" }, accent: { type: "string" } } },
                    content_pillars: { type: "array", items: { type: "string" } },
                  },
                  required: ["summary", "brand_voice_detected", "visual_style", "target_audience_detected", "key_themes"],
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "create_brand_profile" } },
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            brandProfile = { ...brandProfile, ...JSON.parse(toolCall.function.arguments) };
            console.log(`[AutoResearch] Brand profile synthesized successfully`);
          }
        } else {
          const errText = await aiResponse.text();
          console.error("[AutoResearch] AI synthesis error:", errText);
        }
      } catch (e) {
        console.error("[AutoResearch] AI synthesis error:", e);
      }
    }

    // ── Save brand research to profile ─────────────────────────
    await supabase.from("profiles").update({
      brand_voice_tone: brandProfile.brand_voice_detected,
      target_audience: brandProfile.target_audience_detected,
    }).eq("id", userId);

    // Store the full brand profile in brand_memory for retrieval
    await supabase.from("brand_memory").upsert({
      profile_id: userId,
      memory_type: "brand_profile",
      pattern_category: "auto_research",
      pattern_value: domain,
      context: brandProfile,
      frequency: 1,
    }, { onConflict: "profile_id,pattern_category,pattern_value" }).select();

    console.log(`[AutoResearch] Brand research complete for ${domain}`);

    return new Response(JSON.stringify({ brandProfile }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("AutoResearch error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
