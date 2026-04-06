import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const KIE_BASE = "https://api.kie.ai/api/v1/jobs";

// ── Kie AI Unified Task Helper ───────────────────────────────
async function kieCreateTask(apiKey: string, model: string, input: Record<string, unknown>): Promise<string> {
  const response = await fetch(`${KIE_BASE}/createTask`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, input }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Kie AI createTask failed [${response.status}]: ${err}`);
  }
  const data = await response.json();
  if (data.code !== 200) throw new Error(`Kie AI createTask error: ${data.msg || JSON.stringify(data)}`);
  return data.data.taskId;
}

async function kiePollTask(apiKey: string, taskId: string, maxAttempts = 90, intervalMs = 3000): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const response = await fetch(`${KIE_BASE}/recordInfo?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) { await response.text(); continue; }
    const data = await response.json();
    const state = data.data?.state;
    if (state === "success") {
      const resultJson = data.data.resultJson;
      const parsed = typeof resultJson === "string" ? JSON.parse(resultJson) : resultJson;
      return { urls: parsed.resultUrls || [], costTime: data.data.costTime || 0, lastFrameUrl: parsed.lastFrameUrl || null };
    }
    if (state === "fail") throw new Error(`Kie AI task failed: ${data.data.failMsg || "Unknown error"}`);
  }
  throw new Error("Kie AI task timed out after polling");
}

// ── Provider Router ──────────────────────────────────────────
function routeProvider(assetType: string) {
  switch (assetType) {
    case "image":
    case "carousel":
      return { provider: "replicate", model: "seedream-5", estimatedCost: assetType === "carousel" ? 0.15 : 0.05 };
    case "video":
      return { provider: "kie_ai", model: "kling-2.5", estimatedCost: 0.35 };
    default:
      return { provider: "lovable_ai", model: "google/gemini-3-flash-preview", estimatedCost: 0.002 };
  }
}

function mapAspectRatio(width: number, height: number): string {
  const ratio = width / height;
  if (ratio > 2.0) return "21:9";
  if (ratio > 1.6) return "16:9";
  if (ratio > 1.2) return "4:3";
  if (ratio > 0.9) return "1:1";
  if (ratio > 0.7) return "3:4";
  return "9:16";
}

// ── Image Generation via Replicate Seedream 5 (Primary) ─────
async function generateImage(prompt: string, width: number, height: number) {
  const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
  if (!REPLICATE_API_KEY) {
    console.warn("[Seedream 5] No REPLICATE_API_KEY, falling back to Kie AI");
    return await generateImageKie(prompt, width, height);
  }
  const startTime = Date.now();
  const aspectRatio = mapAspectRatio(width, height);
  try {
    console.log(`[Seedream 5] Generating image via Replicate, aspect: ${aspectRatio}`);
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: { Authorization: `Bearer ${REPLICATE_API_KEY}`, "Content-Type": "application/json", Prefer: "wait" },
      body: JSON.stringify({
        model: "bytedance/seedream-3.0",
        input: {
          prompt,
          aspect_ratio: aspectRatio,
          num_outputs: 1,
          output_format: "png",
          guidance_scale: 5,
        },
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      console.error(`[Seedream 5] Replicate error ${response.status}: ${err}`);
      throw new Error(`Replicate Seedream error: ${response.status}`);
    }
    const prediction = await response.json();

    // If synchronous response (Prefer: wait)
    if (prediction.status === "succeeded" && prediction.output?.[0]) {
      return { url: prediction.output[0], provider: "replicate_seedream_5", cost: 0.05, timeMs: Date.now() - startTime };
    }

    // Async polling fallback
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const pollResp = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { Authorization: `Bearer ${REPLICATE_API_KEY}` },
      });
      const pollData = await pollResp.json();
      if (pollData.status === "succeeded" && pollData.output?.[0]) {
        return { url: pollData.output[0], provider: "replicate_seedream_5", cost: 0.05, timeMs: Date.now() - startTime };
      }
      if (pollData.status === "failed" || pollData.status === "canceled") {
        throw new Error(`Replicate Seedream failed: ${pollData.error || "Unknown"}`);
      }
    }
    throw new Error("Replicate Seedream timed out");
  } catch (e) {
    console.error("[Seedream 5] Failed, trying Kie AI fallback:", e);
    return await generateImageKie(prompt, width, height);
  }
}

// ── Image Fallback via Kie AI Seedream 4.5 ──────────────────
async function generateImageKie(prompt: string, width: number, height: number) {
  const KIE_AI_API_KEY = Deno.env.get("KIE_AI_API_KEY")!;
  const aspectRatio = mapAspectRatio(width, height);
  try {
    const taskId = await kieCreateTask(KIE_AI_API_KEY, "seedream/4.5-text-to-image", { prompt, aspect_ratio: aspectRatio, quality: "basic" });
    const result = await kiePollTask(KIE_AI_API_KEY, taskId, 60, 3000);
    if (!result.urls?.length) throw new Error("Seedream returned no image URLs");
    return { url: result.urls[0], provider: "kie_ai_seedream_4.5", cost: 0.04, timeMs: result.costTime };
  } catch (e) {
    console.error("[Seedream 4.5] Failed, trying FAL fallback:", e);
    return await generateImageFallback(prompt, width, height);
  }
}

