import { useState } from "react";
import { Check, X, RefreshCw, Pencil, ImageIcon, VideoIcon, FileText, Layers, Instagram } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { GeneratedAsset, AssetStatus, SocialMeta } from "@/types/campaigns";

const parseSocialMeta = (asset: GeneratedAsset): SocialMeta | null => {
  const text = asset.content_text || "";
  const match = text.match(/^\[meta:([a-z]+)\|([a-z]+)\|([0-9/]+)\]/);
  if (match) {
    return {
      platform: match[1] as SocialMeta["platform"],
      format: match[2] as SocialMeta["format"],
      aspectRatio: match[3],
      label: `${match[1].charAt(0).toUpperCase() + match[1].slice(1)} ${match[2].charAt(0).toUpperCase() + match[2].slice(1)}`,
      width: 0,
      height: 0,
    };
  }
  return null;
};

const stripMeta = (text: string | null): string | null => {
  if (!text) return null;
  return text.replace(/^\[meta:[^\]]+\]\s*/, "").replace(/^\[Generation context:[^\]]*\]\s*/, "").trim() || null;
};

const platformIcon = (platform: string) => {
  switch (platform) {
    case "instagram": return <Instagram className="w-2.5 h-2.5" />;
    case "tiktok": return <span className="text-[8px] font-black leading-none">TT</span>;
    case "facebook": return <span className="text-[8px] font-bold leading-none">f</span>;
    case "youtube": return <span className="text-[8px] font-bold leading-none">YT</span>;
    case "linkedin": return <span className="text-[8px] font-bold leading-none">in</span>;
    case "x": return <span className="text-[8px] font-bold leading-none">𝕏</span>;
    case "snapchat": return <span className="text-[8px] font-bold leading-none">👻</span>;
    default: return <ImageIcon className="w-2.5 h-2.5" />;
  }
};

const typeIcon = (type: string) => {
  if (type === "video") return VideoIcon;
  if (type === "copy") return FileText;
  if (type === "carousel") return Layers;
  return ImageIcon;
};

const statusBadgeConfig: Record<AssetStatus, { label: string; className: string }> = {
  pending_review: { label: "Review", className: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800 border-red-200" },
  regenerating: { label: "Regen…", className: "animate-pulse bg-blue-50 text-blue-700 border-blue-200" },
};

interface AssetFeedCardProps {
  asset: GeneratedAsset;
  onStatusChange: () => void;
}

const AssetFeedCard = ({ asset, onStatusChange }: AssetFeedCardProps) => {
  const [updating, setUpdating] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(stripMeta(asset.content_text) || "");

  const socialMeta = parseSocialMeta(asset);
  const displayCaption = stripMeta(asset.content_text);
  const statusCfg = statusBadgeConfig[asset.status];
  const isVisual = asset.asset_type !== "copy";

  const updateStatus = async (newStatus: AssetStatus) => {
    setUpdating(true);
    const { error } = await supabase
      .from("generated_assets")
      .update({ status: newStatus })
      .eq("id", asset.id);
    if (error) toast.error("Failed to update.");
    else {
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

  const aspectRatio = socialMeta?.aspectRatio?.replace("/", " / ") || "4 / 5";

  return (
    <article className="group relative bg-card rounded-lg border border-border overflow-hidden shadow-sm hover:shadow-md transition-all duration-150 flex flex-col">
      {/* Media */}
      {isVisual && (
        <div
          className="relative w-full bg-muted overflow-hidden"
          style={{ aspectRatio }}
        >
          {asset.content_url ? (
            <img src={asset.content_url} alt={socialMeta?.label || "Asset"} className="w-full h-full object-cover" />
          ) : (
            <Skeleton className="w-full h-full" />
          )}

          {/* Platform badge */}
          {socialMeta && (
            <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 bg-foreground/70 backdrop-blur-sm rounded text-[8px] font-semibold text-card uppercase tracking-wide">
              {platformIcon(socialMeta.platform)}
              <span>{socialMeta.format}</span>
            </div>
          )}

          {/* Status badge */}
          <div className="absolute top-1.5 right-1.5">
            <Badge variant="outline" className={`text-[8px] py-0 px-1 ${statusCfg.className} backdrop-blur-sm`}>
              {statusCfg.label}
            </Badge>
          </div>

          {/* Carousel slide indicator */}
          {asset.asset_type === "carousel" && (
            <div className="absolute bottom-1.5 right-1.5 px-1 py-0.5 bg-foreground/60 backdrop-blur-sm rounded text-[8px] font-mono text-card">
              1/5
            </div>
          )}

          {/* Video duration */}
          {asset.asset_type === "video" && (
            <div className="absolute bottom-1.5 right-1.5 px-1 py-0.5 bg-foreground/60 backdrop-blur-sm rounded text-[8px] font-mono text-card">
              0:15
            </div>
          )}

          {/* Dimension label */}
          {socialMeta && (
            <div className="absolute bottom-1.5 left-1.5 px-1 py-0.5 bg-foreground/50 backdrop-blur-sm rounded text-[7px] font-mono text-card">
              {socialMeta.aspectRatio}
            </div>
          )}
        </div>
      )}

      {/* Copy-only */}
      {asset.asset_type === "copy" && (
        <div className="p-3 flex-1 flex items-center">
          <div className="flex items-start gap-1.5">
            <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] text-foreground leading-relaxed line-clamp-4">{displayCaption}</p>
          </div>
        </div>
      )}

      {/* Caption + actions */}
      <div className="p-2 flex flex-col gap-1.5 flex-1">
        {isVisual && displayCaption && !editingCaption && (
          <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
            {displayCaption}
          </p>
        )}

        {editingCaption && (
          <div className="space-y-1.5">
            <Textarea
              value={captionDraft}
              onChange={(e) => setCaptionDraft(e.target.value)}
              className="text-[10px] min-h-[48px] resize-none"
            />
            <div className="flex gap-1">
              <Button size="sm" onClick={handleSaveCaption} className="text-[9px] h-6 px-1.5">Save</Button>
              <Button size="sm" variant="outline" onClick={() => setEditingCaption(false)} className="text-[9px] h-6 px-1.5">Cancel</Button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-1 mt-auto opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-100">
          {asset.status === "pending_review" && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-6 text-[9px] font-semibold text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                onClick={() => updateStatus("approved")}
                disabled={updating}
              >
                <Check className="w-2.5 h-2.5 mr-0.5" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-6 text-[9px] font-semibold text-red-700 border-red-200 hover:bg-red-50"
                onClick={() => updateStatus("rejected")}
                disabled={updating}
              >
                <X className="w-2.5 h-2.5 mr-0.5" /> Reject
              </Button>
              {!editingCaption && isVisual && displayCaption && (
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingCaption(true)}>
                  <Pencil className="w-2.5 h-2.5" />
                </Button>
              )}
            </>
          )}
          {asset.status === "rejected" && (
            <Button size="sm" variant="outline" className="flex-1 h-6 text-[9px]" onClick={handleRegenerate} disabled={updating}>
              <RefreshCw className="w-2.5 h-2.5 mr-0.5" /> Regenerate
            </Button>
          )}
          {asset.status === "approved" && (
            <div className="flex items-center gap-1 text-emerald-600">
              <Check className="w-2.5 h-2.5" />
              <span className="text-[9px] font-medium">Ready</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default AssetFeedCard;
