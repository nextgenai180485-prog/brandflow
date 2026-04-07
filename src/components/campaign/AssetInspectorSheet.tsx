import { useState, useEffect, useCallback, useRef } from "react";
import {
  X, Check, RefreshCw, Download, Copy, Star, Pencil, Wand2, Save,
  ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, Loader2,
  RotateCw, FolderPlus, Keyboard
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import CampaignSimulator from "./CampaignSimulator";
import AssetEditor from "@/components/AssetEditor";
import type { GeneratedAsset, Campaign } from "@/types/campaigns";

interface AssetInspectorSheetProps {
  open: boolean;
  onClose: () => void;
  campaign: Campaign | null;
  assets: GeneratedAsset[];
  initialAssetId?: string | null;
  onAssetsChange: (assets: GeneratedAsset[]) => void;
  onCampaignChange?: (campaign: Campaign) => void;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  pending_review: { label: "Pending Review", icon: <Clock className="w-3 h-3" />, className: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "Approved", icon: <CheckCircle2 className="w-3 h-3" />, className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  rejected: { label: "Rejected", icon: <XCircle className="w-3 h-3" />, className: "bg-red-100 text-red-800 border-red-200" },
  regenerating: { label: "Regenerating", icon: <RefreshCw className="w-3 h-3 animate-spin" />, className: "bg-blue-50 text-blue-700 border-blue-200" },
};

function parseCaption(contentText: string | null): string {
  if (!contentText) return "";
  return contentText.replace(/^\[meta:[^\]]*\]\s*/, "");
}

function parseRationale(rationale: string | null): Record<string, any> | null {
  if (!rationale) return null;
  try { return JSON.parse(rationale); } catch { return null; }
}

export default function AssetInspectorSheet({
  open, onClose, campaign, assets, initialAssetId, onAssetsChange, onCampaignChange
}: AssetInspectorSheetProps) {
  const navigableAssets = assets.filter(a => a.content_url);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingCaption, setEditingCaption] = useState(false);
  const [editedCaption, setEditedCaption] = useState("");
  const [captionSaving, setCaptionSaving] = useState(false);
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const captionRef = useRef<HTMLTextAreaElement>(null);

  // Sync initial asset
  useEffect(() => {
    if (initialAssetId && navigableAssets.length > 0) {
      const idx = navigableAssets.findIndex(a => a.id === initialAssetId);
      if (idx >= 0) setCurrentIndex(idx);
    }
  }, [initialAssetId, open]);

  const currentAsset = navigableAssets[currentIndex] || null;
  const caption = currentAsset ? parseCaption(currentAsset.content_text) : "";
  const rationale = currentAsset ? parseRationale(currentAsset.rationale || null) : null;
  const status = currentAsset ? (STATUS_CONFIG[currentAsset.status] || STATUS_CONFIG.pending_review) : null;

  const goNext = useCallback(() => {
    if (currentIndex < navigableAssets.length - 1) setCurrentIndex(i => i + 1);
  }, [currentIndex, navigableAssets.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!open || !currentAsset) return;
    const handler = (e: KeyboardEvent) => {
      if (editingCaption) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); goPrev(); }
      if (e.key === "a" || e.key === "A") { e.preventDefault(); handleApprove(); }
      if (e.key === "r" || e.key === "R") { e.preventDefault(); handleReject(); }
      if (e.key === "d" || e.key === "D") { e.preventDefault(); handleDownload(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, currentAsset, currentIndex, editingCaption, goNext, goPrev]);

  const handleApprove = async () => {
    if (!currentAsset || actionLoading) return;
    setActionLoading(true);
    await supabase.from("generated_assets").update({ status: "approved" }).eq("id", currentAsset.id);
    const rat = parseRationale(currentAsset.rationale || null);
    await supabase.functions.invoke("generate-content", {
      body: { action: "record_memory", memoryType: "approval", patternCategory: rat?.angle || currentAsset.asset_type, patternValue: rat?.direction || "approved_asset", context: { platform: currentAsset.platform, format: currentAsset.format } },
    });
    onAssetsChange(assets.map(a => a.id === currentAsset.id ? { ...a, status: "approved" as any } : a));
    setActionLoading(false);
    toast.success("Asset approved");
    // Auto-advance to next pending
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
    onAssetsChange(assets.map(a => a.id === currentAsset.id ? { ...a, status: "rejected" as any } : a));
    setActionLoading(false);
    toast("Asset rejected — feedback recorded");
  };

  const handleRegenerate = async () => {
    if (!currentAsset || !campaign || actionLoading) return;
    setActionLoading(true);
    await supabase.from("generated_assets").update({ status: "regenerating" as any, content_url: null }).eq("id", currentAsset.id);
    onAssetsChange(assets.map(a => a.id === currentAsset.id ? { ...a, status: "regenerating" as any, content_url: null } : a));
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
    } catch { window.open(currentAsset.content_url, "_blank"); }
  };

  const handleSaveCaption = async () => {
    if (!currentAsset) return;
    setCaptionSaving(true);
    const metaMatch = currentAsset.content_text?.match(/^\[meta:[^\]]*\]/);
    const metaPrefix = metaMatch?.[0] ? `${metaMatch[0]} ` : "";
    const newContentText = `${metaPrefix}${editedCaption}`;
    const { error } = await supabase.from("generated_assets").update({ content_text: newContentText }).eq("id", currentAsset.id);
    if (error) { toast.error("Failed to save caption"); }
    else {
      onAssetsChange(assets.map(a => a.id === currentAsset.id ? { ...a, content_text: newContentText } : a));
      toast.success("Caption saved");
    }
    setEditingCaption(false);
    setCaptionSaving(false);
  };

  const toggleStar = (id: string) => {
    setStarred(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleApproveAll = async () => {
    const pending = assets.filter(a => a.status === "pending_review" && a.content_url);
    for (const a of pending) {
      await supabase.from("generated_assets").update({ status: "approved" }).eq("id", a.id);
    }
    onAssetsChange(assets.map(a => a.status === "pending_review" && a.content_url ? { ...a, status: "approved" as any } : a));
    if (campaign && onCampaignChange) {
      await supabase.from("campaigns").update({ status: "approved" }).eq("id", campaign.id);
      onCampaignChange({ ...campaign, status: "approved" });
    }
    toast.success(`${pending.length} assets approved`);
  };

  const pendingCount = assets.filter(a => a.status === "pending_review" && a.content_url).length;

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="w-full sm:w-[520px] md:w-[560px] p-0 flex flex-col gap-0 overflow-hidden [&>button]:hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary transition-colors shrink-0">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground truncate">{campaign?.title || "Campaign"}</h2>
                <p className="text-[10px] text-muted-foreground">
                  {navigableAssets.length} asset{navigableAssets.length !== 1 ? "s" : ""}
                  {pendingCount > 0 && ` · ${pendingCount} pending`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {pendingCount > 1 && (
                <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={handleApproveAll}>
                  <CheckCircle2 className="w-3 h-3" /> Approve All ({pendingCount})
                </Button>
              )}
            </div>
          </div>

          {/* Asset Carousel Strip */}
          {navigableAssets.length > 1 && (
            <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border bg-secondary/20 overflow-x-auto shrink-0">
              {navigableAssets.map((asset, i) => (
                <button
                  key={asset.id}
                  onClick={() => setCurrentIndex(i)}
                  className={cn(
                    "relative w-10 h-10 rounded-lg overflow-hidden border-2 shrink-0 transition-all",
                    i === currentIndex ? "border-primary ring-1 ring-primary/30" : "border-transparent hover:border-border opacity-60 hover:opacity-100"
                  )}
                >
                  <img src={asset.content_url!} alt="" className="w-full h-full object-cover" />
                  {asset.status === "approved" && (
                    <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    </div>
                  )}
                  {asset.status === "rejected" && (
                    <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                      <XCircle className="w-3 h-3 text-red-500" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Main Content — Scrollable */}
          <div className="flex-1 overflow-y-auto">
            {currentAsset ? (
              <div className="flex flex-col items-center gap-4 p-4">
                {/* Navigation + Counter */}
                <div className="flex items-center justify-between w-full">
                  <button onClick={goPrev} disabled={currentIndex === 0} className={cn("p-1.5 rounded-lg border border-border transition-all", currentIndex === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-secondary")}>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-foreground">{currentIndex + 1} of {navigableAssets.length}</span>
                    {status && (
                      <Badge variant="outline" className={cn("text-[9px] gap-1", status.className)}>
                        {status.icon} {status.label}
                      </Badge>
                    )}
                  </div>
                  <button onClick={goNext} disabled={currentIndex === navigableAssets.length - 1} className={cn("p-1.5 rounded-lg border border-border transition-all", currentIndex === navigableAssets.length - 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-secondary")}>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Simulator */}
                <div className="w-full flex justify-center">
                  <CampaignSimulator
                    imageUrl={currentAsset.content_url}
                    brandName={campaign?.title || "Brand"}
                    caption={caption}
                    isStarred={starred.has(currentAsset.id)}
                    onStar={() => toggleStar(currentAsset.id)}
                    onEdit={() => setEditingAssetId(currentAsset.id)}
                    onDownload={handleDownload}
                    onSaveToLibrary={() => toast.info("Save to Library coming soon")}
                    onHide={() => toast.info("Hide feature coming soon")}
                  />
                </div>

                {/* Platform + Format badges */}
                <div className="flex items-center gap-2 w-full">
                  {currentAsset.platform && (
                    <Badge variant="outline" className="text-[10px] capitalize">{currentAsset.platform}</Badge>
                  )}
                  {currentAsset.format && (
                    <Badge variant="outline" className="text-[10px] capitalize">{currentAsset.format}</Badge>
                  )}
                  {currentAsset.provider && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">{currentAsset.provider}</Badge>
                  )}
                </div>

                {/* Caption */}
                <div className="w-full space-y-2">
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">Caption</p>
                  {editingCaption ? (
                    <div className="space-y-2">
                      <textarea
                        ref={captionRef}
                        value={editedCaption}
                        onChange={(e) => setEditedCaption(e.target.value)}
                        className="w-full text-[12px] text-foreground leading-relaxed bg-muted/50 border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px]"
                        rows={4}
                      />
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" className="h-7 text-[10px] gap-1" disabled={captionSaving} onClick={handleSaveCaption}>
                          <Save className="w-3 h-3" /> Save
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setEditingCaption(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="group/caption relative">
                      <p className="text-[12px] text-foreground leading-relaxed">{caption || "No caption"}</p>
                      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover/caption:opacity-100 transition-all">
                        <button onClick={() => { setEditingCaption(true); setEditedCaption(caption); setTimeout(() => captionRef.current?.focus(), 50); }} className="p-1 rounded hover:bg-secondary">
                          <Pencil className="w-3 h-3 text-muted-foreground" />
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(caption); toast.success("Copied"); }} className="p-1 rounded hover:bg-secondary">
                          <Copy className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Rationale */}
                {rationale?.direction && rationale.direction !== "default" && (
                  <div className="w-full p-3 rounded-lg bg-secondary/30 border border-border space-y-1">
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">AI Rationale</p>
                    <p className="text-[11px] text-foreground font-medium">{rationale.direction}</p>
                    {rationale.angle && <p className="text-[10px] text-muted-foreground">{rationale.angle}</p>}
                  </div>
                )}

                {/* Action Buttons */}
                {currentAsset.content_url && (
                  <div className="w-full space-y-2">
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">Actions</p>
                    <div className="grid grid-cols-2 gap-2">
                      {currentAsset.status === "pending_review" && (
                        <>
                          <Button size="sm" className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={actionLoading} onClick={handleApprove}>
                            <Check className="w-3.5 h-3.5" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="h-9 gap-1.5 text-red-500 border-red-200 hover:bg-red-50" disabled={actionLoading} onClick={handleReject}>
                            <X className="w-3.5 h-3.5" /> Reject
                          </Button>
                        </>
                      )}
                      {(currentAsset.status === "rejected" || currentAsset.status === "approved") && (
                        <Button size="sm" variant="outline" className="h-9 gap-1.5" disabled={actionLoading} onClick={handleRegenerate}>
                          <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={handleDownload}>
                        <Download className="w-3.5 h-3.5" /> Download
                      </Button>
                      {currentAsset.asset_type !== "video" && (
                        <Button size="sm" variant="outline" className="h-9 gap-1.5 text-primary" onClick={() => setEditingAssetId(currentAsset.id)}>
                          <Wand2 className="w-3.5 h-3.5" /> SeedEdit
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Assets generating…</p>
              </div>
            )}
          </div>

          {/* Keyboard Hint Bar */}
          <div className="flex items-center justify-center gap-4 px-4 py-2 border-t border-border bg-secondary/20 shrink-0">
            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
              <Keyboard className="w-3 h-3" />
              <span className="font-medium">← → Navigate</span>
              <span className="mx-1">·</span>
              <kbd className="px-1 py-0.5 rounded bg-secondary border border-border text-[8px] font-bold">A</kbd>
              <span>Approve</span>
              <span className="mx-1">·</span>
              <kbd className="px-1 py-0.5 rounded bg-secondary border border-border text-[8px] font-bold">R</kbd>
              <span>Reject</span>
              <span className="mx-1">·</span>
              <kbd className="px-1 py-0.5 rounded bg-secondary border border-border text-[8px] font-bold">D</kbd>
              <span>Download</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Asset Editor Modal */}
      {(() => {
        const editAsset = assets.find(a => a.id === editingAssetId);
        if (!editAsset || !editAsset.content_url) return null;
        return (
          <AssetEditor
            imageUrl={editAsset.content_url}
            assetId={editAsset.id}
            onEdited={(newUrl) => {
              onAssetsChange(assets.map(a => a.id === editingAssetId ? { ...a, content_url: newUrl } : a));
              setEditingAssetId(null);
            }}
            onClose={() => setEditingAssetId(null)}
          />
        );
      })()}
    </>
  );
}