// ── Video Generation via Replicate Kling 2.5 (Primary) / Kie AI (Fallback) ──
async function generateVideo(prompt: string, width: number, height: number) {
  const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
  const aspectRatio = mapAspectRatio(width, height);

  // Primary: Replicate Kling 2.5
  if (REPLICATE_API_KEY) {
    try {
      console.log(`[Kling 2.5] Generating video via Replicate, aspect: ${aspectRatio}`);
      const startTime = Date.now();
      const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: { Authorization: `Bearer ${REPLICATE_API_KEY}`, "Content-Type": "application/json", Prefer: "wait=120" },
        body: JSON.stringify({
          model: "kwaai/kling-v2.5-pro",
          input: {
            prompt,
            duration: 5,
            aspect_ratio: aspectRatio,
            negative_prompt: "blurry, low quality, distorted, watermark, text overlay, amateur",
          },
        }),
      });
      if (!response.ok) {
        const err = await response.text();
        console.error(`[Kling 2.5] Replicate error ${response.status}: ${err}`);
        throw new Error(`Replicate Kling error: ${response.status}`);
      }
      const prediction = await response.json();
      if (prediction.status === "succeeded" && prediction.output) {
        const outputUrl = typeof prediction.output === "string" ? prediction.output : prediction.output?.[0] || prediction.output?.video;
        if (outputUrl) return { url: outputUrl, provider: "replicate_kling_2.5", cost: 0.35, timeMs: Date.now() - startTime };
      }
      // Async polling
      for (let i = 0; i < 120; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const pollResp = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
          headers: { Authorization: `Bearer ${REPLICATE_API_KEY}` },
        });
        const pollData = await pollResp.json();
        if (pollData.status === "succeeded") {
          const outputUrl = typeof pollData.output === "string" ? pollData.output : pollData.output?.[0] || pollData.output?.video;
          if (outputUrl) return { url: outputUrl, provider: "replicate_kling_2.5", cost: 0.35, timeMs: Date.now() - startTime };
        }
        if (pollData.status === "failed" || pollData.status === "canceled") {
          throw new Error(`Replicate Kling failed: ${pollData.error || "Unknown"}`);
        }
      }
      throw new Error("Replicate Kling timed out");
    } catch (e) {
      console.error("[Kling 2.5 Replicate] Failed, trying Kie AI fallback:", e);
    }
  }

  // Fallback: Kie AI Kling 2.5 → 3.0 → Seedance
  const KIE_AI_API_KEY = Deno.env.get("KIE_AI_API_KEY");
  if (!KIE_AI_API_KEY) {
    console.error("[Video] No KIE_AI_API_KEY, falling back to image");
    const fallback = await generateImage(prompt, width, height);
    return { ...fallback, provider: fallback.provider + "_video_fallback" };
  }

  // Kie Kling 2.5
  try {
    console.log(`[Kling 2.5 Kie] Generating video, aspect: ${aspectRatio}`);
    const taskId = await kieCreateTask(KIE_AI_API_KEY, "kling/kling-2.5", {
      prompt, aspect_ratio: aspectRatio, resolution: "720p", duration: 5, generate_audio: false, web_search: false,
    });
    const result = await kiePollTask(KIE_AI_API_KEY, taskId, 100, 3000);
    if (!result.urls?.length) throw new Error("Kling 2.5 returned no video URLs");
    return { url: result.urls[0], provider: "kie_ai_kling_2.5", cost: 0.35, timeMs: result.costTime };
  } catch (e) { console.error("[Kling 2.5 Kie] Failed:", e); }

  // Kie Kling 3.0
  try {
    const taskId = await kieCreateTask(KIE_AI_API_KEY, "kling/kling-3.0", {
      prompt, aspect_ratio: aspectRatio, resolution: "720p", duration: 5, generate_audio: false, web_search: false,
    });
    const result = await kiePollTask(KIE_AI_API_KEY, taskId, 100, 3000);
    if (!result.urls?.length) throw new Error("Kling 3.0 returned no video URLs");
    return { url: result.urls[0], provider: "kie_ai_kling_3.0", cost: 0.40, timeMs: result.costTime };
  } catch (e) { console.error("[Kling 3.0 Kie] Failed:", e); }

  // Seedance 2.0
  try {
    const taskId = await kieCreateTask(KIE_AI_API_KEY, "bytedance/seedance-2", {
      prompt, aspect_ratio: aspectRatio, resolution: "720p", duration: 8, generate_audio: false, web_search: false,
    });
    const result = await kiePollTask(KIE_AI_API_KEY, taskId, 100, 3000);
    if (!result.urls?.length) throw new Error("Seedance returned no video URLs");
    return { url: result.urls[0], provider: "kie_ai_seedance_2.0", cost: 0.30, timeMs: result.costTime };
  } catch (e) {
    console.error("[Seedance 2.0] All video providers failed:", e);
    const fallback = await generateImage(prompt, width, height);
    return { ...fallback, provider: fallback.provider + "_video_fallback" };
  }
}

