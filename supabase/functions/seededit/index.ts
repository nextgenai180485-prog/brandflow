import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get("authorization");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      anonKey,
      { global: { headers: { Authorization: authHeader! } } }
    );
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, imageUrl, prompt, assetId, guidanceScale } =
      await req.json();

    const WAVESPEED_API_KEY = Deno.env.get("WAVESPEED_API_KEY");
    if (!WAVESPEED_API_KEY)
      throw new Error("WAVESPEED_API_KEY not configured");

    if (action === "edit") {
      console.log("SeedEdit request:", { prompt, guidanceScale, assetId });

      // Submit SeedEdit task
      const submitResp = await fetch(
        "https://api.wavespeed.ai/api/v3/bytedance/seededit-v3",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${WAVESPEED_API_KEY}`,
          },
          body: JSON.stringify({
            image: imageUrl,
            prompt: prompt,
            guidance_scale: guidanceScale ?? 0.5,
            seed: -1,
            enable_base64_output: false,
          }),
        }
      );

      if (!submitResp.ok) {
        const errText = await submitResp.text();
        console.error("WaveSpeed submit error:", submitResp.status, errText);
        return new Response(
          JSON.stringify({
            error: `WaveSpeed API error: ${submitResp.status}`,
            detail: errText,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const submitData = await submitResp.json();
      console.log("WaveSpeed submit response:", JSON.stringify(submitData));
      const taskId = submitData.data?.id;
      const resultUrl = submitData.data?.urls?.get;

      if (!taskId || !resultUrl) {
        console.error("No task ID in response:", submitData);
        return new Response(
          JSON.stringify({ error: "Failed to start edit task" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Poll for result (max 60s)
      let result = null;
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000));

        const pollResp = await fetch(resultUrl, {
          headers: { Authorization: `Bearer ${WAVESPEED_API_KEY}` },
        });

        if (!pollResp.ok) {
          console.log(`Poll attempt ${i + 1} failed: ${pollResp.status}`);
          continue;
        }

        const pollData = await pollResp.json();
        const status = pollData.data?.status;
        console.log(`Poll attempt ${i + 1}: status=${status}`);

        if (status === "completed") {
          result = pollData.data;
          break;
        }
        if (status === "failed") {
          console.error("SeedEdit task failed:", pollData.data?.error);
          return new Response(
            JSON.stringify({
              error: pollData.data?.error || "Edit task failed",
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }

      if (!result) {
        return new Response(JSON.stringify({ error: "Edit timed out" }), {
          status: 504,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const outputUrl =
        Array.isArray(result.outputs) && result.outputs.length > 0
          ? result.outputs[0]
          : null;

      if (!outputUrl) {
        return new Response(
          JSON.stringify({ error: "No output from edit" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Download and upload to Supabase Storage
      const imgResp = await fetch(outputUrl);
      const imgBlob = await imgResp.blob();
      const fileName = `${user.id}/${assetId || crypto.randomUUID()}_edited_${Date.now()}.png`;

      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { error: uploadError } = await serviceClient.storage
        .from("campaign_assets")
        .upload(fileName, imgBlob, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        return new Response(
          JSON.stringify({
            editedUrl: outputUrl,
            inference: result.timings?.inference,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const {
        data: { publicUrl },
      } = serviceClient.storage
        .from("campaign_assets")
        .getPublicUrl(fileName);

      // Update asset record if assetId provided
      if (assetId && assetId !== "test") {
        await serviceClient
          .from("generated_assets")
          .update({
            content_url: publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", assetId);
      }

      console.log("SeedEdit complete:", { publicUrl, inference: result.timings?.inference });

      return new Response(
        JSON.stringify({
          editedUrl: publicUrl,
          inference: result.timings?.inference,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("seededit error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
