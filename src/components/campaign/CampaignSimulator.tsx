import { useState } from "react";
import { Eye, EyeOff, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";

type SimPlatform = "instagram" | "tiktok" | "linkedin" | "facebook";

interface CampaignSimulatorProps {
  imageUrl: string | null;
  brandName?: string;
  caption?: string;
  className?: string;
}

const PLATFORMS: { key: SimPlatform; label: string }[] = [
  { key: "instagram", label: "IG Feed" },
  { key: "tiktok", label: "TikTok" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "facebook", label: "Facebook" },
];

// Safe zone overlay data per platform
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
          <span className="text-[11px] font-semibold">{brandName.toLowerCase().replace(/\s+/g, "")}</span>
          <div className="ml-auto"><MoreHorizontal className="w-4 h-4 text-white/70" /></div>
        </div>
        <div className="w-full aspect-[4/5] bg-neutral-900">
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
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
          <p className="text-[11px] font-semibold">1,247 likes</p>
        </div>
        <div className="px-3 pb-3">
          <p className="text-[11px] leading-[15px]">
            <span className="font-semibold mr-1">{brandName.toLowerCase().replace(/\s+/g, "")}</span>
            {caption}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-around py-1.5 border-t border-white/10">
        {["🏠", "🔍", "➕", "🎬", "👤"].map((e, i) => (
          <span key={i} className={cn("text-sm", i === 0 ? "opacity-100" : "opacity-40")}>{e}</span>
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
      <div className="relative z-10 flex items-center justify-center gap-5 pt-10 pb-2">
        <span className="text-[12px] text-white/50">Following</span>
        <span className="text-[12px] font-semibold border-b-2 border-white pb-0.5">For You</span>
      </div>
      <div className="absolute right-2 bottom-24 z-10 flex flex-col items-center gap-4">
        <div className="flex flex-col items-center gap-0.5">
          <Heart className="w-6 h-6" />
          <span className="text-[9px]">24.5K</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <MessageCircle className="w-6 h-6" />
          <span className="text-[9px]">312</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <Bookmark className="w-5 h-5" />
          <span className="text-[9px]">1.8K</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <Send className="w-5 h-5 -rotate-12" />
          <span className="text-[9px]">Share</span>
        </div>
      </div>
      <div className="relative z-10 mt-auto px-3 pb-16">
        <p className="text-[12px] font-semibold mb-0.5">@{brandName.toLowerCase().replace(/\s+/g, "")}</p>
        <p className="text-[11px] leading-[14px] text-white/90 line-clamp-2">{caption}</p>
      </div>
      <div className="relative z-10 flex items-center justify-around py-2 bg-black border-t border-white/10">
        {["Home", "Friends", "+", "Inbox", "Profile"].map((l, i) => (
          <div key={i} className={cn("flex flex-col items-center", i === 0 ? "text-white" : "text-white/40")}>
            {i === 2 ? (
              <div className="w-9 h-5 bg-gradient-to-r from-cyan-400 to-pink-500 rounded-md flex items-center justify-center">
                <span className="text-sm font-bold">+</span>
              </div>
            ) : (
              <span className="text-[8px]">{l}</span>
            )}
          </div>
        ))}
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

export default function CampaignSimulator({ imageUrl, brandName = "Brand", caption = "", className }: CampaignSimulatorProps) {
  const [platform, setPlatform] = useState<SimPlatform>("instagram");
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const renderContent = () => {
    if (!imageUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-muted/30 text-muted-foreground gap-3">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
            <Eye className="w-5 h-5" />
          </div>
          <p className="text-[11px] font-medium text-center px-4">Select a template below to preview it here</p>
        </div>
      );
    }
    const props = { imageUrl, brandName, caption };
    if (platform === "tiktok") return <TikTokContent {...props} />;
    if (platform === "linkedin" || platform === "facebook") return <LinkedInContent {...props} />;
    return <IGFeedContent {...props} />;
  };

  const phoneScale = fullscreen ? 0.85 : 0.6;

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Platform switcher */}
      <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-xl border border-border">
        {PLATFORMS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPlatform(p.key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all",
              platform === p.key
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* iPhone 16 Pro Shell */}
      <div
        className="relative transition-transform duration-300"
        style={{
          width: 393 * phoneScale,
          height: 852 * phoneScale,
        }}
      >
        {/* Outer shell */}
        <div
          className="absolute inset-0 rounded-[55px] border-[4px] border-[#2A2A2E] bg-black shadow-2xl overflow-hidden"
          style={{
            borderRadius: 55 * phoneScale,
            borderWidth: Math.max(3, 4 * phoneScale),
          }}
        >
          {/* Dynamic Island */}
          <div
            className="absolute top-[10px] left-1/2 -translate-x-1/2 bg-black rounded-full z-20"
            style={{
              width: 126 * phoneScale,
              height: 37 * phoneScale,
              top: 10 * phoneScale,
            }}
          />

          {/* Content viewport */}
          <div className="w-full h-full overflow-hidden relative" style={{ transform: `scale(${phoneScale})`, transformOrigin: "top left", width: 393, height: 852 }}>
            {renderContent()}

            {/* Safe Zone overlays */}
            {showSafeZones && imageUrl && (
              <>
                {SAFE_ZONES[platform]?.map((zone, i) => (
                  <div key={i} className={cn("absolute z-30", zone.style)}>
                    <div className="w-full h-full bg-red-500/25 border border-red-500/40 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-red-300 uppercase tracking-wider drop-shadow-lg">{zone.label}</span>
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

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowSafeZones(!showSafeZones)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all border",
            showSafeZones
              ? "bg-red-500/10 border-red-500/30 text-red-400"
              : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
          )}
        >
          {showSafeZones ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          Safe Zones
        </button>
        <button
          onClick={() => setFullscreen(!fullscreen)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-secondary/50 border border-border text-muted-foreground hover:text-foreground transition-all"
        >
          {fullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          {fullscreen ? "Compact" : "Expand"}
        </button>
      </div>
    </div>
  );
}