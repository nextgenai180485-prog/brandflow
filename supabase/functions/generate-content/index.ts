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
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Kie AI createTask failed [${response.status}]: ${err}`);
  }

  const data = await response.json();
  if (data.code !== 200) {
    throw new Error(`Kie AI createTask error: ${data.msg || JSON.stringify(data)}`);
  }
  return data.data.taskId;
}

async function kiePollTask(apiKey: string, taskId: string, maxAttempts = 90, intervalMs = 3000): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const response = await fetch(`${KIE_BASE}/recordInfo?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`Kie AI poll error [${response.status}]:`, err);
      continue;
    }

    const data = await response.json();
    const state = data.data?.state;

    if (state === "success") {
      const resultJson = data.data.resultJson;
      const parsed = typeof resultJson === "string" ? JSON.parse(resultJson) : resultJson;
      return {
        urls: parsed.resultUrls || [],
        costTime: data.data.costTime || 0,
        lastFrameUrl: parsed.lastFrameUrl || null,
      };
    }

    if (state === "fail") {
      throw new Error(`Kie AI task failed: ${data.data.failMsg || "Unknown error"}`);
    }
    // else waiting/queuing/generating — continue polling
  }
  throw new Error("Kie AI task timed out after polling");
}

// ── Provider Router ──────────────────────────────────────────
interface RouteResult {
  provider: string;
  model: string;
  estimatedCost: number;
}

function routeProvider(assetType: string): RouteResult {
  switch (assetType) {
    case "image":
    case "carousel":
      return {
        provider: "kie_ai",
        model: "seedream/4.5-text-to-image",
        estimatedCost: assetType === "carousel" ? 0.12 : 0.04,
      };
    case "video":
      return {
        provider: "kie_ai",
        model: "bytedance/seedance-2",
        estimatedCost: 0.30,
      };
    case "copy":
      return {
        provider: "lovable_ai",
        model: "google/gemini-3-flash-preview",
        estimatedCost: 0.002,
      };
    default:
      return {
        provider: "lovable_ai",
        model: "google/gemini-3-flash-preview",
        estimatedCost: 0.002,
      };
  }
}

// ── Aspect Ratio Mapping ─────────────────────────────────────
function mapAspectRatioForSeedream(width: number, height: number): string {
  const ratio = width / height;
  if (ratio > 2.0) return "21:9";
  if (ratio > 1.6) return "16:9";
  if (ratio > 1.2) return "4:3";
  if (ratio > 0.9) return "1:1";
  if (ratio > 0.7) return "3:4";
  if (ratio > 0.5) return "9:16";
  return "9:16";
}

function mapAspectRatioForSeedance(width: number, height: number): string {
  const ratio = width / height;
  if (ratio > 2.0) return "21:9";
  if (ratio > 1.6) return "16:9";
  if (ratio > 1.2) return "4:3";
  if (ratio > 0.9) return "1:1";
  if (ratio > 0.7) return "3:4";
  return "9:16";
}

// ── Image Generation via Kie AI Seedream 4.5 ────────────────
async function generateImage(
  prompt: string,
  width: number,
  height: number
): Promise<{ url: string; provider: string; cost: number; timeMs: number }> {
  const KIE_AI_API_KEY = Deno.env.get("KIE_AI_API_KEY")!;
  const aspectRatio = mapAspectRatioForSeedream(width, height);

  console.log(`[Seedream 4.5] Creating task, aspect: ${aspectRatio}`);

  try {
    const taskId = await kieCreateTask(KIE_AI_API_KEY, "seedream/4.5-text-to-image", {
      prompt,
      aspect_ratio: aspectRatio,
      quality: "basic", // "basic" = 2K, "high" = 4K
    });

    console.log(`[Seedream 4.5] Task created: ${taskId}, polling...`);
    const result = await kiePollTask(KIE_AI_API_KEY, taskId, 60, 3000);

    if (!result.urls || result.urls.length === 0) {
      throw new Error("Seedream returned no image URLs");
    }

    return {
      url: result.urls[0],
      provider: "kie_ai_seedream_4.5",
      cost: 0.04,
      timeMs: result.costTime,
    };
  } catch (e) {
    console.error("[Seedream 4.5] Failed, trying fallback:", e);
    return await generateImageFallback(prompt, width, height);
  }
}

