import { useState, useRef } from "react";
import { Wand2, Loader2, X, Undo2, Check, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface AssetEditorProps {
  imageUrl: string;
  assetId: string;
  onEdited: (newUrl: string) => void;
  onClose: () => void;
}

const QUICK_EDITS = [
  "Make the background warmer and more inviting",
  "Increase the contrast and make colors more vibrant",
  "Make it look more professional and polished",
  "Add a subtle golden hour lighting effect",
  "Remove any distracting background elements",
  "Make the overall mood darker and more dramatic",
];

export default function AssetEditor({ imageUrl, assetId, onEdited, onClose }: AssetEditorProps) {
  const [prompt, setPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [guidanceScale, setGuidanceScale] = useState(0.5);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleEdit = async (editPrompt?: string) => {
    const finalPrompt = editPrompt || prompt;
    if (!finalPrompt.trim()) {
      toast.error("Describe the edit you want");
      return;
    }

    setIsEditing(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seededit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            action: "edit",
            imageUrl,
            prompt: finalPrompt,
            assetId,
            guidanceScale,
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Edit failed" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      const data = await resp.json();

      if (data.editedUrl) {
        setPreviewUrl(data.editedUrl);
        toast.success(`Edit complete${data.inference ? ` (${(data.inference / 1000).toFixed(1)}s)` : ""}`);
      } else {
        throw new Error("No edited image returned");
      }
    } catch (e: any) {
      console.error("Edit error:", e);
      toast.error(e.message || "Edit failed");
    } finally {
      setIsEditing(false);
    }
  };

  const handleAccept = () => {
    if (previewUrl) {
      onEdited(previewUrl);
      toast.success("Edit applied");
    }
  };

  const handleRevert = () => {
    setPreviewUrl(null);
    setPrompt("");
  };

  const displayUrl = previewUrl || imageUrl;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      <div className="flex flex-col lg:flex-row gap-6 max-w-5xl w-full mx-4 max-h-[90vh]">
        {/* Image preview */}
        <div className="flex-1 flex items-center justify-center relative">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl max-h-[70vh]">
            <img
              src={displayUrl}
              alt="Editing"
              className={cn(
                "max-h-[70vh] w-auto object-contain transition-opacity",
                isEditing && "opacity-50"
              )}
            />
            {isEditing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
                <span className="text-sm text-white font-medium">Applying edit…</span>
                <span className="text-xs text-white/50">SeedEdit 3.0 · ~5-15s</span>
              </div>
            )}
            {previewUrl && !isEditing && (
              <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-emerald-500/90 text-white text-[10px] font-bold uppercase tracking-wider">
                Edited
              </div>
            )}
          </div>
        </div>

        {/* Edit panel */}
        <div className="w-full lg:w-[340px] flex flex-col gap-4 bg-card/90 backdrop-blur-md rounded-2xl border border-border p-5 max-h-[70vh] overflow-y-auto">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" />
              SeedEdit 3.0
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Describe what you want to change. The AI preserves composition and identity.
            </p>
          </div>

          {/* Custom prompt */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isEditing && handleEdit()}
                placeholder="e.g. Make the background warmer…"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                disabled={isEditing}
              />
              <Button
                size="sm"
                className="h-9 px-3"
                onClick={() => handleEdit()}
                disabled={isEditing || !prompt.trim()}
              >
                {isEditing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Quick edits */}
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
              Quick Edits
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {QUICK_EDITS.map((edit) => (
                <button
                  key={edit}
                  onClick={() => {
                    setPrompt(edit);
                    handleEdit(edit);
                  }}
                  disabled={isEditing}
                  className="text-left text-xs text-foreground bg-secondary/50 hover:bg-secondary rounded-lg px-3 py-2 transition-colors border border-border/50 hover:border-border disabled:opacity-50"
                >
                  {edit}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Sliders className="w-3 h-3" />
            {showAdvanced ? "Hide" : "Show"} Advanced
          </button>

          {showAdvanced && (
            <div className="space-y-2 p-3 rounded-lg bg-secondary/30 border border-border/50">
              <div className="flex items-center justify-between">
                <label className="text-[11px] text-muted-foreground">Edit Strength</label>
                <span className="text-[11px] font-mono text-foreground">{guidanceScale.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={guidanceScale}
                onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="text-[9px] text-muted-foreground">
                Lower = subtle changes, Higher = stronger edits
              </p>
            </div>
          )}

          {/* Accept/Revert */}
          {previewUrl && !isEditing && (
            <div className="flex gap-2 pt-2 border-t border-border">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1.5"
                onClick={handleRevert}
              >
                <Undo2 className="w-3 h-3" /> Revert
              </Button>
              <Button
                size="sm"
                className="flex-1 gap-1.5"
                onClick={handleAccept}
              >
                <Check className="w-3 h-3" /> Accept Edit
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
