import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SOCIAL_FORMATS, type SocialMeta, type SocialPlatform } from "@/types/campaigns";

// Platform icons as simple branded circles
const PLATFORM_COLORS: Record<SocialPlatform, string> = {
  instagram: "bg-gradient-to-tr from-purple-600 to-pink-500",
  tiktok: "bg-black dark:bg-white",
  facebook: "bg-blue-600",
  youtube: "bg-red-600",
  linkedin: "bg-blue-700",
  x: "bg-black dark:bg-white",
  snapchat: "bg-yellow-400",
};

const PLATFORM_ICONS: Record<SocialPlatform, string> = {
  instagram: "IG",
  tiktok: "TT",
  facebook: "FB",
  youtube: "YT",
  linkedin: "LI",
  x: "𝕏",
  snapchat: "SC",
};

interface SelectedFormat {
  platform: SocialPlatform;
  format: string;
}

interface AssetPlatformSelectorProps {
  selected: SelectedFormat[];
  onChange: (formats: SelectedFormat[]) => void;
  assetType: "image" | "video";
  compact?: boolean;
}

// Group formats by platform
const groupedFormats = SOCIAL_FORMATS.reduce((acc, fmt) => {
  if (!acc[fmt.platform]) acc[fmt.platform] = [];
  acc[fmt.platform].push(fmt);
  return acc;
}, {} as Record<SocialPlatform, SocialMeta[]>);

const PLATFORM_ORDER: SocialPlatform[] = [
  "instagram", "tiktok", "facebook", "linkedin", "x", "snapchat", "youtube",
];

const AssetPlatformSelector = ({
  selected,
  onChange,
  assetType,
  compact = false,
}: AssetPlatformSelectorProps) => {
  const [expanded, setExpanded] = useState<SocialPlatform | null>(null);

  const isSelected = (platform: SocialPlatform, format: string) =>
    selected.some((s) => s.platform === platform && s.format === format);

  const toggle = (platform: SocialPlatform, format: string) => {
    if (isSelected(platform, format)) {
      onChange(selected.filter((s) => !(s.platform === platform && s.format === format)));
    } else {
      onChange([...selected, { platform, format }]);
    }
  };

  const platformHasSelection = (platform: SocialPlatform) =>
    selected.some((s) => s.platform === platform);

  const countForPlatform = (platform: SocialPlatform) =>
    selected.filter((s) => s.platform === platform).length;

  // Filter formats relevant to asset type (video formats for video, etc.)
  const getRelevantFormats = (platform: SocialPlatform) => {
    const formats = groupedFormats[platform] || [];
    if (assetType === "video") {
      return formats; // videos can go anywhere
    }
    // images: exclude reel formats
    return formats.filter((f) => f.format !== "reel");
  };

  return (
    <div className={cn("flex flex-wrap gap-1.5", compact && "gap-1")}>
      {PLATFORM_ORDER.map((platform) => {
        const formats = getRelevantFormats(platform);
        if (formats.length === 0) return null;
        const hasSelection = platformHasSelection(platform);
        const count = countForPlatform(platform);
        const isExpanded = expanded === platform;

        return (
          <div key={platform} className="relative">
            {/* Platform chip */}
            <button
              type="button"
              onClick={() => {
                if (formats.length === 1) {
                  // Single format: toggle directly
                  toggle(platform, formats[0].format);
                } else {
                  setExpanded(isExpanded ? null : platform);
                }
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all border",
                hasSelection
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/20 hover:bg-secondary/50"
              )}
            >
              <span
                className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0",
                  PLATFORM_COLORS[platform],
                  (platform === "tiktok" || platform === "x") && "text-white dark:text-black"
                )}
              >
                {PLATFORM_ICONS[platform]}
              </span>
              <span className="capitalize">{platform === "x" ? "X" : platform}</span>
              {count > 0 && (
                <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center">
                  {count}
                </span>
              )}
              {formats.length > 1 && (
                <ChevronDown
                  className={cn(
                    "w-3 h-3 transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />
              )}
            </button>

            {/* Format dropdown */}
            {isExpanded && formats.length > 1 && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setExpanded(null)}
                />
                <div className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[180px]">
                  {formats.map((fmt) => {
                    const sel = isSelected(platform, fmt.format);
                    return (
                      <button
                        key={fmt.format}
                        type="button"
                        onClick={() => toggle(platform, fmt.format)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors",
                          sel
                            ? "bg-primary/5 text-primary"
                            : "text-foreground hover:bg-secondary/50"
                        )}
                      >
                        <div
                          className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                            sel
                              ? "bg-primary border-primary"
                              : "border-border"
                          )}
                        >
                          {sel && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                        </div>
                        <div className="flex-1">
                          <span className="font-medium capitalize">{fmt.format}</span>
                          <span className="text-muted-foreground ml-1.5">
                            {fmt.aspectRatio} • {fmt.width}×{fmt.height}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AssetPlatformSelector;
