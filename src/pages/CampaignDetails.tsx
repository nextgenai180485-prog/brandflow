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
import ResearchPreviewPanel from "@/components/ResearchPreviewPanel";
import type { IntelligenceBrief } from "@/components/ResearchPreviewPanel";
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

  // Research state
  const [researchBrief, setResearchBrief] = useState<IntelligenceBrief | null>(null);
  const [researchId, setResearchId] = useState<string | null>(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchApproved, setResearchApproved] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user || !id) return;
    const [cRes, aRes, rRes] = await Promise.all([
      supabase.from("campaigns").select("*").eq("id", id).single(),
      supabase.from("generated_assets").select("*").eq("campaign_id", id).order("created_at", { ascending: false }),
      supabase.from("campaign_research").select("*").eq("campaign_id", id).order("created_at", { ascending: false }).limit(1),
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

    // Load existing research
    if (rRes.data && rRes.data.length > 0) {
      const research = rRes.data[0] as any;
      if (research.intelligence_brief) {
        setResearchBrief(research.intelligence_brief as IntelligenceBrief);
        setResearchId(research.id);
        // Auto-approve if assets already exist (research was already used)
        if (aRes.data && aRes.data.length > 0) {
          setResearchApproved(true);
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

  const handleResearchReady = (brief: IntelligenceBrief, rId: string) => {
    setResearchBrief(brief);
    setResearchId(rId);
    setResearchApproved(false); // Require explicit approval
  };

  const handleResearchApprove = () => {
    setResearchApproved(true);
    toast.success("Research approved — ready to generate!");
  };

  const handleResearchRerun = () => {
    setResearchBrief(null);
    setResearchId(null);
    setResearchApproved(false);
  };

  const platformTabs = useMemo(() => {
    const platforms = new Set<SocialPlatform>();
    assets.forEach((a) => { const p = parsePlatform(a); if (p) platforms.add(p); });
    return Array.from(platforms).sort();
  }, [assets]);

  // Filter out user-uploaded source assets (no provider AND no meta tag = source input)
  const generatedAssets = assets.filter((a) => {
    // If it has a provider, it's AI-generated
    if (a.provider) return true;
    // If content_text has [meta:...] tag, it's a generation output
    if (a.content_text && /^\[meta:/.test(a.content_text)) return true;
    // Otherwise it's a user-uploaded source asset — hide from grid
    return false;
  });
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
  const showResearchPanel = campaign.status === "draft" && (researchBrief || researchLoading);
  const showEmptyDraft = campaign.status === "draft" && generatedAssets.length === 0 && !researchBrief && !researchLoading;

  return (
    <AppShell>
      <div className="px-4 sm:px-6 pt-4 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <button onClick={() => navigate("/dashboard")} className="p-1.5 -ml-1.5 rounded-md hover:bg-secondary transition-colors shrink-0">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground truncate tracking-tight">{campaign.title}</h1>
            <Badge variant="outline" className={`text-[10px] shrink-0 ${status.className}`}>{status.label}</Badge>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {campaign.status === "draft" && (
              <GenerateButton
                campaignId={campaign.id}
                onGenerated={fetchData}
                onResearchReady={handleResearchReady}
                onResearchLoading={setResearchLoading}
                researchApproved={researchApproved}
                researchId={researchId}
                intelligenceBrief={researchBrief}
              />
            )}
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

        {/* Research Preview Panel — shows before generation */}
        {showResearchPanel && (
          <div className="mb-6">
            <ResearchPreviewPanel
              brief={researchBrief}
              loading={researchLoading}
              onApprove={handleResearchApprove}
              onRerun={handleResearchRerun}
              approved={researchApproved}
            />
          </div>
        )}

        {/* Platform filter tabs + bulk actions */}
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


        {/* Asset grid */}
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
        ) : showEmptyDraft ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card py-16">
            <p className="text-muted-foreground mb-4 text-xs text-center px-4">
              Start by researching your market, then generate content backed by real intelligence.
            </p>
            <GenerateButton
              campaignId={campaign.id}
              onGenerated={fetchData}
              onResearchReady={handleResearchReady}
              onResearchLoading={setResearchLoading}
              researchApproved={researchApproved}
              researchId={researchId}
              intelligenceBrief={researchBrief}
            />
          </div>
        ) : generatedAssets.length > 0 && filteredAssets.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-xs text-muted-foreground">No assets for this platform.</p>
          </div>
      ) : campaign.status === "generating" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card overflow-hidden">
                <Skeleton className="aspect-[4/5] w-full" />
                <div className="px-2.5 py-2 border-t border-border/50 space-y-1.5">
                  <Skeleton className="h-2.5 w-full" />
                  <Skeleton className="h-2.5 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Inspector Side Panel */}
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
        researchBrief={researchBrief}
      />
    </AppShell>
  );
};

export default CampaignDetails;
