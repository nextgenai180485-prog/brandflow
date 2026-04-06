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
  const pendingAssets = generatedAssets.filter((a) => a.status === "pending_review");

  if (loading) {
    return (
      <AppShell>
        <div className="p-4 sm:p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] rounded-xl" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  if (!campaign) {
    return (
      <AppShell>
        <div className="p-4 sm:p-6">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Back to Campaigns
          </button>
          <p className="text-muted-foreground">Campaign not found.</p>
        </div>
      </AppShell>
    );
  }

  const status = statusConfig[campaign.status];

  return (
    <AppShell>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Compact Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">{campaign.title}</h1>
              {campaign.instructions && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{campaign.instructions}</p>
              )}
            </div>
            <Badge variant="outline" className={`${status.className} shrink-0`}>{status.label}</Badge>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {campaign.status === "draft" && (
              <GenerateButton campaignId={campaign.id} onGenerated={fetchData} />
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setScheduleOpen(true)}
              disabled={campaign.status !== "approved"}
              className="gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Publish
            </Button>
          </div>
        </div>

        {/* Source assets filmstrip */}
        {sourceAssets.length > 0 && (
          <div className="mb-5">
            <h2 className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-2">Source Assets</h2>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sourceAssets.map((asset) => (
                <div key={asset.id} className="shrink-0 w-16 h-16 rounded-lg border border-border overflow-hidden bg-card">
                  {asset.content_url && (
                    <img src={asset.content_url} alt="Source" className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feed header + bulk actions */}
        {generatedAssets.length > 0 && (
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                Generated · {generatedAssets.length}
              </span>
            </div>

            {pendingAssets.length > 1 && (
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                  onClick={async () => {
                    await supabase
                      .from("generated_assets")
                      .update({ status: "approved" })
                      .in("id", pendingAssets.map((a) => a.id));
                    toast.success(`${pendingAssets.length} assets approved!`);
                    fetchData();
                  }}
                >
                  <CheckCheck className="w-3 h-3" /> Accept All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] gap-1 text-red-700 border-red-200 hover:bg-red-50"
                  onClick={async () => {
                    await supabase
                      .from("generated_assets")
                      .update({ status: "rejected" })
                      .in("id", pendingAssets.map((a) => a.id));
                    toast.success(`${pendingAssets.length} assets rejected.`);
                    fetchData();
                  }}
                >
                  <XCircle className="w-3 h-3" /> Reject All
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Adobe-style dense grid */}
        {generatedAssets.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
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
