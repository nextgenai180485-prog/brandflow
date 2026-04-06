import { useState } from "react";
import { X, Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhonePreviewProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string | null;
  caption: string;
  platform: string;
  format: string;
  brandName?: string;
  aspectRatio?: string;
  isVideo?: boolean;
  // Navigation
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

const PLATFORM_CONFIGS: Record<string, {
  appName: string;
  statusBar: boolean;
  bottomNav: boolean;
}> = {
  instagram: { appName: "Instagram", statusBar: true, bottomNav: true },
  tiktok: { appName: "TikTok", statusBar: true, bottomNav: true },
  linkedin: { appName: "LinkedIn", statusBar: true, bottomNav: true },
  facebook: { appName: "Facebook", statusBar: true, bottomNav: true },
  x: { appName: "X", statusBar: true, bottomNav: true },
  youtube: { appName: "YouTube", statusBar: true, bottomNav: true },
};

function InstagramPostView({ imageUrl, caption, brandName, isVideo }: {
  imageUrl: string; caption: string; brandName: string; isVideo?: boolean;
}) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 text-[10px] font-medium">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <div className="flex gap-[2px]">
            {[1,2,3,4].map(i => <div key={i} className="w-[3px] h-[3px] rounded-full bg-white" />)}
          </div>
          <span className="text-[8px]">5G</span>
          <div className="w-5 h-2.5 border border-white/60 rounded-[2px] relative">
            <div className="absolute inset-[1px] right-[3px] bg-white rounded-[1px]" />
          </div>
        </div>
      </div>

      {/* App header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="text-base font-semibold tracking-tight">Instagram</span>
        <div className="flex items-center gap-4">
          <Heart className="w-5 h-5" />
          <Send className="w-5 h-5 -rotate-12" />
        </div>
      </div>

      {/* Post */}
      <div className="flex-1 overflow-y-auto">
        {/* Post header */}
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
              <span className="text-[9px] font-bold">{brandName.charAt(0).toUpperCase()}</span>
            </div>
          </div>
          <div className="flex-1">
            <span className="text-[13px] font-semibold">{brandName.toLowerCase().replace(/\s+/g, '')}</span>
          </div>
          <MoreHorizontal className="w-5 h-5 text-white/70" />
        </div>

        {/* Image */}
        <div className="w-full aspect-square bg-neutral-900">
          {isVideo ? (
            <video src={imageUrl} className="w-full h-full object-cover" muted playsInline autoPlay loop />
          ) : (
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-4">
            <button onClick={() => setLiked(!liked)}>
              <Heart className={cn("w-6 h-6 transition-all", liked ? "fill-red-500 text-red-500 scale-110" : "text-white")} />
            </button>
            <MessageCircle className="w-6 h-6 text-white -scale-x-100" />
            <Send className="w-6 h-6 text-white -rotate-12" />
          </div>
          <button onClick={() => setSaved(!saved)}>
            <Bookmark className={cn("w-6 h-6 transition-all", saved ? "fill-white text-white" : "text-white")} />
          </button>
        </div>

        {/* Likes */}
        <div className="px-3 pb-1">
          <p className="text-[13px] font-semibold">{liked ? "1,248" : "1,247"} likes</p>
        </div>

        {/* Caption */}
        <div className="px-3 pb-3">
          <p className="text-[13px] leading-[18px]">
            <span className="font-semibold mr-1">{brandName.toLowerCase().replace(/\s+/g, '')}</span>
            {caption}
          </p>
        </div>

        {/* Time */}
        <div className="px-3 pb-4">
          <p className="text-[10px] text-white/40 uppercase tracking-wide">2 hours ago</p>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-around py-2 border-t border-white/10 bg-black">
        {["🏠", "🔍", "➕", "🎬", "👤"].map((icon, i) => (
          <div key={i} className={cn("text-lg", i === 0 ? "opacity-100" : "opacity-40")}>{icon}</div>
        ))}
      </div>
    </div>
  );
}

function InstagramStoryView({ imageUrl, caption, brandName, isVideo }: {
  imageUrl: string; caption: string; brandName: string; isVideo?: boolean;
}) {
  return (
    <div className="flex flex-col h-full bg-black text-white relative">
      {/* Full bleed media */}
      <div className="absolute inset-0">
        {isVideo ? (
          <video src={imageUrl} className="w-full h-full object-cover" muted playsInline autoPlay loop />
        ) : (
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        )}
      </div>

      {/* Progress bars */}
      <div className="relative z-10 flex gap-1 px-2 pt-3">
        <div className="flex-1 h-[2px] bg-white rounded-full" />
        <div className="flex-1 h-[2px] bg-white/30 rounded-full" />
        <div className="flex-1 h-[2px] bg-white/30 rounded-full" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center gap-2.5 px-3 py-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
          <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
            <span className="text-[9px] font-bold">{brandName.charAt(0).toUpperCase()}</span>
          </div>
        </div>
        <span className="text-[13px] font-semibold">{brandName.toLowerCase().replace(/\s+/g, '')}</span>
        <span className="text-[11px] text-white/50">2h</span>
        <div className="ml-auto">
          <MoreHorizontal className="w-5 h-5 text-white/70" />
        </div>
      </div>

      {/* Bottom caption overlay */}
      {caption && (
        <div className="relative z-10 mt-auto px-4 pb-16">
          <p className="text-[13px] leading-[18px] text-white drop-shadow-lg line-clamp-3">{caption}</p>
        </div>
      )}

      {/* Reply bar */}
      <div className="relative z-10 flex items-center gap-3 px-3 py-3 bg-gradient-to-t from-black/60">
        <div className="flex-1 border border-white/30 rounded-full px-4 py-2">
          <span className="text-[13px] text-white/50">Send message</span>
        </div>
        <Heart className="w-6 h-6" />
        <Send className="w-6 h-6 -rotate-12" />
      </div>
    </div>
  );
}

function TikTokView({ imageUrl, caption, brandName, isVideo }: {
  imageUrl: string; caption: string; brandName: string; isVideo?: boolean;
}) {
  const [liked, setLiked] = useState(false);

  return (
    <div className="flex flex-col h-full bg-black text-white relative">
      {/* Full bleed media */}
      <div className="absolute inset-0">
        {isVideo ? (
          <video src={imageUrl} className="w-full h-full object-cover" muted playsInline autoPlay loop />
        ) : (
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        )}
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-center gap-6 pt-12 pb-3">
        <span className="text-[15px] text-white/50">Following</span>
        <span className="text-[15px] font-semibold border-b-2 border-white pb-0.5">For You</span>
      </div>

      {/* Right side actions */}
      <div className="absolute right-3 bottom-28 z-10 flex flex-col items-center gap-5">
        <div className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <span className="text-[11px] font-bold">{brandName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center -mt-2">
            <span className="text-[8px] font-bold">+</span>
          </div>
        </div>
        <button onClick={() => setLiked(!liked)} className="flex flex-col items-center gap-0.5">
          <Heart className={cn("w-8 h-8", liked ? "fill-red-500 text-red-500" : "text-white")} />
          <span className="text-[11px]">{liked ? "24.6K" : "24.5K"}</span>
        </button>
        <div className="flex flex-col items-center gap-0.5">
          <MessageCircle className="w-8 h-8 text-white" />
          <span className="text-[11px]">312</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <Bookmark className="w-7 h-7 text-white" />
          <span className="text-[11px]">1,842</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <Send className="w-7 h-7 text-white -rotate-12" />
          <span className="text-[11px]">Share</span>
        </div>
      </div>

      {/* Bottom caption */}
      <div className="relative z-10 mt-auto px-3 pb-20">
        <p className="text-[14px] font-semibold mb-1">@{brandName.toLowerCase().replace(/\s+/g, '')}</p>
        <p className="text-[13px] leading-[17px] text-white/90 line-clamp-2">{caption}</p>
      </div>

      {/* Bottom nav */}
      <div className="relative z-10 flex items-center justify-around py-2.5 bg-black border-t border-white/10">
        {["Home", "Friends", "+", "Inbox", "Profile"].map((label, i) => (
          <div key={i} className={cn("flex flex-col items-center", i === 0 ? "text-white" : "text-white/40")}>
            {i === 2 ? (
              <div className="w-11 h-7 bg-gradient-to-r from-cyan-400 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-white">+</span>
              </div>
            ) : (
              <span className="text-[10px]">{label}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LinkedInView({ imageUrl, caption, brandName, isVideo }: {
  imageUrl: string; caption: string; brandName: string; isVideo?: boolean;
}) {
  const [liked, setLiked] = useState(false);

  return (
    <div className="flex flex-col h-full bg-[#000000] text-white">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 text-[10px] font-medium bg-[#1B1F23]">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <span className="text-[8px]">5G</span>
          <div className="w-5 h-2.5 border border-white/60 rounded-[2px] relative">
            <div className="absolute inset-[1px] right-[3px] bg-white rounded-[1px]" />
          </div>
        </div>
      </div>

      {/* App header */}
      <div className="flex items-center gap-3 px-3 py-2 bg-[#1B1F23]">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
          <span className="text-[11px] font-bold">{brandName.charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex-1 bg-[#38434F] rounded-md px-3 py-1.5">
          <span className="text-[12px] text-white/50">Search</span>
        </div>
        <MessageCircle className="w-5 h-5 text-white/60" />
      </div>

      {/* Post */}
      <div className="flex-1 overflow-y-auto bg-[#1B1F23]">
        <div className="bg-[#1B1F23] border-b border-white/5 mt-2">
          {/* Post header */}
          <div className="flex items-start gap-2.5 px-3 py-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-[13px] font-bold">{brandName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold">{brandName}</p>
              <p className="text-[11px] text-white/40">2h · 🌐</p>
            </div>
            <MoreHorizontal className="w-5 h-5 text-white/40" />
          </div>

          {/* Caption */}
          <div className="px-3 pb-2">
            <p className="text-[13px] leading-[18px] text-white/90 line-clamp-3">{caption}</p>
            <button className="text-[13px] text-white/50 mt-0.5">...more</button>
          </div>

          {/* Image */}
          <div className="w-full aspect-square bg-neutral-900">
            {isVideo ? (
              <video src={imageUrl} className="w-full h-full object-cover" muted playsInline autoPlay loop />
            ) : (
              <img src={imageUrl} alt="" className="w-full h-full object-cover" />
            )}
          </div>

          {/* Reactions */}
          <div className="flex items-center justify-between px-3 py-2 text-[11px] text-white/40">
            <span>👍❤️ {liked ? "128" : "127"}</span>
            <span>14 comments · 8 reposts</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-around px-3 py-2 border-t border-white/10">
            {[
              { label: liked ? "Liked" : "Like", active: liked, onClick: () => setLiked(!liked) },
              { label: "Comment" },
              { label: "Repost" },
              { label: "Send" },
            ].map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                className={cn("text-[12px] font-medium py-1", action.active ? "text-blue-500" : "text-white/50")}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GenericView({ imageUrl, caption, brandName, platform, isVideo }: {
  imageUrl: string; caption: string; brandName: string; platform: string; isVideo?: boolean;
}) {
  return (
    <div className="flex flex-col h-full bg-black text-white">
      <div className="flex items-center justify-between px-4 py-1.5 text-[10px] font-medium">
        <span>9:41</span>
        <div className="w-5 h-2.5 border border-white/60 rounded-[2px] relative">
          <div className="absolute inset-[1px] right-[3px] bg-white rounded-[1px]" />
        </div>
      </div>
      <div className="px-3 py-2 border-b border-white/10">
        <span className="text-sm font-semibold capitalize">{platform}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="w-full aspect-square bg-neutral-900">
          {isVideo ? (
            <video src={imageUrl} className="w-full h-full object-cover" muted playsInline autoPlay loop />
          ) : (
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="px-3 py-3">
          <p className="text-[13px] leading-[18px]">
            <span className="font-semibold mr-1">{brandName}</span>
            {caption}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PhonePreview({
  open, onClose, imageUrl, caption, platform, format, brandName = "Brand",
  aspectRatio, isVideo, onPrev, onNext, hasPrev, hasNext,
}: PhonePreviewProps) {
  if (!open || !imageUrl) return null;

  const isStory = format === "story" || format === "reel" || aspectRatio === "9:16";
  const p = platform?.toLowerCase() || "instagram";

  const renderView = () => {
    const props = { imageUrl, caption, brandName, isVideo };
    if (p === "tiktok") return <TikTokView {...props} />;
    if (p === "linkedin") return <LinkedInView {...props} />;
    if (p === "instagram" && isStory) return <InstagramStoryView {...props} />;
    if (p === "instagram") return <InstagramPostView {...props} />;
    if (p === "facebook") return <LinkedInView {...props} />;
    return <GenericView {...props} platform={p} />;
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Nav arrows */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
          className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors z-10"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
      )}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext?.(); }}
          className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors z-10"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      )}

      {/* Phone frame */}
      <div
        className="relative animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close — inside frame wrapper so it's above stopPropagation */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="absolute -top-3 -right-3 sm:top-2 sm:right-2 w-9 h-9 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center hover:bg-black/90 transition-colors z-[60] border border-white/20"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Device shell */}
        <div className="relative w-[375px] h-[812px] max-h-[90vh] rounded-[50px] border-[6px] border-neutral-800 bg-black shadow-2xl shadow-black/60 overflow-hidden">
          {/* Notch / Dynamic Island */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 w-[126px] h-[34px] bg-black rounded-b-[20px]" />

          {/* Screen content */}
          <div className="w-full h-full rounded-[44px] overflow-hidden">
            {renderView()}
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[134px] h-[5px] bg-white/30 rounded-full z-50" />
        </div>
      </div>

      {/* Platform label */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <span className="text-[11px] text-white/40 font-medium uppercase tracking-widest capitalize">{p} Preview</span>
      </div>
    </div>
  );
}
