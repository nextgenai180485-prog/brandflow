import { useState, useCallback } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CreateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const CreateCampaignDialog = ({
  open,
  onOpenChange,
  onCreated,
}: CreateCampaignDialogProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);

  const reset = () => {
    setTitle("");
    setInstructions("");
    setFile(null);
    setFileUrl(null);
    setUploading(false);
    setCreating(false);
  };

  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      if (!user) return;
      setFile(selectedFile);
      setUploading(true);

      const ext = selectedFile.name.split(".").pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from("campaign_assets")
        .upload(path, selectedFile, { upsert: false });

      if (error) {
        toast.error("Upload failed. Please try again.");
        setFile(null);
        setUploading(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("campaign_assets").getPublicUrl(path);

      setFileUrl(publicUrl);
      setUploading(false);
    },
    [user],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFileSelect(droppedFile);
    },
    [handleFileSelect],
  );

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

    // If a file was uploaded, create a generated_assets record
    if (fileUrl) {
      const isVideo =
        file?.type.startsWith("video/") ?? false;
      await supabase.from("generated_assets").insert({
        campaign_id: campaign.id,
        profile_id: user.id,
        asset_type: isVideo ? "video" : "image",
        content_url: fileUrl,
        status: "pending_review",
      });
    }

    toast.success("Campaign created");
    reset();
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            New Campaign
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Campaign Name */}
          <div className="space-y-2">
            <Label htmlFor="campaign-title">Campaign Name</Label>
            <Input
              id="campaign-title"
              placeholder='e.g. "Mother\'s Day Botox Promo"'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="campaign-instructions">
              What is this campaign about?{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="campaign-instructions"
              placeholder="Describe your campaign goals, target audience, or any specific instructions…"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>
              Upload Image or Video{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>

            {!file ? (
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-8 cursor-pointer transition-colors hover:border-foreground/30 hover:bg-secondary/50"
              >
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Drag &amp; drop or click to browse
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,video/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                />
              </label>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-foreground" />
                )}
                <span className="text-sm truncate flex-1">
                  {file.name}
                </span>
                {!uploading && (
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setFileUrl(null);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={!title.trim() || uploading || creating}
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating…
              </>
            ) : (
              "Create"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCampaignDialog;
