import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Check, X, RefreshCw, Download, Copy, Loader2,
  CheckCircle2, XCircle, Clock, Sparkles, Image as ImageIcon, Video
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Campaign, GeneratedAsset, CampaignStatus } from "@/types/campaigns";

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  pending_review: { label: "Pending", icon: <Clock className="w-3 h-3" />, className: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "Approved", icon: <CheckCircle2 className="w-3 h-3" />, className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  rejected: { label: "Rejected", icon: <XCircle className="w-3 h-3" />, className: "bg-red-100 text-red-800 border-red-200" },
  regenerating: { label: "Regenerating", icon: <RefreshCw className="w-3 h-3 animate-spin" />, className: "bg-blue-50 text-blue-700 border-blue-200" },
};

const CAMPAIGN_STATUS: Record<CampaignStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-secondary text-secondary-foreground" },
  generating: { label: "Generating…", className: "animate-pulse bg-blue-50 text-blue-700 border-blue-200" },
  review: { label: "In Review", className: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  scheduled: { label: "Scheduled", className: "bg-violet-100 text-violet-800 border-violet-200" },
  published: { label: "Published", className: "bg-sky-100 text-sky-800 border-sky-200" },
};

function parseCaption(contentText: string | null): string {
  if (!contentText) return "";
  // Strip [meta:platform|format|ratio] prefix
  return contentText.replace(/^\[meta:[^\]]*\]\s*/, "");
}

function parseRationale(rationale: string | null): Record<string, any> | null {
  if (!rationale) return null;
  try {
    return JSON.parse(rationale);
  } catch {
    return null;
  }
}