// ── Image Editing via WaveSpeed AI SeedEdit 3.0 ──────────────
async function editImageSeedEdit(imageUrl: string, editPrompt: string, guidanceScale = 0.5) {
  const WAVESPEED_API_KEY = Deno.env.get("WAVESPEED_API_KEY");
  if (!WAVESPEED_API_KEY) throw new Error("WAVESPEED_API_KEY not configured");
  const startTime = Date.now();
  const response = await fetch("https://api.wavespeed.ai/api/v3/bytedance/seededit-v3", {
    method: "POST",
    headers: { Authorization: `Bearer ${WAVESPEED_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ image: imageUrl, prompt: editPrompt, guidance_scale: guidanceScale, seed: -1, enable_base64_output: false }),
  });
  if (!response.ok) { const err = await response.text(); throw new Error(`WaveSpeed SeedEdit submit failed [${response.status}]: ${err}`); }
  const submitData = await response.json();
  const requestId = submitData.data?.id;
  const getUrl = submitData.data?.urls?.get;
  if (!requestId) throw new Error("WaveSpeed SeedEdit returned no request ID");
  const pollEndpoint = getUrl || `https://api.wavespeed.ai/api/v3/predictions/${requestId}/result`;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollResp = await fetch(pollEndpoint, { headers: { Authorization: `Bearer ${WAVESPEED_API_KEY}` } });
    if (!pollResp.ok) { await pollResp.text(); continue; }
    const pollData = await pollResp.json();
    const status = pollData.data?.status;
    if (status === "completed") {
      const outputs = pollData.data?.outputs;
      if (outputs?.length) return { url: outputs[0], provider: "wavespeed_seededit_3.0", cost: 0.027, timeMs: pollData.data?.timings?.inference || (Date.now() - startTime) };
      throw new Error("SeedEdit completed but returned no outputs");
    }
    if (status === "failed") throw new Error(`SeedEdit failed: ${pollData.data?.error || "Unknown"}`);
  }
  throw new Error("SeedEdit 3.0 timed out");
}

// ── Fallback: FAL AI ─────────────────────────────────────────
async function generateImageFallback(prompt: string, width: number, height: number) {
  const FAL_AI_API_KEY = Deno.env.get("FAL_AI_API_KEY");
  if (!FAL_AI_API_KEY) return await generateImageReplicate(prompt, width, height);
  const startTime = Date.now();
  const response = await fetch("https://queue.fal.run/fal-ai/flux/schnell", {
    method: "POST",
    headers: { Authorization: `Key ${FAL_AI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, image_size: { width: Math.min(width, 1024), height: Math.min(height, 1024) }, num_images: 1 }),
  });
  if (!response.ok) { await response.text(); return await generateImageReplicate(prompt, width, height); }
  const data = await response.json();
  if (data.request_url) {
    const resultUrl = data.response_url || data.request_url;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const pollResp = await fetch(resultUrl, { headers: { Authorization: `Key ${FAL_AI_API_KEY}` } });
      if (pollResp.ok) {
        const pollData = await pollResp.json();
        if (pollData.images?.[0]?.url) return { url: pollData.images[0].url, provider: "fal_ai", cost: 0.03, timeMs: Date.now() - startTime };
        if (pollData.status === "COMPLETED" && pollData.output?.images?.[0]?.url) return { url: pollData.output.images[0].url, provider: "fal_ai", cost: 0.03, timeMs: Date.now() - startTime };
      }
    }
    throw new Error("FAL AI generation timed out");
  }
  if (data.images?.[0]?.url) return { url: data.images[0].url, provider: "fal_ai", cost: 0.03, timeMs: Date.now() - startTime };
  throw new Error("FAL AI returned no images");
}

// ── Fallback: Replicate ──────────────────────────────────────
async function generateImageReplicate(prompt: string, width: number, height: number) {
  const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
  if (!REPLICATE_API_KEY) throw new Error("No fallback provider available");
  const startTime = Date.now();
  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: { Authorization: `Bearer ${REPLICATE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b", input: { prompt, width: Math.min(width, 1024), height: Math.min(height, 1024), num_outputs: 1 } }),
  });
  if (!response.ok) { const err = await response.text(); throw new Error(`Replicate error: ${response.status} ${err}`); }
  const prediction = await response.json();
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollResp = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, { headers: { Authorization: `Bearer ${REPLICATE_API_KEY}` } });
    const pollData = await pollResp.json();
    if (pollData.status === "succeeded" && pollData.output?.[0]) return { url: pollData.output[0], provider: "replicate", cost: 0.05, timeMs: Date.now() - startTime };
    if (pollData.status === "failed") throw new Error("Replicate generation failed");
  }
  throw new Error("Replicate generation timed out");
}

// ══════════════════════════════════════════════════════════════
// LAYER 2: DECISION ENGINE — Strategic Creative Selection
// ══════════════════════════════════════════════════════════════
async function runDecisionEngine(
  brandContext: any,
  intelligenceBrief: any,
  brandMemory: any[],
  campaignInstructions: string | null
): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return createFallbackDecision(brandContext, intelligenceBrief);
  }

  // Build brand memory summary for the AI
  const approvedPatterns = brandMemory.filter((m) => m.memory_type === "approval");
  const rejectedPatterns = brandMemory.filter((m) => m.memory_type === "rejection");
  const doNotUse = brandMemory.filter((m) => m.memory_type === "rejection" && m.frequency >= 5);

  const memoryContext = {
    approved: approvedPatterns.map((m) => `${m.pattern_category}: ${m.pattern_value} (${m.frequency}x)`),
    rejected: rejectedPatterns.map((m) => `${m.pattern_category}: ${m.pattern_value} (${m.frequency}x)`),
    do_not_use: doNotUse.map((m) => `${m.pattern_category}: ${m.pattern_value}`),
  };

  try {
    console.log("[Decision Engine] Scoring creative directions via AI");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are the Decision Engine for "${brandContext.businessName}" in the ${brandContext.industry} industry. Your job is to evaluate 5 creative directions, score each one, and select the optimal winner. Be specific, data-driven, and strategic. Reference the research data and brand memory to justify every score.`,
          },
          {
            role: "user",
            content: `Given the following inputs, generate 5 creative directions, score each, and select the winner.

BRAND: ${brandContext.businessName} (${brandContext.industry})
BRAND VOICE: ${brandContext.brandVoice}
TARGET AUDIENCE: ${brandContext.targetAudience}
${campaignInstructions ? `CAMPAIGN INSTRUCTIONS: ${campaignInstructions}` : ""}

RESEARCH INTELLIGENCE:
${JSON.stringify({
  summary: intelligenceBrief?.summary,
  competitors: intelligenceBrief?.competitors?.slice(0, 5),
  hooks: intelligenceBrief?.hooks?.slice(0, 5),
  content_angles: intelligenceBrief?.content_angles?.slice(0, 5),
  visual_direction: intelligenceBrief?.visual_direction,
  avoid: intelligenceBrief?.avoid,
}, null, 2)}

BRAND MEMORY (learned from past interactions):
${JSON.stringify(memoryContext, null, 2)}

Generate exactly 5 creative directions. For each, provide:
- name: short descriptive name
- description: 2-3 sentence creative brief
- angle_type: transformation | social_proof | urgency | authority | lifestyle | education | behind_the_scenes | myth_busting
- hook_suggestion: an attention-grabbing opening line
- format_recommendation: reel | carousel | post | story
- scoring: { brand_alignment: 0-100, market_relevance: 0-100, platform_suitability: 0-100, originality: 0-100 }

Then select the winner with the highest weighted score and explain why.

Output JSON only.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_decision",
              description: "Submit the scored creative directions and winner selection",
              parameters: {
                type: "object",
                properties: {
                  creative_directions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        angle_type: { type: "string" },
                        hook_suggestion: { type: "string" },
                        format_recommendation: { type: "string" },
                        scoring: {
                          type: "object",
                          properties: {
                            brand_alignment: { type: "number" },
                            market_relevance: { type: "number" },
                            platform_suitability: { type: "number" },
                            originality: { type: "number" },
                          },
                        },
                        total_score: { type: "number" },
                      },
                    },
                  },
                  winner_index: { type: "number" },
                  winner_rationale: { type: "string" },
                  confidence_score: { type: "number" },
                  scoring_weights: {
                    type: "object",
                    properties: {
                      brand_alignment: { type: "number" },
                      market_relevance: { type: "number" },
                      platform_suitability: { type: "number" },
                      originality: { type: "number" },
                    },
                  },
                  assumptions: { type: "array", items: { type: "string" } },
                  next_test_recommendation: { type: "string" },
                },
                required: ["creative_directions", "winner_index", "winner_rationale", "confidence_score"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_decision" } },
      }),
    });

    if (!response.ok) {
      console.error("[Decision Engine] AI error:", await response.text());
      return createFallbackDecision(brandContext, intelligenceBrief);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const decision = JSON.parse(toolCall.function.arguments);
      console.log(`[Decision Engine] Winner: ${decision.creative_directions?.[decision.winner_index]?.name}, confidence: ${decision.confidence_score}`);
      return decision;
    }
  } catch (e) {
    console.error("[Decision Engine] Error:", e);
  }

  return createFallbackDecision(brandContext, intelligenceBrief);
}

