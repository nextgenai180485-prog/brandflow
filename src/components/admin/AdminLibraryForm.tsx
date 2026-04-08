import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { X, Save, Loader2, Sparkles } from "lucide-react";
import FileUploadZone from "./FileUploadZone";

type FieldType = "text" | "textarea" | "tags" | "select" | "number" | "json" | "file";
type TableName = "video_templates" | "character_library" | "ad_reference_library" | "image_templates" | "hooks";

interface AdminLibraryFormProps {
  tableName: TableName;
  editingItem: any | null;
  onClose: () => void;
  onSaved: () => void;
}

// Maps: which file field triggers which JSON field, and which analysis mode
const AUTO_ANALYSIS_MAP: Record<TableName, { fileField: string; jsonField: string; mode: string }[]> = {
  video_templates: [{ fileField: "example_url", jsonField: "sealcam_analysis", mode: "sealcam" }],
  character_library: [{ fileField: "avatar_url", jsonField: "persona_traits", mode: "persona" }],
  ad_reference_library: [
    { fileField: "media_url", jsonField: "sealcam_analysis", mode: "sealcam" },
    { fileField: "thumbnail_url", jsonField: "sealcam_analysis", mode: "sealcam" },
  ],
  image_templates: [{ fileField: "preview_url", jsonField: "style_guide", mode: "style_guide" }],
  hooks: [],
};

const FORM_FIELDS: Record<TableName, { key: string; label: string; type: FieldType; options?: string[]; folder?: string }[]> = {
  video_templates: [
    { key: "template_name", label: "Template Name", type: "text" },
    { key: "family", label: "Family", type: "select", options: ["F1_UGC", "F2_SPOKESPERSON", "F5_CINEMATIC", "F8_CREATIVE_CLONER"] },
    { key: "mood", label: "Mood", type: "text" },
    { key: "aspect_ratio", label: "Aspect Ratio", type: "select", options: ["9:16", "16:9", "1:1", "4:5"] },
    { key: "duration_s", label: "Duration (seconds)", type: "number" },
    { key: "hook_type", label: "Hook Type", type: "select", options: ["question", "shock", "story", "statistic", "challenge", "visual"] },
    { key: "tags", label: "Tags (comma-separated)", type: "tags" },
    { key: "example_url", label: "Example Media", type: "file", folder: "video-templates" },
    { key: "sealcam_analysis", label: "SEALCaM Analysis (JSON)", type: "json" },
  ],
  character_library: [
    { key: "name", label: "Character Name", type: "text" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "gender", label: "Gender", type: "select", options: ["male", "female", "neutral"] },
    { key: "age_range", label: "Age Range", type: "select", options: ["18-24", "25-35", "35-45", "45-55", "55+"] },
    { key: "voice_style", label: "Voice Style", type: "select", options: ["professional", "casual", "energetic", "calm", "authoritative", "friendly"] },
    { key: "avatar_url", label: "Avatar", type: "file", folder: "characters" },
    { key: "mood_tags", label: "Mood Tags (comma-separated)", type: "tags" },
    { key: "industry_tags", label: "Industry Tags (comma-separated)", type: "tags" },
    { key: "ethnicity_tags", label: "Ethnicity Tags (comma-separated)", type: "tags" },
    { key: "persona_traits", label: "Persona Traits (JSON)", type: "json" },
  ],
  ad_reference_library: [
    { key: "title", label: "Title", type: "text" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "media_url", label: "Media File", type: "file", folder: "ad-references" },
    { key: "media_type", label: "Media Type", type: "select", options: ["image", "video"] },
    { key: "thumbnail_url", label: "Thumbnail", type: "file", folder: "ad-references/thumbnails" },
    { key: "industry_tags", label: "Industry Tags (comma-separated)", type: "tags" },
    { key: "mood_tags", label: "Mood Tags (comma-separated)", type: "tags" },
    { key: "platform_tags", label: "Platform Tags (comma-separated)", type: "tags" },
    { key: "performance_notes", label: "Performance Notes", type: "textarea" },
    { key: "compatible_families", label: "Compatible Families (comma-separated)", type: "tags" },
    { key: "sealcam_analysis", label: "SEALCaM Analysis (JSON)", type: "json" },
  ],
  image_templates: [
    { key: "style_name", label: "Style Name", type: "text" },
    { key: "preview_url", label: "Preview Thumbnail", type: "file", folder: "image-templates" },
    { key: "vertical", label: "Vertical", type: "select", options: ["general", "beauty", "fitness", "saas", "ecommerce", "food", "realestate", "fashion", "wellness", "automotive"] },
    { key: "platform", label: "Platform", type: "select", options: ["instagram", "tiktok", "facebook", "linkedin", "x", "youtube"] },
    { key: "format", label: "Format", type: "select", options: ["post", "story", "reel", "carousel"] },
    { key: "quality_tier", label: "Quality Tier", type: "select", options: ["standard", "premium", "elite"] },
    { key: "prompt_modifiers", label: "Prompt Modifiers (comma-separated)", type: "tags" },
    { key: "negative_prompt", label: "Negative Prompt", type: "textarea" },
    { key: "tags", label: "Tags (comma-separated)", type: "tags" },
    { key: "style_guide", label: "Style Guide (JSON)", type: "json" },
  ],
  hooks: [
    { key: "hook_text", label: "Hook Text", type: "textarea" },
    { key: "hook_type", label: "Hook Type", type: "select", options: ["question", "shock", "story", "statistic", "challenge", "visual", "curiosity"] },
    { key: "family", label: "Family", type: "select", options: ["F1_UGC", "F2_SPOKESPERSON", "F5_CINEMATIC", "F8_CREATIVE_CLONER"] },
    { key: "platform", label: "Platform", type: "select", options: ["instagram", "tiktok", "facebook", "linkedin", "x", "youtube"] },
    { key: "effectiveness_score", label: "Effectiveness Score (0-1)", type: "number" },
  ],
};

