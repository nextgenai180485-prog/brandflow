import { useState, useEffect, useCallback } from "react";
import { Check, Upload, Loader2, VideoIcon, FolderOpen, Film, Users, Image, Megaphone, Zap, Eye, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  /** Optional: source library tab this came from */
  source_tab?: string;
}

interface AssetLibraryPickerProps {
  selectedAssets: LibraryAsset[];
  onChange: (assets: LibraryAsset[]) => void;
}

// ── Library tab definitions ──
const LIBRARY_TABS = [
  { value: "your_assets" as const, label: "Your Uploads", icon: Upload, table: "brand_assets" as const, nameField: "file_name" },
  { value: "video_templates" as const, label: "Video Templates", icon: Film, table: "video_templates" as const, nameField: "template_name" },
  { value: "character_library" as const, label: "Characters", icon: Users, table: "character_library" as const, nameField: "name" },
  { value: "ad_reference_library" as const, label: "Ad References", icon: Megaphone, table: "ad_reference_library" as const, nameField: "title" },
  { value: "image_templates" as const, label: "Image Templates", icon: Image, table: "image_templates" as const, nameField: "style_name" },
  { value: "hooks" as const, label: "Hooks", icon: Zap, table: "hooks" as const, nameField: "hook_text" },
];

type LibTabValue = (typeof LIBRARY_TABS)[number]["value"];

const AssetLibraryPicker = ({ selectedAssets, onChange }: AssetLibraryPickerProps) => {
  const [open, setOpen] = useState(false);

  const isSelected = (id: string) => selectedAssets.some((a) => a.id === id);

  const toggleAsset = (asset: LibraryAsset) => {
    if (isSelected(asset.id)) {
      onChange(selectedAssets.filter((a) => a.id !== asset.id));
    } else {
      onChange([...selectedAssets, asset]);
    }
  };

  return (
    <div className="space-y-3">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="w-full flex items-center gap-3 rounded-xl border-2 border-dashed border-border py-3 px-4 cursor-pointer hover:border-foreground/30 hover:bg-secondary/50 transition-all">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
              <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="text-left">
              <p className="text-xs font-medium text-foreground">
                {selectedAssets.length > 0 ? `Browse Templates (${selectedAssets.length} selected)` : "Templates"}
              </p>
              <p className="text-[10px] text-muted-foreground">Browse style references, characters, and templates</p>
            </div>
          </button>
        </DialogTrigger>
        <FullLibraryDialog
          open={open}
          selectedAssets={selectedAssets}
          isSelected={isSelected}
          toggleAsset={toggleAsset}
          onChange={onChange}
        />
      </Dialog>
    </div>
  );
};

// ── Full Library Dialog ──
interface FullLibraryDialogProps {
  open: boolean;
  selectedAssets: LibraryAsset[];
  isSelected: (id: string) => boolean;
  toggleAsset: (asset: LibraryAsset) => void;
  onChange: (assets: LibraryAsset[]) => void;
}

