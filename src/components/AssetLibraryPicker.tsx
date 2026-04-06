import { useState, useEffect, useCallback } from "react";
import { Check, Plus, Upload, X, Loader2, ImageIcon, VideoIcon, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface LibraryAsset {
  id: string;
  file_name: string;
  file_url: string;
  asset_type: string;
  created_at: string;
}

interface AssetLibraryPickerProps {
  selectedAssets: LibraryAsset[];
  onChange: (assets: LibraryAsset[]) => void;
}

const AssetLibraryPicker = ({ selectedAssets, onChange }: AssetLibraryPickerProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadAssets = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("brand_assets")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false });
    setAssets((data as LibraryAsset[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (open) loadAssets();
  }, [open, loadAssets]);

  const isSelected = (id: string) => selectedAssets.some((a) => a.id === id);

  const toggleAsset = (asset: LibraryAsset) => {
    if (isSelected(asset.id)) {
      onChange(selectedAssets.filter((a) => a.id !== asset.id));
    } else {
      onChange([...selectedAssets, asset]);
    }
  };

  const handleUploadNew = async (files: FileList | null) => {
    if (!files || !user) return;
    setUploading(true);
    const newAssets: LibraryAsset[] = [];

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

      // Save to brand_assets (global library)
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
        newAssets.push(row as LibraryAsset);
      }
    }

    if (newAssets.length > 0) {
      toast.success(`${newAssets.length} asset${newAssets.length > 1 ? "s" : ""} added to library`);
      onChange([...selectedAssets, ...newAssets]);
      await loadAssets();
    }
    setUploading(false);
  };

  const removeSelected = (id: string) => {
    onChange(selectedAssets.filter((a) => a.id !== id));
  };

  const isImageUrl = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          Reference Assets <span className="text-muted-foreground font-normal">(optional)</span>
        </p>
      </div>

      {/* Selected assets preview */}
      {selectedAssets.length > 0 && (
        <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
          {selectedAssets.map((asset) => (
            <div key={asset.id} className="relative group aspect-square rounded-lg border border-border overflow-hidden bg-muted">
              {isImageUrl(asset.file_url) ? (
                <img src={asset.file_url} alt={asset.file_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
                  <VideoIcon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-[8px] text-muted-foreground text-center truncate w-full">{asset.file_name}</span>
                </div>
              )}
              <button
                onClick={() => removeSelected(asset.id)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-foreground/80 text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {/* Add more button inline */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button className="aspect-square rounded-lg border-2 border-dashed border-border bg-card flex flex-col items-center justify-center cursor-pointer hover:border-foreground/30 transition-colors">
                <Plus className="w-4 h-4 text-muted-foreground mb-0.5" />
                <span className="text-[10px] text-muted-foreground font-medium">Add</span>
              </button>
            </DialogTrigger>
            <PickerDialog
              assets={assets}
              loading={loading}
              uploading={uploading}
              selectedAssets={selectedAssets}
              isSelected={isSelected}
              toggleAsset={toggleAsset}
              onUpload={handleUploadNew}
              isImageUrl={isImageUrl}
            />
          </Dialog>
        </div>
      )}

      {/* Empty state */}
      {selectedAssets.length === 0 && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button className="w-full flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border py-8 cursor-pointer hover:border-foreground/30 hover:bg-secondary/50 transition-all">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Select from Asset Library</p>
                <p className="text-xs text-muted-foreground mt-1">Choose existing assets or upload new ones</p>
              </div>
            </button>
          </DialogTrigger>
          <PickerDialog
            assets={assets}
            loading={loading}
            uploading={uploading}
            selectedAssets={selectedAssets}
            isSelected={isSelected}
            toggleAsset={toggleAsset}
            onUpload={handleUploadNew}
            isImageUrl={isImageUrl}
          />
        </Dialog>
      )}
    </div>
  );
};

// ── Picker Dialog Content ──
interface PickerDialogProps {
  assets: LibraryAsset[];
  loading: boolean;
  uploading: boolean;
  selectedAssets: LibraryAsset[];
  isSelected: (id: string) => boolean;
  toggleAsset: (asset: LibraryAsset) => void;
  onUpload: (files: FileList | null) => void;
  isImageUrl: (url: string) => boolean;
}

const PickerDialog = ({
  assets, loading, uploading, selectedAssets, isSelected, toggleAsset, onUpload, isImageUrl
}: PickerDialogProps) => (
  <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
    <DialogHeader>
      <DialogTitle className="text-lg font-semibold">Asset Library</DialogTitle>
    </DialogHeader>

    {/* Upload new */}
    <div className="flex items-center gap-3 pb-3 border-b border-border">
      <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card cursor-pointer hover:bg-secondary/50 transition-colors">
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-sm font-medium text-foreground">
          {uploading ? "Uploading…" : "Upload to Library"}
        </span>
        <input
          type="file"
          className="hidden"
          accept="image/*,video/*"
          multiple
          disabled={uploading}
          onChange={(e) => onUpload(e.target.files)}
        />
      </label>
      <span className="text-xs text-muted-foreground">
        {selectedAssets.length} selected
      </span>
    </div>

    {/* Asset grid */}
    <div className="flex-1 overflow-y-auto py-3">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <FolderOpen className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No assets yet. Upload your first one above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {assets.map((asset) => {
            const selected = isSelected(asset.id);
            return (
              <button
                key={asset.id}
                onClick={() => toggleAsset(asset)}
                className={cn(
                  "relative aspect-square rounded-lg border-2 overflow-hidden transition-all",
                  selected
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-foreground/20"
                )}
              >
                {isImageUrl(asset.file_url) ? (
                  <img src={asset.file_url} alt={asset.file_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-1 p-2">
                    <VideoIcon className="w-6 h-6 text-muted-foreground" />
                    <span className="text-[8px] text-muted-foreground text-center truncate w-full">{asset.file_name}</span>
                  </div>
                )}
                {selected && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  </DialogContent>
);

export default AssetLibraryPicker;
