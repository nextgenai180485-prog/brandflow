import { useState } from "react";
import { Check, X, RefreshCw, Pencil, ImageIcon, VideoIcon, FileText, Sparkles, Instagram } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { GeneratedAsset, AssetStatus, SocialMeta } from "@/types/campaigns";

/* ── Helpers ─────────────────────────────────── */

const parseSocialMeta = (asset: GeneratedAsset): SocialMeta | null => {
  const text = asset.content_text || "";
  const match = text.match(/^\[meta:([a-z]+)\|([a-z]+)\|([0-9/]+)\]/);
  if (match) {
    return {
      platform: match[1] as SocialMeta["platform"],
      format: match[2] as SocialMeta["format"],
      aspectRatio: match[3],
      label: `${match[1].charAt(0).toUpperCase() + match[1].slice(1)} ${match[2].charAt(0).toUpperCase() + match[2].slice(1)}`,
    };
  }
  // Fallback based on asset type
  if (asset.asset_type === "video") return { platform: "instagram", format: "reel", aspectRatio: "9/16", label: "Video Reel" };
  if (asset.asset_type === "image") return { platform: "instagram", format: "post", aspectRatio: "4/5", label: "Image Post" };
  return null;
};

const stripMeta = (text: string | null): string | null => {
  if (!text) return null;
  const cleaned = text.replace(/^\[meta:[^\]]+\]\s*/, "").replace(/^\[Generation context:[^\]]*\]\s*/, "");
  return cleaned.trim() || null;
};

const platformIcon = (platform: string) => {
  switch (platform) {
    case "instagram": return <Instagram className="w-3 h-3" />;
    case "tiktok": return <span className="text-[10px] font-black leading-none">TT</span>;
    case "facebook": return <span className="text-[10px] font-bold leading-none">f</span>;
    case "youtube": return <span className="text-[10px] font-bold leading-none">YT</span>;
    default: return <ImageIcon className="w-3 h-3" />;
  }
};

const typeIcon = (type: string) => {
  if (type === "video") return VideoIcon;
  if (type === "copy") return FileText;
  return ImageIcon;
};

