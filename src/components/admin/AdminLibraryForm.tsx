import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { X, Save, Loader2 } from "lucide-react";

type TableName = "video_templates" | "character_library" | "ad_reference_library" | "image_templates";

interface AdminLibraryFormProps {
  tableName: TableName;
  editingItem: any | null;
  onClose: () => void;
  onSaved: () => void;
}

const FORM_FIELDS: Record<TableName, { key: string; label: string; type: "text" | "textarea" | "tags" | "select" | "number" | "json"; options?: string[] }[]> = {
  video_templates: [
    { key: "template_name", label: "Template Name", type: "text" },
    { key: "family", label: "Family", type: "select", options: ["F1_UGC", "F2_SPOKESPERSON", "F5_CINEMATIC", "F8_CREATIVE_CLONER"] },
    { key: "mood", label: "Mood", type: "text" },
    { key: "aspect_ratio", label: "Aspect Ratio", type: "select", options: ["9:16", "16:9", "1:1", "4:5"] },
    { key: "duration_s", label: "Duration (seconds)", type: "number" },
    { key: "hook_type", label: "Hook Type", type: "select", options: ["question", "shock", "story", "statistic", "challenge", "visual"] },
    { key: "tags", label: "Tags (comma-separated)", type: "tags" },
    { key: "example_url", label: "Example URL", type: "text" },
    { key: "sealcam_analysis", label: "SEALCaM Analysis (JSON)", type: "json" },
  ],
  character_library: [
    { key: "name", label: "Character Name", type: "text" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "gender", label: "Gender", type: "select", options: ["male", "female", "neutral"] },
    { key: "age_range", label: "Age Range", type: "select", options: ["18-24", "25-35", "35-45", "45-55", "55+"] },
    { key: "voice_style", label: "Voice Style", type: "select", options: ["professional", "casual", "energetic", "calm", "authoritative", "friendly"] },
    { key: "avatar_url", label: "Avatar URL", type: "text" },
    { key: "mood_tags", label: "Mood Tags (comma-separated)", type: "tags" },
    { key: "industry_tags", label: "Industry Tags (comma-separated)", type: "tags" },
    { key: "ethnicity_tags", label: "Ethnicity Tags (comma-separated)", type: "tags" },
    { key: "persona_traits", label: "Persona Traits (JSON)", type: "json" },
  ],
  ad_reference_library: [
    { key: "title", label: "Title", type: "text" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "media_url", label: "Media URL", type: "text" },
    { key: "media_type", label: "Media Type", type: "select", options: ["image", "video"] },
    { key: "thumbnail_url", label: "Thumbnail URL", type: "text" },
    { key: "industry_tags", label: "Industry Tags (comma-separated)", type: "tags" },
    { key: "mood_tags", label: "Mood Tags (comma-separated)", type: "tags" },
    { key: "platform_tags", label: "Platform Tags (comma-separated)", type: "tags" },
    { key: "performance_notes", label: "Performance Notes", type: "textarea" },
    { key: "compatible_families", label: "Compatible Families (comma-separated)", type: "tags" },
    { key: "sealcam_analysis", label: "SEALCaM Analysis (JSON)", type: "json" },
  ],
  image_templates: [
    { key: "style_name", label: "Style Name", type: "text" },
    { key: "vertical", label: "Vertical", type: "select", options: ["general", "beauty", "fitness", "saas", "ecommerce", "food", "realestate", "fashion", "wellness", "automotive"] },
    { key: "platform", label: "Platform", type: "select", options: ["instagram", "tiktok", "facebook", "linkedin", "x", "youtube"] },
    { key: "format", label: "Format", type: "select", options: ["post", "story", "reel", "carousel"] },
    { key: "quality_tier", label: "Quality Tier", type: "select", options: ["standard", "premium", "elite"] },
    { key: "prompt_modifiers", label: "Prompt Modifiers (comma-separated)", type: "tags" },
    { key: "negative_prompt", label: "Negative Prompt", type: "textarea" },
    { key: "tags", label: "Tags (comma-separated)", type: "tags" },
    { key: "style_guide", label: "Style Guide (JSON)", type: "json" },
  ],
};

const AdminLibraryForm = ({ tableName, editingItem, onClose, onSaved }: AdminLibraryFormProps) => {
  const fields = FORM_FIELDS[tableName];
  const [saving, setSaving] = useState(false);

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

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">{editingItem ? "Edit Item" : "Add New Item"}</CardTitle>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}><X className="h-3.5 w-3.5" /></Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map((field) => (
            <div key={field.key} className={field.type === "textarea" || field.type === "json" ? "col-span-full" : ""}>
              <Label className="text-[10px] font-medium text-muted-foreground mb-1 block">{field.label}</Label>
              {field.type === "select" ? (
                <Select value={values[field.key] || ""} onValueChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {field.options?.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === "textarea" || field.type === "json" ? (
                <Textarea
                  value={values[field.key] || ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="text-xs min-h-[60px] resize-none font-mono"
                  rows={field.type === "json" ? 4 : 2}
                />
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
          <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs gap-1">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            {editingItem ? "Update" : "Create"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminLibraryForm;