// ── Video Generation via Kie AI Seedance 2.0 ─────────────────
async function generateVideo(
  prompt: string,
  width: number,
  height: number
): Promise<{ url: string; provider: string; cost: number; timeMs: number }> {
  const KIE_AI_API_KEY = Deno.env.get("KIE_AI_API_KEY")!;
  const aspectRatio = mapAspectRatioForSeedance(width, height);

  console.log(`[Seedance 2.0] Creating video task, aspect: ${aspectRatio}`);

  try {
    const taskId = await kieCreateTask(KIE_AI_API_KEY, "bytedance/seedance-2", {
      prompt,
      aspect_ratio: aspectRatio,
      resolution: "720p",
      duration: 8,
      generate_audio: false,
      web_search: false,
    });

    console.log(`[Seedance 2.0] Task created: ${taskId}, polling...`);
    // Video takes longer — poll up to 5 minutes
    const result = await kiePollTask(KIE_AI_API_KEY, taskId, 100, 3000);

    if (!result.urls || result.urls.length === 0) {
      throw new Error("Seedance returned no video URLs");
    }

    return {
      url: result.urls[0],
      provider: "kie_ai_seedance_2.0",
      cost: 0.30,
      timeMs: result.costTime,
    };
  } catch (e) {
    console.error("[Seedance 2.0] Failed, trying image fallback:", e);
    // Fallback: generate a still image if video fails
    const fallback = await generateImage(prompt, width, height);
    return { ...fallback, provider: fallback.provider + "_video_fallback" };
  }
}
// ── Image Editing via WaveSpeed AI SeedEdit 3.0 ──────────────
async function editImageSeedEdit(
  imageUrl: string,
  editPrompt: string,
  guidanceScale = 0.5
): Promise<{ url: string; provider: string; cost: number; timeMs: number }> {
  const WAVESPEED_API_KEY = Deno.env.get("WAVESPEED_API_KEY");
  if (!WAVESPEED_API_KEY) throw new Error("WAVESPEED_API_KEY not configured");

  const startTime = Date.now();
  console.log(`[SeedEdit 3.0] Editing image via WaveSpeed AI`);

  // Submit task
  const response = await fetch("https://api.wavespeed.ai/api/v3/bytedance/seededit-v3", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WAVESPEED_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image: imageUrl,
      prompt: editPrompt,
      guidance_scale: guidanceScale,
      seed: -1,
      enable_base64_output: false,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`WaveSpeed SeedEdit submit failed [${response.status}]: ${err}`);
  }

  const submitData = await response.json();
  const requestId = submitData.data?.id;
  const getUrl = submitData.data?.urls?.get;

  if (!requestId) {
    throw new Error("WaveSpeed SeedEdit returned no request ID");
  }

  // Poll for result
  const pollEndpoint = getUrl || `https://api.wavespeed.ai/api/v3/predictions/${requestId}/result`;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollResp = await fetch(pollEndpoint, {
      headers: { Authorization: `Bearer ${WAVESPEED_API_KEY}` },
    });

    if (!pollResp.ok) {
      const err = await pollResp.text();
      console.error(`[SeedEdit 3.0] Poll error [${pollResp.status}]:`, err);
      continue;
    }

    const pollData = await pollResp.json();
    const status = pollData.data?.status;

    if (status === "completed") {
      const outputs = pollData.data?.outputs;
      if (outputs && outputs.length > 0) {
        return {
          url: outputs[0],
          provider: "wavespeed_seededit_3.0",
          cost: 0.027,
          timeMs: pollData.data?.timings?.inference || (Date.now() - startTime),
        };
      }
      throw new Error("SeedEdit completed but returned no outputs");
    }

    if (status === "failed") {
      throw new Error(`SeedEdit failed: ${pollData.data?.error || "Unknown"}`);
    }
  }

  throw new Error("SeedEdit 3.0 timed out");
}

