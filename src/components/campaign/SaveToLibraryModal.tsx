import { useState } from "react";
import { FolderPlus, X, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SaveToLibraryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  title: string;
  tags?: string[];
}

const LIBRARY_CATEGORIES = [
  { key: "ad_reference", label: "Ad References" },
  { key: "brand_assets", label: "Brand Assets" },
  { key: "templates", label: "Templates" },
  { key: "inspiration", label: "Inspiration" },
];

export default function SaveToLibraryModal({ open, onOpenChange, imageUrl, title: defaultTitle, tags = [] }: SaveToLibraryModalProps) {
  const [name, setName] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("ad_reference");
  const [customTags, setCustomTags] = useState<string[]>(tags);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!open) return null;

  const handleAddTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !customTags.includes(t)) {
      setCustomTags([...customTags, t]);
      setTagInput("");
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Enter a name"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("ad_reference_library").insert({
        title: name.trim(),
        description: description.trim() || null,
        media_url: imageUrl,
        thumbnail_url: imageUrl,
        media_type: "image",
        industry_tags: customTags.filter(t => !["trending", "top", "editorial", "minimal"].includes(t)),
        mood_tags: customTags.filter(t => ["editorial", "minimal", "luxurious", "energetic", "warm", "cozy"].includes(t)),
        platform_tags: ["instagram"],
        is_active: true,
      });
      if (error) throw error;
      setSaved(true);
      toast.success("Saved to library");
      setTimeout(() => onOpenChange(false), 1200);
    } catch (err) {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => onOpenChange(false)}>
      <div className="bg-background rounded-2xl border border-border shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <FolderPlus className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Save to Library</h3>
          </div>
          <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Preview */}
        <div className="px-5 py-4">
          <div className="w-full h-36 rounded-xl overflow-hidden border border-border mb-4 bg-muted">
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Asset name" className="h-9 text-sm" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notes about this asset..." rows={2} className="resize-none text-sm" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Category</Label>
              <div className="flex flex-wrap gap-1.5">
                {LIBRARY_CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setCategory(cat.key)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all",
                      category === cat.key
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tags</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                  placeholder="Add tag..."
                  className="h-8 text-xs flex-1"
                />
                <Button variant="outline" size="sm" onClick={handleAddTag} className="h-8 text-[10px]">Add</Button>
              </div>
              {customTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {customTags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-[9px] gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => setCustomTags(customTags.filter(x => x !== t))}>
                      {t} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border bg-secondary/20">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs">Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || saved} className="gap-1.5 text-xs">
            {saved ? <><Check className="w-3.5 h-3.5" /> Saved</> : saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : <><FolderPlus className="w-3.5 h-3.5" /> Save</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
