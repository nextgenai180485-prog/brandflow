import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Sparkles, CheckCheck, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import GenerateButton from "@/components/GenerateButton";
import AssetFeedCard from "@/components/AssetFeedCard";
import ScheduleModal from "@/components/ScheduleModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Campaign, GeneratedAsset, CampaignStatus } from "@/types/campaigns";

const statusConfig: Record<CampaignStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-secondary text-secondary-foreground" },
  generating: { label: "Generating", className: "animate-pulse bg-blue-50 text-blue-700 border-blue-200" },
  review: { label: "In Review", className: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  scheduled: { label: "Scheduled", className: "bg-violet-100 text-violet-800 border-violet-200" },
  published: { label: "Published", className: "bg-sky-100 text-sky-800 border-sky-200" },
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
        <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-6 w-24 mb-8" />
          <div className="space-y-6">
            <Skeleton className="h-[400px] rounded-2xl" />
            <Skeleton className="h-[400px] rounded-2xl" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (!campaign) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
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
      <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:py-10">
        {/* Back nav */}
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Campaigns
        </button>

        {/* Campaign Header Card */}
        <div className="bg-card rounded-2xl border border-border p-5 sm:p-8 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-semibold text-foreground truncate">{campaign.title}</h1>
              <p className="text-xs text-muted-foreground font-mono mt-1">ID: {campaign.id.slice(0, 12)}…</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className={status.className}>{status.label}</Badge>
            </div>
          </div>

          {campaign.instructions && (
            <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{campaign.instructions}</p>
          )}

          {/* Action bar */}
          <div className="flex flex-col sm:flex-row gap-2 mt-6 pt-4 border-t border-border/50">
            {campaign.status === "draft" && (
              <GenerateButton campaignId={campaign.id} onGenerated={fetchData} />
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setScheduleOpen(true)}
              disabled={campaign.status !== "approved"}
              className="gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              Publish All Approved
            </Button>
          </div>
        </div>

        {/* Source assets — compact row */}
        {sourceAssets.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 px-1">Uploaded Assets</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {sourceAssets.map((asset) => (
                <div key={asset.id} className="shrink-0 w-20 h-20 rounded-xl border border-border overflow-hidden bg-card">
                  {asset.asset_type === "image" && asset.content_url && (
                    <img src={asset.content_url} alt="Source" className="w-full h-full object-cover" />
                  )}
                  {asset.asset_type === "video" && asset.content_url && (
                    <video src={asset.content_url} className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feed Section Label */}
        <div className="flex items-center gap-2 mb-4 px-1">
          <Sparkles className="w-4 h-4 text-brand" />
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Generated Content Feed</h2>
          {generatedAssets.length > 0 && (
            <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {generatedAssets.length} item{generatedAssets.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Feed Grid — responsive */}
        {generatedAssets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {generatedAssets.map((asset) => (
              <AssetFeedCard
                key={asset.id}
                asset={asset}
                onStatusChange={fetchData}
                campaignTitle={campaign.title}
              />
            ))}
          </div>
        ) : campaign.status === "draft" ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card py-16 sm:py-20">
            <p className="text-muted-foreground mb-6 text-sm text-center px-4">
              Ready to create content for this campaign.
            </p>
            <GenerateButton campaignId={campaign.id} onGenerated={fetchData} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card py-16">
            <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground text-sm">Generating content…</p>
          </div>
        )}
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
