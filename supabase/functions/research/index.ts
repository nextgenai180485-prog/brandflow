import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Color Extraction Utilities ─────────────────────────────
function extractColorsFromHTML(html: string): { hex: string; source: string }[] {
  const colors = new Map<string, string>();
  const cssVarRegex = /--([\w-]+)\s*:\s*(#(?:[0-9a-fA-F]{3}){1,2})\b/g;
  let m;
  while ((m = cssVarRegex.exec(html)) !== null) {
    colors.set(m[2].toLowerCase(), `CSS var --${m[1]}`);
  }
  const hexRegex = /(?:color|background|background-color|border-color|fill|stroke)\s*:\s*(#(?:[0-9a-fA-F]{3}){1,2})\b/gi;
  while ((m = hexRegex.exec(html)) !== null) {
    const hex = m[1].toLowerCase();
    if (!colors.has(hex)) colors.set(hex, "CSS property");
  }
  const rgbRegex = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/g;
  while ((m = rgbRegex.exec(html)) !== null) {
    const hex = "#" + [m[1], m[2], m[3]].map(c => parseInt(c).toString(16).padStart(2, "0")).join("");
    if (!colors.has(hex)) colors.set(hex, "RGB value");
  }
  const filtered = Array.from(colors.entries())
    .filter(([hex]) => {
      const clean = hex.replace("#", "");
      const full = clean.length === 3 ? clean.split("").map(c => c + c).join("") : clean;
      const r = parseInt(full.substring(0, 2), 16);
      const g = parseInt(full.substring(2, 4), 16);
      const b = parseInt(full.substring(4, 6), 16);
      const avg = (r + g + b) / 3;
      const spread = Math.max(r, g, b) - Math.min(r, g, b);
      if (avg < 20 || avg > 240) return false;
      if (spread < 15 && avg > 50 && avg < 200) return false;
      return true;
    })
    .map(([hex, source]) => ({ hex, source }));
  return filtered.slice(0, 12);
}

function extractAssetsFromHTML(html: string, domain: string): { logos: string[]; ogImage: string | null; heroImages: string[] } {
  const logos: string[] = [];
  const heroImages: string[] = [];
  let ogImage: string | null = null;
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogMatch) ogImage = ogMatch[1];
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let im;
  while ((im = imgRegex.exec(html)) !== null) {
    const src = im[0];
    const url = im[1];
    if (/logo/i.test(src) || /brand/i.test(src)) {
      const full = url.startsWith("http") ? url : `https://${domain}${url.startsWith("/") ? "" : "/"}${url}`;
      logos.push(full);
    }
  }
  const allImgs = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi) || [];
  for (const tag of allImgs.slice(0, 10)) {
    const srcMatch = tag.match(/src=["']([^"']+)["']/);
    if (srcMatch && !/(icon|favicon|pixel|tracking|1x1)/i.test(srcMatch[1])) {
      const url = srcMatch[1].startsWith("http") ? srcMatch[1] : `https://${domain}${srcMatch[1].startsWith("/") ? "" : "/"}${srcMatch[1]}`;
      if (!logos.includes(url)) heroImages.push(url);
    }
  }
  return { logos: logos.slice(0, 3), ogImage, heroImages: heroImages.slice(0, 5) };
}

