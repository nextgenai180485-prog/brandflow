import { useState, useRef } from "react";
import { Upload, X, Palette } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import BrandPalettePreview from "./BrandPalettePreview";

interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
}

interface Props {
  colors: BrandColors;
  onColorsChange: (colors: BrandColors) => void;
  uploadedAssets: { url: string; name: string; type: string }[];
  onAssetsChange: (assets: { url: string; name: string; type: string }[]) => void;
}

const presetPalettes: BrandColors[] = [
  { primary: "#D35400", secondary: "#F8F5F1", accent: "#2C3E50" },
  { primary: "#8E44AD", secondary: "#FAF0F5", accent: "#2C3E50" },
  { primary: "#27AE60", secondary: "#F0FAF4", accent: "#1A1A1A" },
  { primary: "#2980B9", secondary: "#F0F5FA", accent: "#1A1A1A" },
  { primary: "#E74C3C", secondary: "#FFF5F5", accent: "#2C3E50" },
  { primary: "#1A1A1A", secondary: "#F8F5F1", accent: "#D35400" },
];

const BrandIdentity = ({ colors, onColorsChange, uploadedAssets, onAssetsChange }: Props) => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    setUploading(true);

    const newAssets = [...uploadedAssets];
    for (const file of Array.from(files)) {
      if (newAssets.length >= 4) break;
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("campaign_assets").upload(path, file);
      if (error) {
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }
      const { data: urlData } = supabase.storage.from("campaign_assets").getPublicUrl(path);
      newAssets.push({
        url: urlData.publicUrl,
        name: file.name,
        type: file.type.startsWith("image") ? "logo" : "style_reference",
      });
    }
    onAssetsChange(newAssets);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeAsset = (idx: number) => {
    onAssetsChange(uploadedAssets.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-1">Define your brand look</h2>
        <p className="text-muted-foreground text-sm">Choose colors and upload your logo or style references.</p>
      </div>

      {/* Color Palette */}
      <div className="space-y-4">
        <Label className="flex items-center gap-2">
          <Palette className="w-4 h-4" /> Brand Colors
        </Label>
        <div className="grid grid-cols-3 gap-4">
          {(["primary", "secondary", "accent"] as const).map((key) => (
            <div key={key} className="space-y-2">
              <Label className="text-xs capitalize text-muted-foreground">{key}</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colors[key]}
                  onChange={(e) => onColorsChange({ ...colors, [key]: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                />
                <Input
                  value={colors[key]}
                  onChange={(e) => onColorsChange({ ...colors, [key]: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Generated OKLCH Palette */}
        <div className="space-y-3 pt-2">
          <Label className="text-xs text-muted-foreground block">
            Generated Color Scales <span className="text-[10px] ml-1">(OKLCH engine)</span>
          </Label>
          <BrandPalettePreview seedHex={colors.primary} label="primary" />
          <BrandPalettePreview seedHex={colors.secondary} label="secondary" />
          <BrandPalettePreview seedHex={colors.accent} label="accent" />
        </div>

        {/* Presets */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Quick presets</Label>
          <div className="flex gap-3 flex-wrap">
            {presetPalettes.map((p, i) => (
              <button
                key={i}
                onClick={() => onColorsChange(p)}
                className="flex rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-ring transition-all"
              >
                <div className="w-6 h-8" style={{ backgroundColor: p.primary }} />
                <div className="w-6 h-8" style={{ backgroundColor: p.secondary }} />
                <div className="w-6 h-8" style={{ backgroundColor: p.accent }} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Asset Upload */}
      <div className="space-y-4">
        <Label>Logo & Style References <span className="text-muted-foreground font-normal">(up to 4)</span></Label>

        {uploadedAssets.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {uploadedAssets.map((a, i) => (
              <div key={i} className="relative rounded-lg border border-border overflow-hidden bg-card group">
                <img src={a.url} alt={a.name} className="w-full h-32 object-cover" />
                <button
                  onClick={() => removeAsset(i)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-foreground/80 text-background opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
                <p className="text-xs text-muted-foreground p-2 truncate">{a.name}</p>
              </div>
            ))}
          </div>
        )}

        {uploadedAssets.length < 4 && (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              {uploading ? "Uploading…" : "Upload Images"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandIdentity;
