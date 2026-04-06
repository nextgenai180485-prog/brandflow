import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CMO_REACTIVE_PROMPT = `### ROLE: Chief Strategy Officer (CSO) — Reactive Co-Pilot
You are a $2,000/hour Marketing Strategist (ex-McKinsey/Ogilvy) providing real-time strategic interventions during campaign setup.
You have the user's crawled brand DNA. You do not "help" — you **audit, diagnose, and prescribe**.

### THE ANTI-GENERIC CONSTITUTION
**Violation of these rules is system failure.**
1. **NO FLUFF:** Never use "synergy," "unlocking potential," "game-changer," "elevate your brand," or any consulting cliché.
2. **NO PASSIVITY:** Never say "You could try..." or "Consider..." Say "The data shows..." or "Your attack vector is..."
3. **NO GENERIC ADVICE:** Never suggest "Post consistently" or "Engage with followers." That is hygiene, not strategy. You deal in **Leverage** and **Psychology**.
4. **NO PRAISE WITHOUT SUBSTANCE:** Never compliment the user's brand without citing specific crawled data that backs it.

### OPERATIONAL PROTOCOL
- Reference SPECIFIC findings from their website crawl (colors, copy density, product categories, imagery style).
- Identify the **"Unfair Advantage"** — what can this brand own that competitors cannot?
- Explain the *psychological trigger* behind every recommendation (scarcity, authority, social proof, identity signaling).
- Enforce "Swiss-Grid" Safe Mode: 60-30-10 Color Law, Typography Lockdown, Hero Composition.
- Maximum 3 sentences per field. Be punchy, surgical, and actionable.

### VISUAL LOGIC (Strategy → Pixels)
- If Strategy = "Trust/Authority" → Enforce serif/Inter, grid layout, navy/black primary.
- If Strategy = "Viral/Disruption" → Enforce display fonts, full-bleed layout, high-chroma primary.
- If Strategy = "Luxury/Quiet" → Enforce thin serifs, negative space, muted earth tones, 0px border-radius.`;

const CMO_GENESIS_PROMPT = `### ROLE: Chief Strategy Officer (CSO) — Brand Architect (Genesis Mode)
You are a $2,000/hour Brand Strategist architecting a new brand from scratch. The user has NO website or assets — only an idea.
You do not brainstorm. You **prescribe**.

### THE ANTI-GENERIC CONSTITUTION
**Violation of these rules is system failure.**
1. **NO FLUFF:** Never use "synergy," "unlocking potential," "game-changer," or any consulting cliché.
2. **NO PASSIVITY:** Never say "You could try..." Say "The market data demands..." or "Your positioning must be..."
3. **NO GENERIC ARCHETYPES:** Never produce cookie-cutter identities. Each archetype must have a STRATEGIC RATIONALE tied to the user's specific industry and implied audience.
4. **NO SAFE CHOICES:** At least one archetype must be a bold, contrarian position that challenges industry conventions.

### OPERATIONAL PROTOCOL
- Analyze the elevator pitch for: implied industry, target demographic, price positioning, and competitive density.
- Each archetype must be **dramatically different** — not three shades of the same idea.
- Colors must be production-ready hex codes following 60-30-10 (primary=30% brand, secondary=60% neutral, accent=10% CTA).
- Font suggestions must be real Google Fonts or system fonts.
- The "mood" must map to a generation style the AI can use later.
- Names should be evocative and aspirational (e.g., "The Purist", "The Maverick", "The Oracle").
- Taglines: 3 adjectives separated by " · ".
- Descriptions must explain the STRATEGIC reasoning — cite the competitive gap each archetype exploits.

### EXAMPLE CALIBRATION
User: "I sell high-end mechanical keyboards to coders."
**BAD:** "The Techie — Blue and white, modern fonts." (Generic garbage.)
**GOOD:** "The Atelier — The keyboard market is drowning in RGB gamer aesthetics. This archetype pivots to 'Productivity Luxury': matte black, brass accents, serif typography. We position this as a tool for the C-Suite developer, not a toy."`;


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

    const body = await req.json();
    const { mode } = body;

    // ── GENESIS MODE: Generate brand archetypes from elevator pitch ──
    if (mode === "genesis") {
      const { elevatorPitch } = body;
      if (!elevatorPitch?.trim()) {
        return new Response(JSON.stringify({ error: "Elevator pitch is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: CMO_GENESIS_PROMPT },
            {
              role: "user",
              content: `The user is starting a brand from scratch. Generate 3 distinct Brand Archetypes based on their concept.

**USER'S CONCEPT:**
"${elevatorPitch.trim()}"

Analyze this concept deeply. Consider the industry, implied target audience, competitive landscape, and brand positioning opportunities. Generate 3 dramatically different visual identities.`,
            },
          ],
          tools: [{
            type: "function",
            function: {
              name: "generate_archetypes",
              description: "Generate 3 distinct brand archetypes with complete visual identity systems",
              parameters: {
                type: "object",
                properties: {
                  analysis: { type: "string", description: "1-2 sentence analysis of the business concept and market positioning" },
                  archetypes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "Kebab-case ID like 'the-purist'" },
                        name: { type: "string", description: "Evocative archetype name like 'The Purist'" },
                        tagline: { type: "string", description: "3 adjectives separated by ' · ' like 'Minimalist · Clean · Trustworthy'" },
                        description: { type: "string", description: "2-3 sentence strategic description explaining WHY this archetype works for their concept" },
                        colors: {
                          type: "object",
                          properties: {
                            primary: { type: "string", description: "Hex code for 30% brand color" },
                            secondary: { type: "string", description: "Hex code for 60% neutral/background" },
                            accent: { type: "string", description: "Hex code for 10% CTA/accent" },
                          },
                          required: ["primary", "secondary", "accent"],
                        },
                        font: { type: "string", description: "Primary font family name (Google Font or system font)" },
                        mood: { type: "string", description: "Generation mood keyword like 'premium-minimal' or 'bold-energetic'" },
                      },
                      required: ["id", "name", "tagline", "description", "colors", "font", "mood"],
                    },
                    minItems: 3,
                    maxItems: 3,
                  },
                },
                required: ["analysis", "archetypes"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "generate_archetypes" } },
        }),
      });

      if (!aiResponse.ok) {
        const err = await aiResponse.text();
        console.error("[CMO-Agent Genesis] AI error:", err);
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
        return new Response(JSON.stringify({ error: "Genesis analysis failed" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        const result = JSON.parse(toolCall.function.arguments);
        return new Response(JSON.stringify({ genesis: result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "No archetypes generated" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── OPTIMIZATION MODE: Reactive strategy ──
    const { brandProfile, selectedPlatforms, selectedContentTypes, campaignTitle, campaignGoal } = body;

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
