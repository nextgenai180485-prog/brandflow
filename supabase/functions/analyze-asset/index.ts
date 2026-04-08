import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image_url, analysis_mode } = await req.json();

    if (!image_url || typeof image_url !== "string") {
      return new Response(JSON.stringify({ error: "image_url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!getAIConfig()) {
      return new Response(JSON.stringify({ error: "No AI provider configured (set OPENROUTER_API_KEY or LOVABLE_API_KEY)" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode-specific extraction schemas
    const modes: Record<string, { system: string; schema: any }> = {
      sealcam: {
        system: `You are an elite visual analyst. Extract a SEALCaM (Subject, Environment, Action, Lighting, Camera, Metatokens) breakdown from this image. Be precise, cinematic, and technical. Describe exactly what you see — not what you imagine.`,
        schema: {
          name: "extract_sealcam",
          description: "Extract SEALCaM cinematic analysis from an image",
          parameters: {
            type: "object",
            properties: {
              subject: { type: "string", description: "Primary subject(s) — appearance, positioning, expression, clothing, product details" },
              environment: { type: "string", description: "Setting, background, spatial context, props, surfaces" },
              action: { type: "string", description: "What is happening — movement, gesture, interaction (use present continuous)" },
              lighting: { type: "string", description: "Light quality, direction, color temperature, shadows, highlights, key/fill/rim" },
              camera: { type: "string", description: "Shot type, angle, focal length estimate, depth of field, movement" },
              metatokens: { type: "string", description: "Style modifiers — film stock feel, grain, color grade, mood, era, artistic reference" },
              mood: { type: "string", description: "Overall emotional tone in 2-4 words" },
              composition: { type: "string", description: "Framing, rule of thirds, leading lines, negative space, visual weight" },
              color_palette: { type: "array", items: { type: "string" }, description: "3-6 dominant colors as descriptive names" },
            },
            required: ["subject", "environment", "action", "lighting", "camera", "metatokens", "mood", "composition", "color_palette"],
          },
        },
      },
      style_guide: {
        system: `You are an elite visual style analyst. Extract the visual style attributes from this image that can be used as a reusable style template for image generation. Focus on reproducible style elements, not content-specific details.`,
        schema: {
          name: "extract_style_guide",
          description: "Extract style guide from an image for template creation",
          parameters: {
            type: "object",
            properties: {
              mood: { type: "string", description: "Overall mood/atmosphere (e.g., 'luxury minimal', 'warm lifestyle')" },
              lighting: { type: "string", description: "Lighting setup description (e.g., 'soft studio three-point')" },
              composition: { type: "string", description: "Composition pattern (e.g., 'centered product hero')" },
              background: { type: "string", description: "Background style (e.g., 'clean white gradient')" },
              color_treatment: { type: "string", description: "Color grading/treatment (e.g., 'warm film-like tones')" },
              texture: { type: "string", description: "Surface/texture quality (e.g., 'organic matte', 'glossy reflective')" },
              depth_of_field: { type: "string", description: "DOF characteristic (e.g., 'shallow with product sharp')" },
              style_reference: { type: "string", description: "Similar to what professional style (e.g., 'Apple product photography')" },
            },
            required: ["mood", "lighting", "composition", "background", "color_treatment"],
          },
        },
      },
      persona: {
        system: `You are an elite casting analyst. Extract detailed persona and appearance traits from this character/person image for use as an AI character reference. Be precise about physical attributes, expression, and casting qualities.`,
        schema: {
          name: "extract_persona",
          description: "Extract persona traits from a character image",
          parameters: {
            type: "object",
            properties: {
              appearance: { type: "string", description: "Physical description — build, hair, skin tone, distinguishing features" },
              expression: { type: "string", description: "Facial expression and emotional projection" },
              wardrobe: { type: "string", description: "Clothing style, colors, formality level" },
              energy: { type: "string", description: "Overall energy/vibe (e.g., 'confident professional', 'approachable warm')" },
              casting_type: { type: "string", description: "What type of role this person fits (e.g., 'tech CEO', 'fitness influencer')" },
              age_estimate: { type: "string", description: "Estimated age range" },
              voice_impression: { type: "string", description: "What voice style would match this person's appearance" },
            },
            required: ["appearance", "expression", "energy", "casting_type"],
          },
        },
      },
    };

    const mode = modes[analysis_mode] || modes.sealcam;

    const aiResponse = await fetch(getAIConfig()!.url, {
      method: "POST",
      headers: getAIConfig()!.headers,
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: mode.system },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this image and extract the structured data." },
              { type: "image_url", image_url: { url: image_url } },
            ],
          },
        ],
        tools: [{ type: "function", function: mode.schema }],
        tool_choice: { type: "function", function: { name: mode.schema.name } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly.", fallback: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted — top up in Settings → Workspace → Usage.", fallback: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI returned no structured output" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Analyze asset error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
