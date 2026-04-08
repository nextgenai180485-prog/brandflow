import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ══════════════════════════════════════════════════════════════
// OKLCH COLOR ENGINE — Server-side port from src/lib/colorEngine.ts
// Converts brand seed hex → perceptually uniform semantic color tokens
// ══════════════════════════════════════════════════════════════

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return "#" + [clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  const s = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, s * 255));
}

function linearRgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const l_ = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m_ = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s_ = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l = Math.cbrt(l_); const m = Math.cbrt(m_); const s = Math.cbrt(s_);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToLinearRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_; const m = m_ * m_ * m_; const s = s_ * s_ * s_;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function oklabToOklch(L: number, a: number, b: number): [number, number, number] {
  const C = Math.sqrt(a * a + b * b);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return [L, C, H];
}

function oklchToOklab(L: number, C: number, H: number): [number, number, number] {
  const hRad = (H * Math.PI) / 180;
  return [L, C * Math.cos(hRad), C * Math.sin(hRad)];
}

function clampToGamut(L: number, C: number, H: number): [number, number, number] {
  let lo = 0, hi = C, bestC = 0;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    const [labL, labA, labB] = oklchToOklab(L, mid, H);
    const [r, g, b] = oklabToLinearRgb(labL, labA, labB);
    if (r >= -0.001 && r <= 1.001 && g >= -0.001 && g <= 1.001 && b >= -0.001 && b <= 1.001) {
      bestC = mid; lo = mid;
    } else { hi = mid; }
  }
  return [L, bestC, H];
}

function oklchToHex(L: number, C: number, H: number): string {
  const [cL, cC, cH] = clampToGamut(L, C, H);
  const [labL, labA, labB] = oklchToOklab(cL, cC, cH);
  const [lr, lg, lb] = oklabToLinearRgb(labL, labA, labB);
  return rgbToHex(linearToSrgb(lr), linearToSrgb(lg), linearToSrgb(lb));
}

interface BrandColorTokens {
  vibrant: string;   // Step 400 — headlines
  active: string;    // Step 600 — CTA backgrounds
  soft: string;      // Step 200 — subtitle fills
  text: string;      // Step 900 — dark readable text
  deep: string;      // Step 800 — shadows/backing
  subtle: string;    // Step 100 — near-white tints
}

const STEP_LIGHTNESS: Record<number, number> = {
  100: 0.97, 200: 0.90, 300: 0.80, 400: 0.70, 500: 0.60,
  600: 0.50, 700: 0.40, 800: 0.30, 900: 0.22, 1000: 0.15,
};
const CHROMA_BOOST: Record<number, number> = {
  100: 0.3, 200: 0.5, 300: 1.4, 400: 1.5, 500: 1.3,
  600: 1.0, 700: 0.9, 800: 0.7, 900: 0.5, 1000: 0.3,
};

function generateBrandColorTokens(seedHex: string): BrandColorTokens {
  const [r, g, b] = hexToRgb(seedHex);
  const [lr, lg, lb] = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
  const [labL, labA, labB] = linearRgbToOklab(lr, lg, lb);
  const [, seedC, seedH] = oklabToOklch(labL, labA, labB);
  const baseChroma = Math.max(seedC, 0.08);

  const step = (n: number) => oklchToHex(STEP_LIGHTNESS[n], baseChroma * CHROMA_BOOST[n], seedH);

  return {
    vibrant: step(400),
    active: step(600),
    soft: step(200),
    text: step(900),
    deep: step(800),
    subtle: step(100),
  };
}

// ══════════════════════════════════════════════════════════════

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

