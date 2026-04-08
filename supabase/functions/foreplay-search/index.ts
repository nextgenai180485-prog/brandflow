const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FOREPLAY_BASE = "https://public.api.foreplay.co";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("FOREPLAY_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "FOREPLAY_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      endpoint = "discovery/ads",
      keyword,
      domain,
      niche,
      niches,
      platform,
      display_format,
      live,
      language,
      market_target,
      running_duration_min_days,
      running_duration_max_days,
      limit = 25,
      offset = 0,
      cursor,
      order,
      // Brand search params
      name,
      category,
    } = body;

    const params = new URLSearchParams();

    const isBrandEndpoint = endpoint.includes("brands");

    if (isBrandEndpoint) {
      // Brand endpoints use 'query' for search
      if (name) params.set("query", name);
      if (keyword) params.set("query", keyword);
      if (category) params.set("category", category);
      if (niches) params.set("niches", JSON.stringify(Array.isArray(niches) ? niches : [niches]));
      if (niche) params.set("niches", JSON.stringify([niche]));
    } else {
      // Ad endpoints
      if (keyword) params.set("keyword", keyword);
      if (domain) params.set("domain", domain);
      if (niches) params.set("niches", JSON.stringify(Array.isArray(niches) ? niches : [niches]));
      else if (niche) params.set("niches", JSON.stringify([niche]));
      if (platform) params.set("publisher_platform", platform);
      if (display_format) params.set("display_format", display_format);
      if (live !== undefined) params.set("live", String(live));
      if (language) params.set("languages", language);
      if (market_target) params.set("market_target", market_target);
      if (running_duration_min_days) params.set("running_duration_min_days", String(running_duration_min_days));
      if (running_duration_max_days) params.set("running_duration_max_days", String(running_duration_max_days));
      if (order) params.set("order", order);
    }

    if (cursor) params.set("cursor", cursor);
    if (offset) params.set("offset", String(offset));
    params.set("limit", String(limit));

    const url = `${FOREPLAY_BASE}/api/${endpoint}?${params.toString()}`;
    console.log("Foreplay request:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: apiKey,
        Accept: "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const status = response.status;
      let errorMsg = data?.error?.message || data?.metadata?.message || `Foreplay API error (${status})`;

      if (status === 402) errorMsg = "Foreplay credits exhausted. Please top up at app.foreplay.co";
      if (status === 429) errorMsg = "Foreplay rate limit reached. Please wait a moment and try again.";

      console.error("Foreplay error:", status, errorMsg, JSON.stringify(data));
      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const creditsRemaining = response.headers.get("X-Credits-Remaining");
    const creditCost = response.headers.get("X-Credit-Cost");

    return new Response(
      JSON.stringify({
        success: true,
        data: data.data || [],
        metadata: {
          ...data.metadata,
          credits_remaining: creditsRemaining ? parseInt(creditsRemaining) : null,
          credit_cost: creditCost ? parseInt(creditCost) : null,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Foreplay search error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
