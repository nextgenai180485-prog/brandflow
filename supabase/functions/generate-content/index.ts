import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Provider Router ──────────────────────────────────────────
interface RouteResult {
  provider: string;
  endpoint: string;
  model: string;
  estimatedCost: number;
}

function routeProvider(assetType: string): RouteResult {
  switch (assetType) {
    case "image":
      return {
        provider: "kie_ai",
        endpoint: "https://api.kie.ai/v2/image/generate",
        model: "gpt-4o-image",
        estimatedCost: 0.04,
      };
    case "video":
      return {
        provider: "fal_ai",
        endpoint: "https://queue.fal.run/fal-ai/kling-video/v2/master/image-to-video",
        model: "kling-2.6",
        estimatedCost: 0.25,
      };
    case "carousel":
      return {
        provider: "kie_ai",
        endpoint: "https://api.kie.ai/v2/image/generate",
        model: "gpt-4o-image",
        estimatedCost: 0.08, // Multiple images
      };
    case "copy":
      return {
        provider: "lovable_ai",
        endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions",
        model: "google/gemini-3-flash-preview",
        estimatedCost: 0.002,
      };
    default:
      return {
        provider: "lovable_ai",
        endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions",
        model: "google/gemini-3-flash-preview",
        estimatedCost: 0.002,
      };
  }
}

// ── Image Generation via Kie AI ──────────────────────────────
async function generateImage(
  prompt: string,
  width: number,
  height: number
): Promise<{ url: string; provider: string; cost: number }> {
  const KIE_AI_API_KEY = Deno.env.get("KIE_AI_API_KEY")!;

  // Kie AI GPT-4o Image generation
  const response = await fetch("https://api.kie.ai/v2/image/generate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KIE_AI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      model: "gpt-image-1",
      size: width >= height ? "1536x1024" : "1024x1536",
      quality: "low",
      n: 1,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Kie AI image error:", response.status, err);

    // Fallback to FAL AI
    return await generateImageFallback(prompt, width, height);
  }

  const data = await response.json();
  const imageData = data.data?.[0];
  
  if (imageData?.url) {
    return { url: imageData.url, provider: "kie_ai", cost: 0.04 };
  }
  
  if (imageData?.b64_json) {
    // Upload base64 to Supabase Storage
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const fileName = `generated/${crypto.randomUUID()}.png`;
    const binaryData = Uint8Array.from(atob(imageData.b64_json), (c) => c.charCodeAt(0));
    
    const { error: uploadError } = await supabase.storage
      .from("campaign_assets")
      .upload(fileName, binaryData, { contentType: "image/png" });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to upload generated image");
    }

    const { data: urlData } = supabase.storage
      .from("campaign_assets")
      .getPublicUrl(fileName);

    return { url: urlData.publicUrl, provider: "kie_ai", cost: 0.04 };
  }

  throw new Error("No image data returned");
}

async function generateImageFallback(
  prompt: string,
  width: number,
  height: number
): Promise<{ url: string; provider: string; cost: number }> {
  const FAL_AI_API_KEY = Deno.env.get("FAL_AI_API_KEY");
  if (!FAL_AI_API_KEY) throw new Error("No fallback provider available");

  // FAL AI flux model
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
    // Last resort: Replicate
    return await generateImageReplicate(prompt, width, height);
  }

  const data = await response.json();
  
  // FAL returns a request_url for polling
  if (data.request_url) {
    // Poll for result
    const resultUrl = data.response_url || data.request_url;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const pollResp = await fetch(resultUrl, {
        headers: { Authorization: `Key ${FAL_AI_API_KEY}` },
      });
      if (pollResp.ok) {
        const pollData = await pollResp.json();
        if (pollData.images?.[0]?.url) {
          return { url: pollData.images[0].url, provider: "fal_ai", cost: 0.03 };
        }
        if (pollData.status === "COMPLETED" && pollData.output?.images?.[0]?.url) {
          return { url: pollData.output.images[0].url, provider: "fal_ai", cost: 0.03 };
        }
      }
    }
    throw new Error("FAL AI generation timed out");
  }

  if (data.images?.[0]?.url) {
    return { url: data.images[0].url, provider: "fal_ai", cost: 0.03 };
  }

  throw new Error("FAL AI returned no images");
}

async function generateImageReplicate(
  prompt: string,
  width: number,
  height: number
): Promise<{ url: string; provider: string; cost: number }> {
  const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
  if (!REPLICATE_API_KEY) throw new Error("No Replicate fallback available");

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

  // Poll for completion
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollResp = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { Authorization: `Bearer ${REPLICATE_API_KEY}` },
    });
    const pollData = await pollResp.json();
    if (pollData.status === "succeeded" && pollData.output?.[0]) {
      return { url: pollData.output[0], provider: "replicate", cost: 0.05 };
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

    const { campaignId, assets, researchId, intelligenceBrief, brandContext } = await req.json();

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

        // Generate visual asset
        if (assetType === "image" || assetType === "carousel") {
          const prompt = buildImagePrompt(platform, format, brandContext || {}, intelligenceBrief || {});
          console.log(`Generating ${assetType} for ${platform}/${format}:`, prompt.substring(0, 100));
          
          const result = await generateImage(prompt, width || 1080, height || 1080);
          contentUrl = result.url;
          actualProvider = result.provider;
          actualCost = result.cost;
        } else if (assetType === "video") {
          // For MVP, generate a still image as video thumbnail
          // Full video generation will use Kie AI Veo3 in next phase
          const prompt = buildImagePrompt(platform, format, brandContext || {}, intelligenceBrief || {});
          const result = await generateImage(prompt, width || 1080, height || 1920);
          contentUrl = result.url;
          actualProvider = result.provider + "_still";
          actualCost = result.cost;
        }

        // Generate caption
        const caption = await generateCaption(
          platform,
          format,
          brandContext || {},
          intelligenceBrief || {}
        );

        const generationTimeMs = Date.now() - startTime;

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
        
        // Insert a failed placeholder so user sees the error
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
