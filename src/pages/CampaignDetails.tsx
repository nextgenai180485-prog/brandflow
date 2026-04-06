import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Sparkles, CheckCheck, XCircle, Trash2 } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Campaign, GeneratedAsset, CampaignStatus, SocialPlatform, SOCIAL_FORMATS } from "@/types/campaigns";
import { PLATFORM_LABELS } from "@/types/campaigns";

const statusConfig: Record<CampaignStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-secondary text-secondary-foreground" },
  generating: { label: "Generating", className: "animate-pulse bg-blue-50 text-blue-700 border-blue-200" },
  review: { label: "In Review", className: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  scheduled: { label: "Scheduled", className: "bg-violet-100 text-violet-800 border-violet-200" },
  published: { label: "Published", className: "bg-sky-100 text-sky-800 border-sky-200" },
};

const parsePlatform = (asset: GeneratedAsset): SocialPlatform | null => {
  const text = asset.content_text || "";
  const match = text.match(/^\[meta:([a-z]+)\|/);
  return match ? (match[1] as SocialPlatform) : null;
};

const CampaignDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [activePlatform, setActivePlatform] = useState<SocialPlatform | "all">("all");

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
          toast.success("All assets approved! Campaign ready to publish.");
        }
      }
    }
    setLoading(false);
  }, [user, id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteCampaign = async () => {
    if (!id) return;
    await supabase.from("generated_assets").delete().eq("campaign_id", id);
    await supabase.from("campaigns").delete().eq("id", id);
    toast.success("Campaign deleted.");
    navigate("/dashboard");
  };

  // Derive platform tabs from actual assets
  const platformTabs = useMemo(() => {
    const platforms = new Set<SocialPlatform>();
    assets.forEach((a) => {
      const p = parsePlatform(a);
      if (p) platforms.add(p);
    });
    return Array.from(platforms).sort();
  }, [assets]);

  const generatedAssets = assets.filter((a) => a.content_url?.includes("placehold") || a.asset_type === "copy");
  const sourceAssets = assets.filter((a) => a.content_url && !a.content_url.includes("placehold"));

  const filteredAssets = activePlatform === "all"
    ? generatedAssets
    : generatedAssets.filter((a) => parsePlatform(a) === activePlatform);

  const pendingAssets = filteredAssets.filter((a) => a.status === "pending_review");

  if (loading) {
    return (
      <AppShell>
        <div className="px-4 sm:px-6 pt-3">
          <Skeleton className="h-6 w-40 mb-3" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] rounded-lg" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  if (!campaign) {
    return (
      <AppShell>
        <div className="px-4 sm:px-6 pt-3">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <p className="text-muted-foreground text-sm">Campaign not found.</p>
        </div>
      </AppShell>
    );
  }

  const status = statusConfig[campaign.status];

  return (
    <AppShell>
      <div className="px-4 sm:px-6 pt-3 pb-6">
        {/* Compact header — 16px gap from top nav */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-1.5 -ml-1.5 rounded-md hover:bg-secondary transition-colors shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">{campaign.title}</h1>
            <Badge variant="outline" className={`text-[10px] shrink-0 ${status.className}`}>{status.label}</Badge>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {campaign.status === "draft" && (
              <GenerateButton campaignId={campaign.id} onGenerated={fetchData} />
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setScheduleOpen(true)}
              disabled={campaign.status !== "approved"}
              className="gap-1 h-8 text-xs"
            >
              <Send className="w-3 h-3" /> Publish
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{campaign.title}" and all generated assets.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteCampaign} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Source assets filmstrip */}
        {sourceAssets.length > 0 && (
          <div className="mb-3">
            <h2 className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest mb-1.5">Source Assets</h2>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {sourceAssets.map((asset) => (
                <div key={asset.id} className="shrink-0 w-12 h-12 rounded-md border border-border overflow-hidden bg-card">
                  {asset.content_url && <img src={asset.content_url} alt="Source" className="w-full h-full object-cover" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Platform filter tabs + bulk actions */}
        {generatedAssets.length > 0 && (
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                onClick={() => setActivePlatform("all")}
                className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors whitespace-nowrap ${
                  activePlatform === "all" ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({generatedAssets.length})
              </button>
              {platformTabs.map((p) => {
                const count = generatedAssets.filter((a) => parsePlatform(a) === p).length;
                return (
                  <button
                    key={p}
                    onClick={() => setActivePlatform(p)}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors whitespace-nowrap ${
                      activePlatform === p ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {PLATFORM_LABELS[p]} ({count})
                  </button>
                );
              })}
            </div>

            {pendingAssets.length > 1 && (
              <div className="flex gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[9px] gap-0.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                  onClick={async () => {
                    await supabase.from("generated_assets").update({ status: "approved" }).in("id", pendingAssets.map((a) => a.id));
                    toast.success(`${pendingAssets.length} approved!`);
                    fetchData();
                  }}
                >
                  <CheckCheck className="w-2.5 h-2.5" /> Accept All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[9px] gap-0.5 text-red-700 border-red-200 hover:bg-red-50"
                  onClick={async () => {
                    await supabase.from("generated_assets").update({ status: "rejected" }).in("id", pendingAssets.map((a) => a.id));
                    toast.success(`${pendingAssets.length} rejected.`);
                    fetchData();
                  }}
                >
                  <XCircle className="w-2.5 h-2.5" /> Reject All
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Asset grid */}
        {filteredAssets.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {filteredAssets.map((asset) => (
              <AssetFeedCard key={asset.id} asset={asset} onStatusChange={fetchData} />
            ))}
          </div>
        ) : campaign.status === "draft" ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card py-12">
            <p className="text-muted-foreground mb-4 text-xs text-center px-4">
              Ready to create content for this campaign.
            </p>
            <GenerateButton campaignId={campaign.id} onGenerated={fetchData} />
          </div>
        ) : generatedAssets.length > 0 && filteredAssets.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-xs text-muted-foreground">No assets for this platform.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card py-12">
            <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-muted-foreground text-xs">Generating…</p>
          </div>
        )}
      </div>

      <ScheduleModal open={scheduleOpen} onOpenChange={setScheduleOpen} campaignId={campaign.id} onScheduled={fetchData} />
    </AppShell>
  );
};

export default CampaignDetails;
