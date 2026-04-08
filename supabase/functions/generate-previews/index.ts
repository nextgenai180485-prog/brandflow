import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse body
    let limit = 2;
    let targetTable: "image_templates" | "video_templates" = "image_templates";
    try {
      const body = await req.json();
      if (body?.limit) limit = Math.min(body.limit, 5);
      if (body?.table === "video_templates") targetTable = "video_templates";
    } catch { /* no body is fine */ }

    let templates: any[] = [];

    if (targetTable === "image_templates") {
      const { data, error } = await adminClient
        .from("image_templates")
        .select("id, style_name, vertical, format, style_guide")
        .is("preview_url", null)
        .limit(limit);
      if (error) throw error;
      templates = (data || []).map((t: any) => ({
        id: t.id,
        name: t.style_name,
        table: "image_templates" as const,
        urlField: "preview_url" as const,
        storagePath: `image-templates/${t.id}.png`,
        prompt: buildImageTemplatePrompt(t),
      }));
    } else {
      const { data, error } = await adminClient
        .from("video_templates")
        .select("id, template_name, family, mood, tags, aspect_ratio, duration_s, sealcam_analysis")
        .is("example_url", null)
        .limit(limit);
      if (error) throw error;
      templates = (data || []).map((t: any) => ({
        id: t.id,
        name: t.template_name,
        table: "video_templates" as const,
        urlField: "example_url" as const,
        storagePath: `video-templates/${t.id}.png`,
        prompt: buildVideoTemplatePrompt(t),
      }));
    }

    if (templates.length === 0) {
      return new Response(JSON.stringify({ message: `All ${targetTable} already have previews` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating previews for ${templates.length} ${targetTable}...`);
    const results: any[] = [];

    for (const tpl of templates) {
      console.log(`[${tpl.name}] Generating...`);

      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: tpl.prompt }],
            modalities: ["image", "text"],
          }),
        });

        if (!aiResp.ok) {
          const errText = await aiResp.text();
          console.error(`[${tpl.name}] AI error: ${errText}`);
          results.push({ id: tpl.id, name: tpl.name, status: `ai_error: ${aiResp.status}` });
          continue;
        }

        const aiData = await aiResp.json();
        const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!imageUrl || !imageUrl.startsWith("data:image")) {
          console.error(`[${tpl.name}] No image in response`);
          results.push({ id: tpl.id, name: tpl.name, status: "no_image_returned" });
          continue;
        }

        // Decode base64
        const base64Data = imageUrl.split(",")[1];
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        // Upload to storage
        const { error: uploadErr } = await adminClient.storage
          .from("library-assets")
          .upload(tpl.storagePath, bytes, {
            contentType: "image/png",
            upsert: true,
          });

        if (uploadErr) {
          console.error(`[${tpl.name}] Upload error:`, uploadErr);
          results.push({ id: tpl.id, name: tpl.name, status: `upload_error: ${uploadErr.message}` });
          continue;
        }

        const { data: urlData } = adminClient.storage
          .from("library-assets")
          .getPublicUrl(tpl.storagePath);

        const publicUrl = urlData.publicUrl;

        // Update template row
        const { error: updateErr } = await adminClient
          .from(tpl.table)
          .update({ [tpl.urlField]: publicUrl })
          .eq("id", tpl.id);

        if (updateErr) {
          console.error(`[${tpl.name}] DB update error:`, updateErr);
          results.push({ id: tpl.id, name: tpl.name, status: `db_error: ${updateErr.message}` });
          continue;
        }

        console.log(`[${tpl.name}] ✅ Done: ${publicUrl}`);
        results.push({ id: tpl.id, name: tpl.name, status: "success", preview_url: publicUrl });

      } catch (e: any) {
        console.error(`[${tpl.name}] Error:`, e.message);
        results.push({ id: tpl.id, name: tpl.name, status: `error: ${e.message}` });
      }
    }

    const successCount = results.filter((r: any) => r.status === "success").length;
    return new Response(JSON.stringify({
      message: `Generated ${successCount}/${templates.length} previews for ${targetTable}`,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("Fatal error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildImageTemplatePrompt(tpl: any): string {
  const sg = tpl.style_guide as Record<string, string> || {};
  return `Professional ${tpl.vertical} product photography preview for a "${tpl.style_name}" template style. ${sg.composition || "balanced composition"}, ${sg.lighting || "studio lighting"}, ${sg.background || "clean background"}. ${sg.color_treatment || "natural color treatment"}. Shot on Nikon Z8 45.7MP, 85mm f/1.8 lens. Organic textures, subtle cinematic film grain. No text, no watermarks, no logos. Photorealistic, editorial quality. Format: ${tpl.format || "1:1"}.`;
}

function buildVideoTemplatePrompt(tpl: any): string {
  const sealcam = tpl.sealcam_analysis as Record<string, any> || {};
  const family = (tpl.family || "").replace(/_/g, " ");
  const mood = tpl.mood || "professional";
  const tags = (tpl.tags || []).slice(0, 3).join(", ");
  const aspect = tpl.aspect_ratio || "9:16";

  // Build a cinematic still-frame that represents the video template style
  const sceneDesc = sealcam.opening_scene || sealcam.scene_description || "";
  const lighting = sealcam.lighting || "professional studio lighting";
  const colorGrade = sealcam.color_grade || "cinematic color grade";

  return `A cinematic still frame representing a "${tpl.template_name}" video template in the ${family} style. Mood: ${mood}. ${sceneDesc ? `Scene: ${sceneDesc}.` : ""} ${tags ? `Style tags: ${tags}.` : ""} ${lighting}, ${colorGrade}. Aspect ratio ${aspect}. Shot on RED Komodo 6K, anamorphic lens, shallow depth of field. Film grain, organic skin tones, professional production quality. No text, no watermarks, no logos. This is a preview thumbnail for a video template — show a single striking cinematic frame that captures the template's visual essence.`;
}
