import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, X, Loader2, Plus, ImageIcon, VideoIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AssetPlatformSelector from "@/components/AssetPlatformSelector";
import type { SocialPlatform } from "@/types/campaigns";

interface SelectedFormat {
  platform: SocialPlatform;
  format: string;
}

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  uploading: boolean;
  url: string | null;
  type: "image" | "video";
}

const NewCampaign = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [platforms, setPlatforms] = useState<SelectedFormat[]>([]);
  const [creating, setCreating] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const uploadFile = useCallback(
    async (file: File): Promise<UploadedFile> => {
      const id = crypto.randomUUID();
      const isVideo = file.type.startsWith("video/");
      const preview = isVideo ? "" : URL.createObjectURL(file);
      const entry: UploadedFile = {
        id, file, preview, uploading: true, url: null,
        type: isVideo ? "video" : "image",
      };

      if (!user) return { ...entry, uploading: false };

      const ext = file.name.split(".").pop();
      const path = `${user.id}/${id}.${ext}`;

      const { error } = await supabase.storage
        .from("campaign_assets")
        .upload(path, file, { upsert: false });

      if (error) {
        toast.error(`Failed to upload ${file.name}`);
        return { ...entry, uploading: false };
      }

      const { data: { publicUrl } } = supabase.storage.from("campaign_assets").getPublicUrl(path);
      return { ...entry, uploading: false, url: publicUrl };
    },
    [user]
  );

  const handleFiles = useCallback(
    async (incoming: FileList | File[]) => {
      const newFiles = Array.from(incoming).filter(
        (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
      );
      if (newFiles.length === 0) return;

      const placeholders: UploadedFile[] = newFiles.map((f) => ({
        id: crypto.randomUUID(),
        file: f,
        preview: f.type.startsWith("video/") ? "" : URL.createObjectURL(f),
        uploading: true,
        url: null,
        type: f.type.startsWith("video/") ? "video" as const : "image" as const,
      }));

      setFiles((prev) => [...prev, ...placeholders]);
      const results = await Promise.all(newFiles.map(uploadFile));
      setFiles((prev) => {
        const existing = prev.filter((p) => !placeholders.find((ph) => ph.id === p.id));
        return [...existing, ...results];
      });
    },
    [uploadFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const removed = prev.find((f) => f.id === id);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleCreate = async () => {
    if (!user || !title.trim()) return;
    setCreating(true);

    const { data: campaign, error } = await supabase
      .from("campaigns")
      .insert({
        profile_id: user.id,
        title: title.trim(),
        instructions: instructions.trim() || null,
        status: "draft",
      })
      .select()
      .single();

    if (error || !campaign) {
      toast.error("Failed to create campaign.");
      setCreating(false);
      return;
    }

    // Create one generated_asset per file × platform combination
    const uploadedFiles = files.filter((f) => f.url);
    const assetRows: Array<{
      campaign_id: string;
      profile_id: string;
      asset_type: string;
      content_url: string;
      status: string;
      platform: string | null;
      format: string | null;
    }> = [];

    for (const f of uploadedFiles) {
      if (platforms.length > 0) {
        for (const p of platforms) {
          assetRows.push({
            campaign_id: campaign.id,
            profile_id: user.id,
            asset_type: f.type,
            content_url: f.url!,
            status: "pending_review",
            platform: p.platform,
            format: p.format,
          });
        }
      } else {
        assetRows.push({
          campaign_id: campaign.id,
          profile_id: user.id,
          asset_type: f.type,
          content_url: f.url!,
          status: "pending_review",
          platform: null,
          format: null,
        });
      }
    }

    if (assetRows.length > 0) {
      await supabase.from("generated_assets").insert(assetRows);
    }

    toast.success("Campaign created");
    navigate(`/dashboard/campaigns/${campaign.id}`);
  };

  const anyUploading = files.some((f) => f.uploading);
  const canCreate = title.trim().length > 0 && !anyUploading && !creating;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:py-10">
        {/* Back nav */}
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Campaigns
        </button>

        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-8">
          Create New Campaign
        </h1>

        <div className="space-y-8">
          {/* Campaign Name */}
          <div className="space-y-2">
            <Label htmlFor="campaign-title" className="text-sm font-medium">
              Campaign Name
            </Label>
            <Input
              id="campaign-title"
              placeholder={"e.g. \"Mother's Day Botox Promo\" or \"Summer Filler Special\""}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="h-12 text-base"
            />
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="campaign-instructions" className="text-sm font-medium">
              What is this campaign about?{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="campaign-instructions"
              placeholder="e.g. Promote our new lip filler package to women 25–45 in the metro area…"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              className="resize-none text-base"
            />
          </div>

          {/* Inline Asset Canvas */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Upload Images & Videos{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>

            {/* Filmstrip grid */}
            {files.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {files.map((f) => (
                  <div
                    key={f.id}
                    className="relative group aspect-square rounded-lg border border-border overflow-hidden bg-muted"
                  >
                    {f.uploading ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : f.type === "image" && f.preview ? (
                      <img src={f.preview} alt={f.file.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
                        <VideoIcon className="w-6 h-6 text-muted-foreground" />
                        <span className="text-[9px] text-muted-foreground text-center truncate w-full">
                          {f.file.name}
                        </span>
                      </div>
                    )}

                    {!f.uploading && (
                      <button
                        onClick={() => removeFile(f.id)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-foreground/80 text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}

                    <div className="absolute bottom-1 left-1">
                      {f.type === "image" ? (
                        <ImageIcon className="w-3 h-3 text-background drop-shadow-md" />
                      ) : (
                        <VideoIcon className="w-3 h-3 text-background drop-shadow-md" />
                      )}
                    </div>
                  </div>
                ))}

                {/* Add More tile */}
                <label className="aspect-square rounded-lg border-2 border-dashed border-border bg-card flex flex-col items-center justify-center cursor-pointer hover:border-foreground/30 hover:bg-secondary/50 transition-colors">
                  <Plus className="w-4 h-4 text-muted-foreground mb-0.5" />
                  <span className="text-[10px] text-muted-foreground font-medium">Add</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,video/*"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) handleFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            )}

            {/* Hero Dropzone */}
            {files.length === 0 && (
              <label
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-12 sm:py-16 cursor-pointer transition-all ${
                  dragOver
                    ? "border-foreground/50 bg-secondary/80 scale-[1.01]"
                    : "border-border hover:border-foreground/30 hover:bg-secondary/50"
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Drag & drop images or videos</p>
                  <p className="text-xs text-muted-foreground mt-1">or click to browse • Supports bulk upload</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,video/*"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) handleFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>

          {/* Campaign-wide Platform Selection */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Target Platforms & Formats</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                All assets in this campaign will be generated for the selected platforms
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <AssetPlatformSelector
                selected={platforms}
                onChange={setPlatforms}
                assetType="image"
              />
              {platforms.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border/50">
                  {files.filter((f) => f.url).length > 0
                    ? `${files.filter((f) => f.url).length} asset${files.filter((f) => f.url).length !== 1 ? "s" : ""} × ${platforms.length} format${platforms.length !== 1 ? "s" : ""} = ${files.filter((f) => f.url).length * platforms.length} generations`
                    : `${platforms.length} format${platforms.length !== 1 ? "s" : ""} selected`}
                </p>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-border/50">
            <Button
              size="lg"
              className="w-full sm:w-auto"
              onClick={handleCreate}
              disabled={!canCreate}
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create Campaign"
              )}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default NewCampaign;