const FullLibraryDialog = ({ open, selectedAssets, isSelected, toggleAsset, onChange }: FullLibraryDialogProps) => {
  const [activeTab, setActiveTab] = useState<LibTabValue>("your_assets");
  const [search, setSearch] = useState("");

  return (
    <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
      <DialogHeader className="shrink-0 px-5 pt-5 pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <DialogTitle className="text-base font-semibold">Content Library</DialogTitle>
          <span className="text-xs text-muted-foreground">{selectedAssets.length} selected</span>
        </div>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, tag, or mood..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-xs"
          />
        </div>
      </DialogHeader>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LibTabValue)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="shrink-0 mx-5 mt-3 mb-0 w-auto grid grid-cols-6 h-auto p-1">
            {LIBRARY_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="gap-1 text-[9px] px-1.5 py-1.5 flex flex-col items-center"
              >
                <tab.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline truncate">{tab.label.split(" ")[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 overflow-y-auto px-5 py-3">
            {LIBRARY_TABS.map((tab) => (
              <TabsContent key={tab.value} value={tab.value} className="mt-0">
                <LibraryTabGrid
                  tab={tab}
                  search={search}
                  isSelected={isSelected}
                  toggleAsset={toggleAsset}
                  onChange={onChange}
                  selectedAssets={selectedAssets}
                />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </DialogContent>
  );
};

// ── Single tab grid ──
interface LibraryTabGridProps {
  tab: (typeof LIBRARY_TABS)[number];
  search: string;
  isSelected: (id: string) => boolean;
  toggleAsset: (asset: LibraryAsset) => void;
  onChange: (assets: LibraryAsset[]) => void;
  selectedAssets: LibraryAsset[];
}

const LibraryTabGrid = ({ tab, search, isSelected, toggleAsset, onChange, selectedAssets }: LibraryTabGridProps) => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    let query = supabase.from(tab.table as any).select("*");

    if (tab.value === "your_assets" && user) {
      query = query.eq("profile_id", user.id);
    } else if (!tab.value === "your_assets") {
      query = query.eq("is_active", true);
    }

    if (tab.value === "your_assets") {
      query = query.order("created_at", { ascending: false });
    } else {
      query = query.order("usage_count", { ascending: false });
    }

    const { data } = await query;
    setItems(data || []);
    setLoading(false);
  }, [tab.table, tab.value === "your_assets", user]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const filtered = items.filter((item: any) => {
    if (!search) return true;
    const name = (item[tab.nameField] || "").toLowerCase();
    const tags = [...(item.tags || []), ...(item.mood_tags || []), ...(item.industry_tags || [])].join(" ").toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || tags.includes(q);
  });

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

      if (uploadError) { toast.error(`Failed to upload ${file.name}`); continue; }

      const { data: { publicUrl } } = supabase.storage.from("campaign_assets").getPublicUrl(path);

      const { data: row, error: insertError } = await supabase
        .from("brand_assets")
        .insert({ profile_id: user.id, file_name: file.name, file_url: publicUrl, asset_type: isVideo ? "video" : "image" })
        .select()
        .single();

      if (!insertError && row) {
        newAssets.push({ ...(row as any), source_tab: "your_assets" });
      }
    }

    if (newAssets.length > 0) {
      toast.success(`${newAssets.length} asset${newAssets.length > 1 ? "s" : ""} uploaded`);
      onChange([...selectedAssets, ...newAssets]);
      await loadItems();
    }
    setUploading(false);
  };

  // Convert any library item to a LibraryAsset for selection
  const toLibraryAsset = (item: any): LibraryAsset => {
    const url = item.file_url || item.avatar_url || item.thumbnail_url || item.media_url || item.example_url || "";
    const name = item[tab.nameField] || item.file_name || "Untitled";
    return {
      id: item.id,
      file_name: name,
      file_url: url,
      asset_type: item.asset_type || item.media_type || "reference",
      created_at: item.created_at,
      source_tab: tab.value,
    };
  };

  const isImageUrl = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url);

  if (loading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Upload button for user assets tab */}
      {tab.value === "your_assets" && (
        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card cursor-pointer hover:bg-secondary/50 transition-colors">
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-xs font-medium text-foreground">
            {uploading ? "Uploading…" : "Upload New"}
          </span>
          <input type="file" className="hidden" accept="image/*,video/*" multiple disabled={uploading} onChange={(e) => handleUploadNew(e.target.files)} />
        </label>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <tab.icon className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">
            {tab.value === "your_assets" ? "No uploads yet. Add your first asset above." : "No items found"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
          {filtered.map((item: any) => {
            const asset = toLibraryAsset(item);
            const selected = isSelected(item.id);
            const thumb = item.file_url || item.avatar_url || item.thumbnail_url || item.media_url || item.example_url;
            const name = item[tab.nameField] || "Untitled";
            const tags = [...(item.tags || []), ...(item.mood_tags || [])].slice(0, 2);

            return (
              <button
                key={item.id}
                onClick={() => toggleAsset(asset)}
                className={cn(
                  "relative rounded-lg border-2 overflow-hidden transition-all text-left group",
                  selected
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-foreground/20"
                )}
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                  {thumb && isImageUrl(thumb) ? (
                    <img src={thumb} alt={name} className="w-full h-full object-cover" />
                  ) : thumb ? (
                    <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-1">
                      <VideoIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                  ) : (
                    <tab.icon className="w-6 h-6 text-muted-foreground/30" />
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors" />
                </div>

                {/* Info strip */}
                <div className="p-1.5">
                  <p className="text-[9px] font-medium text-foreground truncate">{name}</p>
                  {tags.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {tags.map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-[7px] px-1 py-0">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selection indicator */}
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
  );
};

export default AssetLibraryPicker;