// ── Fallback: FAL AI ─────────────────────────────────────────
async function generateImageFallback(
  prompt: string,
  width: number,
  height: number
): Promise<{ url: string; provider: string; cost: number; timeMs: number }> {
  const FAL_AI_API_KEY = Deno.env.get("FAL_AI_API_KEY");
  if (!FAL_AI_API_KEY) {
    return await generateImageReplicate(prompt, width, height);
  }

  const startTime = Date.now();
  const response = await fetch("https://queue.fal.run/fal-ai/flux/schnell", {
    method: "POST",
    headers: {
      Authorization: `Key ${FAL_AI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_size: { width: Math.min(width, 1024), height: Math.min(height, 1024) },
      num_images: 1,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("FAL AI fallback error:", response.status, err);
    return await generateImageReplicate(prompt, width, height);
  }

  const data = await response.json();

  if (data.request_url) {
    const resultUrl = data.response_url || data.request_url;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const pollResp = await fetch(resultUrl, {
        headers: { Authorization: `Key ${FAL_AI_API_KEY}` },
      });
      if (pollResp.ok) {
        const pollData = await pollResp.json();
        if (pollData.images?.[0]?.url) {
          return { url: pollData.images[0].url, provider: "fal_ai", cost: 0.03, timeMs: Date.now() - startTime };
        }
        if (pollData.status === "COMPLETED" && pollData.output?.images?.[0]?.url) {
          return { url: pollData.output.images[0].url, provider: "fal_ai", cost: 0.03, timeMs: Date.now() - startTime };
        }
      }
    }
    throw new Error("FAL AI generation timed out");
  }

  if (data.images?.[0]?.url) {
    return { url: data.images[0].url, provider: "fal_ai", cost: 0.03, timeMs: Date.now() - startTime };
  }

  throw new Error("FAL AI returned no images");
}

// ── Fallback: Replicate ──────────────────────────────────────
async function generateImageReplicate(
  prompt: string,
  width: number,
  height: number
): Promise<{ url: string; provider: string; cost: number; timeMs: number }> {
  const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
  if (!REPLICATE_API_KEY) throw new Error("No fallback provider available");

  const startTime = Date.now();
  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REPLICATE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      input: {
        prompt,
        width: Math.min(width, 1024),
        height: Math.min(height, 1024),
        num_outputs: 1,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Replicate error: ${response.status} ${err}`);
  }

  const prediction = await response.json();

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollResp = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { Authorization: `Bearer ${REPLICATE_API_KEY}` },
    });
    const pollData = await pollResp.json();
    if (pollData.status === "succeeded" && pollData.output?.[0]) {
      return { url: pollData.output[0], provider: "replicate", cost: 0.05, timeMs: Date.now() - startTime };
    }
    if (pollData.status === "failed") {
      throw new Error("Replicate generation failed");
    }
  }
  throw new Error("Replicate generation timed out");
}

// ── Caption Generation via Lovable AI ────────────────────────
async function generateCaption(
  platform: string,
  format: string,
  brandContext: any,
  intelligenceBrief: any
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return `Content for ${platform} ${format}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: `You are a social media copywriter for "${brandContext.businessName || "the brand"}" in the ${brandContext.industry || "beauty"} industry. Brand voice: ${brandContext.brandVoice || "professional, warm"}. Write captions that are native to each platform.`,
        },
        {
          role: "user",
          content: `Write a single ${platform} ${format} caption for this brand.
Target audience: ${brandContext.targetAudience || "general audience"}
${intelligenceBrief?.content_angles ? `Trending angles: ${intelligenceBrief.content_angles.join(", ")}` : ""}
${intelligenceBrief?.hooks ? `Hook inspiration: ${intelligenceBrief.hooks.join("; ")}` : ""}

Requirements:
- Platform-native formatting (hashtags for IG, professional tone for LinkedIn, etc.)
- Include relevant emojis
- Include a call-to-action
- Keep it concise and engaging
- Output ONLY the caption text, no explanations`,
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error("Caption AI error:", response.status);
    return `Discover the difference at ${brandContext.businessName || "our studio"}. ✨ #${brandContext.industry || "beauty"}`;
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || `Content for ${platform}`;
}

