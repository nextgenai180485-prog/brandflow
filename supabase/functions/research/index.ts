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

  // 1. CSS Variables: --primary: #0055FF or --brand-color: #abc
  const cssVarRegex = /--([\w-]+)\s*:\s*(#(?:[0-9a-fA-F]{3}){1,2})\b/g;
  let m;
  while ((m = cssVarRegex.exec(html)) !== null) {
    colors.set(m[2].toLowerCase(), `CSS var --${m[1]}`);
  }

  // 2. Inline/embedded hex codes in style attrs and CSS blocks
  const hexRegex = /(?:color|background|background-color|border-color|fill|stroke)\s*:\s*(#(?:[0-9a-fA-F]{3}){1,2})\b/gi;
  while ((m = hexRegex.exec(html)) !== null) {
    const hex = m[1].toLowerCase();
    if (!colors.has(hex)) colors.set(hex, "CSS property");
  }

  // 3. RGB/RGBA in styles → convert to hex
  const rgbRegex = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/g;
  while ((m = rgbRegex.exec(html)) !== null) {
    const hex = "#" + [m[1], m[2], m[3]].map(c => parseInt(c).toString(16).padStart(2, "0")).join("");
    if (!colors.has(hex)) colors.set(hex, "RGB value");
  }

  // Filter out pure black/white/grays
  const filtered = Array.from(colors.entries())
    .filter(([hex]) => {
      const clean = hex.replace("#", "");
      const full = clean.length === 3
        ? clean.split("").map(c => c + c).join("")
        : clean;
      const r = parseInt(full.substring(0, 2), 16);
      const g = parseInt(full.substring(2, 4), 16);
      const b = parseInt(full.substring(4, 6), 16);
      // Skip near-black, near-white, and grays
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

  // OG Image
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogMatch) ogImage = ogMatch[1];

  // Logo candidates
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

  // Hero images (large images near top)
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

// ── SSE Helper ─────────────────────────────────────────────
function sseEvent(event: string, data: any): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

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

    // If streaming requested, use SSE
    if (stream) {
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          const send = (event: string, data: any) => {
            controller.enqueue(encoder.encode(sseEvent(event, data)));
          };

          try {
            // Phase 1: Connect
            send("phase", { phase: "connecting", message: `Connecting to ${domain || brandName} server...` });

            // Phase 1A: Deep HTML crawl
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

            // Phase 1B: Exa deep site crawl
            let sitePages: any[] = [];
            if (domain) {
              send("phase", { phase: "crawling", message: `Deep crawling site:${domain} via Exa...` });
              try {
                const siteResp = await fetch("https://api.exa.ai/search", {
                  method: "POST",
                  headers: { "x-api-key": EXA_API_KEY, "Content-Type": "application/json" },
                  body: JSON.stringify({
                    query: `site:${domain}`,
                    type: "auto",
                    numResults: 5,
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
              } catch (e) {
                console.error("[Research] Site crawl error:", e);
              }
            }

            // Phase 2: Competitor search
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

            // Phase 3: Trends
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

            // Phase 4: AI Synthesis
            send("phase", { phase: "synthesis", message: `Synthesizing intelligence brief...` });

            const directText = rawHTML
              ? rawHTML.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
                  .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
                  .replace(/<[^>]+>/g, " ")
                  .replace(/\s+/g, " ")
                  .trim().substring(0, 2500)
              : null;

            let intelligenceBrief: any = {
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
                      {
                        role: "system",
                        content: `You are a senior brand strategist analyzing ${brandName} (${domain || "no website"}). Produce a forensic brand intelligence brief. Output valid JSON only.`,
                      },
                      {
                        role: "user",
                        content: `Analyze all data below and create a comprehensive intelligence brief.

BRAND WEBSITE CONTENT (${domain}):
${directText?.substring(0, 2000) || "Not available"}

CRAWLED PAGES (${sitePages.length}):
${JSON.stringify(sitePages.slice(0, 4), null, 2)}

EXTRACTED COLORS: ${JSON.stringify(extractedColors)}
EXTRACTED ASSETS: logos=${extractedAssets.logos.length}, ogImage=${extractedAssets.ogImage ? "yes" : "no"}

COMPETITOR DATA:
${JSON.stringify(competitorResults.slice(0, 6), null, 2)}

TRENDS:
${JSON.stringify(trendResults.slice(0, 4), null, 2)}

Brand voice: "${brandVoice || "professional"}", Target: "${targetAudience || "consumers"}"
${uploadedAssetUrls?.length ? `User uploaded ${uploadedAssetUrls.length} reference assets.` : ""}

Output JSON:
- "summary": 3-4 sentence brand overview with specific data
- "competitors": [{name, strength, weakness, instagram_style}] top 5
- "trending_topics": 5 specific trending topics
- "content_angles": 5 creative angles
- "visual_direction": detailed visual style (reference extracted colors if available)
- "hooks": 5 platform-specific hooks
- "avoid": 5 things to avoid
- "brand_gap_analysis": what's missing vs competitors
- "recommended_formats": [{platform, format, reason}] top 3
- "research_quality": 1-5 confidence`,
                      },
                    ],
                    tools: [{
                      type: "function",
                      function: {
                        name: "create_intelligence_brief",
                        description: "Create structured intelligence brief",
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
                      extracted_colors: extractedColors,
                      extracted_assets: extractedAssets,
                      sources: [...competitorResults, ...trendResults].map((r) => ({ title: r.title, url: r.url })),
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
                research_type: "deep_crawl",
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
            } else {
              send("phase", { phase: "complete", message: "Research complete" });
              send("result", { research, intelligenceBrief });
            }
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

    // ── Non-streaming path (legacy) ──────────────────────────
    const domain2 = domain;
    let rawHTML = "";
    let extractedColors: { hex: string; source: string }[] = [];
    let extractedAssets = { logos: [] as string[], ogImage: null as string | null, heroImages: [] as string[] };

    if (domain2) {
      try {
        const siteResp = await fetch(`https://${domain2}`, {
          headers: { "User-Agent": "BrandflowBot/1.0 (brand analysis)" },
          signal: AbortSignal.timeout(10000),
        });
        if (siteResp.ok) {
          rawHTML = await siteResp.text();
          extractedColors = extractColorsFromHTML(rawHTML);
          extractedAssets = extractAssetsFromHTML(rawHTML, domain2);
        }
      } catch (e) {
        console.error("[Research] Direct fetch failed:", e);
      }
    }

    // Exa site crawl
    let sitePages: any[] = [];
    if (domain2) {
      try {
        const siteResp = await fetch("https://api.exa.ai/search", {
          method: "POST",
          headers: { "x-api-key": EXA_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `site:${domain2}`, type: "auto", numResults: 5,
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
        } else { await siteResp.text(); }
      } catch (e) { console.error("[Research] Site crawl error:", e); }
    }

    // Competitors
    const competitorQuery = `top ${brandIndustry} brands competitors ${targetAudience || "consumers"} social media marketing 2026`;
    let competitorResults: any[] = [];
    try {
      const compResp = await fetch("https://api.exa.ai/search", {
        method: "POST",
        headers: { "x-api-key": EXA_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ query: competitorQuery, type: "auto", numResults: 8, contents: { text: { maxCharacters: 500 }, highlights: { numSentences: 2 } } }),
      });
      if (compResp.ok) {
        const data = await compResp.json();
        competitorResults = (data.results || []).map((r: any) => ({ title: r.title, url: r.url, snippet: r.text?.substring(0, 400) || "", highlights: r.highlights || [] }));
      } else { await compResp.text(); }
    } catch (e) { console.error("[Research] Competitor error:", e); }

    // Trends
    const trendQuery = `${brandIndustry} social media content trends hooks CTAs ${targetAudience || ""} 2026`;
    let trendResults: any[] = [];
    try {
      const trendResp = await fetch("https://api.exa.ai/search", {
        method: "POST",
        headers: { "x-api-key": EXA_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ query: trendQuery, type: "auto", numResults: 6, contents: { text: { maxCharacters: 500 }, highlights: { numSentences: 2 } } }),
      });
      if (trendResp.ok) {
        const data = await trendResp.json();
        trendResults = (data.results || []).map((r: any) => ({ title: r.title, url: r.url, snippet: r.text?.substring(0, 400) || "" }));
      } else { await trendResp.text(); }
    } catch (e) { console.error("[Research] Trends error:", e); }

    // AI Synthesis
    const directText = rawHTML
      ? rawHTML.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().substring(0, 2500)
      : null;

    let intelligenceBrief: any = {
      summary: `Found ${competitorResults.length} competitors and ${trendResults.length} trends.`,
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
              { role: "system", content: `You are a senior brand strategist analyzing ${brandName}. Output valid JSON only.` },
              {
                role: "user",
                content: `Analyze:\nWEBSITE: ${directText?.substring(0, 2000) || "N/A"}\nPAGES: ${JSON.stringify(sitePages.slice(0, 4))}\nCOLORS: ${JSON.stringify(extractedColors)}\nCOMPETITORS: ${JSON.stringify(competitorResults.slice(0, 6))}\nTRENDS: ${JSON.stringify(trendResults.slice(0, 4))}\nVoice: "${brandVoice}", Target: "${targetAudience}"\n\nOutput: summary, competitors[{name,strength,weakness,instagram_style}], trending_topics[], content_angles[], visual_direction, hooks[], avoid[], brand_gap_analysis, recommended_formats[{platform,format,reason}], research_quality(1-5)`,
              },
            ],
            tools: [{
              type: "function",
              function: {
                name: "create_intelligence_brief",
                description: "Create intelligence brief",
                parameters: {
                  type: "object",
                  properties: {
                    summary: { type: "string" }, competitors: { type: "array", items: { type: "object" } },
                    trending_topics: { type: "array", items: { type: "string" } }, content_angles: { type: "array", items: { type: "string" } },
                    visual_direction: { type: "string" }, hooks: { type: "array", items: { type: "string" } },
                    avoid: { type: "array", items: { type: "string" } }, brand_gap_analysis: { type: "string" },
                    recommended_formats: { type: "array", items: { type: "object" } }, research_quality: { type: "number" },
                  },
                  required: ["summary", "competitors", "visual_direction", "research_quality"],
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "create_intelligence_brief" } },
          }),
        });
        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const tc = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (tc?.function?.arguments) {
            intelligenceBrief = { ...intelligenceBrief, ...JSON.parse(tc.function.arguments), extracted_colors: extractedColors, extracted_assets: extractedAssets, sources: intelligenceBrief.sources };
          }
        } else { await aiResponse.text(); }
      } catch (e) { console.error("[Research] AI error:", e); }
    }

    const { data: research, error: insertError } = await supabase
      .from("campaign_research")
      .insert({
        campaign_id: campaignId, profile_id: userId, research_type: "deep_crawl",
        query: `site:${domain} | ${competitorQuery}`,
        results: { sitePages, competitors: competitorResults, trends: trendResults, extractedColors, extractedAssets },
        intelligence_brief: intelligenceBrief, provider: "exa",
      })
      .select().single();

    if (insertError) {
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