function createFallbackDecision(brandContext: any, intelligenceBrief: any) {
  return {
    creative_directions: [
      {
        name: "Brand Experience Showcase",
        description: `Highlight the premium experience at ${brandContext.businessName}. Focus on transformation and results.`,
        angle_type: "transformation",
        hook_suggestion: intelligenceBrief?.hooks?.[0] || "Discover the difference",
        format_recommendation: "reel",
        scoring: { brand_alignment: 80, market_relevance: 75, platform_suitability: 85, originality: 70 },
        total_score: 78,
      },
    ],
    winner_index: 0,
    winner_rationale: "Selected based on brand alignment and platform suitability. Limited research data available for more nuanced scoring.",
    confidence_score: 0.6,
    scoring_weights: { brand_alignment: 0.30, market_relevance: 0.25, platform_suitability: 0.25, originality: 0.20 },
    assumptions: ["Using default creative direction due to limited data"],
    next_test_recommendation: "Run research phase to get data-backed creative directions",
  };
}

// ══════════════════════════════════════════════════════════════
// LAYER 3: TRUST ENGINE — Decision Trace Storage
// ══════════════════════════════════════════════════════════════
async function storeDecisionTrace(
  supabase: any,
  userId: string,
  campaignId: string,
  researchId: string | null,
  decision: any,
  intelligenceBrief: any,
  brandMemoryInfluences: any[]
): Promise<string | null> {
  const winner = decision.creative_directions?.[decision.winner_index] || {};
  const rejected = (decision.creative_directions || [])
    .filter((_: any, i: number) => i !== decision.winner_index)
    .map((d: any) => ({
      name: d.name,
      angle_type: d.angle_type,
      total_score: d.total_score,
      reason_rejected: `Score ${d.total_score} vs winner score ${winner.total_score}`,
    }));

  try {
    const { data, error } = await supabase
      .from("decision_traces")
      .insert({
        campaign_id: campaignId,
        profile_id: userId,
        research_id: researchId,
        decision_summary: `Selected "${winner.name}" (${winner.angle_type}) with ${(decision.confidence_score * 100).toFixed(0)}% confidence. ${decision.winner_rationale}`,
        creative_directions: decision.creative_directions || [],
        scoring_criteria: decision.scoring_weights || {},
        winner: { ...winner, rationale: decision.winner_rationale },
        rejected_alternatives: rejected,
        confidence_score: decision.confidence_score || 0,
        brand_memory_influences: brandMemoryInfluences.map((m) => ({
          type: m.memory_type,
          category: m.pattern_category,
          value: m.pattern_value,
          frequency: m.frequency,
        })),
        research_sources: intelligenceBrief?.sources?.slice(0, 10) || [],
        assumptions: decision.assumptions || [],
        next_test_recommendation: decision.next_test_recommendation ? { description: decision.next_test_recommendation } : {},
      })
      .select("id")
      .single();

    if (error) {
      console.error("[Trust Engine] Failed to store trace:", error);
      return null;
    }
    console.log(`[Trust Engine] Decision trace stored: ${data.id}`);
    return data.id;
  } catch (e) {
    console.error("[Trust Engine] Error:", e);
    return null;
  }
}