const AdminLibraryForm = ({ tableName, editingItem, onClose, onSaved }: AdminLibraryFormProps) => {
  const fields = FORM_FIELDS[tableName];
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);

  const getInitialValues = () => {
    const values: Record<string, string> = {};
    fields.forEach((field) => {
      if (editingItem) {
        const val = editingItem[field.key];
        if (field.type === "tags") {
          values[field.key] = Array.isArray(val) ? val.join(", ") : "";
        } else if (field.type === "json") {
          values[field.key] = val ? JSON.stringify(val, null, 2) : "{}";
        } else {
          values[field.key] = val != null ? String(val) : "";
        }
      } else {
        values[field.key] = field.type === "json" ? "{}" : "";
      }
    });
    return values;
  };

  const [values, setValues] = useState<Record<string, string>>(getInitialValues);

  // Auto-analyze uploaded media via vision AI
  const triggerAutoAnalysis = useCallback(async (fileFieldKey: string, mediaUrl: string) => {
    const mappings = AUTO_ANALYSIS_MAP[tableName] || [];
    const mapping = mappings.find((m) => m.fileField === fileFieldKey);
    if (!mapping || !mediaUrl) return;

    // Accept images and videos — vision models can handle video thumbnails/frames
    const isMedia = /\.(jpg|jpeg|png|gif|webp|svg|mp4|mov|webm|avi)(\?|$)/i.test(mediaUrl);
    if (!isMedia) return;

    setAnalyzing(mapping.jsonField);
    toast.info("🔍 Auto-analyzing media…", { id: "auto-analyze" });

    try {
      const { data, error } = await supabase.functions.invoke("analyze-asset", {
        body: { image_url: mediaUrl, analysis_mode: mapping.mode },
      });

      if (error) throw error;
      if (data?.analysis) {
        const formatted = JSON.stringify(data.analysis, null, 2);
        setValues((prev) => ({ ...prev, [mapping.jsonField]: formatted }));
        toast.success("✨ Analysis complete — JSON auto-populated", { id: "auto-analyze" });
      }
    } catch (e: any) {
      console.error("Auto-analysis failed:", e);
      toast.error("Analysis failed — you can fill JSON manually", { id: "auto-analyze" });
    } finally {
      setAnalyzing(null);
    }
  }, [tableName]);

  // Manual analyze: find the source file field for a given JSON field and re-run analysis
  const triggerManualAnalysis = useCallback((jsonFieldKey: string) => {
    const mappings = AUTO_ANALYSIS_MAP[tableName] || [];
    const mapping = mappings.find((m) => m.jsonField === jsonFieldKey);
    if (!mapping) return;
    const sourceUrl = values[mapping.fileField];
    if (!sourceUrl) {
      toast.error("Upload a media file first before analyzing");
      return;
    }
    triggerAutoAnalysis(mapping.fileField, sourceUrl);
  }, [tableName, values, triggerAutoAnalysis]);

  // Check if a JSON field has an analysis mapping (to show the analyze button)
  const hasAnalysisMapping = (jsonFieldKey: string) => {
    const mappings = AUTO_ANALYSIS_MAP[tableName] || [];
    return mappings.some((m) => m.jsonField === jsonFieldKey);
  };

  const handleFileChange = useCallback((fieldKey: string, url: string) => {
    setValues((prev) => ({ ...prev, [fieldKey]: url }));
    if (url) {
      triggerAutoAnalysis(fieldKey, url);
    }
  }, [triggerAutoAnalysis]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      fields.forEach((field) => {
        const raw = values[field.key] || "";
        if (field.type === "tags") {
          payload[field.key] = raw.split(",").map((s) => s.trim()).filter(Boolean);
        } else if (field.type === "json") {
          try { payload[field.key] = JSON.parse(raw); } catch { payload[field.key] = {}; }
        } else if (field.type === "number") {
          payload[field.key] = Number(raw) || 0;
        } else {
          payload[field.key] = raw || null;
        }
      });

      const { error } = await supabase.functions.invoke("admin-library", {
        body: {
          action: editingItem ? "update" : "create",
          table: tableName,
          id: editingItem?.id,
          data: payload,
        },
      });

      if (error) throw error;
      toast.success(editingItem ? "Updated" : "Created");
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Check if a JSON field is being auto-analyzed
  const isFieldAnalyzing = (fieldKey: string) => analyzing === fieldKey;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">{editingItem ? "Edit Item" : "Add New Item"}</CardTitle>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}><X className="h-3.5 w-3.5" /></Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map((field) => (
            <div key={field.key} className={field.type === "textarea" || field.type === "json" || field.type === "file" ? "col-span-full" : ""}>
              <Label className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                {field.label}
                {isFieldAnalyzing(field.key) && (
                  <span className="inline-flex items-center gap-1 text-primary">
                    <Sparkles className="h-3 w-3 animate-pulse" />
                    <span className="text-[9px]">Auto-extracting…</span>
                  </span>
                )}
              </Label>
              {field.type === "file" ? (
                <FileUploadZone
                  value={values[field.key] || ""}
                  onChange={(url) => handleFileChange(field.key, url)}
                  folder={field.folder || "uploads"}
                />
              ) : field.type === "select" ? (
                <Select value={values[field.key] || ""} onValueChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {field.options?.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === "textarea" || field.type === "json" ? (
                <div className="relative">
                  <Textarea
                    value={values[field.key] || ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className={`text-xs min-h-[60px] resize-none font-mono transition-colors ${
                      isFieldAnalyzing(field.key) ? "border-primary/50 bg-primary/5" : ""
                    }`}
                    rows={field.type === "json" ? 4 : 2}
                  />
                  {field.type === "json" && hasAnalysisMapping(field.key) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="absolute top-1.5 right-1.5 h-7 text-[10px] gap-1 bg-background/80 backdrop-blur-sm"
                      disabled={!!analyzing}
                      onClick={() => triggerManualAnalysis(field.key)}
                    >
                      {isFieldAnalyzing(field.key) ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      {isFieldAnalyzing(field.key) ? "Analyzing…" : "Auto-Extract"}
                    </Button>
                  )}
                </div>
              ) : (
                <Input
                  type={field.type === "number" ? "number" : "text"}
                  value={values[field.key] || ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="h-8 text-xs"
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !!analyzing} className="text-xs gap-1">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            {editingItem ? "Update" : "Create"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminLibraryForm;
