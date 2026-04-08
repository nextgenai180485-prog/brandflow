import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Check, X, RefreshCw, Download, Copy, Pencil, Wand2, Save,
  ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, Loader2,
  Keyboard, ImageIcon, Video, Layers, FileText, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CampaignSimulator from "@/components/campaign/CampaignSimulator";
import AssetEditor from "@/components/AssetEditor";
import type { Campaign, GeneratedAsset, CampaignStatus } from "@/types/campaigns";

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  pending_review: { label: "Pending", icon: <Clock className="w-3 h-3" />, className: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "Approved", icon: <CheckCircle2 className="w-3 h-3" />, className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  rejected: { label: "Rejected", icon: <XCircle className="w-3 h-3" />, className: "bg-red-100 text-red-800 border-red-200" },
  regenerating: { label: "Regenerating", icon: <RefreshCw className="w-3 h-3 animate-spin" />, className: "bg-blue-50 text-blue-700 border-blue-200" },
};

const CAMPAIGN_STATUS: Record<CampaignStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-secondary text-secondary-foreground" },
  generating: { label: "Generating", className: "animate-pulse bg-blue-50 text-blue-700 border-blue-200" },
  review: { label: "In Review", className: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  scheduled: { label: "Scheduled", className: "bg-violet-100 text-violet-800 border-violet-200" },
  published: { label: "Published", className: "bg-sky-100 text-sky-800 border-sky-200" },
};

function parseCaption(contentText: string | null): string {
  if (!contentText) return "";
  return contentText.replace(/^\[meta:[^\]]*\]\s*/, "");
}

function parseRationale(rationale: string | null): Record<string, any> | null {
  if (!rationale) return null;
  try { return JSON.parse(rationale); } catch { return null; }
}

