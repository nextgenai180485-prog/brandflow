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

    const { campaignId, industry, brandVoice, targetAudience, businessName, websiteUrl, uploadedAssetUrls } = await req.json();

    if (!campaignId) {
      return new Response(JSON.stringify({ error: "campaignId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const EXA_API_KEY = Deno.env.get("EXA_API_KEY");
    if (!EXA_API_KEY) {
      return new Response(JSON.stringify({ error: "EXA_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const brandName = businessName || "the brand";
    const brandIndustry = industry || "beauty";
    const domain = websiteUrl ? websiteUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "") : null;

    // ── Research Phase 1: Brand Website Analysis ──────────────
    let brandWebsiteInsights: any = null;
    if (domain) {
      console.log(`[Research] Analyzing brand website: ${domain}`);
      try {
        const brandSearchResp = await fetch("https://api.exa.ai/search", {
          method: "POST",
          headers: { "x-api-key": EXA_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `site:${domain}`,
            type: "auto",
            numResults: 5,
            contents: { text: { maxCharacters: 800 }, highlights: { numSentences: 3 } },
          }),
        });
        if (brandSearchResp.ok) {
          const brandData = await brandSearchResp.json();
          brandWebsiteInsights = (brandData.results || []).map((r: any) => ({
            title: r.title, url: r.url,
            snippet: r.text?.substring(0, 500) || "",
            highlights: r.highlights || [],
          }));
          console.log(`[Research] Found ${brandWebsiteInsights.length} pages from ${domain}`);
        } else {
          const err = await brandSearchResp.text();
          console.error("[Research] Brand website search failed:", err);
        }
      } catch (e) {
        console.error("[Research] Brand website analysis error:", e);
      }
    }

    // ── Research Phase 2: Competitor Analysis ─────────────────
    console.log(`[Research] Finding competitors for ${brandName} in ${brandIndustry}`);
    const competitorQuery = `top ${brandIndustry} brands competitors ${targetAudience || "consumers"} social media marketing 2026`;
    let competitorResults: any[] = [];
    try {
      const compResp = await fetch("https://api.exa.ai/search", {
        method: "POST",
        headers: { "x-api-key": EXA_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          query: competitorQuery,
          type: "auto",
          numResults: 8,
          contents: { text: { maxCharacters: 500 }, highlights: { numSentences: 2 } },
        }),
      });
      if (compResp.ok) {
        const compData = await compResp.json();
        competitorResults = (compData.results || []).map((r: any) => ({
          title: r.title, url: r.url,
          snippet: r.text?.substring(0, 400) || "",
          highlights: r.highlights || [],
          publishedDate: r.publishedDate,
        }));
      } else {
        await compResp.text();
      }
    } catch (e) {
      console.error("[Research] Competitor analysis error:", e);
    }

    // ── Research Phase 3: Content Trends ──────────────────────
    console.log(`[Research] Analyzing content trends`);
    const trendQuery = `${brandIndustry} social media content trends hooks CTAs ${targetAudience || ""} 2026`;
    let trendResults: any[] = [];
    try {
      const trendResp = await fetch("https://api.exa.ai/search", {
        method: "POST",
        headers: { "x-api-key": EXA_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          query: trendQuery,
          type: "auto",
          numResults: 6,
          contents: { text: { maxCharacters: 500 }, highlights: { numSentences: 2 } },
        }),
      });
      if (trendResp.ok) {
        const trendData = await trendResp.json();
        trendResults = (trendData.results || []).map((r: any) => ({
          title: r.title, url: r.url,
          snippet: r.text?.substring(0, 400) || "",
          highlights: r.highlights || [],
          publishedDate: r.publishedDate,
        }));
      } else {
        await trendResp.text();
      }
    } catch (e) {
      console.error("[Research] Trend analysis error:", e);
    }

    // ── AI Synthesis: Build Rich Intelligence Brief ───────────
    let intelligenceBrief: any = {
      summary: `Found ${competitorResults.length} competitor signals and ${trendResults.length} trend signals for ${brandIndustry}.`,
      competitors: [], trending_topics: [], content_angles: [],
      visual_direction: "", hooks: [], avoid: [],
      brand_gap_analysis: "", research_quality: 3,
      sources: [...competitorResults, ...trendResults].map((r) => ({ title: r.title, url: r.url })),
    };

    if (LOVABLE_API_KEY) {
      try {
        console.log("[Research] Synthesizing intelligence brief via AI");
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `You are a senior market research analyst and creative strategist for a ${brandIndustry} brand called "${brandName}"${domain ? ` (website: ${domain})` : ""}. Analyze all research data and produce a comprehensive, actionable intelligence brief that will guide AI content generation. Be specific with brand names, numbers, and actionable insights. Output valid JSON only.`,
              },
              {
                role: "user",
                content: `Based on the following research, create a comprehensive intelligence brief for social media content targeting "${targetAudience || "general audience"}" with brand voice: "${brandVoice || "professional"}".

${brandWebsiteInsights ? `BRAND WEBSITE ANALYSIS (${domain}):\n${JSON.stringify(brandWebsiteInsights, null, 2)}\n\n` : ""}
COMPETITOR & MARKET DATA:
${JSON.stringify(competitorResults, null, 2)}

CONTENT TRENDS:
${JSON.stringify(trendResults, null, 2)}

${uploadedAssetUrls?.length ? `UPLOADED ASSETS (${uploadedAssetUrls.length} files provided by user as style reference)\n\n` : ""}

Output JSON with these fields:
- "summary": 3-4 sentence market overview with specific data points
- "competitors": array of objects { name, strength, weakness, instagram_style } — top 5 competitors
- "trending_topics": array of 5 specific trending topics with context
- "content_angles": array of 5 recommended creative angles referencing the research
- "visual_direction": detailed visual style recommendation (colors, composition, mood, typography guidance)
- "hooks": array of 5 platform-specific attention-grabbing hooks
- "avoid": array of 5 specific things to avoid based on market saturation
- "brand_gap_analysis": 2-3 sentences on what's missing from "${brandName}" vs competitors
- "recommended_formats": array of { platform, format, reason } — top 3 format recommendations
- "research_quality": number 1-5 rating of research confidence based on source relevance`,
              },
            ],
            tools: [{
              type: "function",
              function: {
                name: "create_intelligence_brief",
                description: "Create a structured intelligence brief from research",
                parameters: {
                  type: "object",
                  properties: {
                    summary: { type: "string" },
                    competitors: { type: "array", items: { type: "object", properties: { name: { type: "string" }, strength: { type: "string" }, weakness: { type: "string" }, instagram_style: { type: "string" } } } },
                    trending_topics: { type: "array", items: { type: "string" } },
                    content_angles: { type: "array", items: { type: "string" } },
                    visual_direction: { type: "string" },
                    hooks: { type: "array", items: { type: "string" } },
                    avoid: { type: "array", items: { type: "string" } },
                    brand_gap_analysis: { type: "string" },
                    recommended_formats: { type: "array", items: { type: "object", properties: { platform: { type: "string" }, format: { type: "string" }, reason: { type: "string" } } } },
                    research_quality: { type: "number" },
                  },
                  required: ["summary", "competitors", "trending_topics", "content_angles", "visual_direction", "hooks", "avoid", "brand_gap_analysis", "research_quality"],
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "create_intelligence_brief" } },
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            const parsed = JSON.parse(toolCall.function.arguments);
            intelligenceBrief = {
              ...intelligenceBrief,
              ...parsed,
              sources: [...competitorResults, ...trendResults].map((r) => ({ title: r.title, url: r.url })),
            };
            console.log(`[Research] Intelligence brief synthesized, quality: ${parsed.research_quality}/5`);
          }
        } else {
          const errText = await aiResponse.text();
          console.error("[Research] AI synthesis error:", errText);
        }
      } catch (e) {
        console.error("[Research] AI synthesis error:", e);
      }
    }

    // Save research to database
    const { data: research, error: insertError } = await supabase
      .from("campaign_research")
      .insert({
        campaign_id: campaignId,
        profile_id: userId,
        research_type: "market_trends",
        query: `${competitorQuery} | ${trendQuery}${domain ? ` | site:${domain}` : ""}`,
        results: { brandWebsite: brandWebsiteInsights, competitors: competitorResults, trends: trendResults },
        intelligence_brief: intelligenceBrief,
        provider: "exa",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save research" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
