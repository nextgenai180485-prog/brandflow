import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BLOTATO_BASE = "https://backend.blotato.com/v2";

async function blotatoFetch(
  path: string,
  apiKey: string,
  options: RequestInit = {}
) {
  const url = `${BLOTATO_BASE}${path}`;
  console.log(`[Blotato] ${options.method || "GET"} ${url} (key length: ${apiKey.length})`);
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "blotato-api-key": apiKey,
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) {
    console.error(`[Blotato] ${res.status} response:`, text);
    throw new Error(data?.message || data?.error || `Blotato API error ${res.status}`);
  }
  return data;
}

function getBlotatoKey(): string {
  const key = Deno.env.get("BLOTATO_API_KEY");
  if (!key) {
    throw new Error("Platform Blotato API key not configured. Contact support.");
  }
  return key;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const body = await req.json();
    const { action } = body;

    // Get platform-level Blotato key for all API actions
    let blotatoApiKey: string;
    try {
      blotatoApiKey = getBlotatoKey();
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── SYNC ACCOUNTS ───
    if (action === "sync-accounts") {
      const data = await blotatoFetch("/users/me/accounts", blotatoApiKey);
      const accounts = Array.isArray(data) ? data : data?.accounts || data?.data || [];

      for (const acc of accounts) {
        const accountId = acc.id || acc._id || acc.accountId;
        const platform = acc.platform || acc.type || "unknown";
        const username = acc.username || acc.name || acc.displayName || "";
        const displayName = acc.displayName || acc.name || username;
        const avatarUrl = acc.avatarUrl || acc.avatar || acc.profileImageUrl || null;

        await supabase.from("social_accounts").upsert(
          {
            profile_id: userId,
            blotato_account_id: String(accountId),
            platform,
            username,
            display_name: displayName,
            avatar_url: avatarUrl,
            status: "connected",
          },
          { onConflict: "profile_id,blotato_account_id" }
        );
      }

      const { data: localAccounts } = await supabase
        .from("social_accounts")
        .select("*")
        .eq("profile_id", userId);

      return new Response(JSON.stringify({ accounts: localAccounts, synced: accounts.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── LIST ACCOUNTS ───
    if (action === "list-accounts") {
      const data = await blotatoFetch("/users/me/accounts", blotatoApiKey);
      return new Response(JSON.stringify({ accounts: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── PUBLISH ───
    if (action === "publish" || action === "schedule") {
      const {
        asset_id,
        campaign_id,
        social_account_ids,
        caption,
        hashtags,
        scheduled_at,
        platform_options,
      } = body;

      if (!asset_id || !social_account_ids?.length) {
        return new Response(
          JSON.stringify({ error: "asset_id and social_account_ids required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: asset } = await supabase
        .from("generated_assets")
        .select("content_url, content_text, asset_type, platform")
        .eq("id", asset_id)
        .single();

      if (!asset?.content_url) {
        return new Response(
          JSON.stringify({ error: "Asset not found or has no content URL" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: socialAccounts } = await supabase
        .from("social_accounts")
        .select("*")
        .in("id", social_account_ids)
        .eq("profile_id", userId);

      if (!socialAccounts?.length) {
        return new Response(
          JSON.stringify({ error: "No valid social accounts found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const finalCaption = caption || asset.content_text || "";
      const hashtagString = hashtags?.length ? "\n\n" + hashtags.map((h: string) => h.startsWith("#") ? h : `#${h}`).join(" ") : "";

      const targets: Record<string, any> = {};
      for (const acc of socialAccounts) {
        targets[acc.blotato_account_id] = platform_options?.[acc.platform] || {};
      }

      const postPayload: Record<string, any> = {
        text: finalCaption + hashtagString,
        mediaUrls: [asset.content_url],
        targets,
      };

      if (action === "schedule" && scheduled_at) {
        postPayload.scheduledTime = scheduled_at;
      }

      const blotatoResult = await blotatoFetch("/posts", blotatoApiKey, {
        method: "POST",
        body: JSON.stringify(postPayload),
      });

      const submissionId = blotatoResult?.id || blotatoResult?.postSubmissionId || blotatoResult?._id;

      const records = socialAccounts.map((acc: any) => ({
        profile_id: userId,
        asset_id,
        campaign_id: campaign_id || null,
        social_account_id: acc.id,
        platform: acc.platform,
        blotato_post_submission_id: submissionId ? String(submissionId) : null,
        status: action === "schedule" ? "scheduled" : "publishing",
        scheduled_at: scheduled_at || null,
        caption: finalCaption,
        hashtags: hashtags || [],
      }));

      const { data: insertedRecords, error: insertError } = await supabase
        .from("publish_records")
        .insert(records)
        .select();

      if (insertError) {
        console.error("Insert error:", insertError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          blotato_response: blotatoResult,
          publish_records: insertedRecords,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── CHECK STATUS ───
    if (action === "check-status") {
      const { publish_record_id } = body;

      const { data: record } = await supabase
        .from("publish_records")
        .select("*")
        .eq("id", publish_record_id)
        .eq("profile_id", userId)
        .single();

      if (!record?.blotato_post_submission_id) {
        return new Response(
          JSON.stringify({ error: "Record not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const blotatoStatus = await blotatoFetch(
        `/posts/${record.blotato_post_submission_id}`,
        blotatoApiKey
      );

      let newStatus = record.status;
      let platformPostUrl = record.platform_post_url;

      if (blotatoStatus?.status === "published" || blotatoStatus?.status === "completed") {
        newStatus = "published";
        platformPostUrl = blotatoStatus?.url || blotatoStatus?.postUrl || null;
      } else if (blotatoStatus?.status === "failed" || blotatoStatus?.status === "error") {
        newStatus = "publish_failed";
      }

      if (newStatus !== record.status) {
        await supabase
          .from("publish_records")
          .update({
            status: newStatus,
            platform_post_url: platformPostUrl,
            published_at: newStatus === "published" ? new Date().toISOString() : null,
            error_message: blotatoStatus?.error || null,
          })
          .eq("id", publish_record_id);
      }

      return new Response(
        JSON.stringify({ record: { ...record, status: newStatus, platform_post_url: platformPostUrl }, blotato_status: blotatoStatus }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("social-publish error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