// ── Caption Generation via Lovable AI ────────────────────────
async function generateCaption(platform: string, format: string, brandContext: any, intelligenceBrief: any, decisionWinner: any, imagePrompt: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return `Content for ${platform} ${format}`;

  const hookSuggestion = decisionWinner?.hook_suggestion || "";
  const angle = decisionWinner?.angle_type || "";
  const directionName = decisionWinner?.name || "brand showcase";
  const directionDesc = decisionWinner?.description || "";

  const platformRules: Record<string, string> = {
    instagram: "Use relevant hashtags (5-10), line breaks for readability, emojis that match the tone. Start with a hook that stops the scroll. Keep under 2200 chars. End with a CTA.",
    tiktok: "Short, punchy, trend-aware. Use 3-5 hashtags. Include a hook question or statement. Keep conversational and Gen-Z friendly. Under 300 chars ideal.",
    linkedin: "Professional but personable. No hashtags in the body (add 3-5 at the end). Use line breaks. Start with a bold statement or insight. 1300 chars max.",
    facebook: "Conversational, community-focused. 1-3 hashtags max. Ask a question to drive engagement. Medium length.",
    twitter: "Concise, punchy. Under 280 chars. 1-2 hashtags max. Make every word count.",
    youtube: "Descriptive title + description format. Include relevant keywords naturally. Add timestamps if applicable.",
  };

  const platformRule = platformRules[platform.toLowerCase()] || platformRules.instagram;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: `You are an elite social media copywriter for "${brandContext.businessName || "the brand"}" in the ${brandContext.industry || "beauty"} industry. 
Brand voice: ${brandContext.brandVoice || "professional, warm"}.
Target audience: ${brandContext.targetAudience || "general audience"}.

You write captions that feel NATIVE to each platform — not generic marketing copy. Every caption must:
1. Open with a scroll-stopping hook
2. Connect emotionally with the target audience
3. Include a clear but subtle call-to-action
4. Match the platform's culture and formatting norms
5. Be directly relevant to the visual content being posted`,
        },
        {
          role: "user",
          content: `Write a caption for this ${platform} ${format} post.

THE VISUAL CONTENT: ${imagePrompt}

CREATIVE DIRECTION: "${directionName}" — ${directionDesc}
ANGLE: ${angle}
HOOK INSPIRATION: ${hookSuggestion}

${intelligenceBrief?.content_angles ? `TRENDING ANGLES IN THIS SPACE: ${intelligenceBrief.content_angles.slice(0, 5).join(", ")}` : ""}
${intelligenceBrief?.hooks ? `COMPETITOR HOOKS WORKING NOW: ${intelligenceBrief.hooks.slice(0, 5).join(" | ")}` : ""}
${intelligenceBrief?.avoid ? `AVOID THESE APPROACHES: ${intelligenceBrief.avoid.join(", ")}` : ""}

PLATFORM RULES: ${platformRule}

Output ONLY the caption text. No explanations, no quotes around it. Just the raw caption ready to paste.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    await response.text();
    return `Discover the difference at ${brandContext.businessName || "our studio"}. ✨ #${brandContext.industry || "beauty"}`;
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || `Content for ${platform}`;
}