const CampaignReview = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id || !user) return;
    const [campaignRes, assetsRes] = await Promise.all([
      supabase.from("campaigns").select("*").eq("id", id).single(),
      supabase.from("generated_assets").select("*").eq("campaign_id", id).order("created_at", { ascending: true }),
    ]);
    if (campaignRes.data) setCampaign(campaignRes.data as Campaign);
    if (assetsRes.data) setAssets(assetsRes.data as GeneratedAsset[]);
    setLoading(false);
  }, [id, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Poll while generating
  useEffect(() => {
    const isGenerating = campaign?.status === "generating" || assets.some((a) => !a.content_url && a.status === "pending_review");
    if (!isGenerating) return;
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [campaign, assets, fetchData]);

  const handleApprove = async (assetId: string) => {
    setActionLoading(assetId);
    await supabase.from("generated_assets").update({ status: "approved" }).eq("id", assetId);
    // Record to brand memory
    const asset = assets.find((a) => a.id === assetId);
    if (asset) {
      const rat = parseRationale(asset.rationale || null);
      await supabase.functions.invoke("generate-content", {
        body: {
          action: "record_memory",
          memoryType: "approval",
          patternCategory: rat?.angle || asset.asset_type,
          patternValue: rat?.direction || "approved_asset",
          context: { platform: asset.platform, format: asset.format },
        },
      });
    }
    setAssets((prev) => prev.map((a) => a.id === assetId ? { ...a, status: "approved" as any } : a));
    setActionLoading(null);
    toast.success("Asset approved");
  };

  const handleReject = async (assetId: string) => {
    setActionLoading(assetId);
    await supabase.from("generated_assets").update({ status: "rejected" }).eq("id", assetId);
    const asset = assets.find((a) => a.id === assetId);
    if (asset) {
      const rat = parseRationale(asset.rationale || null);
      await supabase.functions.invoke("generate-content", {
        body: {
          action: "record_memory",
          memoryType: "rejection",
          patternCategory: rat?.angle || asset.asset_type,
          patternValue: rat?.direction || "rejected_asset",
          context: { platform: asset.platform, format: asset.format },
        },
      });
    }
    setAssets((prev) => prev.map((a) => a.id === assetId ? { ...a, status: "rejected" as any } : a));
    setActionLoading(null);
    toast("Asset rejected — feedback recorded");
  };

  const handleRegenerate = async (assetId: string) => {
    setActionLoading(assetId);
    const asset = assets.find((a) => a.id === assetId);
    if (!asset || !campaign) { setActionLoading(null); return; }

    await supabase.from("generated_assets").update({ status: "regenerating" as any, content_url: null }).eq("id", assetId);
    setAssets((prev) => prev.map((a) => a.id === assetId ? { ...a, status: "regenerating" as any, content_url: null } : a));

    // Re-trigger generation for this single asset
    await supabase.functions.invoke("generate-content", {
      body: {
        campaignId: campaign.id,
        assets: [{
          platform: asset.platform || "instagram",
          format: asset.format || "post",
          assetType: asset.asset_type,
          width: 1080,
          height: 1080,
          aspectRatio: "1:1",
        }],
        brandContext: {},
      },
    });

    setActionLoading(null);
    toast("Regeneration started");
  };

  const handleCopyCaption = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Caption copied");
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank");
    }
  };

  const handleApproveAll = async () => {
    const pending = assets.filter((a) => a.status === "pending_review" && a.content_url);
    for (const a of pending) {
      await supabase.from("generated_assets").update({ status: "approved" }).eq("id", a.id);
    }
    setAssets((prev) => prev.map((a) =>
      a.status === "pending_review" && a.content_url ? { ...a, status: "approved" as any } : a
    ));
    if (campaign) {
      await supabase.from("campaigns").update({ status: "approved" }).eq("id", campaign.id);
      setCampaign({ ...campaign, status: "approved" });
    }
    toast.success(`${pending.length} assets approved`);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="px-4 sm:px-6 py-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-muted-foreground">Campaign not found.</p>
        </div>
      </AppShell>
    );
  }

  const pendingCount = assets.filter((a) => a.status === "pending_review" && a.content_url).length;
  const approvedCount = assets.filter((a) => a.status === "approved").length;
  const generatingCount = assets.filter((a) => !a.content_url).length;
  const statusInfo = CAMPAIGN_STATUS[campaign.status as CampaignStatus] || CAMPAIGN_STATUS.draft;

  return (
    <AppShell>
      <div className="px-4 sm:px-6 py-4 pb-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-foreground tracking-tight">{campaign.title}</h1>
              <Badge variant="outline" className={cn("text-[10px]", statusInfo.className)}>
                {statusInfo.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {assets.length} asset{assets.length !== 1 ? "s" : ""}
              {generatingCount > 0 && ` · ${generatingCount} generating`}
              {approvedCount > 0 && ` · ${approvedCount} approved`}
              {campaign.instructions && ` · ${campaign.instructions}`}
            </p>
          </div>

          {pendingCount > 0 && (
            <Button onClick={handleApproveAll} size="sm" className="gap-2 h-9">
              <CheckCircle2 className="w-4 h-4" />
              Approve All ({pendingCount})
            </Button>
          )}
        </div>

        {/* Asset Grid — Adaptive mixed-format */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {assets.map((asset) => {
            const caption = parseCaption(asset.content_text);
            const rationale = parseRationale(asset.rationale || null);
            const status = STATUS_CONFIG[asset.status] || STATUS_CONFIG.pending_review;
            const isGenerating = !asset.content_url && asset.status !== "rejected";
            const isSelected = selectedAsset === asset.id;
            const isVideo = asset.asset_type === "video";

            // Determine aspect ratio from meta
            const metaMatch = asset.content_text?.match(/^\[meta:([^|]*)\|([^|]*)\|([^\]]*)\]/);
            const aspectClass = metaMatch?.[3] === "9:16" ? "aspect-[9/16]"
              : metaMatch?.[3] === "16:9" ? "aspect-video"
              : metaMatch?.[3] === "4:5" ? "aspect-[4/5]"
              : "aspect-square";

            return (
              <div
                key={asset.id}
                className={cn(
                  "group rounded-xl border overflow-hidden bg-card transition-all cursor-pointer",
                  isSelected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-foreground/15 hover:shadow-md"
                )}
                onClick={() => setSelectedAsset(isSelected ? null : asset.id)}
              >
                {/* Media */}
                <div className={cn("relative bg-muted overflow-hidden", aspectClass)}>
                  {isGenerating ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground font-medium">Generating…</span>
                    </div>
                  ) : asset.content_url ? (
                    isVideo ? (
                      <video src={asset.content_url} className="w-full h-full object-cover" muted playsInline />
                    ) : (
                      <img src={asset.content_url} alt="" className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <XCircle className="w-6 h-6 text-muted-foreground/30" />
                    </div>
                  )}

                  {/* Status badge */}
                  <div className="absolute top-2 left-2">
                    <Badge variant="outline" className={cn("text-[9px] backdrop-blur-md gap-1", status.className)}>
                      {status.icon}
                      {status.label}
                    </Badge>
                  </div>

                  {/* Platform badge */}
                  {asset.platform && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="outline" className="text-[9px] backdrop-blur-md bg-background/80 capitalize">
                        {asset.platform}
                      </Badge>
                    </div>
                  )}

                  {/* Type indicator */}
                  {isVideo && asset.content_url && (
                    <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-foreground/50 backdrop-blur-sm flex items-center justify-center">
                      <Video className="w-3 h-3 text-background" />
                    </div>
                  )}
                </div>

                {/* Caption + Actions */}
                <div className="p-3 space-y-2">
                  {caption && (
                    <div className="relative group/caption">
                      <p className="text-[11px] text-foreground leading-relaxed line-clamp-3">{caption}</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopyCaption(caption); }}
                        className="absolute top-0 right-0 p-1 rounded opacity-0 group-hover/caption:opacity-100 hover:bg-secondary transition-all"
                        title="Copy caption"
                      >
                        <Copy className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                  )}

                  {/* Strategic rationale (collapsed) */}
                  {rationale?.direction && rationale.direction !== "default" && (
                    <p className="text-[9px] text-muted-foreground">
                      Strategy: <span className="font-medium text-foreground">{rationale.direction}</span>
                      {rationale.angle && ` · ${rationale.angle}`}
                    </p>
                  )}

                  {/* Action buttons */}
                  {asset.content_url && (
                    <div className={cn(
                      "flex items-center gap-1.5 pt-1 transition-all",
                      isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}>
                      {asset.status === "pending_review" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[10px] gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            disabled={actionLoading === asset.id}
                            onClick={(e) => { e.stopPropagation(); handleApprove(asset.id); }}
                          >
                            <Check className="w-3 h-3" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[10px] gap-1 text-red-500 hover:text-red-600 hover:bg-red-50"
                            disabled={actionLoading === asset.id}
                            onClick={(e) => { e.stopPropagation(); handleReject(asset.id); }}
                          >
                            <X className="w-3 h-3" /> Reject
                          </Button>
                        </>
                      )}
                      {(asset.status === "rejected" || asset.status === "approved") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[10px] gap-1"
                          disabled={actionLoading === asset.id}
                          onClick={(e) => { e.stopPropagation(); handleRegenerate(asset.id); }}
                        >
                          <RefreshCw className="w-3 h-3" /> Regenerate
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[10px] gap-1 ml-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(asset.content_url!, `${campaign.title}-${asset.platform}-${asset.format}.${isVideo ? "mp4" : "jpg"}`);
                        }}
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {assets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">No assets generated yet</p>
              <p className="text-xs text-muted-foreground mt-1">Assets will appear here once generation completes.</p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default CampaignReview;
