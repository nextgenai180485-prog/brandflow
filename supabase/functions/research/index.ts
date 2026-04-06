import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function sseEvent(event: string, data: any): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

const CMO_SYSTEM_PROMPT = `### ROLE: The "Shadow CMO"
You are an elite Marketing Strategist (ex-McKinsey/Ogilvy) analyzing a new client's brand based *strictly* on their crawled website data and competitive landscape.

**YOUR GOAL:**
Do not just "summarize" the brand. You must identify the **"Unclaimed Territory"** (Blue Ocean) in their market. You must shock them with insight.

**THE PROTOCOL (Strict Output Rules):**

1. **The "Anti-Generic" Filter:**
   - NEVER say "improve SEO" or "post consistently."
   - NEVER use corporate fluff like "synergy" or "customer-centric."
   - If you suggest a platform, explain the *psychological trigger*.

2. **The "Competitor Gap" Analysis:**
   - Identify what competitors are *likely* doing (based on sector standard).
   - Identify the *opposite* approach for this user (The Counter-Positioning).

3. **The "Attack Vectors" (3 Specific Strategies):**
   - **Vector A (Low Hanging Fruit):** The immediate quick win.
   - **Vector B (The Wedge):** A specific, narrow angle to crack the market.
   - **Vector C (The Moonshot):** A high-risk, high-reward brand play.

4. **The Opening Diagnosis:**
   - Write a compelling 2-3 sentence "diagnosis" that reads like a consultant delivering findings to a CEO. Reference specific data from the crawl.`;

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

    const { campaignId, industry, brandVoice, targetAudience, businessName, websiteUrl, uploadedAssetUrls, stream } = await req.json();

    if (!campaignId) {
      return new Response(JSON.stringify({ error: "campaignId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const brandName = businessName || "the brand";
    const brandIndustry = industry || "beauty";
    const domain = websiteUrl ? websiteUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "") : null;
    const fullUrl = websiteUrl ? (websiteUrl.startsWith("http") ? websiteUrl : `https://${domain}`) : null;

    async function runResearch(send: (event: string, data: any) => void) {
      // ── Phase 1: Firecrawl Brand Crawl ──
      send("phase", { phase: "connecting", message: `Connecting to ${domain || brandName}...` });

      let brandingData: any = null;
      let markdownContent: string | null = null;
      let scrapeLinks: string[] = [];

      if (domain && FIRECRAWL_API_KEY) {
        send("phase", { phase: "crawling", message: `Deep crawling ${domain} via Firecrawl (branding + content)...` });
        try {
          const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: fullUrl,
              formats: ["branding", "markdown", "links"],
              onlyMainContent: false,
              waitFor: 3000,
            }),
          });

          if (scrapeResp.ok) {
            const scrapeData = await scrapeResp.json();
            const d = scrapeData.data || scrapeData;
            brandingData = d.branding || null;
            markdownContent = d.markdown || null;
            scrapeLinks = d.links || [];

            if (brandingData) {
              send("phase", { phase: "extracting", message: `Firecrawl branding extracted: ${brandingData.colorScheme || "unknown"} theme` });
              send("colors", {
                colors: brandingData.colors ? Object.entries(brandingData.colors).map(([k, v]) => ({ hex: v, source: `Firecrawl ${k}` })) : [],
                fonts: brandingData.fonts || [],
                logo: brandingData.logo || brandingData.images?.logo || null,
              });
            }

            if (markdownContent) {
              send("phase", { phase: "extracting", message: `Extracted ${markdownContent.length} chars of structured content` });
            }

            send("pages_found", { pages: scrapeLinks.slice(0, 10), count: scrapeLinks.length });
          } else {
            const errText = await scrapeResp.text();
            console.error("[Research] Firecrawl scrape error:", errText);
            send("phase", { phase: "extracting", message: "Firecrawl scrape failed, using direct fetch..." });
          }
        } catch (e) {
          console.error("[Research] Firecrawl error:", e);
          send("phase", { phase: "extracting", message: "Firecrawl unavailable, falling back..." });
        }
      }

      // Fallback: direct fetch
      if (!markdownContent && domain) {
        send("phase", { phase: "crawling", message: `Direct fetching ${domain}...` });
        try {
          const siteResp = await fetch(`https://${domain}`, {
            headers: { "User-Agent": "BrandflowBot/1.0 (brand analysis)" },
            signal: AbortSignal.timeout(10000),
          });
          if (siteResp.ok) {
            const html = await siteResp.text();
            markdownContent = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim().substring(0, 4000);
          }
        } catch (e) {
          send("phase", { phase: "extracting", message: "Direct fetch failed" });
        }
      }

      // ── Phase 2: Firecrawl Competitor Search ──
      send("phase", { phase: "competitors", message: `Searching competitors in ${brandIndustry}...` });
      const competitorQuery = `top ${brandIndustry} brands competitors ${targetAudience || "consumers"} social media marketing 2026`;
      let competitorResults: any[] = [];

      if (FIRECRAWL_API_KEY) {
        try {
          const compResp = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: competitorQuery,
              limit: 8,
            }),
          });
          if (compResp.ok) {
            const compData = await compResp.json();
            competitorResults = (compData.data || []).map((r: any) => ({
              title: r.title, url: r.url,
              snippet: r.description || r.markdown?.substring(0, 400) || "",
            }));
            send("phase", { phase: "competitors", message: `Found ${competitorResults.length} competitor signals` });
          } else { await compResp.text(); }
        } catch (e) { console.error("[Research] Competitor error:", e); }
      }

      // ── Phase 3: Firecrawl Trend Search ──
      send("phase", { phase: "trends", message: `Analyzing content trends for ${brandIndustry}...` });
      const trendQuery = `${brandIndustry} social media content trends hooks CTAs ${targetAudience || ""} 2026`;
      let trendResults: any[] = [];

      if (FIRECRAWL_API_KEY) {
        try {
          const trendResp = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: trendQuery,
              limit: 6,
            }),
          });
          if (trendResp.ok) {
            const trendData = await trendResp.json();
            trendResults = (trendData.data || []).map((r: any) => ({
              title: r.title, url: r.url,
              snippet: r.description || r.markdown?.substring(0, 400) || "",
            }));
            send("phase", { phase: "trends", message: `Found ${trendResults.length} trend signals` });
          } else { await trendResp.text(); }
        } catch (e) { console.error("[Research] Trends error:", e); }
      }

      // ── Phase 4: CMO AI Synthesis ──
      send("phase", { phase: "synthesis", message: "Shadow CMO analyzing brand positioning..." });

      let intelligenceBrief: any = {
        brand_diagnosis: "",
        market_gap: "",
        competitor_matrix: [],
        attack_vectors: [],
        summary: `Found ${competitorResults.length} competitor signals and ${trendResults.length} trend signals for ${brandIndustry}.`,
        competitors: [], trending_topics: [], content_angles: [],
        visual_direction: "", hooks: [], avoid: [],
        brand_gap_analysis: "", research_quality: 3,
        firecrawl_branding: brandingData,
        sources: [...competitorResults, ...trendResults].map((r) => ({ title: r.title, url: r.url })),
      };

      if (LOVABLE_API_KEY) {
        try {
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: CMO_SYSTEM_PROMPT },
                {
                  role: "user",
                  content: `Analyze this brand and deliver your CMO consultation.

**CLIENT:** ${brandName} (${domain || "no website"})
**SECTOR:** ${brandIndustry}
**TARGET AUDIENCE:** ${targetAudience || "consumers"}
**BRAND VOICE:** ${brandVoice || "professional"}
${uploadedAssetUrls?.length ? `**UPLOADED ASSETS:** ${uploadedAssetUrls.length} reference images provided` : ""}

**FIRECRAWL BRANDING DATA:**
${JSON.stringify(brandingData, null, 2)}

**CRAWLED WEBSITE CONTENT (${domain}):**
${markdownContent?.substring(0, 2500) || "Not available"}

**DISCOVERED PAGES:** ${scrapeLinks.slice(0, 10).join(", ")}

**COMPETITOR INTELLIGENCE (${competitorResults.length} signals):**
${JSON.stringify(competitorResults.slice(0, 6), null, 2)}

**TREND DATA (${trendResults.length} signals):**
${JSON.stringify(trendResults.slice(0, 4), null, 2)}

Deliver your full CMO consultation now.`,
                },
              ],
              tools: [{
                type: "function",
                function: {
                  name: "deliver_cmo_consultation",
                  description: "Deliver the full CMO Intelligence consultation",
                  parameters: {
                    type: "object",
                    properties: {
                      brand_diagnosis: { type: "string", description: "Compelling 2-3 sentence CEO-level diagnosis" },
                      market_gap: { type: "string", description: "Blue Ocean unclaimed territory" },
                      competitor_matrix: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            dimension: { type: "string" },
                            market_standard: { type: "string" },
                            your_edge: { type: "string" }
                          },
                          required: ["dimension", "market_standard", "your_edge"]
                        }
                      },
                      attack_vectors: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            label: { type: "string" },
                            type: { type: "string", enum: ["low_hanging_fruit", "wedge", "moonshot"] },
                            platform: { type: "string" },
                            insight: { type: "string" },
                            strategy: { type: "string" },
                            action: { type: "string" }
                          },
                          required: ["label", "type", "platform", "insight", "strategy", "action"]
                        }
                      },
                      summary: { type: "string" },
                      competitors: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            strength: { type: "string" },
                            weakness: { type: "string" }
                          },
                          required: ["name", "strength", "weakness"]
                        }
                      },
                      trending_topics: { type: "array", items: { type: "string" } },
                      content_angles: { type: "array", items: { type: "string" } },
                      visual_direction: { type: "string" },
                      hooks: { type: "array", items: { type: "string" } },
                      avoid: { type: "array", items: { type: "string" } },
                      brand_gap_analysis: { type: "string" },
                      research_quality: { type: "number" },
                    },
                    required: ["brand_diagnosis", "market_gap", "competitor_matrix", "attack_vectors", "summary", "competitors", "visual_direction", "research_quality", "hooks", "avoid", "trending_topics", "content_angles", "brand_gap_analysis"],
                  },
                },
              }],
              tool_choice: { type: "function", function: { name: "deliver_cmo_consultation" } },
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
                firecrawl_branding: brandingData,
                sources: intelligenceBrief.sources,
              };
            }
          } else {
            const err = await aiResponse.text();
            console.error("[Research] AI error:", err);
          }
        } catch (e) {
          console.error("[Research] AI error:", e);
        }
      }

      // Save to DB
      const { data: research, error: insertError } = await supabase
        .from("campaign_research")
        .insert({
          campaign_id: campaignId,
          profile_id: userId,
          research_type: "cmo_intelligence",
          query: `site:${domain} | ${competitorQuery}`,
          results: { competitors: competitorResults, trends: trendResults, firecrawl_branding: brandingData },
          intelligence_brief: intelligenceBrief,
          provider: "firecrawl",
        })
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        send("error", { message: "Failed to save research" });
        return null;
      }

      send("phase", { phase: "complete", message: "CMO Intelligence briefing complete" });
      send("result", { research, intelligenceBrief });
      return { research, intelligenceBrief };
    }

    // ── Streaming SSE path ──
    if (stream) {
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          const send = (event: string, data: any) => {
            controller.enqueue(encoder.encode(sseEvent(event, data)));
          };
          try {
            await runResearch(send);
          } catch (e) {
            console.error("Stream error:", e);
            send("error", { message: e instanceof Error ? e.message : "Unknown error" });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readableStream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      });
    }

    // ── Non-streaming path ──
    const collected: { event: string; data: any }[] = [];
    const send = (event: string, data: any) => { collected.push({ event, data }); };
    const result = await runResearch(send);

    if (!result) {
      return new Response(JSON.stringify({ error: "Research failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
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
