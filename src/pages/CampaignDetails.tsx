import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ImageIcon, VideoIcon, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import GenerateButton from "@/components/GenerateButton";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Campaign, GeneratedAsset, CampaignStatus } from "@/types/campaigns";

const statusConfig: Record<CampaignStatus, { label: string; variant: "secondary" | "default" | "outline" | "destructive"; className?: string }> = {
  draft: { label: "Draft", variant: "secondary" },
  generating: { label: "Generating", variant: "outline", className: "animate-pulse border-blue-300 text-blue-700 bg-blue-50" },
  review: { label: "In Review", variant: "default", className: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100" },
  approved: { label: "Approved", variant: "default", className: "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100" },
};

const assetIcon = (type: string) => {
  if (type === "image") return <ImageIcon className="w-5 h-5 text-muted-foreground" />;
  if (type === "video") return <VideoIcon className="w-5 h-5 text-muted-foreground" />;
  return <FileText className="w-5 h-5 text-muted-foreground" />;
};

const CampaignDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user || !id) return;
    const [campaignRes, assetsRes] = await Promise.all([
      supabase.from("campaigns").select("*").eq("id", id).single(),
      supabase.from("generated_assets").select("*").eq("campaign_id", id).order("created_at", { ascending: false }),
    ]);
    if (campaignRes.data) setCampaign(campaignRes.data as Campaign);
    if (assetsRes.data) setAssets(assetsRes.data as GeneratedAsset[]);
    setLoading(false);
  }, [user, id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Split: source uploads vs generated content
  // Source assets are ones uploaded during campaign creation (before generation)
  // Generated assets appear after the generate button is clicked
  const sourceAssets = assets.filter((a) => a.content_url && !a.content_url.includes("placehold"));
  const generatedAssets = assets.filter((a) => a.content_url?.includes("placehold") || a.asset_type === "copy");

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto py-12 px-4 md:px-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-6 w-24 mb-10" />
          <div className="grid md:grid-cols-2 gap-10">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (!campaign) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto py-12 px-4 md:px-8">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Campaigns
          </button>
          <p className="text-muted-foreground">Campaign not found.</p>
        </div>
      </AppShell>
    );
  }

  const status = statusConfig[campaign.status];

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto py-12 px-4 md:px-8">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Campaigns
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <h1 className="text-3xl font-semibold text-foreground">{campaign.title}</h1>
          <Badge variant={status.variant} className={status.className}>{status.label}</Badge>
        </div>

        {/* Two-column layout */}
        <div className="grid md:grid-cols-2 gap-10">
          {/* Left: Source & Instructions */}
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Instructions</h2>
              {campaign.instructions ? (
                <p className="text-foreground leading-relaxed">{campaign.instructions}</p>
              ) : (
                <p className="text-muted-foreground italic">No instructions provided.</p>
              )}
            </div>

            {sourceAssets.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Uploaded Assets</h2>
                <div className="space-y-3">
                  {sourceAssets.map((asset) => (
                    <div key={asset.id} className="rounded-lg border border-border overflow-hidden bg-card">
                      {asset.asset_type === "image" && asset.content_url && (
                        <img src={asset.content_url} alt="Source asset" className="w-full h-auto object-cover max-h-72" />
                      )}
                      {asset.asset_type === "video" && asset.content_url && (
                        <video src={asset.content_url} controls className="w-full max-h-72" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Generated Content — white card with shadow */}
          <div className="bg-card rounded-xl shadow-lg p-8 space-y-6">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Generated Content</h2>

            {campaign.status === "draft" && generatedAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-16">
                <p className="text-muted-foreground mb-6 text-sm">Ready to create content for this campaign.</p>
                <GenerateButton campaignId={campaign.id} onGenerated={fetchData} />
              </div>
            ) : generatedAssets.length > 0 ? (
              <div className="space-y-4">
                {generatedAssets.map((asset) => (
                  <div key={asset.id} className="rounded-lg border border-border bg-background p-4">
                    <div className="flex items-center gap-2 mb-3">
                      {assetIcon(asset.asset_type)}
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{asset.asset_type}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">{asset.status.replace("_", " ")}</Badge>
                    </div>
                    {asset.asset_type === "copy" && asset.content_text ? (
                      <p className="text-sm text-foreground leading-relaxed">{asset.content_text}</p>
                    ) : asset.content_url ? (
                      <img src={asset.content_url} alt={`Generated ${asset.asset_type}`} className="w-full rounded-md max-h-48 object-cover" />
                    ) : (
                      <Skeleton className="h-32 w-full rounded-md" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-16">
                <p className="text-muted-foreground text-sm">Generating content…</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default CampaignDetails;