// ── Prompt Builders (now powered by Decision Engine output) ──
function buildImagePrompt(platform: string, format: string, brandContext: any, intelligenceBrief: any, decisionWinner: any): string {
  const baseStyle = intelligenceBrief?.visual_direction || "modern, clean, professional photography style";
  const angle = decisionWinner?.description || "showcase the brand experience";
  const hookText = decisionWinner?.hook_suggestion || "";
  const avoid = intelligenceBrief?.avoid || [];

  let prompt = `Professional ${brandContext.industry || "beauty and wellness"} marketing image for ${platform} ${format}. `;
  prompt += `Brand: "${brandContext.businessName || "luxury wellness studio"}". `;
  prompt += `Visual style: ${baseStyle}. `;
  prompt += `Creative direction: ${angle}. `;
  if (hookText) prompt += `Concept: ${hookText}. `;
  prompt += `The image should feel premium, aspirational, and authentic. `;
  if (format === "story" || format === "reel") prompt += `Vertical composition optimized for mobile full-screen viewing. `;
  else if (format === "post") prompt += `Well-composed with clean negative space for text overlay potential. `;
  if (avoid.length > 0) prompt += `Avoid: ${avoid.slice(0, 3).join(", ")}. `;
  return prompt;
}

function buildVideoPrompt(platform: string, format: string, brandContext: any, intelligenceBrief: any, decisionWinner: any): string {
  const baseStyle = intelligenceBrief?.visual_direction || "cinematic, smooth motion, professional";
  const angle = decisionWinner?.description || "brand experience showcase";
  const hookText = decisionWinner?.hook_suggestion || "";

  let prompt = `Professional ${brandContext.industry || "beauty"} marketing video for ${platform} ${format}. `;
  prompt += `Brand: "${brandContext.businessName || "luxury studio"}". Style: ${baseStyle}. `;
  prompt += `Creative direction: ${angle}. `;
  if (hookText) prompt += `Opening concept: ${hookText}. `;
  prompt += `Smooth camera movement, high production value, aspirational feel. `;
  if (format === "reel" || format === "story") prompt += `Vertical video optimized for mobile viewing. Dynamic pacing. `;
  return prompt;
}

// ── SEALCaM → Prompt Compiler (Family-Aware) ────────────────
function compileSealcamToPrompt(scene: any, family: string, brandContext: any): string {
  const familyModifiers: Record<string, string> = {
    F1_UGC: "handheld camera, raw authentic feel, natural imperfections, social-first energy, real environment",
    F2_SPOKESPERSON: "talking head, professional but personable, clean background, direct eye contact, confident delivery",
    F5_CINEMATIC: "cinematic 4K, dramatic composition, professional color grading, premium production value, smooth dolly movement",
  };

  const modifier = familyModifiers[family] || familyModifiers.F5_CINEMATIC;

  let prompt = `${scene.subject}. `;
  prompt += `Environment: ${scene.environment}. `;
  prompt += `Action: ${scene.action}. `;
  prompt += `Lighting: ${scene.lighting}. `;
  prompt += `Camera: ${scene.camera}. `;
  if (scene.metatokens) prompt += `Style: ${scene.metatokens}. `;
  prompt += `${modifier}. `;
  if (brandContext?.businessName) prompt += `Brand: ${brandContext.businessName}. `;
  prompt += `No text overlays, no watermarks.`;
  return prompt;
}

function buildVideoPromptFromDirection(creativeDirection: any, sceneIndex: number, brandContext: any): string {
  const scene = creativeDirection.scenes?.[sceneIndex];
  if (!scene) return buildVideoPrompt("instagram", "reel", brandContext, {}, {});
  return compileSealcamToPrompt(scene, creativeDirection.family, brandContext);
}

