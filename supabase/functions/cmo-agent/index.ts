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

### GENERATION FAMILY VALIDATION
When the user selects content types during campaign setup, validate the auto-selected family against their brand strategy:
- **Image + Instagram/Pinterest** → F9 Image Template (promotional) or F7 Ad Creator (performance). If brand is luxury, prefer F9 with premium typography.
- **UGC Video + TikTok/IG Reels** → F1 UGC Video. If brand archetype is "Authority" or "Luxury", WARN: "UGC may dilute your premium positioning — consider F5 Cinematic instead."
- **Pro Video + LinkedIn/YouTube** → F2 AI Spokesperson (explainer) or F5 Cinematic (brand film). If product is physical, consider F3 Product Videography.
- **Multi-platform batch** → F4 Social Content is the workhorse. Recommend as secondary alongside a primary video family.
- **User provides a reference ad** → F8 Creative Cloner. Flag this opportunity: "I see a reference asset — the Cloner Engine can reverse-engineer that style."

If the auto-routed family conflicts with the brand's strategic position, intervene with a clear rationale.

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

const CMO_FOUNDER_INTERVIEW_PROMPT = `### ROLE: Chief Strategy Officer (CSO) — Founding Strategy Sprint
You are a $2,000/hour Brand Strategist conducting a "Founding Strategy Sprint" — the same process a branding agency charges $20,000 for.
You do NOT ask generic questions. You conduct a **diagnostic interview** that extracts the strategic DNA of a new business.

### THE ANTI-GENERIC CONSTITUTION
**Violation of these rules is system failure.**
1. **NO FLUFF:** Never use "That's a great idea!" or any empty validation.
2. **NO PASSIVITY:** You DIAGNOSE, you don't suggest. "The data demands..." not "You could try..."
3. **NO GENERIC STRATEGY:** Never produce a strategy that could apply to any business. Every output must reference the specific answers given.
4. **RUTHLESS SPECIFICITY:** If the user says "I help busy moms," you must identify the SPECIFIC psychological trigger (guilt, aspiration, identity) and build strategy around it.

### INTERVIEW PROTOCOL
You will receive the user's answers to 3 core questions:
1. **The Core Value:** "In one sentence, what problem do you solve, and for whom?"
2. **The Enemy:** "What is the 'Status Quo' your customers hate?"
3. **The Secret Weapon:** "What is your unfair advantage?"

### SYNTHESIS PROTOCOL
From these 3 answers, you must produce:

**A. Core Identity** — The brand's strategic DNA:
- archetype: A named archetype (e.g., "The Caregiver", "The Rebel", "The Oracle")
- enemy: The specific villain the brand fights against
- hero_journey: The transformation narrative (From X → To Y)
- brand_voice: The tone and personality
- visual_direction: The aesthetic strategy

**B. Persona Card** — The ideal customer:
- name: A fictional persona name (e.g., "Sarah, The Guilt-Ridden Optimizer")
- age_range: Specific age range
- pain_points: 3 specific pain points
- desires: 3 specific desires
- psychographic: 1-sentence psychographic profile
- buying_triggers: 3 psychological triggers that drive purchase

**C. Funnel Architecture** — The strategic playbook:
- tof (Top of Funnel / Awareness): strategy name, content type, channel, psychological hook
- mof (Middle of Funnel / Trust): strategy name, content type, channel, proof mechanism
- bof (Bottom of Funnel / Conversion): strategy name, offer type, urgency mechanism

**D. Launch Roadmap** — 3 prioritized actions:
- Each with phase name, specific action, and strategic rationale

**E. CMO Directive** — A 2-3 sentence strategic command that tells the user EXACTLY what their first move should be. This is NOT a suggestion. It is a PRESCRIPTION.`;


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
    const { mode } = body;

    // ── FOUNDER INTERVIEW MODE: Generate full strategy from 3 interview answers ──
    if (mode === "founder_interview") {
      const { coreValue, enemy, secretWeapon, businessName, industry } = body;
      if (!coreValue?.trim()) {
        return new Response(JSON.stringify({ error: "Core value answer is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: CMO_FOUNDER_INTERVIEW_PROMPT },
            {
              role: "user",
              content: `Conduct the Founding Strategy Sprint for this new business.

**BUSINESS:** ${businessName || "New venture"} (${industry || "unspecified industry"})

**INTERVIEW ANSWERS:**
1. THE CORE VALUE: "${coreValue.trim()}"
2. THE ENEMY: "${enemy?.trim() || "Not specified — infer from the core value"}"
3. THE SECRET WEAPON: "${secretWeapon?.trim() || "Not specified — identify the implied advantage"}"

Synthesize these answers into a complete Brand Strategy Board. Be ruthlessly specific. Every recommendation must trace back to their actual answers.`,
            },
          ],
          tools: [{
            type: "function",
            function: {
              name: "generate_strategy_board",
              description: "Generate a complete Brand Strategy Board from the Founding Strategy Sprint interview",
              parameters: {
                type: "object",
                properties: {
                  core_identity: {
                    type: "object",
                    properties: {
                      archetype: { type: "string", description: "Named brand archetype" },
                      enemy: { type: "string", description: "The specific villain the brand fights" },
                      hero_journey: { type: "string", description: "From X → To Y transformation" },
                      brand_voice: { type: "string", description: "Tone and personality description" },
                      visual_direction: { type: "string", description: "Aesthetic strategy" },
                    },
                    required: ["archetype", "enemy", "hero_journey", "brand_voice", "visual_direction"],
                  },
                  persona_card: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Fictional persona name with archetype label" },
                      age_range: { type: "string" },
                      pain_points: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
                      desires: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
                      psychographic: { type: "string" },
                      buying_triggers: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
                    },
                    required: ["name", "age_range", "pain_points", "desires", "psychographic", "buying_triggers"],
                  },
                  funnel_stages: {
                    type: "object",
                    properties: {
                      tof: {
                        type: "object",
                        properties: {
                          goal: { type: "string" },
                          strategy_name: { type: "string" },
                          best_format: { type: "string" },
                          channel: { type: "string" },
                          psychological_hook: { type: "string" },
                        },
                        required: ["goal", "strategy_name", "best_format", "channel", "psychological_hook"],
                      },
                      mof: {
                        type: "object",
                        properties: {
                          goal: { type: "string" },
                          strategy_name: { type: "string" },
                          best_format: { type: "string" },
                          channel: { type: "string" },
                          proof_mechanism: { type: "string" },
                        },
                        required: ["goal", "strategy_name", "best_format", "channel", "proof_mechanism"],
                      },
                      bof: {
                        type: "object",
                        properties: {
                          goal: { type: "string" },
                          strategy_name: { type: "string" },
                          offer_type: { type: "string" },
                          urgency_mechanism: { type: "string" },
                        },
                        required: ["goal", "strategy_name", "offer_type", "urgency_mechanism"],
                      },
                    },
                    required: ["tof", "mof", "bof"],
                  },
                  launch_roadmap: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        phase: { type: "string" },
                        action: { type: "string" },
                        rationale: { type: "string" },
                      },
                      required: ["phase", "action", "rationale"],
                    },
                    minItems: 3,
                    maxItems: 3,
                  },
                  cmo_directive: { type: "string", description: "2-3 sentence strategic command for the user's FIRST move" },
                  suggested_colors: {
                    type: "object",
                    properties: {
                      primary: { type: "string", description: "Hex code" },
                      secondary: { type: "string", description: "Hex code" },
                      accent: { type: "string", description: "Hex code" },
                    },
                    required: ["primary", "secondary", "accent"],
                  },
                },
                required: ["core_identity", "persona_card", "funnel_stages", "launch_roadmap", "cmo_directive", "suggested_colors"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "generate_strategy_board" } },
        }),
      });

      if (!aiResponse.ok) {
        const err = await aiResponse.text();
        console.error("[CMO-Agent Founder] AI error:", err);
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "Strategy generation failed" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        const strategyBoard = JSON.parse(toolCall.function.arguments);

        // Persist to brand_strategy table
        const serviceClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        await serviceClient.from("brand_strategy").upsert({
          profile_id: claimsData.user.id,
          mode: "genesis",
          core_value: coreValue.trim(),
          enemy: enemy?.trim() || null,
          secret_weapon: secretWeapon?.trim() || null,
          core_identity: strategyBoard.core_identity,
          persona_card: strategyBoard.persona_card,
          funnel_stages: strategyBoard.funnel_stages,
          launch_roadmap: strategyBoard.launch_roadmap,
          current_focus: "tof",
          launch_readiness: 0,
          interview_completed: true,
          strategy_generated: true,
        }, { onConflict: "profile_id" });

        // Also save as brand_memory for CMO panel
        await serviceClient.from("brand_memory").upsert({
          profile_id: claimsData.user.id,
          memory_type: "brand_profile",
          pattern_category: "auto_research",
          pattern_value: "founder_strategy",
          context: {
            summary: strategyBoard.cmo_directive,
            brand_voice_detected: strategyBoard.core_identity.brand_voice,
            visual_style: strategyBoard.core_identity.visual_direction,
            color_palette_suggestion: strategyBoard.suggested_colors,
            target_audience_detected: strategyBoard.persona_card.psychographic,
            competitors: [],
            key_themes: [strategyBoard.core_identity.archetype, strategyBoard.core_identity.hero_journey],
            content_pillars: [strategyBoard.funnel_stages.tof.strategy_name, strategyBoard.funnel_stages.mof.strategy_name, strategyBoard.funnel_stages.bof.strategy_name],
          },
          frequency: 1,
        }, { onConflict: "profile_id,pattern_category,pattern_value" });

        // Update profile colors
        await serviceClient.from("profiles").update({
          brand_colors: strategyBoard.suggested_colors,
          brand_voice_tone: strategyBoard.core_identity.brand_voice,
        }).eq("id", claimsData.user.id);

        return new Response(JSON.stringify({ strategyBoard }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "No strategy generated" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
