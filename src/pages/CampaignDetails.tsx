import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import GenerateButton from "@/components/GenerateButton";
import AssetCard from "@/components/AssetCard";
import ScheduleModal from "@/components/ScheduleModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Campaign, GeneratedAsset, CampaignStatus } from "@/types/campaigns";

const statusConfig: Record<CampaignStatus, { label: string; variant: "secondary" | "default" | "outline" | "destructive"; className?: string }> = {
  draft: { label: "Draft", variant: "secondary" },
  generating: { label: "Generating", variant: "outline", className: "animate-pulse border-blue-300 text-blue-700 bg-blue-50" },
  review: { label: "In Review", variant: "default", className: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100" },
  approved: { label: "Approved", variant: "default", className: "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100" },
  scheduled: { label: "Scheduled", variant: "default", className: "bg-violet-100 text-violet-800 border-violet-200 hover:bg-violet-100" },
  published: { label: "Published", variant: "default", className: "bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-100" },
};

const CampaignDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user || !id) return;
    const [campaignRes, assetsRes] = await Promise.all([
      supabase.from("campaigns").select("*").eq("id", id).single(),
      supabase.from("generated_assets").select("*").eq("campaign_id", id).order("created_at", { ascending: false }),
    ]);
    if (campaignRes.data) setCampaign(campaignRes.data as Campaign);
    if (assetsRes.data) {
      const newAssets = assetsRes.data as GeneratedAsset[];
      setAssets(newAssets);

      // Auto-transition: all assets approved → campaign approved
      if (newAssets.length > 0 && newAssets.every((a) => a.status === "approved")) {
        const currentCampaign = campaignRes.data as Campaign;
        if (currentCampaign && currentCampaign.status === "review") {
          await supabase.from("campaigns").update({ status: "approved" }).eq("id", id);
          setCampaign({ ...currentCampaign, status: "approved" } as Campaign);
          toast.success("All assets approved! Campaign is ready to publish.");
        }
      }
    }
    setLoading(false);
  }, [user, id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
          <div className="flex items-center gap-3">
            <Badge variant={status.variant} className={status.className}>{status.label}</Badge>
            <Button
              size="sm"
              onClick={() => setScheduleOpen(true)}
              disabled={campaign.status !== "approved"}
              className="gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              Publish All Approved
            </Button>
          </div>
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

          {/* Right: Generated Content */}
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
                  <AssetCard key={asset.id} asset={asset} onStatusChange={fetchData} />
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

      <ScheduleModal
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        campaignId={campaign.id}
        onScheduled={fetchData}
      />
    </AppShell>
  );
};

export default CampaignDetails;