// ── Background Processing (now with Decision Engine) ─────────
async function processAssetsInBackground(
  userId: string,
  campaignId: string,
  assets: any[],
  researchId: string | null,
  intelligenceBrief: any,
  brandContext: any,
  placeholderIds: string[],
  decisionTraceId: string | null,
  decisionWinner: any
) {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    const placeholderId = placeholderIds[i];
    if (placeholderId === "error") continue;
    const startTime = Date.now();
    const { platform, format, aspectRatio, width, height, assetType } = asset;

    try {
      let contentUrl: string | null = null;
      let actualProvider = "pending";
      let actualCost = 0;
      let generationTimeMs = 0;

      let generatedPrompt = "";

      if (assetType === "image" || assetType === "carousel") {
        generatedPrompt = buildImagePrompt(platform, format, brandContext || {}, intelligenceBrief || {}, decisionWinner);
        console.log(`[Generate] ${assetType} for ${platform}/${format} via Replicate Seedream 5`);
        const result = await generateImage(generatedPrompt, width || 1080, height || 1080);
        contentUrl = result.url;
        actualProvider = result.provider;
        actualCost = result.cost;
        generationTimeMs = result.timeMs;
      } else if (assetType === "video") {
        generatedPrompt = buildVideoPrompt(platform, format, brandContext || {}, intelligenceBrief || {}, decisionWinner);
        console.log(`[Generate] video for ${platform}/${format} via Kling 2.5`);
        const result = await generateVideo(generatedPrompt, width || 1080, height || 1920);
        contentUrl = result.url;
        actualProvider = result.provider;
        actualCost = result.cost;
        generationTimeMs = result.timeMs;
      }

      // Generate caption using decision context + the actual visual prompt for accuracy
      const caption = await generateCaption(platform, format, brandContext || {}, intelligenceBrief || {}, decisionWinner, generatedPrompt);
      if (!generationTimeMs) generationTimeMs = Date.now() - startTime;

      // Build structured rationale from decision engine
      const rationale = JSON.stringify({
        direction: decisionWinner?.name || "default",
        angle: decisionWinner?.angle_type || "general",
        confidence: decisionWinner?.total_score || 0,
        hook: decisionWinner?.hook_suggestion || "",
        trace_id: decisionTraceId,
      });

      const { error: updateError } = await supabase
        .from("generated_assets")
        .update({
          content_url: contentUrl,
          content_text: `[meta:${platform}|${format}|${aspectRatio}] ${caption}`,
          status: "pending_review",
          provider: actualProvider,
          generation_cost: actualCost,
          generation_time_ms: generationTimeMs,
          rationale,
        })
        .eq("id", placeholderId);

      // Link decision trace to this asset
      if (decisionTraceId) {
        await supabase
          .from("decision_traces")
          .update({ asset_id: placeholderId })
          .eq("id", decisionTraceId)
          .is("asset_id", null);
      }

      if (updateError) console.error(`[BG] Update error for ${placeholderId}:`, updateError);
      else console.log(`[BG] ✅ ${platform}/${format} done (${actualProvider})`);
    } catch (e) {
      console.error(`[BG] Generation error for ${platform}/${format}:`, e);
      await supabase
        .from("generated_assets")
        .update({
          content_text: `[meta:${platform}|${format}|${aspectRatio}] Generation failed — tap to regenerate`,
          status: "pending_review",
          provider: "error",
          generation_cost: 0,
          generation_time_ms: Date.now() - startTime,
          rationale: `Error: ${e instanceof Error ? e.message : "Unknown"}`,
        })
        .eq("id", placeholderId);
    }
  }

  // Update campaign status
  const { data: finalAssets } = await supabase.from("generated_assets").select("content_url").eq("campaign_id", campaignId);
  const hasSuccesses = finalAssets?.some((a: any) => a.content_url != null);
  await supabase.from("campaigns").update({ status: hasSuccesses ? "review" : "draft" }).eq("id", campaignId);
  console.log(`[BG] Campaign ${campaignId} processing complete`);
}

