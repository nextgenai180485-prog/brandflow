import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, CheckCheck, XCircle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import GenerateButton from "@/components/GenerateButton";
import AssetFeedCard from "@/components/AssetFeedCard";
import AssetInspector from "@/components/AssetInspector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Campaign, GeneratedAsset, CampaignStatus, SocialPlatform } from "@/types/campaigns";
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
  const match = (asset.content_text || "").match(/^\[meta:([a-z]+)\|/);
  return match ? (match[1] as SocialPlatform) : null;
};

const CampaignDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePlatform, setActivePlatform] = useState<SocialPlatform | "all">("all");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user || !id) return;
    const [cRes, aRes] = await Promise.all([
      supabase.from("campaigns").select("*").eq("id", id).single(),
      supabase.from("generated_assets").select("*").eq("campaign_id", id).order("created_at", { ascending: false }),
    ]);
    if (cRes.data) setCampaign(cRes.data as Campaign);
    if (aRes.data) {
      const newAssets = aRes.data as GeneratedAsset[];
      setAssets(newAssets);
      if (newAssets.length > 0 && newAssets.every((a) => a.status === "approved")) {
        const c = cRes.data as Campaign;
        if (c && c.status === "review") {
          await supabase.from("campaigns").update({ status: "approved" }).eq("id", id);
          setCampaign({ ...c, status: "approved" } as Campaign);
          toast.success("All assets approved — campaign ready to publish!");
        }
      }
    }
    setLoading(false);
  }, [user, id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDeleteCampaign = async () => {
    if (!id) return;
    await supabase.from("generated_assets").delete().eq("campaign_id", id);
    await supabase.from("campaigns").delete().eq("id", id);
    toast.success("Campaign deleted.");
    navigate("/dashboard");
  };

  const platformTabs = useMemo(() => {
    const platforms = new Set<SocialPlatform>();
    assets.forEach((a) => { const p = parsePlatform(a); if (p) platforms.add(p); });
    return Array.from(platforms).sort();
  }, [assets]);

  const generatedAssets = assets.filter((a) => a.content_url?.includes("placehold") || a.asset_type === "copy");
  const filteredAssets = activePlatform === "all"
    ? generatedAssets
    : generatedAssets.filter((a) => parsePlatform(a) === activePlatform);
  const pendingAssets = filteredAssets.filter((a) => a.status === "pending_review");

  const selectedAsset = assets.find((a) => a.id === selectedAssetId) || null;
  const selectedIdx = filteredAssets.findIndex((a) => a.id === selectedAssetId);

  const handleNavigate = (dir: "prev" | "next") => {
    const newIdx = dir === "prev" ? selectedIdx - 1 : selectedIdx + 1;
    if (newIdx >= 0 && newIdx < filteredAssets.length) {
      setSelectedAssetId(filteredAssets[newIdx].id);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="px-4 sm:px-6 pt-6">
          <Skeleton className="h-5 w-40 mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5] rounded-lg" />)}
          </div>
        </div>
      </AppShell>
    );
  }

  if (!campaign) {
    return (
      <AppShell>
        <div className="px-4 sm:px-6 pt-6">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <p className="text-sm text-muted-foreground">Campaign not found.</p>
        </div>
      </AppShell>
    );
  }

  const status = statusConfig[campaign.status];

  return (
    <AppShell>
      <div className="px-4 sm:px-6 pt-4 pb-6">
        {/* Header — 24px from top, tight lockup */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <button onClick={() => navigate("/dashboard")} className="p-1.5 -ml-1.5 rounded-md hover:bg-secondary transition-colors shrink-0">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground truncate tracking-tight">{campaign.title}</h1>
            <Badge variant="outline" className={`text-[10px] shrink-0 ${status.className}`}>{status.label}</Badge>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {campaign.status === "draft" && <GenerateButton campaignId={campaign.id} onGenerated={fetchData} />}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
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

        {/* Platform filter tabs + bulk actions — 16px gap */}
        {generatedAssets.length > 0 && (
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setActivePlatform("all")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
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
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
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
                  className="h-7 text-[10px] gap-0.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                  onClick={async () => {
                    await supabase.from("generated_assets").update({ status: "approved" }).in("id", pendingAssets.map((a) => a.id));
                    toast.success(`${pendingAssets.length} approved!`);
                    fetchData();
                  }}
                >
                  <CheckCheck className="w-3 h-3" /> Accept All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] gap-0.5 text-red-700 border-red-200 hover:bg-red-50"
                  onClick={async () => {
                    await supabase.from("generated_assets").update({ status: "rejected" }).in("id", pendingAssets.map((a) => a.id));
                    toast.success(`${pendingAssets.length} rejected.`);
                    fetchData();
                  }}
                >
                  <XCircle className="w-3 h-3" /> Reject All
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Asset grid — high-density masonry-style */}
        {filteredAssets.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {filteredAssets.map((asset) => (
              <AssetFeedCard
                key={asset.id}
                asset={asset}
                onStatusChange={fetchData}
                isSelected={asset.id === selectedAssetId}
                onClick={() => setSelectedAssetId(asset.id)}
              />
            ))}
          </div>
        ) : campaign.status === "draft" ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card py-16">
            <p className="text-muted-foreground mb-4 text-xs text-center px-4">
              Ready to create content for this campaign.
            </p>
            <GenerateButton campaignId={campaign.id} onGenerated={fetchData} />
          </div>
        ) : generatedAssets.length > 0 && filteredAssets.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-xs text-muted-foreground">No assets for this platform.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card py-16">
            <div className="w-5 h-5 border-2 border-foreground border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-muted-foreground text-xs">Generating…</p>
          </div>
        )}
      </div>

      {/* Inspector Side Panel / Bottom Drawer */}
      <AssetInspector
        asset={selectedAsset}
        open={!!selectedAssetId}
        onOpenChange={(open) => { if (!open) setSelectedAssetId(null); }}
        onStatusChange={fetchData}
        campaignId={campaign.id}
        campaignStatus={campaign.status}
        onScheduled={fetchData}
        onNavigate={handleNavigate}
        hasPrev={selectedIdx > 0}
        hasNext={selectedIdx < filteredAssets.length - 1}
      />
    </AppShell>
  );
};

export default CampaignDetails;