// ── Image Generation with optional reference image ──────────
async function generateImage(prompt: string, width: number, height: number, referenceImageUrls?: string[]) {
  if (referenceImageUrls?.length) {
    return await generateImageWithReference(prompt, width, height, referenceImageUrls);
  }

  const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
  if (!REPLICATE_API_KEY) {
    console.warn("[Seedream 5] No REPLICATE_API_KEY, falling back to Kie AI");
    return await generateImageKie(prompt, width, height);
  }
  const startTime = Date.now();
  const aspectRatio = mapAspectRatio(width, height);
  try {
    console.log(`[Seedream 5] Generating image via Replicate, aspect: ${aspectRatio}`);
    const response = await fetch("https://api.replicate.com/v1/models/bytedance/seedream-3.0/predictions", {
      method: "POST",
      headers: { Authorization: `Bearer ${REPLICATE_API_KEY}`, "Content-Type": "application/json", Prefer: "wait" },
      body: JSON.stringify({
        input: { prompt, aspect_ratio: aspectRatio, num_outputs: 1, output_format: "png", guidance_scale: 5 },
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      console.error(`[Seedream 5] Replicate error ${response.status}: ${err}`);
      throw new Error(`Replicate Seedream error: ${response.status}`);
    }
    const prediction = await response.json();
    if (prediction.status === "succeeded" && prediction.output?.[0]) {
      return { url: prediction.output[0], provider: "replicate_seedream_5", cost: 0.05, timeMs: Date.now() - startTime };
    }
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

// ── Image Generation WITH user reference images (product/model) ──
async function generateImageWithReference(prompt: string, width: number, height: number, referenceImageUrls: string[]) {
  const KIE_AI_API_KEY = Deno.env.get("KIE_AI_API_KEY")!;
  const aspectRatio = mapAspectRatio(width, height);
  const startTime = Date.now();

  try {
    console.log(`[Img2Img] Generating with ${referenceImageUrls.length} reference image(s) via Kie AI Seedream 5 Lite Img2Img`);
    const taskId = await kieCreateTask(KIE_AI_API_KEY, "seedream/5-lite-image-to-image", {
      prompt,
      image_urls: referenceImageUrls,
      aspect_ratio: aspectRatio,
      quality: "basic",
      nsfw_checker: true,
    });
    const result = await kiePollTask(KIE_AI_API_KEY, taskId, 90, 3000);
    if (!result.urls?.length) throw new Error("Seedream 5 Lite Img2Img returned no image URLs");
    console.log(`[Img2Img] ✅ Seedream 5 Lite Img2Img success in ${result.costTime}ms`);
    return { url: result.urls[0], provider: "kie_ai_seedream_5_img2img", cost: 0.06, timeMs: result.costTime || (Date.now() - startTime) };
  } catch (e) {
    console.error("[Img2Img] Seedream 5 Lite Img2Img failed, falling back to text-to-image:", e);
  }

  console.warn("[Img2Img] Img2Img provider failed, falling back to text-only generation");
  return await generateImageKie(prompt, width, height);
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

  if (REPLICATE_API_KEY) {
    try {
      console.log(`[Kling 2.5] Generating video via Replicate, aspect: ${aspectRatio}`);
      const startTime = Date.now();
      const response = await fetch("https://api.replicate.com/v1/models/kwaai/kling-v2.5-pro/predictions", {
        method: "POST",
        headers: { Authorization: `Bearer ${REPLICATE_API_KEY}`, "Content-Type": "application/json", Prefer: "wait=120" },
        body: JSON.stringify({
          input: { prompt, duration: 5, aspect_ratio: aspectRatio, negative_prompt: "blurry, low quality, distorted, watermark, text overlay, amateur, AI-generated look, plastic skin, over-smoothed, artificial blur" },
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

  const KIE_AI_API_KEY = Deno.env.get("KIE_AI_API_KEY");
  if (!KIE_AI_API_KEY) {
    console.error("[Video] No KIE_AI_API_KEY, falling back to image");
    const fallback = await generateImage(prompt, width, height);
    return { ...fallback, provider: fallback.provider + "_video_fallback" };
  }

  try {
    console.log(`[Kling 2.5 Kie] Generating video, aspect: ${aspectRatio}`);
    const taskId = await kieCreateTask(KIE_AI_API_KEY, "kling/kling-2.5", {
      prompt, aspect_ratio: aspectRatio, resolution: "720p", duration: 5, generate_audio: false, web_search: false,
    });
    const result = await kiePollTask(KIE_AI_API_KEY, taskId, 100, 3000);
    if (!result.urls?.length) throw new Error("Kling 2.5 returned no video URLs");
    return { url: result.urls[0], provider: "kie_ai_kling_2.5", cost: 0.35, timeMs: result.costTime };
  } catch (e) { console.error("[Kling 2.5 Kie] Failed:", e); }

  try {
    const taskId = await kieCreateTask(KIE_AI_API_KEY, "kling/kling-3.0", {
      prompt, aspect_ratio: aspectRatio, resolution: "720p", duration: 5, generate_audio: false, web_search: false,
    });
    const result = await kiePollTask(KIE_AI_API_KEY, taskId, 100, 3000);
    if (!result.urls?.length) throw new Error("Kling 3.0 returned no video URLs");
    return { url: result.urls[0], provider: "kie_ai_kling_3.0", cost: 0.40, timeMs: result.costTime };
  } catch (e) { console.error("[Kling 3.0 Kie] Failed:", e); }

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
  supabase: any, userId: string, campaignId: string, researchId: string | null,
  decision: any, intelligenceBrief: any, brandMemoryInfluences: any[]
): Promise<string | null> {
  const winner = decision.creative_directions?.[decision.winner_index] || {};
  const rejected = (decision.creative_directions || [])
    .filter((_: any, i: number) => i !== decision.winner_index)
    .map((d: any) => ({ name: d.name, angle_type: d.angle_type, total_score: d.total_score, reason_rejected: `Score ${d.total_score} vs winner score ${winner.total_score}` }));

  try {
    const { data, error } = await supabase
      .from("decision_traces")
      .insert({
        campaign_id: campaignId, profile_id: userId, research_id: researchId,
        decision_summary: `Selected "${winner.name}" (${winner.angle_type}) with ${(decision.confidence_score * 100).toFixed(0)}% confidence. ${decision.winner_rationale}`,
        creative_directions: decision.creative_directions || [],
        scoring_criteria: decision.scoring_weights || {},
        winner: { ...winner, rationale: decision.winner_rationale },
        rejected_alternatives: rejected,
        confidence_score: decision.confidence_score || 0,
        brand_memory_influences: brandMemoryInfluences.map((m) => ({ type: m.memory_type, category: m.pattern_category, value: m.pattern_value, frequency: m.frequency })),
        research_sources: intelligenceBrief?.sources?.slice(0, 10) || [],
        assumptions: decision.assumptions || [],
        next_test_recommendation: decision.next_test_recommendation ? { description: decision.next_test_recommendation } : {},
      })
      .select("id")
      .single();

    if (error) { console.error("[Trust Engine] Failed to store trace:", error); return null; }
    console.log(`[Trust Engine] Decision trace stored: ${data.id}`);
    return data.id;
  } catch (e) { console.error("[Trust Engine] Error:", e); return null; }
}

// ── Caption Generation via Lovable AI (campaign-brief-first) ─
async function generateCaption(platform: string, format: string, brandContext: any, intelligenceBrief: any, decisionWinner: any, imagePrompt: string, campaignCopy?: any, structuredBrief?: any): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return `Content for ${platform} ${format}`;

  const hookSuggestion = decisionWinner?.hook_suggestion || "";
  const angle = decisionWinner?.angle_type || "";
  const directionName = decisionWinner?.name || "brand showcase";
  const directionDesc = decisionWinner?.description || "";
  const brandName = brandContext.businessName || "the brand";

  const platformRules: Record<string, string> = {
    instagram: "Use relevant hashtags (5-10), line breaks for readability, emojis that match the tone. Start with a hook that stops the scroll. Keep under 2200 chars. End with a CTA.",
    tiktok: "Short, punchy, trend-aware. Use 3-5 hashtags. Include a hook question or statement. Keep conversational and Gen-Z friendly. Under 300 chars ideal.",
    linkedin: "Professional but personable. No hashtags in the body (add 3-5 at the end). Use line breaks. Start with a bold statement or insight. 1300 chars max.",
    facebook: "Conversational, community-focused. 1-3 hashtags max. Ask a question to drive engagement. Medium length.",
    twitter: "Concise, punchy. Under 280 chars. 1-2 hashtags max. Make every word count.",
    youtube: "Descriptive title + description format. Include relevant keywords naturally. Add timestamps if applicable.",
  };
  const platformRule = platformRules[platform.toLowerCase()] || platformRules.instagram;

  let campaignContext = "";
  if (structuredBrief) {
    if (structuredBrief.objective) campaignContext += `Campaign objective: ${structuredBrief.objective}. `;
    if (structuredBrief.messageAngle) campaignContext += `Core message: ${structuredBrief.messageAngle}. `;
    if (structuredBrief.tone?.length) campaignContext += `Tone: ${structuredBrief.tone.join(", ")}. `;
  }
  if (campaignCopy) {
    if (campaignCopy.headline) campaignContext += `Headline: "${campaignCopy.headline}". `;
    if (campaignCopy.ctaText) campaignContext += `CTA: "${campaignCopy.ctaText}". `;
    if (campaignCopy.bodyCopy) campaignContext += `Copy direction: ${campaignCopy.bodyCopy}. `;
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: `You are an elite social media copywriter. You write captions that feel NATIVE to each platform — not generic marketing copy. Every caption must:
1. Open with a scroll-stopping hook
2. Connect emotionally with the target audience
3. Include a clear but subtle call-to-action
4. Match the platform's culture and formatting norms
5. Be directly relevant to the visual content being posted

IMPORTANT: Use ONLY the campaign brief provided. Do NOT invent brand descriptions, company summaries, or value propositions. Write for the specific campaign, not the entire company.`,
        },
        {
          role: "user",
          content: `Write a caption for this ${platform} ${format} post.
Brand name: ${brandName}

CAMPAIGN BRIEF (PRIMARY INPUT — use this):
${campaignContext || "General brand awareness campaign."}

CREATIVE DIRECTION: "${directionName}" — ${directionDesc}
ANGLE: ${angle}
HOOK INSPIRATION: ${hookSuggestion}

PLATFORM RULES: ${platformRule}

Output ONLY the caption text. No explanations, no quotes around it. Just the raw caption ready to paste.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    await response.text();
    return `✨ ${campaignCopy?.headline || "Discover something new"} #${brandContext.industry || "lifestyle"}`;
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || `Content for ${platform}`;
}

// ══════════════════════════════════════════════════════════════
// ENTERPRISE PROMPT SYSTEM — Visual/Metadata Split
// ══════════════════════════════════════════════════════════════

// Text overlay metadata — consumed by post-processing, NOT by image model
interface TextOverlayMeta {
  headline?: string;
  subheadline?: string;
  ctaText?: string;
  brandName?: string;
  includeLogo: boolean;
  logoUrl?: string;
  brandColors?: BrandColorTokens;
}

// The result of the prompt builder — visual prompt for model + metadata for post-processing
interface PromptBundle {
  visualPrompt: string;       // ≤80 words — sent to image model
  imageRefs: string[];         // actual image URLs — sent as image_urls to img2img
  textOverlay: TextOverlayMeta; // consumed by post-processing step only
  platformSeed: string;        // platform-native direction context
}

// Platform-specific aesthetic seeds (concise)
const PLATFORM_SEEDS: Record<string, string> = {
  instagram: "Warm editorial tones. Discovery-optimized. Aspirational lifestyle.",
  tiktok: "Vibrant, high-energy, trend-forward. Bold colors, dynamic angles.",
  facebook: "Community warmth. Relatable, approachable. Mid-range framing.",
  linkedin: "Corporate-premium. Clean backgrounds, trustworthy palette.",
  x: "High-impact single frame. Maximum contrast, bold focal point.",
  youtube: "Cinematic widescreen. Dramatic lighting, thumbnail-optimized.",
  snapchat: "Bright, playful, youthful. Vertical-first, casual but eye-catching.",
};

// Format composition rules (concise)
const FORMAT_RULES: Record<string, string> = {
  story: "Vertical 9:16. Subject centered, mobile-first full-bleed.",
  reel: "Vertical 9:16 cinematic. Rule of thirds, dynamic negative space.",
  post: "Square or 4:5. Clean negative space upper third. Strong visual anchor.",
  carousel: "Consistent visual language. Each frame stands alone, flows as sequence.",
  landscape: "Wide 16:9 cinematic. Layered depth, panoramic feel.",
};

// Vertical photography styles (concise)
const VERTICAL_STYLES: Record<string, string> = {
  beauty: "Soft diffused lighting, luminous skin, macro detail, 85mm f/1.4 shallow DOF.",
  medspa: "Clinical-luxury hybrid. Clean white environments, warm accents, soft directional light.",
  fitness: "Action-frozen capture. Hard directional light, dramatic shadows, 35mm f/2.0.",
  saas: "Minimal tech-forward. Gradient backgrounds, cool blue-purple, device mockups.",
  ecommerce: "Clean product-hero. Soft neutral backdrop, controlled studio light, precise detail.",
  food: "Overhead or 45-degree angle. Natural window light, shallow DOF, warm earth tones.",
  fashion: "Editorial high-fashion. Dramatic pose, directional lighting, aspirational setting.",
  realestate: "Wide-angle architectural. Golden hour or twilight exterior. Clean interior staging.",
  general: "Professional studio lighting. Clean composition, natural tones, editorial quality.",
};

/**
 * Enterprise Prompt Builder — splits output into:
 * 1. visualPrompt: ≤80 words, ONLY visual instructions for the image model
 * 2. imageRefs: actual URLs for img2img pipeline
 * 3. textOverlay: headlines/CTAs for post-processing step
 */
function buildPromptBundle(
  platform: string,
  format: string,
  brandContext: any,
  decisionDirection: any,
  imageTemplate: any | null,
  userAssets: any[] | null,
  campaignCopy: any | null,
  structuredBrief: any | null,
  referenceImageUrl: string | null,
  templateRefs: string[] | null,
): PromptBundle {
  const industry = (brandContext?.industry || "general").toLowerCase();
  const includeLogo = brandContext?.includeLogo !== false;

  // ── 1. Collect ALL image references for img2img pipeline ──
  const imageRefs: string[] = [];

  // User-uploaded product/model images (highest priority)
  if (userAssets?.length) {
    for (const a of userAssets) {
      if ((a.role === "product" || a.role === "model") && a.url) {
        imageRefs.push(a.url);
      }
    }
  }

  // Showcase template style references
  if (templateRefs?.length) {
    for (const ref of templateRefs.slice(0, 2)) {
      if (ref && ref.startsWith("http")) imageRefs.push(ref);
    }
  }

  // Single reference image from showcase selection
  if (referenceImageUrl && referenceImageUrl.startsWith("http")) {
    // Only add if not already in imageRefs
    if (!imageRefs.includes(referenceImageUrl)) imageRefs.push(referenceImageUrl);
  }

  // ══════════════════════════════════════════════════════════
  // SKILL GUIDE: Enterprise Prompt Construction
  // Ref: docs/engines/CREATIVE_DIRECTOR_SKILL.md
  // ══════════════════════════════════════════════════════════

  const angle = decisionDirection?.description || "professional brand showcase";
  const hookVisual = decisionDirection?.hook_suggestion || "";
  const formatRule = FORMAT_RULES[format] || FORMAT_RULES.post;

  // ── STEP 1: Template-first style (user's explicit choice overrides vertical defaults) ──
  let styleDirective = VERTICAL_STYLES[industry] || VERTICAL_STYLES.general;
  if (imageTemplate) {
    const guide = imageTemplate.style_guide || {};
    const parts: string[] = [];
    if (guide.lighting) parts.push(guide.lighting);
    if (guide.composition) parts.push(guide.composition);
    if (guide.color_palette) parts.push(guide.color_palette);
    if (guide.mood) parts.push(guide.mood);
    if (imageTemplate.prompt_modifiers?.length) parts.push(...imageTemplate.prompt_modifiers);
    if (parts.length) styleDirective = parts.join(". ");
  }

  // ── STEP 2: Adaptive subject rendering (Skill Guide §2A) ──
  let subjectDirective = "";
  const hasModel = userAssets?.some((a: any) => a.role === "model");
  const hasProduct = userAssets?.some((a: any) => a.role === "product");
  if (hasModel && hasProduct) {
    subjectDirective = "Feature the provided person as main subject with product prominently visible. Natural interaction between person and product. Preserve exact identity, likeness, facial features, hair texture. ";
  } else if (hasModel) {
    subjectDirective = "Feature the provided person as main subject. Preserve exact identity, likeness, facial features, hair texture, skin pores, natural imperfections. ";
  } else if (hasProduct) {
    subjectDirective = "Feature the provided product as hero element with physical weight and material honesty. 60% clean negative space, product as visual anchor. ";
  }

  // ── STEP 3: Adaptive realism by tone (Skill Guide §2B) ──
  const tones = structuredBrief?.tone || [];
  const toneSet = new Set(tones.map((t: string) => t.toLowerCase()));

  // Select realism approach based on user's tone selection
  let realismApproach = "Clean studio, controlled directional lighting, subtle film grain.";
  if (toneSet.has("luxurious") || toneSet.has("bold")) {
    realismApproach = "Rich contrast, dramatic directional light, cinematic film grain, deep shadows.";
  } else if (toneSet.has("warm") || toneSet.has("playful")) {
    realismApproach = "Golden hour warmth, natural window light, soft organic shadows.";
  } else if (toneSet.has("edgy") || toneSet.has("urgent")) {
    realismApproach = "Hard shadows, high contrast, desaturated with accent color pops.";
  } else if (toneSet.has("educational") || toneSet.has("minimal")) {
    realismApproach = "Even flat lighting, clean backgrounds, diagram-friendly composition.";
  }

  // ── STEP 4: Emotion-to-lighting mapping (Skill Guide §5) ──
  const emotions = structuredBrief?.targetEmotion || structuredBrief?.emotions || [];
  let emotionLighting = "";
  const emotionSet = new Set((Array.isArray(emotions) ? emotions : [emotions]).map((e: string) => e?.toLowerCase()));
  if (emotionSet.has("trust") || emotionSet.has("authority")) {
    emotionLighting = "Cool, even lighting. Trustworthy corporate palette. ";
  } else if (emotionSet.has("excitement") || emotionSet.has("fomo") || emotionSet.has("joy")) {
    emotionLighting = "Warm vibrant lighting. High color saturation. Energetic composition. ";
  } else if (emotionSet.has("aspiration") || emotionSet.has("curiosity")) {
    emotionLighting = "Atmospheric depth. Cinematic backlighting. Aspirational framing. ";
  }

  // ── STEP 5: Universal realism anchor (Skill Guide §2B universal) ──
  const REALISM_ANCHOR = [
    "Organic skin tones, realistic color balance.",
    "Visible skin pores, micro-texture, peach fuzz, natural imperfections.",
    "Subsurface scattering for natural light on skin.",
    "Subtle cinematic film grain, movie-still look.",
    "Shot on Nikon Z8 45.7MP mirrorless, 85mm f/1.8, natural lens character.",
    "Background untouched — no artificial blur added.",
    "Photorealistic only — no stylization.",
  ].join(" ");

  // ── ASSEMBLE: Visual prompt ≤80 words, STRICTLY visual (Skill Guide §1) ──
  let visualPrompt = `${subjectDirective}${angle}. `;
  if (hookVisual) visualPrompt += `${hookVisual}. `;
  visualPrompt += `${realismApproach} ${emotionLighting}`;
  visualPrompt += `${styleDirective}. ${formatRule}. `;
  visualPrompt += `${REALISM_ANCHOR} `;
  visualPrompt += `No text, no watermarks, no logos, no borders, no UI elements. `;
  visualPrompt += `Avoid: stock photo feel, clipart, illustration, 3D render, cartoon, airbrushed, beauty filter, porcelain skin.`;

  // ── 3. Extract text overlay metadata (for post-processing) ──
  // ── Compute OKLCH brand color tokens from seed hex ──
  let computedBrandColors: BrandColorTokens | undefined;
  const seedHex = brandContext?.brandColors?.primary
    || brandContext?.brandPalette?.primary
    || (typeof brandContext?.brandColors === "string" ? brandContext.brandColors : null);
  if (seedHex && typeof seedHex === "string" && /^#?[0-9a-fA-F]{3,6}$/.test(seedHex.replace("#", ""))) {
    try {
      computedBrandColors = generateBrandColorTokens(seedHex.startsWith("#") ? seedHex : `#${seedHex}`);
      console.log(`[OKLCH] Brand tokens computed from seed ${seedHex}: vibrant=${computedBrandColors.vibrant}, active=${computedBrandColors.active}`);
    } catch (e) {
      console.warn("[OKLCH] Failed to compute brand tokens:", e);
    }
  }

  const textOverlay: TextOverlayMeta = {
    headline: campaignCopy?.headline || undefined,
    subheadline: campaignCopy?.subheadline || undefined,
    ctaText: campaignCopy?.ctaText || structuredBrief?.ctaGoal || undefined,
    brandName: brandContext?.businessName || undefined,
    includeLogo,
    logoUrl: includeLogo ? userAssets?.find((a: any) => a.role === "logo")?.url : undefined,
    brandColors: computedBrandColors,
  };

  const platformSeed = PLATFORM_SEEDS[platform.toLowerCase()] || PLATFORM_SEEDS.instagram;

  console.log(`[PromptBundle] Visual prompt: ${visualPrompt.split(" ").length} words | ${imageRefs.length} image refs | Text overlay: ${textOverlay.headline ? "yes" : "no"}`);

  return { visualPrompt, imageRefs, textOverlay, platformSeed };
}

// ══════════════════════════════════════════════════════════════
// POST-PROCESSING: Text Overlay via Lovable AI Image Generation
// ══════════════════════════════════════════════════════════════
async function applyTextOverlay(
  baseImageUrl: string,
  overlay: TextOverlayMeta,
  platform: string,
  format: string,
): Promise<string> {
  // Skip if no text content to overlay
  if (!overlay.headline && !overlay.subheadline && !overlay.ctaText) {
    console.log("[PostProcess] No text overlay needed, returning base image");
    return baseImageUrl;
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.warn("[PostProcess] No LOVABLE_API_KEY, skipping text overlay");
    return baseImageUrl;
  }

  try {
    console.log(`[PostProcess] Applying text overlay: "${overlay.headline || ""}"`);

    // Build overlay instruction
    const textElements: string[] = [];
    if (overlay.headline) textElements.push(`Main headline in large bold text: "${overlay.headline}"`);
    if (overlay.subheadline) textElements.push(`Smaller subheadline below: "${overlay.subheadline}"`);
    if (overlay.ctaText) textElements.push(`Call-to-action button or badge: "${overlay.ctaText}"`);
    if (overlay.includeLogo && overlay.brandName) textElements.push(`Small brand name "${overlay.brandName}" in corner`);

    const layoutByFormat: Record<string, string> = {
      story: "Text in the upper third and CTA in lower third. Vertical layout optimized for mobile.",
      reel: "Text centered with CTA at bottom. Vertical, mobile-first.",
      post: "Text in upper portion with clean breathing room. CTA bottom-right.",
      carousel: "Text centered, consistent positioning across slides.",
      landscape: "Text left-aligned with right side for imagery. Cinematic lower-third style.",
    };
    const layout = layoutByFormat[format] || layoutByFormat.post;

    // Build color directive from OKLCH tokens or fallback
    let colorDirective: string;
    if (overlay.brandColors) {
      const bc = overlay.brandColors;
      colorDirective = `Typography color palette (use these EXACT hex codes for brand consistency):
- Headline color: ${bc.vibrant} — or #FFFFFF if the background behind headline is dark. Pick whichever gives higher contrast.
- Subheadline color: ${bc.soft} — or #FFFFFF for dark backgrounds.
- CTA button/badge: background ${bc.active}, text #FFFFFF, rounded pill shape with 24px padding.
- Brand name: ${bc.text}
- If text needs a shadow for legibility: ${bc.deep} at 40% opacity, 2px Gaussian blur.
- WCAG AA minimum contrast ratio required on ALL text elements.`;
    } else {
      colorDirective = `Use #FFFFFF (white) for all text with rgba(0,0,0,0.5) drop shadow for contrast.`;
    }

    const editInstruction = `Add professional text overlay to this marketing image. ${layout}

Text elements to add:
${textElements.join("\n")}

TYPOGRAPHY SYSTEM (Apple-grade premium):
- Font: SF Pro Display or Inter — clean geometric sans-serif ONLY. No decorative fonts, no serifs, no outlines, no gradients on text.
- Headline: Semibold (600 weight), letter-spacing -0.02em, line-height 1.1. Large and commanding.
- Subheadline: Regular (400 weight), letter-spacing -0.01em, line-height 1.3. Supportive, smaller than headline.
- CTA: Medium (500 weight), ALL CAPS, letter-spacing 0.08em. Rendered as a pill-shaped button.
- Brand name: Light (300 weight), letter-spacing 0.04em. Small and refined, positioned in corner.

${colorDirective}

CRITICAL RULES:
- Do NOT change the underlying photograph — only add text overlay elements.
- Text must feel like it was designed by Apple's marketing team: minimal, precise, premium.
- Generous whitespace around text. Never crowd the image.
- Result must look like a professionally designed social media ad from a Fortune 500 brand.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: editInstruction },
              { type: "image_url", image_url: { url: baseImageUrl } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      console.error(`[PostProcess] AI overlay error: ${response.status}`);
      return baseImageUrl;
    }

    const data = await response.json();
    const editedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (editedImageUrl) {
      // Upload base64 to Supabase storage
      const overlaidUrl = await uploadBase64ToStorage(editedImageUrl);
      if (overlaidUrl) {
        console.log("[PostProcess] ✅ Text overlay applied successfully");
        return overlaidUrl;
      }
    }

    console.warn("[PostProcess] No image returned from overlay, using base image");
    return baseImageUrl;
  } catch (e) {
    console.error("[PostProcess] Text overlay error:", e);
    return baseImageUrl;
  }
}

// Upload base64 image to Supabase storage and return public URL
async function uploadBase64ToStorage(base64DataUrl: string): Promise<string | null> {
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Extract base64 data
    const matches = base64DataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) return null;

    const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
    const base64Data = matches[2];
    const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const fileName = `overlays/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("campaign_assets")
      .upload(fileName, bytes, { contentType: `image/${matches[1]}`, upsert: false });

    if (error) {
      console.error("[Storage] Upload error:", error);
      return null;
    }

    const { data: urlData } = supabase.storage.from("campaign_assets").getPublicUrl(fileName);
    return urlData?.publicUrl || null;
  } catch (e) {
    console.error("[Storage] Upload error:", e);
    return null;
  }
}

// ── SEALCaM → Prompt Compiler (Family-Aware) ────────────────
function compileSealcamToPrompt(scene: any, family: string, brandContext: any): string {
  const familyModifiers: Record<string, string> = {
    F1_UGC: "handheld camera, raw authentic feel, natural imperfections, social-first energy, real environment",
    F2_SPOKESPERSON: "talking head, professional but personable, clean background, direct eye contact, confident delivery",
    F5_CINEMATIC: "cinematic 4K, dramatic composition, professional color grading, premium production value, smooth dolly movement",
  };
  const modifier = familyModifiers[family] || familyModifiers.F5_CINEMATIC;
  let prompt = `${scene.subject}. Environment: ${scene.environment}. Action: ${scene.action}. Lighting: ${scene.lighting}. Camera: ${scene.camera}. `;
  if (scene.metatokens) prompt += `Style: ${scene.metatokens}. `;
  prompt += `${modifier}. No text overlays, no watermarks.`;
  return prompt;
}

function buildVideoPrompt(platform: string, format: string, brandContext: any, intelligenceBrief: any, decisionWinner: any): string {
  const angle = decisionWinner?.description || "brand experience showcase";
  const hookText = decisionWinner?.hook_suggestion || "";
  let prompt = `Professional ${brandContext.industry || "general"} marketing video for ${platform} ${format}. `;
  prompt += `Creative direction: ${angle}. `;
  if (hookText) prompt += `Opening concept: ${hookText}. `;
  prompt += `Smooth camera movement, high production value, aspirational feel. `;
  if (format === "reel" || format === "story") prompt += `Vertical video optimized for mobile viewing. Dynamic pacing. `;
  return prompt;
}

function buildVideoPromptFromDirection(creativeDirection: any, sceneIndex: number, brandContext: any): string {
  const scene = creativeDirection.scenes?.[sceneIndex];
  if (!scene) return buildVideoPrompt("instagram", "reel", brandContext, {}, {});
  return compileSealcamToPrompt(scene, creativeDirection.family, brandContext);
}

// ── Background Processing (Enterprise Prompt Bundle Pipeline) ─────────
async function processAssetsInBackground(
  userId: string,
  campaignId: string,
  assets: any[],
  researchId: string | null,
  intelligenceBrief: any,
  brandContext: any,
  placeholderIds: string[],
  decisionTraceId: string | null,
  decisionWinner: any,
  creativeDirection: any | null,
  referenceImageUrl: string | null = null,
  templateRefs: string[] | null = null,
  userAssets: any[] | null = null,
  structuredBrief: any | null = null,
  campaignCopy: any | null = null,
  allDirections: any[] | null = null,
) {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Load matching image templates for this brand's vertical
  const industry = (brandContext?.industry || "general").toLowerCase();
  const { data: imageTemplates } = await supabase
    .from("image_templates")
    .select("*")
    .eq("is_active", true)
    .or(`vertical.eq.${industry},vertical.eq.general`)
    .order("usage_count", { ascending: false })
    .limit(5);

  console.log(`[Image Templates] Loaded ${imageTemplates?.length || 0} templates for vertical: ${industry}`);
  console.log(`[Generation] Processing ${assets.length} assets with ${allDirections?.length || 1} creative directions`);

  // Process all assets in PARALLEL to avoid sequential timeout kills
  const assetPromises = assets.map(async (assetItem: any, i: number) => {
    const placeholderId = placeholderIds[i];
    if (placeholderId === "error") return null;
    const { platform, format, aspectRatio, width, height, assetType } = assetItem;
    const startTime = Date.now();
    

    // Rotate through creative directions
    const directionPool = allDirections?.length ? allDirections : [decisionWinner];
    const assetDirection = directionPool[i % directionPool.length] || decisionWinner;
    console.log(`[Generate] Asset ${i + 1}/${assets.length}: ${platform}/${format} using direction "${assetDirection?.name || "default"}" (angle: ${assetDirection?.angle_type || "general"})`);

    try {
      let contentUrl: string | null = null;
      let actualProvider = "pending";
      let actualCost = 0;
      let generationTimeMs = 0;

      if (assetType === "image" || assetType === "carousel") {
        // ── ENTERPRISE PROMPT BUNDLE ──
        const matchedTemplate = imageTemplates?.find(
          (t: any) => (t.platform === platform || !t.platform) && (t.format === format || !t.format)
        ) || imageTemplates?.[0] || null;

        if (matchedTemplate) {
          console.log(`[Image Templates] Using template: "${matchedTemplate.style_name}" for ${platform}/${format}`);
        }

        const bundle = buildPromptBundle(
          platform, format, brandContext || {}, assetDirection, matchedTemplate,
          userAssets, campaignCopy, structuredBrief, referenceImageUrl, templateRefs,
        );

        // Combine visual prompt + platform seed (still no text/copy)
        const finalVisualPrompt = `${bundle.visualPrompt} ${bundle.platformSeed}`;

        console.log(`[Generate] ${assetType} for ${platform}/${format} | prompt: ${finalVisualPrompt.split(" ").length} words | refs: ${bundle.imageRefs.length}`);

        // Step 1: Generate base image
        const result = await generateImage(
          finalVisualPrompt,
          width || 1080,
          height || 1080,
          bundle.imageRefs.length > 0 ? bundle.imageRefs : undefined,
        );

        contentUrl = result.url;
        actualProvider = result.provider;
        actualCost = result.cost;
        generationTimeMs = result.timeMs;

        // Step 2: Post-processing — apply text overlay if campaign copy exists
        if (contentUrl && (bundle.textOverlay.headline || bundle.textOverlay.ctaText)) {
          console.log(`[PostProcess] Applying text overlay to ${platform}/${format}`);
          const overlaidUrl = await applyTextOverlay(contentUrl, bundle.textOverlay, platform, format);
          if (overlaidUrl !== contentUrl) {
            contentUrl = overlaidUrl;
            actualProvider += "+text_overlay";
            actualCost += 0.01; // overlay cost
          }
        }

      } else if (assetType === "video") {
        let generatedPrompt = "";
        if (creativeDirection?.scenes?.length) {
          const sceneIndex = i % creativeDirection.scenes.length;
          generatedPrompt = buildVideoPromptFromDirection(creativeDirection, sceneIndex, brandContext || {});
          console.log(`[Generate] video for ${platform}/${format} via SEALCaM scene ${sceneIndex + 1}/${creativeDirection.scenes.length}`);
        } else {
          generatedPrompt = buildVideoPrompt(platform, format, brandContext || {}, intelligenceBrief || {}, assetDirection);
          console.log(`[Generate] video for ${platform}/${format} via generic prompt`);
        }

        // Add concise platform direction (no text/copy in video prompt either)
        const platSeed = PLATFORM_SEEDS[platform.toLowerCase()] || "";
        generatedPrompt += ` ${platSeed}`;

        // Add campaign tone context only (not full copy)
        if (structuredBrief?.tone?.length) {
          generatedPrompt += ` Mood: ${structuredBrief.tone.join(", ")}.`;
        }

        // User asset context for video
        if (userAssets?.some((a: any) => a.role === "product")) {
          generatedPrompt += " Feature the provided product prominently.";
        }
        if (userAssets?.some((a: any) => a.role === "model")) {
          generatedPrompt += " Feature the provided person as the main subject.";
        }

        const result = await generateVideo(generatedPrompt, width || 1080, height || 1920);
        contentUrl = result.url;
        actualProvider = result.provider;
        actualCost = result.cost;
        generationTimeMs = result.timeMs;
      }

      // Generate caption (this uses full campaign copy — that's correct for captions)
      const caption = await generateCaption(platform, format, brandContext || {}, intelligenceBrief || {}, assetDirection, "", campaignCopy, structuredBrief);
      if (!generationTimeMs) generationTimeMs = Date.now() - startTime;

      const rationale = JSON.stringify({
        direction: assetDirection?.name || "default",
        angle: assetDirection?.angle_type || "general",
        confidence: assetDirection?.total_score || 0,
        hook: assetDirection?.hook_suggestion || "",
        trace_id: decisionTraceId,
        prompt_words: 80,
        image_refs: userAssets?.filter((a: any) => a.role === "product" || a.role === "model").length || 0,
        text_overlay: campaignCopy?.headline ? true : false,
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
  });

  await Promise.allSettled(assetPromises);

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
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();
    const { action } = body;

    // ── Edit Image (SeedEdit 3.0) ───────────────────────────────
    if (action === "edit_image") {
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

      const { data: asset } = await supabase.from("generated_assets").select("*").eq("id", assetId).eq("profile_id", userId).single();
      if (!asset) {
        return new Response(JSON.stringify({ error: "Asset not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();
      const { data: trace } = await supabase.from("decision_traces").select("*").eq("campaign_id", asset.campaign_id).eq("profile_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();

      const bCtx = {
        businessName: profile?.business_name || "",
        industry: profile?.industry || "",
        brandVoice: profile?.brand_voice_tone || "",
        targetAudience: profile?.target_audience || "",
      };

      const caption = await generateCaption(
        platform || asset.platform || "instagram",
        format || asset.format || "post",
        bCtx, {}, trace?.winner || {}, ""
      );

      const metaMatch = asset.content_text?.match(/^\[meta:[^\]]*\]/);
      const metaPrefix = metaMatch?.[0] ? `${metaMatch[0]} ` : "";
      await supabase.from("generated_assets").update({ content_text: `${metaPrefix}${caption}` }).eq("id", assetId);

      return new Response(JSON.stringify({ success: true, caption }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Brand Memory Action ─────────────────────────────────────
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

      const { data: existing } = await supabase
        .from("brand_memory")
        .select("id, frequency")
        .eq("profile_id", userId)
        .eq("memory_type", memoryType)
        .eq("pattern_category", patternCategory)
        .eq("pattern_value", patternValue)
        .maybeSingle();

      if (existing) {
        await supabase.from("brand_memory").update({ frequency: existing.frequency + 1, last_seen_at: new Date().toISOString(), context: memCtx || {} }).eq("id", existing.id);
      } else {
        await supabase.from("brand_memory").insert({ profile_id: userId, memory_type: memoryType, pattern_category: patternCategory, pattern_value: patternValue, context: memCtx || {} });
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Generate Action (Enterprise Pipeline) ───────────────────
    const { campaignId, assets, researchId, intelligenceBrief, brandContext, creativeDirection, referenceImageUrl, templateRefs, userAssets, structuredBrief, campaignCopy } = body;

    if (!campaignId || typeof campaignId !== "string" || !assets || !Array.isArray(assets) || assets.length === 0) {
      return new Response(JSON.stringify({ error: "campaignId (string) and non-empty assets[] required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (assets.length > 50) {
      return new Response(JSON.stringify({ error: "Maximum 50 assets per generation request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const VALID_ASSET_TYPES = ["image", "video", "carousel", "copy"];
    for (const a of assets) {
      if (!a.platform || !a.format || !a.assetType || !VALID_ASSET_TYPES.includes(a.assetType)) {
        return new Response(JSON.stringify({ error: `Each asset requires platform, format, and assetType (${VALID_ASSET_TYPES.join("|")})` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    await supabase.from("campaigns").update({ status: "generating" }).eq("id", campaignId);

    const { data: brandMemory } = await supabase
      .from("brand_memory")
      .select("*")
      .eq("profile_id", userId)
      .order("frequency", { ascending: false })
      .limit(50);

    console.log(`[Brand Memory] Loaded ${brandMemory?.length || 0} memory entries`);

    const { data: campaignData } = await supabase.from("campaigns").select("instructions").eq("id", campaignId).single();
    const campaignBriefContext = structuredBrief 
      ? `Campaign Brief — Objective: ${structuredBrief.objective || "general"}, Core Message: ${structuredBrief.messageAngle || "N/A"}, Tone: ${(structuredBrief.tone || []).join(", ") || "N/A"}, CTA: ${structuredBrief.ctaGoal || "N/A"}, Emotion: ${(structuredBrief.targetEmotion || []).join(", ") || "N/A"}. ${structuredBrief.freeformNotes || ""}`
      : null;
    const combinedInstructions = [campaignData?.instructions, campaignBriefContext].filter(Boolean).join("\n\n");
    const decision = await runDecisionEngine(brandContext || {}, intelligenceBrief || {}, brandMemory || [], combinedInstructions || null);
    const allDirections = decision.creative_directions || [];
    const dWinner = allDirections[decision.winner_index] || {};
    console.log(`[Decision Engine] ${allDirections.length} directions generated. Winner: "${dWinner.name}". Will rotate directions across ${assets.length} assets.`);

    const decisionTraceId = await storeDecisionTrace(supabase, userId, campaignId, researchId || null, decision, intelligenceBrief || {}, brandMemory || []);

    const placeholderIds: string[] = [];
    for (const asset of assets) {
      const { platform, format, aspectRatio, assetType } = asset;
      const route = routeProvider(assetType);
      const { data: placeholder, error: insertError } = await supabase
        .from("generated_assets")
        .insert({
          campaign_id: campaignId, profile_id: userId, asset_type: assetType,
          content_url: null, content_text: `[meta:${platform}|${format}|${aspectRatio}] Generating…`,
          status: "pending_review", platform, format, provider: route.provider,
          generation_cost: 0, generation_time_ms: 0, research_id: researchId || null, rationale: "Generating…",
        })
        .select("id")
        .single();
      placeholderIds.push(insertError ? "error" : placeholder.id);
    }

    EdgeRuntime.waitUntil(
      processAssetsInBackground(userId, campaignId, assets, researchId || null, intelligenceBrief || {}, brandContext || {}, placeholderIds, decisionTraceId, dWinner, creativeDirection || null, referenceImageUrl || null, templateRefs || null, userAssets || null, structuredBrief || null, campaignCopy || null, allDirections.length > 1 ? allDirections : null)
        .catch((e) => console.error("[BG] Fatal error:", e))
    );

    return new Response(
      JSON.stringify({
        message: "Generation started",
        placeholders: placeholderIds.length,
        decisionTraceId,
        decision: { winner: dWinner.name, angle: dWinner.angle_type, confidence: decision.confidence_score, rationale: decision.winner_rationale },
        summary: { total: assets.length, succeeded: 0, failed: 0, totalCost: "0.0000", status: "generating" },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Generate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