function sseEvent(event: string, data: any): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// ── CMO Shadow Prompt ──────────────────────────────────────
const CMO_SYSTEM_PROMPT = `### ROLE: The "Shadow CMO"
You are an elite Marketing Strategist (ex-McKinsey/Ogilvy) analyzing a new client's brand based *strictly* on their crawled website data and competitive landscape.

**YOUR GOAL:**
Do not just "summarize" the brand. You must identify the **"Unclaimed Territory"** (Blue Ocean) in their market. You must shock them with insight.

**THE PROTOCOL (Strict Output Rules):**

1. **The "Anti-Generic" Filter:**
   - NEVER say "improve SEO" or "post consistently."
   - NEVER use corporate fluff like "synergy" or "customer-centric."
   - If you suggest a platform, explain the *psychological trigger* (e.g., "Use LinkedIn not for reach, but to signal 'Enterprise Trust' to CIOs").

2. **The "Competitor Gap" Analysis:**
   - Identify what competitors are *likely* doing (based on sector standard).
   - Identify the *opposite* approach for this user (The Counter-Positioning).

3. **The "Attack Vectors" (3 Specific Strategies):**
   - **Vector A (Low Hanging Fruit):** The immediate quick win.
   - **Vector B (The Wedge):** A specific, narrow angle to crack the market.
   - **Vector C (The Moonshot):** A high-risk, high-reward brand play.

4. **The Opening Diagnosis:**
   - Write a compelling 2-3 sentence "diagnosis" that reads like a consultant delivering findings to a CEO. Reference specific data from the crawl. This should hook the reader immediately.`;

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

    // ── Shared crawl + research logic ──────────────────────────
    async function runResearch(send: (event: string, data: any) => void) {
      // Phase 1: Connect & Crawl
      send("phase", { phase: "connecting", message: `Connecting to ${domain || brandName} server...` });

      let rawHTML = "";
      let extractedColors: { hex: string; source: string }[] = [];
      let extractedAssets = { logos: [] as string[], ogImage: null as string | null, heroImages: [] as string[] };

      if (domain) {
        send("phase", { phase: "crawling", message: `Fetching HTML from ${domain}...` });
        try {
          const siteResp = await fetch(`https://${domain}`, {
            headers: { "User-Agent": "BrandflowBot/1.0 (brand analysis)" },
            signal: AbortSignal.timeout(10000),
          });
          if (siteResp.ok) {
            rawHTML = await siteResp.text();
            send("phase", { phase: "extracting", message: `Parsing CSS variables & color properties...` });
            extractedColors = extractColorsFromHTML(rawHTML);
            extractedAssets = extractAssetsFromHTML(rawHTML, domain);
            send("colors", { colors: extractedColors });
            send("assets", { logos: extractedAssets.logos, ogImage: extractedAssets.ogImage, heroImages: extractedAssets.heroImages });
            if (extractedColors.length > 0) {
              send("phase", { phase: "extracting", message: `Found ${extractedColors.length} brand colors from CSS` });
            }
          }
        } catch (e) {
          send("phase", { phase: "extracting", message: `Direct fetch failed, using Exa crawl...` });
        }
      }

      // Exa deep site crawl
      let sitePages: any[] = [];
      if (domain) {
        send("phase", { phase: "crawling", message: `Deep crawling site:${domain} via Exa...` });
        try {
          const siteResp = await fetch("https://api.exa.ai/search", {
            method: "POST",
            headers: { "x-api-key": EXA_API_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `site:${domain}`, type: "auto", numResults: 5,
              contents: { text: { maxCharacters: 1000 }, highlights: { numSentences: 3 } },
            }),
          });
          if (siteResp.ok) {
            const data = await siteResp.json();
            sitePages = (data.results || []).map((r: any) => ({
              title: r.title, url: r.url,
              snippet: r.text?.substring(0, 800) || "",
              highlights: r.highlights || [],
            }));
            const pageNames = sitePages.map((p: any) => {
              try { return new URL(p.url).pathname.replace(/\//g, " ").trim() || "Homepage"; }
              catch { return p.title; }
            });
            send("pages_found", { pages: pageNames, count: sitePages.length });
            send("phase", { phase: "crawling", message: `Found ${sitePages.length} pages: ${pageNames.join(", ")}` });
          } else { await siteResp.text(); }
        } catch (e) { console.error("[Research] Site crawl error:", e); }
      }

      // Competitor search
      send("phase", { phase: "competitors", message: `Searching competitors in ${brandIndustry}...` });
      const competitorQuery = `top ${brandIndustry} brands competitors ${targetAudience || "consumers"} social media marketing 2026`;
      let competitorResults: any[] = [];
      try {
        const compResp = await fetch("https://api.exa.ai/search", {
          method: "POST",
          headers: { "x-api-key": EXA_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            query: competitorQuery, type: "auto", numResults: 8,
            contents: { text: { maxCharacters: 500 }, highlights: { numSentences: 2 } },
          }),
        });
        if (compResp.ok) {
          const data = await compResp.json();
          competitorResults = (data.results || []).map((r: any) => ({
            title: r.title, url: r.url,
            snippet: r.text?.substring(0, 400) || "",
            highlights: r.highlights || [],
            publishedDate: r.publishedDate,
          }));
          send("phase", { phase: "competitors", message: `Found ${competitorResults.length} competitor signals` });
        } else { await compResp.text(); }
      } catch (e) { console.error("[Research] Competitor error:", e); }

      // Trends
      send("phase", { phase: "trends", message: `Analyzing content trends for ${brandIndustry}...` });
      const trendQuery = `${brandIndustry} social media content trends hooks CTAs ${targetAudience || ""} 2026`;
      let trendResults: any[] = [];
      try {
        const trendResp = await fetch("https://api.exa.ai/search", {
          method: "POST",
          headers: { "x-api-key": EXA_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            query: trendQuery, type: "auto", numResults: 6,
            contents: { text: { maxCharacters: 500 }, highlights: { numSentences: 2 } },
          }),
        });
        if (trendResp.ok) {
          const data = await trendResp.json();
          trendResults = (data.results || []).map((r: any) => ({
            title: r.title, url: r.url,
            snippet: r.text?.substring(0, 400) || "",
            highlights: r.highlights || [],
          }));
          send("phase", { phase: "trends", message: `Found ${trendResults.length} trend signals` });
        } else { await trendResp.text(); }
      } catch (e) { console.error("[Research] Trends error:", e); }

      // CMO AI Synthesis
      send("phase", { phase: "synthesis", message: `Shadow CMO analyzing brand positioning...` });

      const directText = rawHTML
        ? rawHTML.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim().substring(0, 2500)
        : null;

      let intelligenceBrief: any = {
        brand_diagnosis: "",
        market_gap: "",
        competitor_matrix: [],
        attack_vectors: [],
        summary: `Found ${competitorResults.length} competitor signals and ${trendResults.length} trend signals for ${brandIndustry}.`,
        competitors: [], trending_topics: [], content_angles: [],
        visual_direction: "", hooks: [], avoid: [],
        brand_gap_analysis: "", research_quality: 3,
        extracted_colors: extractedColors,
        extracted_assets: extractedAssets,
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

**CRAWLED WEBSITE COPY (${domain}):**
${directText?.substring(0, 2000) || "Not available"}

**CRAWLED PAGES (${sitePages.length}):**
${JSON.stringify(sitePages.slice(0, 4), null, 2)}

**EXTRACTED VISUAL DNA:**
Colors: ${JSON.stringify(extractedColors)}
Logos: ${extractedAssets.logos.length}, OG Image: ${extractedAssets.ogImage ? "yes" : "no"}

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
                  description: "Deliver the full CMO Intelligence consultation with brand diagnosis, market gap, attack vectors, and competitor matrix",
                  parameters: {
                    type: "object",
                    properties: {
                      brand_diagnosis: {
                        type: "string",
                        description: "A compelling 2-3 sentence CEO-level diagnosis that hooks the reader. Reference specific data from the crawl. Example: 'I've analyzed [Brand]. The market is crowded with [Archetype], but your data reveals a hidden leverage point...'"
                      },
                      market_gap: {
                        type: "string",
                        description: "The 'Blue Ocean' unclaimed territory. What competitors miss. The counter-positioning opportunity."
                      },
                      competitor_matrix: {
                        type: "array",
                        description: "Direct comparison showing where they can win",
                        items: {
                          type: "object",
                          properties: {
                            dimension: { type: "string", description: "e.g. Visual Tone, Content Hook, Primary Channel" },
                            market_standard: { type: "string", description: "What everyone else does" },
                            your_edge: { type: "string", description: "The brand's counter-position advantage" }
                          },
                          required: ["dimension", "market_standard", "your_edge"]
                        }
                      },
                      attack_vectors: {
                        type: "array",
                        description: "Exactly 3 strategic vectors: A (Low Hanging Fruit), B (The Wedge), C (The Moonshot)",
                        items: {
                          type: "object",
                          properties: {
                            label: { type: "string", description: "e.g. 'The Authority Play'" },
                            type: { type: "string", enum: ["low_hanging_fruit", "wedge", "moonshot"] },
                            platform: { type: "string", description: "Primary platform for this vector" },
                            insight: { type: "string", description: "What competitors are doing wrong" },
                            strategy: { type: "string", description: "The counter-move" },
                            action: { type: "string", description: "Specific content generation action" }
                          },
                          required: ["label", "type", "platform", "insight", "strategy", "action"]
                        }
                      },
                      summary: { type: "string", description: "3-4 sentence brand overview with specific data" },
                      competitors: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            strength: { type: "string" },
                            weakness: { type: "string" },
                            instagram_style: { type: "string" }
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
                      recommended_formats: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            platform: { type: "string" },
                            format: { type: "string" },
                            reason: { type: "string" }
                          }
                        }
                      },
                      research_quality: { type: "number", description: "1-5 confidence score" },
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
                extracted_colors: extractedColors,
                extracted_assets: extractedAssets,
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
          results: { sitePages, competitors: competitorResults, trends: trendResults, extractedColors, extractedAssets },
          intelligence_brief: intelligenceBrief,
          provider: "exa",
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

    // ── Streaming SSE path ─────────────────────────────────────
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

    // ── Non-streaming path ─────────────────────────────────────
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
