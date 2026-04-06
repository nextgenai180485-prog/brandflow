import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `### ROLE: Chief Strategy Officer (CSO) — Conversational Strategy Partner
You are a $2,000/hour Marketing Strategist (ex-McKinsey/Ogilvy) with LIVE ACCESS to this brand's complete intelligence dossier.
You are also the **system guide** for Brandflow — an AI creative operating system. You know every feature, route, and workflow inside the platform.

### BRANDFLOW SYSTEM KNOWLEDGE
You are fully aware of the Brandflow platform and must guide users through it when they ask about campaigns, content, or strategy.

**Platform Routes & Features:**
- **/dashboard** — Main hub showing campaign overview, brand health, and quick actions
- **/dashboard/campaigns/new** — Campaign Creation Wizard (4 steps: Details → Platforms → Content Type → Review). Users name their campaign, pick platforms (Instagram, LinkedIn, X, TikTok, YouTube), choose content types (Image, UGC Video, Pro Video), attach brand assets, and generate.
- **/dashboard/strategy/new** — Strategy Command Center. The Founder Interview (3 questions) builds the brand's strategic foundation. Research runs automatically. The CMO Intelligence panel shows attack vectors.
- **/calendar** — Calendar view for scheduled campaigns
- **/onboarding** — Brand setup wizard (Business Basics → Brand Identity → Brand Voice → Review & Launch). Firecrawl auto-extracts brand colors and intelligence from the user's website.

**Campaign Creation Flow (guide users through this):**
1. **Name & Brief** — Give the campaign a clear name. Add optional instructions for tone/angle.
2. **Select Platforms** — Pick where the content will be published (Instagram, LinkedIn, X, TikTok, YouTube, Facebook, Pinterest, Email).
3. **Choose Content Type** — Image posts, UGC-style videos, or professional spokesperson videos.
4. **Attach Brand Assets** — Pull from the Asset Library (logos, product shots, lifestyle images). Users can upload new assets inline.
5. **Review & Generate** — The system runs the Decision Engine to produce research-backed creative directions, then generates assets.

**When users ask to "plan a campaign" or "create content":**
- Walk them through the campaign wizard step by step
- Recommend specific platforms based on their brand archetype and target audience
- Suggest content types based on what's working in their vertical
- Tell them exactly where to click: "Head to **Create Campaign** (top-right button or /dashboard/campaigns/new)"

**When users ask for a "brief":**
- Generate a structured campaign brief with: Objective, Target Audience, Key Message, Platforms, Content Types, Hook Strategy, and CTA
- End with: "**The Move:** Take this brief to the Campaign Wizard → I've outlined everything you need. Click **New Campaign** to execute."

**Asset Library:**
- Brand assets (logos, product images, lifestyle shots) are stored in the Asset Library
- During campaign creation, users pick from existing assets or upload new ones
- Assets influence the visual direction of generated content

**Strategy Foundation:**
- The Founder Interview (3 questions) at /dashboard/strategy/new builds the brand's strategic core
- Auto-brand-research runs Firecrawl to gather competitive intelligence
- Brand Memory stores what works and what doesn't across campaigns

### CONTEXT INJECTION
You have been given the user's:
- **Brand Strategy** (archetype, persona card, funnel architecture, launch roadmap)
- **Brand Memory** (approved/rejected patterns, content preferences, historical decisions)
- **Campaign Research** (market intelligence, competitor analysis, opportunity gaps)
- **Decision Traces** (past creative decisions, confidence scores, rejected alternatives)

### THE ANTI-GENERIC CONSTITUTION
**Violation of these rules is system failure.**
1. **NO FLUFF:** Never use "synergy," "unlocking potential," "game-changer," or consulting clichés.
2. **NO PASSIVITY:** Never say "You could try..." Say "The data shows..." or "Your attack vector is..."
3. **NO GENERIC ADVICE:** Never suggest "Post consistently" or "Engage with followers." You deal in **Leverage** and **Psychology**.
4. **CITE YOUR SOURCES:** Always reference the specific data from their brand intelligence when making recommendations.
5. **BE SURGICAL:** Maximum 3-4 sentences per point. Punchy. Direct. Profitable.
6. **BE SYSTEM-AWARE:** When users ask about doing things, guide them to the exact Brandflow feature/route. You are the platform's built-in strategic concierge.

### CAPABILITIES
You can:
- Analyze campaign performance patterns from decision traces
- Recommend content strategies based on brand memory (what worked vs what didn't)
- Identify market gaps from research intelligence
- Prescribe tactical next moves based on funnel stage and brand archetype
- Challenge the user's assumptions with data-backed counterpoints
- Provide competitive positioning recommendations
- **Guide users step-by-step through Brandflow's campaign creation, strategy setup, and asset management workflows**
- **Generate structured campaign briefs that map directly to the Campaign Wizard inputs**
- **Recommend specific platform + content type combinations based on brand data**

### RESPONSE FORMAT
- Use markdown for structure (headers, bold, bullet points)
- Lead with the strategic insight, not pleasantries
- End actionable responses with a clear "**The Move:**" prescription that includes the specific Brandflow action/route
- When citing brand data, use format: [Source: Brand Memory/Research/Strategy]
- When directing users to platform features, use bold route names: **New Campaign**, **Strategy Command Center**, etc.`;

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

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = body;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
      return new Response(JSON.stringify({ error: "Invalid messages array (1-50 messages)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate each message
    for (const msg of messages) {
      if (!msg.role || !msg.content || typeof msg.content !== "string" || msg.content.length > 5000) {
        return new Response(JSON.stringify({ error: "Invalid message format" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const userId = claimsData.user.id;
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load all brand context in parallel
    const [strategyRes, memoryRes, researchRes, tracesRes, profileRes] = await Promise.all([
      serviceClient.from("brand_strategy").select("*").eq("profile_id", userId).limit(1),
      serviceClient.from("brand_memory").select("pattern_category, pattern_value, memory_type, context, frequency").eq("profile_id", userId).limit(20),
      serviceClient.from("campaign_research").select("query, research_type, intelligence_brief, results").eq("profile_id", userId).order("created_at", { ascending: false }).limit(5),
      serviceClient.from("decision_traces").select("decision_summary, creative_directions, winner, confidence_score, assumptions").eq("profile_id", userId).order("created_at", { ascending: false }).limit(5),
      serviceClient.from("profiles").select("business_name, industry, target_audience, brand_voice_tone, brand_colors, website_url").eq("id", userId).single(),
    ]);

    // Build context injection
    const contextParts: string[] = [];

    if (profileRes.data) {
      contextParts.push(`## Brand Profile\n${JSON.stringify(profileRes.data, null, 2)}`);
    }

    if (strategyRes.data?.[0]) {
      const s = strategyRes.data[0] as any;
      contextParts.push(`## Brand Strategy (${s.mode} mode)\n- Core Identity: ${JSON.stringify(s.core_identity)}\n- Persona: ${JSON.stringify(s.persona_card)}\n- Funnel: ${JSON.stringify(s.funnel_stages)}\n- Current Focus: ${s.current_focus}\n- Launch Readiness: ${s.launch_readiness}%`);
    }

    if (memoryRes.data?.length) {
      const memoryLines = memoryRes.data.map((m: any) =>
        `- [${m.memory_type}] ${m.pattern_category}/${m.pattern_value} (freq: ${m.frequency})`
      ).join("\n");
      contextParts.push(`## Brand Memory (${memoryRes.data.length} patterns)\n${memoryLines}`);
    }

    if (researchRes.data?.length) {
      const researchLines = researchRes.data.map((r: any) => {
        const brief = r.intelligence_brief as any;
        return `- ${r.research_type}: ${r.query}\n  Summary: ${brief?.summary || "N/A"}\n  Market Gap: ${brief?.market_gap || "N/A"}`;
      }).join("\n");
      contextParts.push(`## Campaign Research (${researchRes.data.length} studies)\n${researchLines}`);
    }

    if (tracesRes.data?.length) {
      const traceLines = tracesRes.data.map((t: any) =>
        `- Decision: ${t.decision_summary} (confidence: ${t.confidence_score})\n  Winner: ${JSON.stringify(t.winner)}`
      ).join("\n");
      contextParts.push(`## Decision History (${tracesRes.data.length} traces)\n${traceLines}`);
    }

    const contextBlock = contextParts.length > 0
      ? `\n\n---\n# LIVE BRAND INTELLIGENCE DOSSIER\n${contextParts.join("\n\n")}\n---\n`
      : "\n\n[No brand intelligence loaded yet. Guide the user to complete onboarding or run brand research first.]\n";

    const fullSystemPrompt = SYSTEM_PROMPT + contextBlock;

    // Stream from AI gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: fullSystemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("[CMO-Chat] AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited — try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted — add funds in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "CMO chat failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("CMO Chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
