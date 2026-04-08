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

    // Fetch all templates missing preview_url
    const { data: templates, error: fetchErr } = await adminClient
      .from("image_templates")
      .select("id, style_name, vertical, format, style_guide")
      .is("preview_url", null);

    if (fetchErr) throw fetchErr;
    if (!templates || templates.length === 0) {
      return new Response(JSON.stringify({ message: "All templates already have previews" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating previews for ${templates.length} templates...`);
    const results: { id: string; style_name: string; status: string; preview_url?: string }[] = [];

    for (const tpl of templates) {
      const sg = tpl.style_guide as Record<string, string> || {};
      const prompt = `Professional ${tpl.vertical} product photography preview for a "${tpl.style_name}" template style. ${sg.composition || "balanced composition"}, ${sg.lighting || "studio lighting"}, ${sg.background || "clean background"}. ${sg.color_treatment || "natural color treatment"}. Shot on Nikon Z8 45.7MP, 85mm f/1.8 lens. Organic textures, subtle cinematic film grain. No text, no watermarks, no logos. Photorealistic, editorial quality. Format: ${tpl.format || "1:1"}.`;

      console.log(`[${tpl.style_name}] Generating...`);

      try {
        // Generate image via Gemini
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
          }),
        });

        if (!aiResp.ok) {
          const errText = await aiResp.text();
          console.error(`[${tpl.style_name}] AI error: ${errText}`);
          results.push({ id: tpl.id, style_name: tpl.style_name, status: `ai_error: ${aiResp.status}` });
          continue;
        }

        const aiData = await aiResp.json();
        const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!imageUrl || !imageUrl.startsWith("data:image")) {
          console.error(`[${tpl.style_name}] No image in response`);
          results.push({ id: tpl.id, style_name: tpl.style_name, status: "no_image_returned" });
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
        const fileName = `image-templates/${tpl.id}.png`;
        const { error: uploadErr } = await adminClient.storage
          .from("library-assets")
          .upload(fileName, bytes, {
            contentType: "image/png",
            upsert: true,
          });

        if (uploadErr) {
          console.error(`[${tpl.style_name}] Upload error:`, uploadErr);
          results.push({ id: tpl.id, style_name: tpl.style_name, status: `upload_error: ${uploadErr.message}` });
          continue;
        }

        // Get public URL
        const { data: urlData } = adminClient.storage
          .from("library-assets")
          .getPublicUrl(fileName);

        const publicUrl = urlData.publicUrl;

        // Update template row
        const { error: updateErr } = await adminClient
          .from("image_templates")
          .update({ preview_url: publicUrl })
          .eq("id", tpl.id);

        if (updateErr) {
          console.error(`[${tpl.style_name}] DB update error:`, updateErr);
          results.push({ id: tpl.id, style_name: tpl.style_name, status: `db_error: ${updateErr.message}` });
          continue;
        }

        console.log(`[${tpl.style_name}] ✅ Done: ${publicUrl}`);
        results.push({ id: tpl.id, style_name: tpl.style_name, status: "success", preview_url: publicUrl });

      } catch (e: any) {
        console.error(`[${tpl.style_name}] Error:`, e.message);
        results.push({ id: tpl.id, style_name: tpl.style_name, status: `error: ${e.message}` });
      }
    }

    const successCount = results.filter(r => r.status === "success").length;
    return new Response(JSON.stringify({ 
      message: `Generated ${successCount}/${templates.length} previews`,
      results 
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
