import { useState, useEffect, useRef } from "react";
import { Check, X, ImageIcon, VideoIcon, FileText, Layers, Instagram } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { GeneratedAsset, AssetStatus, SocialMeta } from "@/types/campaigns";

const useTypewriter = (text: string | null, speed = 18) => {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const prevTextRef = useRef<string | null>(null);

  useEffect(() => {
    if (!text) {
      setDisplayed("");
      setDone(true);
      return;
    }

    // If text hasn't changed, don't re-animate
    if (prevTextRef.current === text) return;
    prevTextRef.current = text;

    setDisplayed("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return { displayed, done };
};

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

const statusBadgeConfig: Record<AssetStatus, { label: string; className: string }> = {
  pending_review: { label: "Review", className: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800 border-red-200" },
  regenerating: { label: "Regen…", className: "animate-pulse bg-blue-50 text-blue-700 border-blue-200" },
};

interface AssetFeedCardProps {
  asset: GeneratedAsset;
  onStatusChange: () => void;
  isSelected?: boolean;
  onClick?: () => void;
}

const AssetFeedCard = ({ asset, onStatusChange, isSelected, onClick }: AssetFeedCardProps) => {
  const socialMeta = parseSocialMeta(asset);
  const displayCaption = stripMeta(asset.content_text);
  const { displayed: typedCaption, done: typingDone } = useTypewriter(displayCaption, 14);
  const statusCfg = statusBadgeConfig[asset.status];
  const isVisual = asset.asset_type !== "copy";
  const aspectRatio = socialMeta?.aspectRatio?.replace("/", " / ") || "4 / 5";

  return (
    <article
      onClick={onClick}
      className={`group relative bg-card rounded-lg border overflow-hidden shadow-sm hover:shadow-md transition-all duration-150 cursor-pointer flex flex-col ${
        isSelected ? "border-primary ring-2 ring-primary/20" : "border-border"
      }`}
    >
      {/* Media */}
      {isVisual && (
        <div className="relative w-full bg-muted overflow-hidden" style={{ aspectRatio }}>
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
              <Layers className="w-2.5 h-2.5 inline mr-0.5" />1/5
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

      {/* Caption footer — typewriter effect */}
      {isVisual && (
        <div className="px-2.5 py-2 border-t border-border/50">
          {displayCaption ? (
            <p className="text-[11px] text-foreground/80 leading-relaxed line-clamp-3 whitespace-pre-line">
              {typedCaption}
              {!typingDone && <span className="inline-block w-[2px] h-3 bg-foreground/60 ml-0.5 animate-pulse align-middle" />}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground/50 italic">No caption</p>
          )}
        </div>
      )}
    </article>
  );
};

export default AssetFeedCard;