const statusBadgeConfig: Record<AssetStatus, { label: string; className: string }> = {
  pending_review: { label: "Review", className: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "Approved ✓", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  rejected: { label: "Rejected ✗", className: "bg-red-100 text-red-800 border-red-200" },
  regenerating: { label: "Regenerating…", className: "animate-pulse bg-blue-50 text-blue-700 border-blue-200" },
};

/* ── Component ───────────────────────────────── */

interface AssetFeedCardProps {
  asset: GeneratedAsset;
  onStatusChange: () => void;
  campaignTitle?: string;
}

const AssetFeedCard = ({ asset, onStatusChange, campaignTitle }: AssetFeedCardProps) => {
  const [updating, setUpdating] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(stripMeta(asset.content_text) || "");

  const socialMeta = parseSocialMeta(asset);
  const displayCaption = stripMeta(asset.content_text);
  const statusCfg = statusBadgeConfig[asset.status];
  const TypeIcon = typeIcon(asset.asset_type);
  const isVisual = asset.asset_type === "image" || asset.asset_type === "video";

  const updateStatus = async (newStatus: AssetStatus) => {
    setUpdating(true);
    const { error } = await supabase
      .from("generated_assets")
      .update({ status: newStatus })
      .eq("id", asset.id);
    if (error) {
      toast.error("Failed to update status.");
    } else {
      toast.success(newStatus === "approved" ? "Approved!" : "Rejected.");
      onStatusChange();
    }
    setUpdating(false);
  };

  const handleRegenerate = async () => {
    setUpdating(true);
    await supabase.from("generated_assets").update({ status: "regenerating" }).eq("id", asset.id);
    setTimeout(async () => {
      await supabase.from("generated_assets").update({ status: "pending_review" }).eq("id", asset.id);
      toast.success("Regenerated!");
      onStatusChange();
      setUpdating(false);
    }, 2000);
  };

  const handleSaveCaption = async () => {
    const metaPrefix = asset.content_text?.match(/^\[meta:[^\]]+\]/)?.[0] || "";
    await supabase
      .from("generated_assets")
      .update({ content_text: metaPrefix ? `${metaPrefix} ${captionDraft}` : captionDraft })
      .eq("id", asset.id);
    setEditingCaption(false);
    toast.success("Caption updated.");
    onStatusChange();
  };

  // Aspect ratio CSS class
  const aspectClass = socialMeta
    ? `aspect-[${socialMeta.aspectRatio}]`
    : asset.asset_type === "video"
      ? "aspect-[9/16]"
      : "aspect-[4/5]";

  return (
    <article className="group relative bg-card rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col">
      {/* Media container with native aspect ratio */}
      {isVisual && (
        <div className={`relative w-full bg-muted overflow-hidden ${aspectClass}`}
          style={{ aspectRatio: socialMeta?.aspectRatio?.replace("/", " / ") || (asset.asset_type === "video" ? "9 / 16" : "4 / 5") }}
        >
          {asset.content_url ? (
            <img
              src={asset.content_url}
              alt={socialMeta?.label || "Generated asset"}
              className="w-full h-full object-cover"
            />
          ) : (
            <Skeleton className="w-full h-full" />
          )}

          {/* Platform badge — top left */}
          {socialMeta && (
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-foreground/70 backdrop-blur-sm rounded text-[10px] font-semibold text-card uppercase tracking-wide">
              {platformIcon(socialMeta.platform)}
              {socialMeta.format}
            </div>
          )}

          {/* Status badge — top right */}
          <div className="absolute top-2 right-2">
            <Badge variant="outline" className={`text-[9px] ${statusCfg.className} backdrop-blur-sm`}>
              {statusCfg.label}
            </Badge>
          </div>

          {/* Video duration overlay */}
          {asset.asset_type === "video" && (
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-foreground/60 backdrop-blur-sm rounded text-[10px] font-mono text-card">
              0:15
            </div>
          )}
        </div>
      )}

      {/* Copy-only card — no media */}
      {asset.asset_type === "copy" && (
        <div className="p-4 flex-1 flex items-center">
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-foreground leading-relaxed line-clamp-5">{displayCaption}</p>
          </div>
        </div>
      )}

      {/* Integrated caption + actions */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Caption */}
        {isVisual && displayCaption && (
          <>
            {editingCaption ? (
              <div className="space-y-2">
                <Textarea
                  value={captionDraft}
                  onChange={(e) => setCaptionDraft(e.target.value)}
                  className="text-xs min-h-[60px] resize-none"
                />
                <div className="flex gap-1.5">
                  <Button size="sm" onClick={handleSaveCaption} className="text-[10px] h-7 px-2">Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingCaption(false)} className="text-[10px] h-7 px-2">Cancel</Button>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3 italic">
                "{displayCaption}"
              </p>
            )}
          </>
        )}

        {/* Action buttons — visible on hover (desktop), always visible on mobile */}
        <div className="flex gap-1.5 mt-auto pt-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
          {asset.status === "pending_review" && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-8 text-[10px] font-semibold text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                onClick={() => updateStatus("approved")}
                disabled={updating}
              >
                <Check className="w-3 h-3 mr-1" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-8 text-[10px] font-semibold text-red-700 border-red-200 hover:bg-red-50"
                onClick={() => updateStatus("rejected")}
                disabled={updating}
              >
                <X className="w-3 h-3 mr-1" /> Reject
              </Button>
              {!editingCaption && isVisual && displayCaption && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => setEditingCaption(true)}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
              )}
            </>
          )}
          {asset.status === "rejected" && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 text-[10px]"
              onClick={handleRegenerate}
              disabled={updating}
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Regenerate
            </Button>
          )}
          {asset.status === "approved" && (
            <div className="flex items-center gap-1.5 text-emerald-600">
              <Check className="w-3 h-3" />
              <span className="text-[10px] font-medium">Ready</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default AssetFeedCard;