const CampaignReview = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingCaption, setEditingCaption] = useState(false);
  const [editedCaption, setEditedCaption] = useState("");
  const [captionSaving, setCaptionSaving] = useState(false);
  const captionRef = useRef<HTMLTextAreaElement>(null);

  const navigableAssets = assets.filter(a => a.content_url);
  const currentAsset = navigableAssets[currentIndex] || null;
  const caption = currentAsset ? parseCaption(currentAsset.content_text) : "";
  const rationale = currentAsset ? parseRationale(currentAsset.rationale || null) : null;
  const status = currentAsset ? (STATUS_CONFIG[currentAsset.status] || STATUS_CONFIG.pending_review) : null;
  const pendingCount = assets.filter(a => a.status === "pending_review" && a.content_url).length;
  const approvedCount = assets.filter(a => a.status === "approved").length;
  const isGenerating = campaign?.status === "generating";

  const fetchData = useCallback(async () => {
    if (!user || !id) return;
    const [{ data: cData }, { data: aData }] = await Promise.all([
      supabase.from("campaigns").select("*").eq("id", id).single(),
      supabase.from("generated_assets").select("*").eq("campaign_id", id).order("created_at", { ascending: true }),
    ]);
    if (cData) setCampaign(cData as Campaign);
    if (aData) setAssets(aData as GeneratedAsset[]);
    setLoading(false);
  }, [user, id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [isGenerating, fetchData]);

  const goNext = useCallback(() => {
    if (currentIndex < navigableAssets.length - 1) setCurrentIndex(i => i + 1);
  }, [currentIndex, navigableAssets.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
  }, [currentIndex]);

  useEffect(() => {
    if (!currentAsset || editingCaption) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); goPrev(); }
      if (e.key === "a" || e.key === "A") { e.preventDefault(); handleApprove(); }
      if (e.key === "r" || e.key === "R") { e.preventDefault(); handleReject(); }
      if (e.key === "d" || e.key === "D") { e.preventDefault(); handleDownload(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentAsset, currentIndex, editingCaption, goNext, goPrev]);

  const handleApprove = async () => {
    if (!currentAsset || actionLoading) return;
    setActionLoading(true);
    await supabase.from("generated_assets").update({ status: "approved" }).eq("id", currentAsset.id);
    const rat = parseRationale(currentAsset.rationale || null);
    await supabase.functions.invoke("generate-content", {
      body: { action: "record_memory", memoryType: "approval", patternCategory: rat?.angle || currentAsset.asset_type, patternValue: rat?.direction || "approved_asset", context: { platform: currentAsset.platform, format: currentAsset.format } },
    });
    setAssets(prev => prev.map(a => a.id === currentAsset.id ? { ...a, status: "approved" as any } : a));
    setActionLoading(false);
    toast.success("Asset approved");
    const nextPending = navigableAssets.findIndex((a, i) => i > currentIndex && a.status === "pending_review");
    if (nextPending >= 0) setCurrentIndex(nextPending);
  };

  const handleReject = async () => {
    if (!currentAsset || actionLoading) return;
    setActionLoading(true);
    await supabase.from("generated_assets").update({ status: "rejected" }).eq("id", currentAsset.id);
    const rat = parseRationale(currentAsset.rationale || null);
    await supabase.functions.invoke("generate-content", {
      body: { action: "record_memory", memoryType: "rejection", patternCategory: rat?.angle || currentAsset.asset_type, patternValue: rat?.direction || "rejected_asset", context: { platform: currentAsset.platform, format: currentAsset.format } },
    });
    setAssets(prev => prev.map(a => a.id === currentAsset.id ? { ...a, status: "rejected" as any } : a));
    setActionLoading(false);
    toast("Asset rejected — feedback recorded");
  };

  const handleRegenerate = async () => {
    if (!currentAsset || !campaign || actionLoading) return;
    setActionLoading(true);
    await supabase.from("generated_assets").update({ status: "regenerating" as any, content_url: null }).eq("id", currentAsset.id);
    setAssets(prev => prev.map(a => a.id === currentAsset.id ? { ...a, status: "regenerating" as any, content_url: null } : a));
    const metaMatch = currentAsset.content_text?.match(/^\[meta:([^|]*)\|([^|]*)\|([^\]]*)\]/);
    const RATIO_MAP: Record<string, { width: number; height: number }> = { "9:16": { width: 1080, height: 1920 }, "16:9": { width: 1280, height: 720 }, "4:5": { width: 1080, height: 1350 }, "1:1": { width: 1080, height: 1080 } };
    const ratio = metaMatch?.[3] || "1:1";
    const dims = RATIO_MAP[ratio] || { width: 1080, height: 1080 };
    await supabase.functions.invoke("generate-content", {
      body: { campaignId: campaign.id, assets: [{ platform: currentAsset.platform || "instagram", format: currentAsset.format || "post", assetType: currentAsset.asset_type, aspectRatio: ratio, ...dims }], brandContext: {} },
    });
    setActionLoading(false);
    toast("Regeneration started");
  };

  const handleDownload = async () => {
    if (!currentAsset?.content_url || !campaign) return;
    try {
      const response = await fetch(currentAsset.content_url);
      const blob = await response.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${campaign.title}-${currentAsset.platform}-${currentAsset.format}.${currentAsset.asset_type === "video" ? "mp4" : "jpg"}`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("Downloaded");
    } catch { if (currentAsset.content_url) window.open(currentAsset.content_url, "_blank"); }
  };

  const handleSaveCaption = async () => {
    if (!currentAsset) return;
    setCaptionSaving(true);
    const metaMatch = currentAsset.content_text?.match(/^\[meta:[^\]]*\]/);
    const metaPrefix = metaMatch?.[0] ? `${metaMatch[0]} ` : "";
    const newContentText = `${metaPrefix}${editedCaption}`;
    const { error } = await supabase.from("generated_assets").update({ content_text: newContentText }).eq("id", currentAsset.id);
    if (error) toast.error("Failed to save caption");
    else {
      setAssets(prev => prev.map(a => a.id === currentAsset.id ? { ...a, content_text: newContentText } : a));
      toast.success("Caption saved");
    }
    setEditingCaption(false);
    setCaptionSaving(false);
  };

  const handleApproveAll = async () => {
    const pending = assets.filter(a => a.status === "pending_review" && a.content_url);
    for (const a of pending) {
      await supabase.from("generated_assets").update({ status: "approved" }).eq("id", a.id);
    }
    setAssets(prev => prev.map(a => a.status === "pending_review" && a.content_url ? { ...a, status: "approved" as any } : a));
    if (campaign) {
      await supabase.from("campaigns").update({ status: "approved" }).eq("id", campaign.id);
      setCampaign({ ...campaign, status: "approved" });
    }
    toast.success(`${pending.length} assets approved`);
  };

  const handleDownloadAll = async () => {
    const downloadable = navigableAssets.filter(a => a.content_url);
    for (const asset of downloadable) {
      try {
        const r = await fetch(asset.content_url!);
        const b = await r.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = `${campaign?.title || "asset"}-${asset.platform}-${asset.format}.${asset.asset_type === "video" ? "mp4" : "jpg"}`;
        a.click();
        URL.revokeObjectURL(a.href);
      } catch { if (asset.content_url) window.open(asset.content_url, "_blank"); }
    }
    toast.success(`${downloadable.length} assets downloaded`);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video": return <Video className="w-3 h-3" />;
      case "carousel": return <Layers className="w-3 h-3" />;
      case "copy": return <FileText className="w-3 h-3" />;
      default: return <ImageIcon className="w-3 h-3" />;
    }
  };

  const campStatus = CAMPAIGN_STATUS[(campaign?.status as CampaignStatus) || "draft"] || CAMPAIGN_STATUS.draft;

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (!campaign) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] gap-3">
          <p className="text-sm text-muted-foreground">Campaign not found</p>
          <Button size="sm" variant="outline" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate("/dashboard")} className="p-1.5 rounded-lg hover:bg-secondary transition-colors shrink-0">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-foreground truncate">{campaign.title}</h1>
                <Badge variant="outline" className={cn("text-[9px] shrink-0", campStatus.className)}>{campStatus.label}</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {navigableAssets.length} asset{navigableAssets.length !== 1 ? "s" : ""}
                {pendingCount > 0 && ` · ${pendingCount} pending`}
                {approvedCount > 0 && ` · ${approvedCount} approved`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 1 && (
              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={handleApproveAll}>
                <CheckCircle2 className="w-3 h-3" /> Approve All ({pendingCount})
              </Button>
            )}
            {navigableAssets.length > 0 && (
              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={handleDownloadAll}>
                <Download className="w-3 h-3" /> Download All
              </Button>
            )}
          </div>
        </div>

        {/* Main: Asset Grid (Left) + Simulator (Right) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel */}
          <div className="w-full lg:w-1/2 flex flex-col overflow-hidden border-r border-border">
            <div className="flex-1 overflow-y-auto p-4">
              {navigableAssets.length === 0 && !isGenerating ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">No assets generated yet</p>
                </div>
              ) : navigableAssets.length === 0 && isGenerating ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <Sparkles className="w-8 h-8 text-blue-500 animate-pulse" />
                  <p className="text-xs text-muted-foreground">Generating your creatives…</p>
                  <p className="text-[10px] text-muted-foreground/60">This takes 30-90 seconds per asset</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {navigableAssets.map((asset, i) => {
                    const isActive = i === currentIndex;
                    return (
                      <button
                        key={asset.id}
                        onClick={() => setCurrentIndex(i)}
                        className={cn(
                          "relative rounded-xl overflow-hidden border-2 transition-all text-left group",
                          isActive ? "border-primary ring-2 ring-primary/20 shadow-lg" : "border-border hover:border-foreground/20 hover:shadow-sm"
                        )}
                      >
                        <div className="aspect-square bg-muted">
                          {asset.asset_type === "video" ? (
                            <video src={asset.content_url!} className="w-full h-full object-cover" muted />
                          ) : (
                            <img src={asset.content_url!} alt="" className="w-full h-full object-cover" loading="lazy" />
                          )}
                        </div>
                        <div className="absolute top-1.5 right-1.5">
                          <div className={cn("w-5 h-5 rounded-full flex items-center justify-center",
                            asset.status === "approved" ? "bg-emerald-500" :
                            asset.status === "rejected" ? "bg-red-500" : "bg-amber-500"
                          )}>
                            {asset.status === "approved" ? <Check className="w-3 h-3 text-white" /> :
                             asset.status === "rejected" ? <X className="w-3 h-3 text-white" /> :
                             <Clock className="w-2.5 h-2.5 text-white" />}
                          </div>
                        </div>
                        <div className="p-2 bg-card border-t border-border">
                          <div className="flex items-center gap-1.5">
                            {getTypeIcon(asset.asset_type)}
                            <span className="text-[10px] text-muted-foreground capitalize truncate">{asset.platform} · {asset.format}</span>
                          </div>
                        </div>
                        {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {currentAsset && (
                <div className="mt-4 space-y-3">
                  <div className="space-y-1.5 p-3 rounded-xl border border-border bg-card">
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">Caption</p>
                    {editingCaption ? (
                      <div className="space-y-2">
                        <textarea ref={captionRef} value={editedCaption} onChange={(e) => setEditedCaption(e.target.value)} className="w-full text-[12px] text-foreground leading-relaxed bg-muted/50 border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-primary min-h-[60px]" rows={3} />
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" className="h-7 text-[10px] gap-1" disabled={captionSaving} onClick={handleSaveCaption}><Save className="w-3 h-3" /> Save</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setEditingCaption(false)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="group/caption">
                        <p className="text-[11px] text-foreground leading-relaxed line-clamp-4">{caption || "No caption"}</p>
                        <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover/caption:opacity-100 transition-all">
                          <button onClick={() => { setEditingCaption(true); setEditedCaption(caption); setTimeout(() => captionRef.current?.focus(), 50); }} className="p-1 rounded hover:bg-secondary"><Pencil className="w-3 h-3 text-muted-foreground" /></button>
                          <button onClick={() => { navigator.clipboard.writeText(caption); toast.success("Copied"); }} className="p-1 rounded hover:bg-secondary"><Copy className="w-3 h-3 text-muted-foreground" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                  {rationale?.direction && rationale.direction !== "default" && (
                    <div className="p-3 rounded-xl bg-secondary/30 border border-border space-y-1">
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">AI Rationale</p>
                      <p className="text-[11px] text-foreground font-medium">{rationale.direction}</p>
                      {rationale.angle && <p className="text-[10px] text-muted-foreground capitalize">{rationale.angle}</p>}
                    </div>
                  )}
                  {currentAsset.content_url && (
                    <div className="grid grid-cols-2 gap-2">
                      {currentAsset.status === "pending_review" && (
                        <>
                          <Button size="sm" className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={actionLoading} onClick={handleApprove}><Check className="w-3.5 h-3.5" /> Approve</Button>
                          <Button size="sm" variant="outline" className="h-9 gap-1.5 text-red-500 border-red-200 hover:bg-red-50" disabled={actionLoading} onClick={handleReject}><X className="w-3.5 h-3.5" /> Reject</Button>
                        </>
                      )}
                      {(currentAsset.status === "rejected" || currentAsset.status === "approved") && (
                        <Button size="sm" variant="outline" className="h-9 gap-1.5" disabled={actionLoading} onClick={handleRegenerate}><RefreshCw className="w-3.5 h-3.5" /> Regenerate</Button>
                      )}
                      <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={handleDownload}><Download className="w-3.5 h-3.5" /> Download</Button>
                      {currentAsset.asset_type !== "video" && (
                        <Button size="sm" variant="outline" className="h-9 gap-1.5 text-primary" onClick={() => setEditingAssetId(currentAsset.id)}><Wand2 className="w-3.5 h-3.5" /> SeedEdit</Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="hidden lg:flex items-center justify-center gap-4 px-4 py-2 border-t border-border bg-secondary/20 shrink-0">
              <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                <Keyboard className="w-3 h-3" />
                <span className="font-medium">← → Navigate</span>
                <span className="mx-1">·</span>
                <kbd className="px-1 py-0.5 rounded bg-secondary border border-border text-[8px] font-bold">A</kbd><span>Approve</span>
                <span className="mx-1">·</span>
                <kbd className="px-1 py-0.5 rounded bg-secondary border border-border text-[8px] font-bold">R</kbd><span>Reject</span>
                <span className="mx-1">·</span>
                <kbd className="px-1 py-0.5 rounded bg-secondary border border-border text-[8px] font-bold">D</kbd><span>Download</span>
              </div>
            </div>
          </div>

          {/* Right Panel: Simulator */}
          <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-muted/20 p-6">
            {currentAsset ? (
              <div className="flex flex-col items-center gap-4 w-full max-w-sm">
                <div className="flex items-center gap-3">
                  <button onClick={goPrev} disabled={currentIndex === 0} className={cn("p-1.5 rounded-lg border border-border transition-all", currentIndex === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-secondary")}><ChevronLeft className="w-4 h-4" /></button>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-foreground">{currentIndex + 1} / {navigableAssets.length}</span>
                    {status && <Badge variant="outline" className={cn("text-[9px] gap-1", status.className)}>{status.icon} {status.label}</Badge>}
                  </div>
                  <button onClick={goNext} disabled={currentIndex === navigableAssets.length - 1} className={cn("p-1.5 rounded-lg border border-border transition-all", currentIndex === navigableAssets.length - 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-secondary")}><ChevronRight className="w-4 h-4" /></button>
                </div>
                <CampaignSimulator imageUrl={currentAsset.content_url} brandName={campaign.title} caption={caption} isStarred={false} onStar={() => {}} onEdit={() => setEditingAssetId(currentAsset.id)} onDownload={handleDownload} onSaveToLibrary={() => toast.info("Save to Library coming soon")} onHide={() => toast.info("Hide feature coming soon")} />
                <div className="flex items-center gap-2">
                  {currentAsset.platform && <Badge variant="outline" className="text-[10px] capitalize">{currentAsset.platform}</Badge>}
                  {currentAsset.format && <Badge variant="outline" className="text-[10px] capitalize">{currentAsset.format}</Badge>}
                  {currentAsset.provider && currentAsset.provider !== "error" && <Badge variant="outline" className="text-[10px] text-muted-foreground">{currentAsset.provider}</Badge>}
                </div>
              </div>
            ) : isGenerating ? (
              <div className="flex flex-col items-center gap-3">
                <Sparkles className="w-10 h-10 text-blue-500 animate-pulse" />
                <p className="text-sm text-muted-foreground">Generating creatives…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Select an asset to preview</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {(() => {
        const editAsset = assets.find(a => a.id === editingAssetId);
        if (!editAsset || !editAsset.content_url) return null;
        return (
          <AssetEditor imageUrl={editAsset.content_url} assetId={editAsset.id} onEdited={(newUrl) => { setAssets(prev => prev.map(a => a.id === editingAssetId ? { ...a, content_url: newUrl } : a)); setEditingAssetId(null); }} onClose={() => setEditingAssetId(null)} />
        );
      })()}
    </AppShell>
  );
};

export default CampaignReview;