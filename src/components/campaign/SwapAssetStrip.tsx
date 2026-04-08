import { useState } from "react";
import { Plus, X, Upload, VideoIcon, Tag, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AssetLibraryPicker, { type LibraryAsset } from "@/components/AssetLibraryPicker";

export type SwapRole = "product" | "model" | "logo" | "background" | "other";

export interface SwapAsset {
  id: string;
  file_name: string;
  file_url: string;
  asset_type: string;
  role: SwapRole;
}

const ROLE_CONFIG: Record<SwapRole, { label: string; color: string }> = {
  product: { label: "Product", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  model: { label: "Model", color: "bg-purple-500/15 text-purple-700 dark:text-purple-400" },
  logo: { label: "Logo", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  background: { label: "BG", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  other: { label: "Other", color: "bg-muted text-muted-foreground" },
};

function detectRole(fileName: string): SwapRole {
  const lower = fileName.toLowerCase();
  if (/logo|brand|icon|mark/i.test(lower)) return "logo";
  if (/model|person|face|portrait|headshot|spokesperson/i.test(lower)) return "model";
  if (/bg|background|scene|backdrop/i.test(lower)) return "background";
  return "product";
}

interface SwapAssetStripProps {
  assets: SwapAsset[];
  onChange: (assets: SwapAsset[]) => void;
  activeIndex: number;
  onActiveChange: (index: number) => void;
}

const SwapAssetStrip = ({ assets, onChange, activeIndex, onActiveChange }: SwapAssetStripProps) => {
  // Bridge: convert SwapAsset[] <-> LibraryAsset[] for the unified picker
  const libraryAssets: LibraryAsset[] = assets.map(a => ({
    id: a.id, file_name: a.file_name, file_url: a.file_url,
    asset_type: a.asset_type, created_at: "",
  }));

  const handleLibraryChange = (selected: LibraryAsset[]) => {
    // Preserve existing roles for assets that are already in the strip
    const updated: SwapAsset[] = selected.map(la => {
      const existing = assets.find(a => a.id === la.id);
      if (existing) return existing;
      return {
        id: la.id, file_name: la.file_name, file_url: la.file_url,
        asset_type: la.asset_type, role: detectRole(la.file_name),
      };
    });
    onChange(updated);
  };

  const removeAsset = (index: number) => {
    const next = assets.filter((_, i) => i !== index);
    onChange(next);
    if (activeIndex >= next.length) onActiveChange(Math.max(0, next.length - 1));
  };

  const changeRole = (index: number, role: SwapRole) => {
    onChange(assets.map((a, i) => i === index ? { ...a, role } : a));
  };

  const isVideo = (url: string) => /\.(mp4|mov|avi|webm|mkv)(\?|$)/i.test(url);

  return (
    <div className="space-y-2">
      {/* Asset strip — only shown when assets exist */}
      {assets.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-medium text-foreground">Your Assets</span>
              <span className="text-[10px] text-muted-foreground">({assets.length})</span>
            </div>
            <button
              onClick={() => { onChange([]); onActiveChange(0); }}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {assets.map((asset, i) => {
              const isActive = i === Math.min(activeIndex, assets.length - 1);
              const roleConfig = ROLE_CONFIG[asset.role];
              return (
                <div
                  key={asset.id}
                  className={cn(
                    "relative shrink-0 w-[72px] rounded-lg overflow-hidden border-2 cursor-pointer transition-all group",
                    isActive ? "border-primary ring-1 ring-primary/30 shadow-sm" : "border-border hover:border-foreground/20"
                  )}
                  onClick={() => onActiveChange(i)}
                >
                  <div className="aspect-square overflow-hidden">
                    {!isVideo(asset.file_url) ? (
                      <img src={asset.file_url} alt={asset.file_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <VideoIcon className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  {/* Role badge */}
                  <div className="px-1 py-0.5 bg-card border-t border-border">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className={cn("w-full flex items-center justify-between rounded px-1 py-0.5 text-[8px] font-bold", roleConfig.color)}>
                          {roleConfig.label}
                          <ChevronDown className="w-2 h-2 opacity-50" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="min-w-[100px]">
                        {(Object.keys(ROLE_CONFIG) as SwapRole[]).map(role => (
                          <DropdownMenuItem
                            key={role}
                            onClick={(e) => { e.stopPropagation(); changeRole(i, role); }}
                            className="text-xs"
                          >
                            <span className={cn("w-2 h-2 rounded-full mr-2", ROLE_CONFIG[role].color.split(" ")[0])} />
                            {ROLE_CONFIG[role].label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {/* Remove button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeAsset(i); }}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-foreground/70 text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Unified library picker — replaces the old separate dialog */}
      <AssetLibraryPicker
        selectedAssets={libraryAssets}
        onChange={handleLibraryChange}
        defaultTab="your_assets"
        triggerLabel={assets.length > 0 ? `Add more assets (${assets.length} selected)` : "Add your product, model, or logo"}
        triggerSubLabel="Upload or select from library"
      />
    </div>
  );
};

export default SwapAssetStrip;