// ── Image Prompt Builder ─────────────────────────────────────
function buildImagePrompt(
  platform: string,
  format: string,
  brandContext: any,
  intelligenceBrief: any
): string {
  const baseStyle = intelligenceBrief?.visual_direction || "modern, clean, professional photography style";
  const angles = intelligenceBrief?.content_angles || [];
  const angle = angles[Math.floor(Math.random() * Math.max(angles.length, 1))] || "showcase the brand experience";
  const avoid = intelligenceBrief?.avoid || [];

  let prompt = `Professional ${brandContext.industry || "beauty and wellness"} marketing image for ${platform} ${format}. `;
  prompt += `Brand: "${brandContext.businessName || "luxury wellness studio"}". `;
  prompt += `Visual style: ${baseStyle}. `;
  prompt += `Creative angle: ${angle}. `;
  prompt += `The image should feel premium, aspirational, and authentic. `;

  if (format === "story" || format === "reel") {
    prompt += `Vertical composition optimized for mobile full-screen viewing. `;
  } else if (format === "post") {
    prompt += `Well-composed with clean negative space for text overlay potential. `;
  }

  if (avoid.length > 0) {
    prompt += `Avoid: ${avoid.slice(0, 3).join(", ")}. `;
  }

  return prompt;
}

// ── Video Prompt Builder ─────────────────────────────────────
function buildVideoPrompt(
  platform: string,
  format: string,
  brandContext: any,
  intelligenceBrief: any
): string {
  const baseStyle = intelligenceBrief?.visual_direction || "cinematic, smooth motion, professional";
  const angles = intelligenceBrief?.content_angles || [];
  const angle = angles[Math.floor(Math.random() * Math.max(angles.length, 1))] || "brand experience showcase";

  let prompt = `Professional ${brandContext.industry || "beauty"} marketing video for ${platform} ${format}. `;
  prompt += `Brand: "${brandContext.businessName || "luxury studio"}". `;
  prompt += `Style: ${baseStyle}. `;
  prompt += `Concept: ${angle}. `;
  prompt += `Smooth camera movement, high production value, aspirational feel. `;

  if (format === "reel" || format === "story") {
    prompt += `Vertical video optimized for mobile viewing. Dynamic pacing. `;
  }

  return prompt;
}