// ── Main Handler ─────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: authError } = await anonClient.auth.getUser();
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { action } = body;

    // ── Edit Action (SeedEdit 3.0 via WaveSpeed) ──────────────
    if (action === "edit") {
      const { assetId, imageUrl, editPrompt, guidanceScale } = body;
      if (!assetId || typeof assetId !== "string" || !imageUrl || typeof imageUrl !== "string" || !editPrompt || typeof editPrompt !== "string") {
        return new Response(JSON.stringify({ error: "assetId (string), imageUrl (string), and editPrompt (string) required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (editPrompt.length > 2000) {
        return new Response(JSON.stringify({ error: "editPrompt must be under 2000 characters" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      EdgeRuntime.waitUntil((async () => {
        try {
          const result = await editImageSeedEdit(imageUrl, editPrompt, guidanceScale || 0.5);
          await supabase.from("generated_assets").update({ content_url: result.url, provider: result.provider, generation_cost: result.cost, generation_time_ms: result.timeMs, rationale: `Edited: ${editPrompt}`, status: "pending_review" }).eq("id", assetId).eq("profile_id", userId);
        } catch (e) {
          console.error("[SeedEdit 3.0] Edit failed:", e);
          await supabase.from("generated_assets").update({ rationale: `Edit failed: ${e instanceof Error ? e.message : "Unknown"}`, status: "pending_review" }).eq("id", assetId);
        }
      })());
      return new Response(JSON.stringify({ success: true, message: "Edit started" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Regenerate Caption Only ─────────────────────────────────
    if (action === "regenerate_caption") {
      const { assetId, platform, format } = body;
      if (!assetId || typeof assetId !== "string") {
        return new Response(JSON.stringify({ error: "assetId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Load asset, brand context, and decision trace
      const { data: asset } = await supabase.from("generated_assets").select("*").eq("id", assetId).eq("profile_id", userId).single();
      if (!asset) {
        return new Response(JSON.stringify({ error: "Asset not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();
      const { data: campaign } = await supabase.from("campaigns").select("*").eq("id", asset.campaign_id).single();

      // Try to load the decision trace for this asset
      const { data: trace } = await supabase.from("decision_traces").select("*").eq("campaign_id", asset.campaign_id).eq("profile_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();

      const brandContext = {
        businessName: profile?.business_name || "",
        industry: profile?.industry || "",
        brandVoice: profile?.brand_voice_tone || "",
        targetAudience: profile?.target_audience || "",
      };

      const decisionWinner = trace?.winner || {};
      const intelligenceBrief = {};

      // Build the visual prompt that describes what the image shows
      const visualPrompt = buildImagePrompt(
        platform || asset.platform || "instagram",
        format || asset.format || "post",
        brandContext,
        intelligenceBrief,
        decisionWinner
      );

      const caption = await generateCaption(
        platform || asset.platform || "instagram",
        format || asset.format || "post",
        brandContext,
        intelligenceBrief,
        decisionWinner,
        visualPrompt
      );

      // Preserve meta prefix, update caption
      const metaMatch = asset.content_text?.match(/^\[meta:[^\]]*\]/);
      const metaPrefix = metaMatch?.[0] ? `${metaMatch[0]} ` : "";
      const newContentText = `${metaPrefix}${caption}`;

      await supabase.from("generated_assets").update({ content_text: newContentText }).eq("id", assetId);

      return new Response(JSON.stringify({ success: true, caption }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Brand Memory Action — record approval/rejection ───────
    if (action === "record_memory") {
      const { memoryType, patternCategory, patternValue, context: memCtx } = body;
      const ALLOWED_MEMORY_TYPES = ["approval", "rejection", "preference", "brand_profile"];
      if (!memoryType || !patternCategory || !patternValue) {
        return new Response(JSON.stringify({ error: "memoryType, patternCategory, patternValue required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!ALLOWED_MEMORY_TYPES.includes(memoryType)) {
        return new Response(JSON.stringify({ error: `memoryType must be one of: ${ALLOWED_MEMORY_TYPES.join(", ")}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (typeof patternCategory !== "string" || patternCategory.length > 255 || typeof patternValue !== "string" || patternValue.length > 500) {
        return new Response(JSON.stringify({ error: "patternCategory (max 255) and patternValue (max 500) must be strings" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Upsert: increment frequency if pattern already exists
      const { data: existing } = await supabase
        .from("brand_memory")
        .select("id, frequency")
        .eq("profile_id", userId)
        .eq("memory_type", memoryType)
        .eq("pattern_category", patternCategory)
        .eq("pattern_value", patternValue)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("brand_memory")
          .update({ frequency: existing.frequency + 1, last_seen_at: new Date().toISOString(), context: memCtx || {} })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("brand_memory")
          .insert({ profile_id: userId, memory_type: memoryType, pattern_category: patternCategory, pattern_value: patternValue, context: memCtx || {} });
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Generate Action (with full four-layer pipeline) ───────
    const { campaignId, assets, researchId, intelligenceBrief, brandContext } = body;

    if (!campaignId || typeof campaignId !== "string" || !assets || !Array.isArray(assets) || assets.length === 0) {
      return new Response(JSON.stringify({ error: "campaignId (string) and non-empty assets[] required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (assets.length > 50) {
      return new Response(JSON.stringify({ error: "Maximum 50 assets per generation request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Validate each asset entry
    const VALID_ASSET_TYPES = ["image", "video", "carousel", "copy"];
    for (const a of assets) {
      if (!a.platform || !a.format || !a.assetType || !VALID_ASSET_TYPES.includes(a.assetType)) {
        return new Response(JSON.stringify({ error: `Each asset requires platform, format, and assetType (${VALID_ASSET_TYPES.join("|")})` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Update campaign to generating
    await supabase.from("campaigns").update({ status: "generating" }).eq("id", campaignId);

    // ── LAYER 4: Load Brand Memory ────────────────────────────
    const { data: brandMemory } = await supabase
      .from("brand_memory")
      .select("*")
      .eq("profile_id", userId)
      .order("frequency", { ascending: false })
      .limit(50);

    console.log(`[Brand Memory] Loaded ${brandMemory?.length || 0} memory entries`);

    // ── LAYER 2: Run Decision Engine ──────────────────────────
    const { data: campaignData } = await supabase.from("campaigns").select("instructions").eq("id", campaignId).single();
    const decision = await runDecisionEngine(brandContext || {}, intelligenceBrief || {}, brandMemory || [], campaignData?.instructions || null);
    const decisionWinner = decision.creative_directions?.[decision.winner_index] || {};

    // ── LAYER 3: Store Decision Trace ─────────────────────────
    const decisionTraceId = await storeDecisionTrace(supabase, userId, campaignId, researchId || null, decision, intelligenceBrief || {}, brandMemory || []);

    // Insert placeholder rows
    const placeholderIds: string[] = [];
    for (const asset of assets) {
      const { platform, format, aspectRatio, assetType } = asset;
      const route = routeProvider(assetType);
      const { data: placeholder, error: insertError } = await supabase
        .from("generated_assets")
        .insert({
          campaign_id: campaignId,
          profile_id: userId,
          asset_type: assetType,
          content_url: null,
          content_text: `[meta:${platform}|${format}|${aspectRatio}] Generating…`,
          status: "pending_review",
          platform,
          format,
          provider: route.provider,
          generation_cost: 0,
          generation_time_ms: 0,
          research_id: researchId || null,
          rationale: "Generating…",
        })
        .select("id")
        .single();

      placeholderIds.push(insertError ? "error" : placeholder.id);
    }

    // Fire background processing
    EdgeRuntime.waitUntil(
      processAssetsInBackground(userId, campaignId, assets, researchId || null, intelligenceBrief || {}, brandContext || {}, placeholderIds, decisionTraceId, decisionWinner)
        .catch((e) => console.error("[BG] Fatal error:", e))
    );

    return new Response(
      JSON.stringify({
        message: "Generation started",
        placeholders: placeholderIds.length,
        decisionTraceId,
        decision: {
          winner: decisionWinner.name,
          angle: decisionWinner.angle_type,
          confidence: decision.confidence_score,
          rationale: decision.winner_rationale,
        },
        summary: { total: assets.length, succeeded: 0, failed: 0, totalCost: "0.0000", status: "generating" },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Generate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
