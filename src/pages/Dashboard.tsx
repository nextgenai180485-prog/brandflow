import { useEffect, useState, useCallback } from "react";
import { Plus, Brain, ChevronDown, Target, TrendingUp, CheckCircle2, Clock, ImageIcon, Sparkles, BarChart3 } from "lucide-react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import EmptyCampaigns from "@/components/EmptyCampaigns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import CampaignCard from "@/components/campaign/CampaignCard";
import AssetInspectorSheet from "@/components/campaign/AssetInspectorSheet";
import BatchActionBar from "@/components/campaign/BatchActionBar";
import type { Campaign, GeneratedAsset } from "@/types/campaigns";

interface CampaignWithAssets extends Campaign {
  assets: GeneratedAsset[];
  assetCount: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState<CampaignWithAssets[]>([]);
  const [loading, setLoading] = useState(true);
  const [strategy, setStrategy] = useState<any>(null);
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [pendingRefs, setPendingRefs] = useState<any[]>([]);

  // Sheet state
  const [sheetCampaignId, setSheetCampaignId] = useState<string | null>(null);
  const [sheetAssetId, setSheetAssetId] = useState<string | null>(null);

  // Batch selection
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Auto-open sheet from URL param (backward compat with /dashboard/campaign/:id redirect)
  useEffect(() => {
    const openCampaign = searchParams.get("open");
    if (openCampaign && campaigns.length > 0) {
      setSheetCampaignId(openCampaign);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, campaigns]);

  // Process C: Welcome notification
  useEffect(() => {
    if (searchParams.get("welcome") === "1") {
      setSearchParams({}, { replace: true });
      const timer = setTimeout(() => {
        toast("I've analyzed your market position. I have 3 strategies ready for your first campaign.", { icon: "🧠", duration: 8000 });
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [searchParams, setSearchParams]);

  // Load brand strategy
  useEffect(() => {
    if (!user) return;
    supabase.from("brand_strategy" as any).select("*").eq("profile_id", user.id).limit(1)
      .then(({ data }) => {
        if (data && data.length > 0 && (data[0] as any).strategy_generated) setStrategy(data[0]);
      });
  }, [user]);

  const fetchCampaigns = useCallback(async () => {
    if (!user) return;
    const { data: campaignData } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
    if (!campaignData) { setLoading(false); return; }

    const ids = campaignData.map(c => c.id);
    const { data: assetData } = ids.length > 0
      ? await supabase.from("generated_assets").select("*").in("campaign_id", ids).order("created_at", { ascending: true })
      : { data: [] };

    const assetMap: Record<string, GeneratedAsset[]> = {};
    (assetData || []).forEach((a: any) => {
      if (!assetMap[a.campaign_id]) assetMap[a.campaign_id] = [];
      assetMap[a.campaign_id].push(a as GeneratedAsset);
    });

    setCampaigns(campaignData.map(c => ({
      ...(c as Campaign),
      assets: assetMap[c.id] || [],
      assetCount: (assetMap[c.id] || []).length,
    })));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  // Poll for generating campaigns
  useEffect(() => {
    const hasGenerating = campaigns.some(c => c.status === "generating");
    if (!hasGenerating) return;
    const interval = setInterval(fetchCampaigns, 4000);
    return () => clearInterval(interval);
  }, [campaigns, fetchCampaigns]);

  const deleteCampaign = useCallback(async (campaignId: string) => {
    await supabase.from("generated_assets").delete().eq("campaign_id", campaignId);
    const { error } = await supabase.from("campaigns").delete().eq("id", campaignId);
    if (error) { toast.error("Failed to delete campaign"); return; }
    toast.success("Campaign deleted");
    setCampaigns(prev => prev.filter(c => c.id !== campaignId));
    if (sheetCampaignId === campaignId) setSheetCampaignId(null);
  }, [sheetCampaignId]);

  const duplicateCampaign = useCallback(async (campaign: CampaignWithAssets) => {
    if (!user) return;
    const { data, error } = await supabase.from("campaigns").insert({
      profile_id: user.id,
      title: `${campaign.title} (copy)`,
      instructions: campaign.instructions || null,
      status: "draft",
      publish_platforms: campaign.publish_platforms || null,
    }).select().single();
    if (error || !data) { toast.error("Failed to duplicate"); return; }
    toast.success("Campaign duplicated");
    navigate(`/dashboard/campaigns/new`);
  }, [user, navigate]);

  // Stats
  const totalAssets = campaigns.reduce((s, c) => s + c.assetCount, 0);
  const pendingReview = campaigns.reduce((s, c) => s + c.assets.filter(a => a.status === "pending_review" && a.content_url).length, 0);
  const approvedToday = campaigns.reduce((s, c) => s + c.assets.filter(a => {
    if (a.status !== "approved") return false;
    const d = new Date(a.updated_at);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length, 0);
  const generating = campaigns.reduce((s, c) => s + c.assets.filter(a => !a.content_url && a.status !== "rejected").length, 0);

  // Sheet campaign
  const sheetCampaign = campaigns.find(c => c.id === sheetCampaignId) || null;

  // Batch handlers
  const handleBatchApprove = async () => {
    for (const id of selectedAssets) {
      await supabase.from("generated_assets").update({ status: "approved" }).eq("id", id);
    }
    setCampaigns(prev => prev.map(c => ({
      ...c,
      assets: c.assets.map(a => selectedAssets.has(a.id) ? { ...a, status: "approved" as any } : a)
    })));
    toast.success(`${selectedAssets.size} assets approved`);
    setSelectedAssets(new Set());
  };

  const handleBatchReject = async () => {
    for (const id of selectedAssets) {
      await supabase.from("generated_assets").update({ status: "rejected" }).eq("id", id);
    }
    setCampaigns(prev => prev.map(c => ({
      ...c,
      assets: c.assets.map(a => selectedAssets.has(a.id) ? { ...a, status: "rejected" as any } : a)
    })));
    toast.success(`${selectedAssets.size} assets rejected`);
    setSelectedAssets(new Set());
  };

  const handleBatchDownload = async () => {
    const allAssets = campaigns.flatMap(c => c.assets);
    for (const id of selectedAssets) {
      const asset = allAssets.find(a => a.id === id);
      if (asset?.content_url) {
        try {
          const r = await fetch(asset.content_url);
          const b = await r.blob();
          const a = document.createElement("a");
          a.href = URL.createObjectURL(b);
          a.download = `asset-${asset.platform}-${asset.format}.${asset.asset_type === "video" ? "mp4" : "jpg"}`;
          a.click();
          URL.revokeObjectURL(a.href);
        } catch { window.open(asset.content_url, "_blank"); }
      }
    }
    toast.success(`${selectedAssets.size} assets downloaded`);
  };

  return (
    <AppShell>
      <div className="px-4 sm:px-6 pt-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground tracking-tight">Command Center</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""} · {totalAssets} total assets
            </p>
          </div>
          <Button size="sm" onClick={() => {
            const state = pendingRefs.length > 0 ? {
              bulkRefs: pendingRefs.map((r: any) => ({
                id: r.id, title: r.title,
                mediaUrl: r.media_url || r.thumbnail_url,
                industryTags: r.industry_tags, moodTags: r.mood_tags, platformTags: r.platform_tags,
              })),
            } : undefined;
            navigate("/dashboard/campaigns/new", { state });
          }} className="h-8 text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Campaign{pendingRefs.length > 0 ? ` · ${pendingRefs.length} ref${pendingRefs.length > 1 ? 's' : ''}` : ''}
          </Button>
        </div>

        {/* Live Stats Bar */}
        {totalAssets > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: "Generating", value: generating, icon: <Sparkles className="w-3.5 h-3.5" />, color: "text-blue-500", pulse: generating > 0 },
              { label: "Pending Review", value: pendingReview, icon: <Clock className="w-3.5 h-3.5" />, color: "text-amber-500" },
              { label: "Approved Today", value: approvedToday, icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-emerald-500" },
              { label: "Total Assets", value: totalAssets, icon: <BarChart3 className="w-3.5 h-3.5" />, color: "text-foreground" },
            ].map((stat) => (
              <div key={stat.label} className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-border bg-card ${stat.pulse ? "animate-pulse" : ""}`}>
                <div className={`${stat.color}`}>{stat.icon}</div>
                <div>
                  <p className="text-lg font-bold text-foreground leading-tight">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Strategy Widget */}
        {strategy && (
          <Collapsible open={strategyOpen} onOpenChange={setStrategyOpen} className="mb-5">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-3 hover:bg-secondary/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-foreground">
                      Current Mission: {(strategy as any).core_identity?.archetype || "Strategy Active"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Focus: {((strategy as any).current_focus || "tof") === "tof" ? "Top of Funnel — Awareness" : ((strategy as any).current_focus === "mof" ? "Mid Funnel — Trust" : "Bottom Funnel — Conversion")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">
                    {(strategy as any).launch_readiness || 0}% Ready
                  </Badge>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${strategyOpen ? "rotate-180" : ""}`} />
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 rounded-xl border border-border bg-card p-5 space-y-4 animate-in fade-in duration-300">
                {(strategy as any).persona_card?.name && (
                  <div className="flex items-start gap-3">
                    <Target className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Target Persona</p>
                      <p className="text-xs font-bold text-foreground">{(strategy as any).persona_card.name}</p>
                      <p className="text-[10px] text-muted-foreground">{(strategy as any).persona_card.psychographic}</p>
                    </div>
                  </div>
                )}
                {(strategy as any).funnel_stages && (
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Funnel Strategy</p>
                      {["tof", "mof", "bof"].map((stage) => {
                        const s = (strategy as any).funnel_stages?.[stage];
                        if (!s) return null;
                        return (
                          <p key={stage} className="text-[10px] text-foreground">
                            <span className="font-semibold capitalize">{stage === "tof" ? "Awareness" : stage === "mof" ? "Trust" : "Conversion"}:</span>{" "}
                            {s.strategy_name}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Campaign Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                <Skeleton className="aspect-video w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyCampaigns
            onCreateClick={(selectedRefs) => {
              if (selectedRefs && selectedRefs.length > 0) {
                navigate("/dashboard/campaigns/new", {
                  state: {
                    bulkRefs: selectedRefs.map(r => ({
                      id: r.id, title: r.title,
                      mediaUrl: r.media_url || r.thumbnail_url,
                      industryTags: r.industry_tags, moodTags: r.mood_tags, platformTags: r.platform_tags,
                    })),
                  },
                });
              } else {
                navigate("/dashboard/campaigns/new");
              }
            }}
            onSelectionChange={(refs) => setPendingRefs(refs)}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {campaigns.map(campaign => (
              <AlertDialog key={campaign.id} open={deleteConfirmId === campaign.id} onOpenChange={(o) => !o && setDeleteConfirmId(null)}>
                <CampaignCard
                  campaign={campaign}
                  assets={campaign.assets}
                  onClick={() => setSheetCampaignId(campaign.id)}
                  onDelete={(e) => { e.stopPropagation(); setDeleteConfirmId(campaign.id); }}
                  onDuplicate={(e) => { e.stopPropagation(); duplicateCampaign(campaign); }}
                />
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{campaign.title}" and all its generated assets.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { deleteCampaign(campaign.id); setDeleteConfirmId(null); }}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ))}
          </div>
        )}
      </div>

      {/* Asset Inspector Sheet */}
      <AssetInspectorSheet
        open={!!sheetCampaignId}
        onClose={() => { setSheetCampaignId(null); setSheetAssetId(null); }}
        campaign={sheetCampaign}
        assets={sheetCampaign?.assets || []}
        initialAssetId={sheetAssetId}
        onAssetsChange={(newAssets) => {
          setCampaigns(prev => prev.map(c => c.id === sheetCampaignId ? { ...c, assets: newAssets, assetCount: newAssets.length } : c));
        }}
        onCampaignChange={(updated) => {
          setCampaigns(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
        }}
      />

      {/* Batch Action Bar */}
      <BatchActionBar
        selectedCount={selectedAssets.size}
        onApprove={handleBatchApprove}
        onReject={handleBatchReject}
        onDownload={handleBatchDownload}
        onClear={() => setSelectedAssets(new Set())}
      />
    </AppShell>
  );
};

export default Dashboard;