// ── Main Handler ─────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: authError } = await anonClient.auth.getUser();
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action } = body;

    // ── Edit Action (SeedEdit 3.0 via WaveSpeed) ──────────────
    if (action === "edit") {
      const { assetId, imageUrl, editPrompt, guidanceScale } = body;
      if (!assetId || !imageUrl || !editPrompt) {
        return new Response(
          JSON.stringify({ error: "assetId, imageUrl, and editPrompt required for edit action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const result = await editImageSeedEdit(imageUrl, editPrompt, guidanceScale || 0.5);

        // Update the asset with the new edited image
        const { data: updatedAsset, error: updateError } = await supabase
          .from("generated_assets")
          .update({
            content_url: result.url,
            provider: result.provider,
            generation_cost: result.cost,
            generation_time_ms: result.timeMs,
            rationale: `Edited: ${editPrompt}`,
            status: "pending_review",
          })
          .eq("id", assetId)
          .eq("profile_id", userId)
          .select()
          .single();

        if (updateError) {
          throw new Error(`Failed to save edit: ${updateError.message}`);
        }

        return new Response(
          JSON.stringify({ success: true, asset: updatedAsset, provider: result.provider, cost: result.cost }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        console.error("[SeedEdit 3.0] Edit failed:", e);
        return new Response(
          JSON.stringify({ error: e instanceof Error ? e.message : "Edit failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── Generate Action (default) ─────────────────────────────
    const { campaignId, assets, researchId, intelligenceBrief, brandContext } = body;

    if (!campaignId || !assets || !Array.isArray(assets)) {
      return new Response(
        JSON.stringify({ error: "campaignId and assets[] required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update campaign to generating
    await supabase.from("campaigns").update({ status: "generating" }).eq("id", campaignId);

    const results: any[] = [];

    for (const asset of assets) {
      const startTime = Date.now();
      const { platform, format, aspectRatio, width, height, assetType } = asset;
      const route = routeProvider(assetType);

      try {
        let contentUrl: string | null = null;
        let actualProvider = route.provider;
        let actualCost = route.estimatedCost;
        let generationTimeMs = 0;

        // Generate visual asset
        if (assetType === "image" || assetType === "carousel") {
          const prompt = buildImagePrompt(platform, format, brandContext || {}, intelligenceBrief || {});
          console.log(`[Generate] ${assetType} for ${platform}/${format} via Seedream 4.5`);

          const result = await generateImage(prompt, width || 1080, height || 1080);
          contentUrl = result.url;
          actualProvider = result.provider;
          actualCost = result.cost;
          generationTimeMs = result.timeMs;
        } else if (assetType === "video") {
          const prompt = buildVideoPrompt(platform, format, brandContext || {}, intelligenceBrief || {});
          console.log(`[Generate] video for ${platform}/${format} via Seedance 2.0`);

          const result = await generateVideo(prompt, width || 1080, height || 1920);
          contentUrl = result.url;
          actualProvider = result.provider;
          actualCost = result.cost;
          generationTimeMs = result.timeMs;
        }

        // Generate caption
        const caption = await generateCaption(
          platform,
          format,
          brandContext || {},
          intelligenceBrief || {}
        );

        if (!generationTimeMs) {
          generationTimeMs = Date.now() - startTime;
        }

        // Save to database
        const { data: savedAsset, error: saveError } = await supabase
          .from("generated_assets")
          .insert({
            campaign_id: campaignId,
            profile_id: userId,
            asset_type: assetType,
            content_url: contentUrl,
            content_text: `[meta:${platform}|${format}|${aspectRatio}] ${caption}`,
            status: "pending_review",
            platform,
            format,
            provider: actualProvider,
            generation_cost: actualCost,
            generation_time_ms: generationTimeMs,
            research_id: researchId || null,
            rationale: intelligenceBrief?.summary || null,
          })
          .select()
          .single();

        if (saveError) {
          console.error("Save error:", saveError);
          results.push({ platform, format, error: saveError.message });
        } else {
          results.push({ platform, format, success: true, asset: savedAsset });
        }
      } catch (e) {
        console.error(`Generation error for ${platform}/${format}:`, e);

        await supabase.from("generated_assets").insert({
          campaign_id: campaignId,
          profile_id: userId,
          asset_type: assetType,
          content_url: null,
          content_text: `[meta:${platform}|${format}|${aspectRatio}] Generation failed — tap to regenerate`,
          status: "pending_review",
          platform,
          format,
          provider: route.provider,
          generation_cost: 0,
          generation_time_ms: Date.now() - startTime,
          rationale: `Error: ${e instanceof Error ? e.message : "Unknown"}`,
        });

        results.push({ platform, format, error: e instanceof Error ? e.message : "Unknown" });
      }
    }

    // Update campaign status
    const hasSuccesses = results.some((r) => r.success);
    await supabase
      .from("campaigns")
      .update({ status: hasSuccesses ? "review" : "draft" })
      .eq("id", campaignId);

    const totalCost = results
      .filter((r) => r.success)
      .reduce((sum, r) => sum + (r.asset?.generation_cost || 0), 0);

    return new Response(
      JSON.stringify({
        results,
        summary: {
          total: results.length,
          succeeded: results.filter((r) => r.success).length,
          failed: results.filter((r) => r.error).length,
          totalCost: totalCost.toFixed(4),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Generate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
