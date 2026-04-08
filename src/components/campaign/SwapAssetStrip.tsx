import { useState, useCallback } from "react";
import { Plus, X, Upload, Loader2, FolderOpen, ChevronDown, ImageIcon, VideoIcon, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [libraryAssets, setLibraryAssets] = useState<any[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadLibrary = useCallback(async () => {
    if (!user) return;
    setLoadingLibrary(true);
    const { data } = await supabase
      .from("brand_assets")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false });
    setLibraryAssets(data || []);
    setLoadingLibrary(false);
  }, [user]);

  const handleOpenDialog = () => {
    setDialogOpen(true);
    loadLibrary();
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || !user) return;
    setUploading(true);
    const newAssets: SwapAsset[] = [];

    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (!isVideo && !isImage) continue;

      const ext = file.name.split(".").pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("campaign_assets")
        .upload(path, file, { upsert: false });

      if (uploadError) {
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage.from("campaign_assets").getPublicUrl(path);

      const { data: row, error: insertError } = await supabase
        .from("brand_assets")
        .insert({
          profile_id: user.id,
          file_name: file.name,
          file_url: publicUrl,
          asset_type: isVideo ? "video" : "image",
        })
        .select()
        .single();

      if (!insertError && row) {
        newAssets.push({
          id: (row as any).id,
          file_name: file.name,
          file_url: publicUrl,
          asset_type: isVideo ? "video" : "image",
          role: detectRole(file.name),
        });
      }
    }

    if (newAssets.length > 0) {
      toast.success(`${newAssets.length} asset${newAssets.length > 1 ? "s" : ""} added`);
      onChange([...assets, ...newAssets]);
      await loadLibrary();
    }
    setUploading(false);
  };

  const addFromLibrary = (asset: any) => {
    if (assets.some(a => a.id === asset.id)) {
      onChange(assets.filter(a => a.id !== asset.id));
      return;
    }
    onChange([...assets, {
      id: asset.id,
      file_name: asset.file_name,
      file_url: asset.file_url,
      asset_type: asset.asset_type,
      role: detectRole(asset.file_name),
    }]);
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-3.5 h-3.5 text-primary" />
          <span className="text-sm font-medium text-foreground">Your Assets</span>
          <span className="text-[10px] text-muted-foreground">(product, model, logo…)</span>
        </div>
        {assets.length > 0 && (
          <button
            onClick={() => { onChange([]); onActiveChange(0); }}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Asset strip */}
      {assets.length > 0 && (
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
          {/* Inline add button */}
          <button
            onClick={handleOpenDialog}
            className="shrink-0 w-[72px] aspect-square rounded-lg border-2 border-dashed border-border bg-card flex flex-col items-center justify-center cursor-pointer hover:border-foreground/30 transition-colors"
          >
            <Plus className="w-4 h-4 text-muted-foreground mb-0.5" />
            <span className="text-[9px] text-muted-foreground font-medium">Add</span>
          </button>
        </div>
      )}

      {/* Empty state */}
      {assets.length === 0 && (
        <div
          className="flex items-center gap-3 rounded-xl border-2 border-dashed border-border py-3 px-4 cursor-pointer hover:border-foreground/30 hover:bg-secondary/50 transition-all"
          onClick={handleOpenDialog}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleUpload(e.dataTransfer.files);
          }}
        >
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <Upload className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="text-left">
            <p className="text-xs font-medium text-foreground">Add your product, model, or logo</p>
            <p className="text-[10px] text-muted-foreground">Upload or select from library · drag & drop supported</p>
          </div>
        </div>
      )}

      {/* Picker Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Add Your Assets</DialogTitle>
          </DialogHeader>

          {/* Upload */}
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card cursor-pointer hover:bg-secondary/50 transition-colors">
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium text-foreground">
                {uploading ? "Uploading…" : "Upload New"}
              </span>
              <input
                type="file"
                className="hidden"
                accept="image/*,video/*"
                multiple
                disabled={uploading}
                onChange={(e) => handleUpload(e.target.files)}
              />
            </label>
            <span className="text-xs text-muted-foreground">
              {assets.length} asset{assets.length !== 1 ? "s" : ""} added
            </span>
          </div>

          {/* Library grid */}
          <div className="flex-1 overflow-y-auto py-3">
            {loadingLibrary ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : libraryAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <FolderOpen className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No assets yet. Upload your first one above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {libraryAssets.map((asset) => {
                  const selected = assets.some(a => a.id === asset.id);
                  return (
                    <button
                      key={asset.id}
                      onClick={() => addFromLibrary(asset)}
                      className={cn(
                        "relative aspect-square rounded-lg border-2 overflow-hidden transition-all",
                        selected
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border hover:border-foreground/20"
                      )}
                    >
                      {!isVideo(asset.file_url) ? (
                        <img src={asset.file_url} alt={asset.file_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-1 p-2">
                          <VideoIcon className="w-6 h-6 text-muted-foreground" />
                          <span className="text-[8px] text-muted-foreground text-center truncate w-full">{asset.file_name}</span>
                        </div>
                      )}
                      {selected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-primary-foreground text-[10px] font-bold">✓</span>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm px-1 py-0.5">
                        <p className="text-[8px] text-foreground truncate">{asset.file_name}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SwapAssetStrip;
