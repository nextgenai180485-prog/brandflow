import { useEffect, useState, useCallback } from "react";
import { Plus, LayoutGrid, Clock, ImageIcon, Video, FileText, Layers, Brain, ChevronDown, Target, TrendingUp, Trash2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
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
import type { Campaign, CampaignStatus, GeneratedAsset } from "@/types/campaigns";

const statusConfig: Record<CampaignStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-secondary text-secondary-foreground" },
  generating: { label: "Generating", className: "animate-pulse bg-blue-50 text-blue-700 border-blue-200" },
  review: { label: "In Review", className: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  scheduled: { label: "Scheduled", className: "bg-violet-100 text-violet-800 border-violet-200" },
  published: { label: "Published", className: "bg-sky-100 text-sky-800 border-sky-200" },
};

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

  // Process C: The "Intrigue" Notification on first arrival from onboarding
  useEffect(() => {
    if (searchParams.get("welcome") === "1") {
      // Remove param to avoid re-triggering
      setSearchParams({}, { replace: true });
      // Delayed toast for dramatic effect
      const timer = setTimeout(() => {
        toast("I've analyzed your market position. I have 3 strategies ready for your first campaign.", {
          icon: "🧠",
          duration: 8000,
        });
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [searchParams, setSearchParams]);

  // Load brand strategy
  useEffect(() => {
    if (!user) return;
    supabase
      .from("brand_strategy" as any)
      .select("*")
      .eq("profile_id", user.id)
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0 && (data[0] as any).strategy_generated) {
          setStrategy(data[0]);
        }
      });
  }, [user]);

  const fetchCampaigns = useCallback(async () => {
    if (!user) return;
    const { data: campaignData } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (!campaignData) { setLoading(false); return; }

    const ids = campaignData.map((c) => c.id);
    const { data: assetData } = ids.length > 0
      ? await supabase.from("generated_assets").select("*").in("campaign_id", ids).order("created_at", { ascending: true })
      : { data: [] };

    const assetMap: Record<string, GeneratedAsset[]> = {};
    (assetData || []).forEach((a: any) => {
      if (!assetMap[a.campaign_id]) assetMap[a.campaign_id] = [];
      assetMap[a.campaign_id].push(a as GeneratedAsset);
    });

    setCampaigns(
      campaignData.map((c) => ({
        ...(c as Campaign),
        assets: assetMap[c.id] || [],
        assetCount: (assetMap[c.id] || []).length,
      }))
    );
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  // Poll for generating campaigns
  useEffect(() => {
    const hasGenerating = campaigns.some((c) => c.status === "generating");
    if (!hasGenerating) return;
    const interval = setInterval(fetchCampaigns, 4000);
    return () => clearInterval(interval);
  }, [campaigns, fetchCampaigns]);

  const deleteCampaign = useCallback(async (campaignId: string) => {
    // Delete assets first, then campaign
    await supabase.from("generated_assets").delete().eq("campaign_id", campaignId);
    const { error } = await supabase.from("campaigns").delete().eq("id", campaignId);
    if (error) {
      toast.error("Failed to delete campaign");
      return;
    }
    toast.success("Campaign deleted");
    setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video": return <Video className="w-3 h-3" />;
      case "carousel": return <Layers className="w-3 h-3" />;
      case "copy": return <FileText className="w-3 h-3" />;
      default: return <ImageIcon className="w-3 h-3" />;
    }
  };

  return (
    <AppShell>
      <div className="px-4 sm:px-6 pt-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-foreground tracking-tight">Campaigns</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""} · {campaigns.reduce((s, c) => s + c.assetCount, 0)} total assets
            </p>
          </div>
          <Button size="sm" onClick={() => navigate("/dashboard/strategy/new")} className="h-8 text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            New Campaign
          </Button>
        </div>

        {/* Strategy Widget */}
        {strategy && (
          <Collapsible open={strategyOpen} onOpenChange={setStrategyOpen} className="mb-6">
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
                {/* Persona */}
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
                {/* Funnel */}
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
                {/* CMO Directive */}
                {(strategy as any).cmo_directive && (
                  <div className="border-t border-border pt-3">
                    <p className="text-[10px] text-foreground italic">{(strategy as any).cmo_directive}</p>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                <Skeleton className="aspect-[16/10] w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyCampaigns onCreateClick={() => navigate("/dashboard/strategy/new")} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {campaigns.map((campaign) => {
              const status = statusConfig[campaign.status];
              const thumbnails = campaign.assets
                .filter((a) => a.content_url && a.asset_type !== "copy")
                .slice(0, 4);
              const typeBreakdown = campaign.assets.reduce<Record<string, number>>((acc, a) => {
                acc[a.asset_type] = (acc[a.asset_type] || 0) + 1;
                return acc;
              }, {});

              return (
                <div
                  key={campaign.id}
                  onClick={() => navigate(`/dashboard/campaign/${campaign.id}`)}
                  className="group rounded-xl border border-border bg-card overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:border-foreground/15 hover:-translate-y-0.5"
                >
                  {/* Thumbnail Grid */}
                  <div className="aspect-[4/5] bg-muted relative overflow-hidden">
                    {thumbnails.length === 0 ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <LayoutGrid className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                    ) : thumbnails.length === 1 ? (
                      <img src={thumbnails[0].content_url!} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className={`grid h-full w-full ${thumbnails.length === 2 ? "grid-cols-2" : thumbnails.length === 3 ? "grid-cols-2 grid-rows-2" : "grid-cols-2 grid-rows-2"}`}>
                        {thumbnails.map((t, i) => (
                          <div key={t.id} className={`relative overflow-hidden ${thumbnails.length === 3 && i === 0 ? "row-span-2" : ""}`}>
                            <img src={t.content_url!} alt="" className="w-full h-full object-cover" />
                            {t.asset_type === "video" && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-6 h-6 rounded-full bg-foreground/40 flex items-center justify-center">
                                  <Video className="w-3 h-3 text-background" />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Status overlay */}
                    <div className="absolute top-2 left-2">
                      <Badge variant="outline" className={`text-[9px] backdrop-blur-md ${status.className}`}>
                        {status.label}
                      </Badge>
                    </div>

                    {/* Asset count overlay */}
                    {campaign.assetCount > 0 && (
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-foreground/70 backdrop-blur-sm text-[9px] font-medium text-background">
                        {campaign.assetCount} asset{campaign.assetCount !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {campaign.title}
                      </h3>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{campaign.title}" and all its generated assets. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCampaign(campaign.id);
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(campaign.created_at), "MMM d, yyyy")}
                      </span>
                      {Object.entries(typeBreakdown).map(([type, count]) => (
                        <span key={type} className="flex items-center gap-0.5">
                          {getTypeIcon(type)} {count}
                        </span>
                      ))}
                    </div>
                    {campaign.scheduled_at && (
                      <p className="text-[10px] text-primary/70 mt-1">
                        Scheduled: {format(new Date(campaign.scheduled_at), "MMM d 'at' h:mm a")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default Dashboard;
