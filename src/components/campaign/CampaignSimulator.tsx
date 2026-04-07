import { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff, Maximize2, Minimize2, Star, Pencil, Download, FolderPlus, EyeOff as HideIcon, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";

type SimPlatform = "instagram" | "tiktok" | "linkedin" | "facebook";

interface CampaignSimulatorProps {
  imageUrl: string | null;
  brandName?: string;
  caption?: string;
  className?: string;
  onStar?: () => void;
  onEdit?: () => void;
  onDownload?: () => void;
  onSaveToLibrary?: () => void;
  onHide?: () => void;
  isStarred?: boolean;
}

const PLATFORMS: { key: SimPlatform; label: string }[] = [
  { key: "instagram", label: "IG Feed" },
  { key: "tiktok", label: "TikTok" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "facebook", label: "Facebook" },
];

const SAFE_ZONES: Record<SimPlatform, { label: string; style: string }[]> = {
  instagram: [
    { label: "Caption Area", style: "bottom-0 left-0 right-0 h-[18%]" },
    { label: "Home Bar", style: "bottom-0 left-0 right-0 h-[4%]" },
  ],
  tiktok: [
    { label: "Right Rail", style: "top-[35%] right-0 w-[15%] h-[40%]" },
    { label: "Caption Area", style: "bottom-[8%] left-0 right-[20%] h-[15%]" },
    { label: "Bottom Nav", style: "bottom-0 left-0 right-0 h-[7%]" },
  ],
  linkedin: [
    { label: "Caption Area", style: "bottom-0 left-0 right-0 h-[12%]" },
  ],
  facebook: [
    { label: "Caption Area", style: "bottom-0 left-0 right-0 h-[12%]" },
  ],
};

const ASPECT_VARIANTS = [
  { label: "9:16", w: 9, h: 16 },
  { label: "4:5", w: 4, h: 5 },
  { label: "1:1", w: 1, h: 1 },
  { label: "16:9", w: 16, h: 9 },
];

// ── Platform Content Renderers ──

function IGFeedContent({ imageUrl, brandName, caption }: { imageUrl: string; brandName: string; caption: string }) {
  return (
    <div className="flex flex-col h-full bg-black text-white">
      <div className="flex items-center justify-between px-3 py-1.5 text-[9px] font-medium">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <span className="text-[7px]">5G</span>
          <div className="w-4 h-2 border border-white/60 rounded-[2px] relative">
            <div className="absolute inset-[1px] right-[2px] bg-white rounded-[1px]" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10">
        <span className="text-[13px] font-semibold">Instagram</span>
        <div className="flex items-center gap-3">
          <Heart className="w-4 h-4" />
          <Send className="w-4 h-4 -rotate-12" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 p-[1.5px]">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
              <span className="text-[8px] font-bold">{brandName.charAt(0).toUpperCase()}</span>
            </div>
          </div>
          <div>
            <span className="text-[11px] font-semibold">{brandName.toLowerCase().replace(/\s+/g, "")}</span>
            <p className="text-[8px] text-white/40">Sponsored</p>
          </div>
          <div className="ml-auto"><MoreHorizontal className="w-4 h-4 text-white/70" /></div>
        </div>
        <div className="w-full aspect-[4/5] bg-neutral-900">
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="bg-blue-600 mx-0 flex items-center justify-between px-3 py-1.5">
          <span className="text-[10px] font-semibold">Shop now</span>
          <span className="text-[12px]">›</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-3">
            <Heart className="w-5 h-5" />
            <MessageCircle className="w-5 h-5 -scale-x-100" />
            <Send className="w-5 h-5 -rotate-12" />
          </div>
          <Bookmark className="w-5 h-5" />
        </div>
        <div className="px-3 pb-1">
          <p className="text-[11px] font-semibold">261 likes</p>
        </div>
        <div className="px-3 pb-3">
          <p className="text-[11px] leading-[15px]">
            <span className="font-semibold mr-1">{brandName.toLowerCase().replace(/\s+/g, "")}</span>
            {caption}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-around py-2 border-t border-white/10">
        {["🏠", "🔍", "➕", "🎬", "👤"].map((e, i) => (
          <span key={i} className={cn("text-[14px]", i === 0 ? "opacity-100" : "opacity-40")}>{e}</span>
        ))}
      </div>
    </div>
  );
}

function TikTokContent({ imageUrl, brandName, caption }: { imageUrl: string; brandName: string; caption: string }) {
  return (
    <div className="flex flex-col h-full bg-black text-white relative">
      <div className="absolute inset-0">
        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 pt-12 pb-2">
        <span className="text-[10px] text-white/60">←</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-white/60">{brandName}</span>
          <span className="text-[9px] text-white/40">Sponsored</span>
        </div>
        <span className="text-[12px]">📷</span>
      </div>
      <div className="relative z-10 flex items-center justify-center gap-5 pt-14 pb-2">
        <span className="text-[12px] text-white/50">Following</span>
        <span className="text-[12px] font-semibold border-b-2 border-white pb-0.5">For You</span>
      </div>
      <div className="absolute right-3 bottom-28 z-10 flex flex-col items-center gap-5">
        <div className="flex flex-col items-center gap-0.5">
          <Heart className="w-7 h-7" />
          <span className="text-[9px]">24.5K</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <MessageCircle className="w-7 h-7" />
          <span className="text-[9px]">312</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <Bookmark className="w-6 h-6" />
          <span className="text-[9px]">1.8K</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <Send className="w-6 h-6 -rotate-12" />
          <span className="text-[9px]">Share</span>
        </div>
      </div>
      <div className="relative z-10 mt-auto px-4 pb-4">
        <p className="text-[12px] font-semibold mb-1">@{brandName.toLowerCase().replace(/\s+/g, "")}</p>
        <p className="text-[11px] leading-[14px] text-white/90 line-clamp-2">{caption}</p>
        <div className="mt-2 bg-blue-600/90 rounded-md px-3 py-1.5 flex items-center justify-between">
          <span className="text-[10px] font-semibold">Learn more</span>
          <span className="text-[11px]">› ⋮</span>
        </div>
      </div>
      <div className="relative z-10 flex items-center justify-around py-2.5 bg-black border-t border-white/10">
        <div className="flex items-center gap-0.5">
          <span className="text-[9px] text-white/40">Add a comment...</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px]">❤️</span>
          <span className="text-[12px]">😂</span>
          <span className="text-[12px]">🥺</span>
          <span className="text-[12px]">➕</span>
        </div>
      </div>
    </div>
  );
}

