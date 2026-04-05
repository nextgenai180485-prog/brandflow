import { useState } from "react";
import { Check, X, RefreshCw, Pencil, ImageIcon, VideoIcon, FileText, MoreHorizontal, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { GeneratedAsset, AssetStatus } from "@/types/campaigns";

const assetTypeLabel = (type: string) => {
  if (type === "image") return { icon: ImageIcon, label: "Image Post" };
  if (type === "video") return { icon: VideoIcon, label: "Video Reel" };
  return { icon: FileText, label: "Caption Copy" };
};

const statusBadgeConfig: Record<AssetStatus, { label: string; className: string }> = {
  pending_review: { label: "Pending Review", className: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "Approved ✓", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  rejected: { label: "Rejected ✗", className: "bg-red-100 text-red-800 border-red-200" },
  regenerating: { label: "Regenerating…", className: "animate-pulse bg-blue-50 text-blue-700 border-blue-200" },
};

interface AssetFeedCardProps {
  asset: GeneratedAsset;
  onStatusChange: () => void;
  campaignTitle?: string;
}

const AssetFeedCard = ({ asset, onStatusChange, campaignTitle }: AssetFeedCardProps) => {
  const [updating, setUpdating] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(asset.content_text || "");

  const { icon: TypeIcon, label: typeLabel } = assetTypeLabel(asset.asset_type);
  const statusCfg = statusBadgeConfig[asset.status];

  const updateStatus = async (newStatus: AssetStatus) => {
    setUpdating(true);
    const { error } = await supabase
      .from("generated_assets")
      .update({ status: newStatus })
      .eq("id", asset.id);

    if (error) {
      toast.error("Failed to update asset status.");
    } else {
      toast.success(newStatus === "approved" ? "Asset approved!" : "Asset rejected.");
      onStatusChange();
    }
    setUpdating(false);
  };

  const handleRegenerate = async () => {
    setUpdating(true);
    await supabase
      .from("generated_assets")
      .update({ status: "regenerating" })
      .eq("id", asset.id);

    setTimeout(async () => {
      await supabase
        .from("generated_assets")
        .update({ status: "pending_review" })
        .eq("id", asset.id);
      toast.success("Asset regenerated! Ready for review.");
      onStatusChange();
      setUpdating(false);
    }, 2000);
  };

  const handleRerollCaption = async () => {
    setUpdating(true);
    const captions = [
      "✨ Elevate your glow this season. Book your complimentary consultation today — limited spots available. #Beauty #Confidence",
      "🌟 Your transformation starts here. Discover exclusive treatment packages designed just for you. #MedSpa #SelfCare",
      "💫 Radiance redefined. Experience the difference our expert team can make. DM us for availability. #Glow #Wellness",
    ];
    const newCaption = captions[Math.floor(Math.random() * captions.length)];

    await supabase
      .from("generated_assets")
      .update({ content_text: newCaption })
      .eq("id", asset.id);

    setCaptionDraft(newCaption);
    toast.success("Caption refreshed!");
    onStatusChange();
    setUpdating(false);
  };

  const handleSaveCaption = async () => {
    await supabase
      .from("generated_assets")
      .update({ content_text: captionDraft })
      .eq("id", asset.id);
    setEditingCaption(false);
    toast.success("Caption updated.");
    onStatusChange();
  };

  const isVisual = asset.asset_type === "image" || asset.asset_type === "video";
  const caption = asset.content_text;
  // Filter out internal generation context from display
  const displayCaption = caption && !caption.startsWith("[Generation context:") ? caption : null;

  return (
    <article className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header — Profile-style */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <TypeIcon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">{typeLabel}</h3>
            <p className="text-[11px] text-muted-foreground font-mono truncate">
              {campaignTitle || `#${asset.id.slice(0, 8)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-[10px] ${statusCfg.className}`}>
            {statusCfg.label}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-md hover:bg-secondary transition-colors">
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleRegenerate} disabled={updating}>
                <RefreshCw className="w-3.5 h-3.5 mr-2" /> Regenerate
              </DropdownMenuItem>
              {isVisual && displayCaption && (
                <DropdownMenuItem onClick={() => setEditingCaption(true)}>
                  <Pencil className="w-3.5 h-3.5 mr-2" /> Edit Caption
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Body — The "Post Image/Video" */}
      {isVisual && (
        <div className="w-full bg-muted">
          {asset.asset_type === "image" && asset.content_url ? (
            <img
              src={asset.content_url}
              alt={`Generated ${asset.asset_type}`}
              className="w-full aspect-square object-cover"
            />
          ) : asset.asset_type === "video" && asset.content_url ? (
            <div className="w-full aspect-[9/16] max-h-[480px] flex items-center justify-center">
              <img
                src={asset.content_url}
                alt="Generated video placeholder"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <Skeleton className="w-full aspect-square" />
          )}
        </div>
      )}

      {/* Copy-only asset body */}
      {asset.asset_type === "copy" && asset.content_text && (
        <div className="px-4 py-6 sm:px-5">
          <p className="text-base text-foreground leading-relaxed">{asset.content_text}</p>
        </div>
      )}

      {/* Caption Section — Instagram-style, below the image */}
      {isVisual && displayCaption && (
        <div className="px-4 py-3 sm:px-5 border-t border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand bg-amber-50 px-2 py-0.5 rounded">
              <Sparkles className="w-3 h-3" />
              AI Caption
            </span>
          </div>

          {editingCaption ? (
            <div className="space-y-2">
              <Textarea
                value={captionDraft}
                onChange={(e) => setCaptionDraft(e.target.value)}
                className="text-sm min-h-[80px]"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveCaption} className="text-xs">
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingCaption(false)} className="text-xs">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground/80 leading-relaxed italic line-clamp-3 sm:line-clamp-none">
              "{displayCaption}"
            </p>
          )}

          {/* Caption re-roll */}
          {!editingCaption && asset.status === "pending_review" && (
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRerollCaption}
                disabled={updating}
                className="text-xs gap-1.5"
              >
                <RefreshCw className="w-3 h-3" /> Re-roll Caption
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingCaption(true)}
                className="text-xs gap-1.5"
              >
                <Pencil className="w-3 h-3" /> Edit
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Action Footer — Accept / Reject */}
      {asset.status === "pending_review" && (
        <div className="px-4 py-3 sm:px-5 border-t border-border/50 bg-secondary/30">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-11 sm:h-9 text-emerald-700 border-emerald-200 hover:bg-emerald-50 font-semibold"
              onClick={() => updateStatus("approved")}
              disabled={updating}
            >
              <Check className="w-4 h-4 mr-1.5" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-11 sm:h-9 text-red-700 border-red-200 hover:bg-red-50 font-semibold"
              onClick={() => updateStatus("rejected")}
              disabled={updating}
            >
              <X className="w-4 h-4 mr-1.5" /> Reject
            </Button>
          </div>
        </div>
      )}

      {/* Rejected state — Regenerate CTA */}
      {asset.status === "rejected" && (
        <div className="px-4 py-3 sm:px-5 border-t border-border/50 bg-red-50/30">
          <Button
            size="sm"
            variant="outline"
            className="w-full h-11 sm:h-9"
            onClick={handleRegenerate}
            disabled={updating}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Regenerate
          </Button>
        </div>
      )}
    </article>
  );
};

export default AssetFeedCard;
