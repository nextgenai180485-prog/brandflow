import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── AI Provider Routing: OpenRouter (primary) → Lovable AI Gateway (fallback) ──
function getAIConfig() {
  const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
  if (openRouterKey) {
    return {
      url: "https://openrouter.ai/api/v1/chat/completions",
      headers: { Authorization: `Bearer ${openRouterKey}`, "Content-Type": "application/json" },
    };
  }
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) {
    return {
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    };
  }
  return null;
}


interface SEALCaMScene {
  subject: string;
  environment: string;
  action: string;
  lighting: string;
  camera: string;
  metatokens: string;
}

interface VisualDirectorOutput {
  family: "F1_UGC" | "F2_SPOKESPERSON" | "F5_CINEMATIC";
  family_label: string;
  rationale: string;
  scenes: SEALCaMScene[];
  caption_suggestion: string;
  aspect_ratio: string;
  estimated_duration_s: number;
  mood: string;
  hook_strategy: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { brief, platform, format, referenceAssets } = await req.json();
    if (!brief || typeof brief !== "string" || brief.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Brief must be at least 10 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather brand context
    const [profileRes, strategyRes, memoryRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("brand_strategy").select("*").eq("profile_id", user.id).maybeSingle(),
      supabase.from("brand_memory").select("*").eq("profile_id", user.id).limit(20),
    ]);

    const profile = profileRes.data;
    const strategy = strategyRes.data;
    const memories = memoryRes.data || [];

    const brandContext = {
      business: profile?.business_name || "Unknown",
      industry: profile?.industry || "general",
      voice: profile?.brand_voice_tone || "professional",
      keywords: profile?.brand_voice_keywords || [],
      audience: profile?.target_audience || "general audience",
      coreIdentity: strategy?.core_identity || {},
      enemy: strategy?.enemy || null,
      secretWeapon: strategy?.secret_weapon || null,
    };

    const memoryContext = memories.length > 0
      ? `Brand Memory Patterns:\n${memories.map((m: any) => `- ${m.pattern_category}: ${m.pattern_value} (freq: ${m.frequency})`).join("\n")}`
      : "No brand memory yet.";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!getAIConfig()) {
      return new Response(JSON.stringify({ error: "No AI provider configured (set OPENROUTER_API_KEY or LOVABLE_API_KEY)" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are BrandFlow's Visual Director — an elite creative director AI that transforms user briefs into structured, cinematic generation instructions.

BRAND CONTEXT:
- Business: ${brandContext.business}
- Industry: ${brandContext.industry}  
- Voice: ${brandContext.voice}
- Keywords: ${brandContext.keywords.join(", ")}
- Target Audience: ${brandContext.audience}
- Core Identity: ${JSON.stringify(brandContext.coreIdentity)}
- Enemy (competitor positioning): ${brandContext.enemy || "not defined"}
- Secret Weapon (differentiator): ${brandContext.secretWeapon || "not defined"}

${memoryContext}

TARGET: Platform=${platform || "instagram"}, Format=${format || "reel"}

${Array.isArray(referenceAssets) && referenceAssets.length > 0
  ? `REFERENCE ASSETS PROVIDED (${referenceAssets.length}):
${referenceAssets.map((a: any, i: number) => `${i + 1}. ${a.file_name} (${a.asset_type}) — ${a.file_url}`).join("\n")}

These reference assets should inform your creative direction. Consider the visual style, product appearance, colors, and composition visible in these references. Incorporate them into your SEALCaM scene descriptions where relevant — e.g., "the product shown in reference asset 1" or "matching the warm tones from the brand's uploaded imagery."`
  : "No reference assets provided."}

YOUR JOB:
1. Analyze the user's creative brief
2. Select the RIGHT generation family:
   - F1_UGC: Raw, authentic, social-first content. Handheld feel, real environments, casual tone. Best for testimonials, day-in-life, quick tips, behind-scenes.
   - F2_SPOKESPERSON: Talking-head style with AI avatar. Professional but personable. Best for educational content, announcements, product explainers, thought leadership.
   - F5_CINEMATIC: High-production, commercial-grade visuals. Dramatic lighting, precise camera moves, premium feel. Best for hero ads, brand films, product showcases, launch videos.
3. Structure the brief into SEALCaM scenes (1-4 scenes depending on complexity)
4. Each scene MUST have all 6 SEALCaM fields: subject, environment, action, lighting, camera, metatokens

RESPOND with a JSON object matching this exact structure:
{
  "family": "F1_UGC" | "F2_SPOKESPERSON" | "F5_CINEMATIC",
  "family_label": "human readable label",
  "rationale": "why this family was chosen over alternatives",
  "scenes": [
    {
      "subject": "detailed subject description",
      "environment": "setting and spatial context",
      "action": "what's happening, use present continuous",
      "lighting": "light quality, direction, color temperature",
      "camera": "shot type, angle, movement, lens",
      "metatokens": "style modifiers, quality tokens"
    }
  ],
  "caption_suggestion": "platform-native caption with hashtags if relevant",
  "aspect_ratio": "9:16 or 16:9 or 1:1 or 4:5",
  "estimated_duration_s": 15,
  "mood": "overall mood/energy of the piece",
  "hook_strategy": "the opening hook approach — what grabs attention in the first 2 seconds"
}

Be specific, cinematic, and intentional. Every field must serve the brand's strategic positioning.`;

    const aiResponse = await fetch(getAIConfig()!.url, {
      method: "POST",
      headers: getAIConfig()!.headers,
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: brief },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "structure_creative_brief",
              description: "Structure a creative brief into SEALCaM scenes with family routing",
              parameters: {
                type: "object",
                properties: {
                  family: { type: "string", enum: ["F1_UGC", "F2_SPOKESPERSON", "F5_CINEMATIC"] },
                  family_label: { type: "string" },
                  rationale: { type: "string" },
                  scenes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        subject: { type: "string" },
                        environment: { type: "string" },
                        action: { type: "string" },
                        lighting: { type: "string" },
                        camera: { type: "string" },
                        metatokens: { type: "string" },
                      },
                      required: ["subject", "environment", "action", "lighting", "camera", "metatokens"],
                    },
                  },
                  caption_suggestion: { type: "string" },
                  aspect_ratio: { type: "string" },
                  estimated_duration_s: { type: "number" },
                  mood: { type: "string" },
                  hook_strategy: { type: "string" },
                },
                required: ["family", "family_label", "rationale", "scenes", "caption_suggestion", "aspect_ratio", "estimated_duration_s", "mood", "hook_strategy"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "structure_creative_brief" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI returned no structured output" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result: VisualDirectorOutput = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, direction: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Visual Director error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