function LinkedInContent({ imageUrl, brandName, caption }: { imageUrl: string; brandName: string; caption: string }) {
  return (
    <div className="flex flex-col h-full bg-[#000] text-white">
      <div className="flex items-center justify-between px-3 py-1.5 text-[9px] font-medium bg-[#1B1F23]">
        <span>9:41</span>
        <div className="w-4 h-2 border border-white/60 rounded-[2px] relative">
          <div className="absolute inset-[1px] right-[2px] bg-white rounded-[1px]" />
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1B1F23]">
        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
          <span className="text-[10px] font-bold">{brandName.charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex-1 bg-[#38434F] rounded-md px-2 py-1">
          <span className="text-[10px] text-white/50">Search</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-[#1B1F23]">
        <div className="mt-1">
          <div className="flex items-start gap-2 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-bold">{brandName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold">{brandName}</p>
              <p className="text-[9px] text-white/40">2h · 🌐</p>
            </div>
          </div>
          <div className="px-3 pb-1.5">
            <p className="text-[11px] leading-[15px] text-white/90 line-clamp-2">{caption}</p>
          </div>
          <div className="w-full aspect-square bg-neutral-900">
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex items-center justify-around px-3 py-2 border-t border-white/10 text-[10px] text-white/50">
            <span>Like</span><span>Comment</span><span>Repost</span><span>Send</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──

export default function CampaignSimulator({
  imageUrl, brandName = "Brand", caption = "", className,
  onStar, onEdit, onDownload, onSaveToLibrary, onHide, isStarred = false,
}: CampaignSimulatorProps) {
  const [platform, setPlatform] = useState<SimPlatform>("instagram");
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"preview" | "reels" | "feed">("feed");

  const renderContent = () => {
    if (!imageUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-muted/30 text-muted-foreground gap-3">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <ImageIcon className="w-7 h-7" />
          </div>
          <p className="text-[12px] font-medium text-center px-6">Select a template below to preview</p>
          <p className="text-[10px] text-center px-8 text-muted-foreground/60">Choose from the Source Gallery or upload your own creative</p>
        </div>
      );
    }
    const props = { imageUrl, brandName, caption };
    if (platform === "tiktok" || previewMode === "reels") return <TikTokContent {...props} />;
    if (platform === "linkedin" || platform === "facebook") return <LinkedInContent {...props} />;
    return <IGFeedContent {...props} />;
  };

  // Dynamic scale to fit container without scroll
  const availableHeight = typeof window !== "undefined" ? window.innerHeight - 56 - 220 - 40 : 600;
  const maxPhoneHeight = availableHeight - 90;
  const dynamicScale = Math.min(fullscreen ? 0.78 : 0.62, maxPhoneHeight / 852);
  const phoneScale = Math.max(0.35, dynamicScale);

  return (
    <div className={cn("flex gap-4 items-start", fullscreen && "gap-6", className)}>
      {/* ── Left: Phone Simulator ── */}
      <div className="flex flex-col items-center gap-1.5">
        {/* Preview mode tabs */}
        <div className="flex items-center gap-0 p-0.5 bg-secondary/60 rounded-lg border border-border">
          {(["preview", "reels", "feed"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setPreviewMode(mode)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all capitalize",
                previewMode === mode
                  ? "bg-background text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mode === "preview" && <ImageIcon className="w-3 h-3" />}
              {mode === "reels" && <span className="text-[10px]">▶</span>}
              {mode === "feed" && <span className="text-[10px]">⊞</span>}
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        {/* iPhone 16 Pro Shell */}
        <div
          className="relative transition-all duration-300"
          style={{
            width: 393 * phoneScale,
            height: 852 * phoneScale,
          }}
        >
          <div
            className="absolute inset-0 bg-black shadow-2xl overflow-hidden"
            style={{
              borderRadius: 55 * phoneScale,
              border: `${Math.max(3, 4 * phoneScale)}px solid #2A2A2E`,
            }}
          >
            {/* Dynamic Island */}
            <div
              className="absolute left-1/2 -translate-x-1/2 bg-black rounded-full z-20"
              style={{
                width: 126 * phoneScale,
                height: 37 * phoneScale,
                top: 10 * phoneScale,
              }}
            />

            {/* Content viewport */}
            <div
              className="w-full h-full overflow-hidden relative"
              style={{ transform: `scale(${phoneScale})`, transformOrigin: "top left", width: 393, height: 852 }}
            >
              {previewMode === "preview" && imageUrl ? (
                <div className="w-full h-full bg-muted/10 flex items-center justify-center p-4">
                  <img src={imageUrl} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
                </div>
              ) : (
                renderContent()
              )}

              {/* Safe Zone overlays */}
              {showSafeZones && imageUrl && previewMode !== "preview" && (
                <>
                  {SAFE_ZONES[platform]?.map((zone, i) => (
                    <div key={i} className={cn("absolute z-30", zone.style)}>
                      <div className="w-full h-full bg-red-500/20 border border-dashed border-red-400/50 flex items-center justify-center">
                        <span className="text-[8px] font-bold text-red-300 uppercase tracking-wider drop-shadow-lg bg-red-900/40 px-1.5 py-0.5 rounded">{zone.label}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Home indicator */}
            <div
              className="absolute bottom-[6px] left-1/2 -translate-x-1/2 bg-white/30 rounded-full z-20"
              style={{
                width: 134 * phoneScale,
                height: 5 * phoneScale,
                bottom: 6 * phoneScale,
              }}
            />
          </div>
        </div>

        {/* Compact info bar below phone */}
        <div className="flex items-center gap-3">
          {/* Platform indicator */}
          <div className="flex items-center gap-1 px-2 py-0.5 bg-secondary/50 rounded-full border border-border">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-[9px] font-semibold text-foreground capitalize">{platform}</span>
          </div>

          {/* Carousel dots */}
          {imageUrl && (
            <div className="flex items-center gap-0.5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={cn("w-1 h-1 rounded-full transition-colors", i === 0 ? "bg-foreground w-1.5" : "bg-muted-foreground/30")} />
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSafeZones(!showSafeZones)}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold transition-all border",
                showSafeZones
                  ? "bg-red-500/10 border-red-500/30 text-red-400"
                  : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {showSafeZones ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
              Safe
            </button>
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-secondary/50 border border-border text-muted-foreground hover:text-foreground transition-all"
            >
              {fullscreen ? <Minimize2 className="w-2.5 h-2.5" /> : <Maximize2 className="w-2.5 h-2.5" />}
              {fullscreen ? "–" : "+"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Right: Actions Panel ── */}
      {imageUrl && (
        <div className="flex flex-col gap-0 min-w-[140px] max-w-[180px] pt-6">
          {/* ACTIONS */}
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 px-1">Actions</p>
          <div className="flex flex-col">
            <button onClick={onStar} className={cn("flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-medium transition-colors hover:bg-secondary/50 rounded-lg", isStarred ? "text-amber-500" : "text-foreground")}>
              <Star className={cn("w-3.5 h-3.5", isStarred && "fill-current")} /> Star
            </button>
            <button onClick={onEdit} className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button onClick={onDownload} className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-secondary/50 rounded-lg transition-colors">
              <Download className="w-3.5 h-3.5" /> Download
            </button>
            <button onClick={onSaveToLibrary} className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-secondary/50 rounded-lg transition-colors">
              <FolderPlus className="w-3.5 h-3.5" /> Save to Library
            </button>
            <button onClick={onHide} className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-secondary/50 rounded-lg transition-colors">
              <HideIcon className="w-3.5 h-3.5" /> Hide
            </button>
          </div>

          {/* ASPECT RATIO VARIANTS */}
          <div className="mt-3">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 px-1">Aspect Ratio Variants</p>

            {/* Variant thumbnails grid */}
            <div className="grid grid-cols-2 gap-1.5 mt-2 px-1">
              {ASPECT_VARIANTS.map((v) => (
                <div key={v.label} className="relative rounded-lg overflow-hidden border border-border bg-secondary/30 hover:border-primary/40 transition-colors cursor-pointer group">
                  <div style={{ aspectRatio: `${v.w}/${v.h}`, maxHeight: 60 }} className="w-full overflow-hidden">
                    <img src={imageUrl!} alt={v.label} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex items-center justify-between px-1.5 py-1">
                    <span className="text-[9px] font-semibold text-foreground">{v.label}</span>
                    <span className="text-[10px] text-green-500">✓</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
