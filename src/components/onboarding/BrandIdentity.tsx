import { useState, useRef } from "react";
import { Upload, X, Palette, Sun, Moon } from "lucide-react";
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

const BrandIdentity = ({ colors, onColorsChange, uploadedAssets, onAssetsChange }: Props) => {
  const { user } = useAuth();
  const brightLogoRef = useRef<HTMLInputElement>(null);
  const darkLogoRef = useRef<HTMLInputElement>(null);
  const styleRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  const brightLogo = uploadedAssets.find((a) => a.type === "logo_bright");
  const darkLogo = uploadedAssets.find((a) => a.type === "logo_dark");
  const styleAssets = uploadedAssets.filter((a) => a.type === "style_reference");

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    assetType: string
  ) => {
    const files = e.target.files;
    if (!files || !user) return;
    setUploading(assetType);

    const file = files[0];
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("campaign_assets").upload(path, file);
    if (error) {
      toast.error(`Failed to upload ${file.name}`);
      setUploading(null);
      return;
    }
    const { data: urlData } = supabase.storage.from("campaign_assets").getPublicUrl(path);

    // For logo types, replace existing; for style_reference, append
    if (assetType === "logo_bright" || assetType === "logo_dark") {
      const filtered = uploadedAssets.filter((a) => a.type !== assetType);
      onAssetsChange([
        ...filtered,
        { url: urlData.publicUrl, name: file.name, type: assetType },
      ]);
    } else {
      if (styleAssets.length >= 2) {
        toast.error("Maximum 2 style references allowed.");
        setUploading(null);
        return;
      }
      onAssetsChange([
        ...uploadedAssets,
        { url: urlData.publicUrl, name: file.name, type: assetType },
      ]);
    }

    setUploading(null);
    // Reset file input
    if (assetType === "logo_bright" && brightLogoRef.current) brightLogoRef.current.value = "";
    if (assetType === "logo_dark" && darkLogoRef.current) darkLogoRef.current.value = "";
    if (assetType === "style_reference" && styleRef.current) styleRef.current.value = "";
  };

  const removeAsset = (type: string, idx?: number) => {
    if (type === "style_reference" && idx !== undefined) {
      const styleIdx = uploadedAssets.reduce<number[]>((acc, a, i) => {
        if (a.type === "style_reference") acc.push(i);
        return acc;
      }, []);
      onAssetsChange(uploadedAssets.filter((_, i) => i !== styleIdx[idx]));
    } else {
      onAssetsChange(uploadedAssets.filter((a) => a.type !== type));
    }
  };

  const LogoSlot = ({
    label,
    icon: Icon,
    logo,
    assetType,
    inputRef,
    bgClass,
  }: {
    label: string;
    icon: typeof Sun;
    logo: { url: string; name: string; type: string } | undefined;
    assetType: string;
    inputRef: React.RefObject<HTMLInputElement>;
    bgClass: string;
  }) => (
    <div className="flex-1 space-y-2">
      <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="w-3.5 h-3.5" /> {label}
      </Label>
      {logo ? (
        <div className={`relative rounded-xl border border-border overflow-hidden group ${bgClass} p-4 flex items-center justify-center h-28`}>
          <img src={logo.url} alt={logo.name} className="max-h-20 max-w-full object-contain" />
          <button
            onClick={() => removeAsset(assetType)}
            className="absolute top-2 right-2 p-1 rounded-full bg-foreground/80 text-background opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading === assetType}
          className={`w-full h-28 rounded-xl border-2 border-dashed border-border hover:border-primary/50 ${bgClass} flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer`}
        >
          <Upload className="w-5 h-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {uploading === assetType ? "Uploading…" : `Upload ${label}`}
          </span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleUpload(e, assetType)}
        className="hidden"
      />
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Visual System
        </p>
        <h2 className="text-2xl font-bold text-foreground tracking-tight mb-1">
          Lock in your brand's visual identity
        </h2>
        <p className="text-sm text-muted-foreground">
          These colors and logos will govern every asset your CSO generates. No guessing, no off-brand content.
        </p>
      </div>

      {/* Logo Upload — Bright & Dark */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Upload className="w-4 h-4" /> Brand Logos
          <span className="text-muted-foreground font-normal text-[10px]">— bright & dark versions for any background</span>
        </Label>
        <div className="flex gap-4">
          <LogoSlot
            label="Bright Logo"
            icon={Sun}
            logo={brightLogo}
            assetType="logo_bright"
            inputRef={brightLogoRef}
            bgClass="bg-muted/30"
          />
          <LogoSlot
            label="Dark Logo"
            icon={Moon}
            logo={darkLogo}
            assetType="logo_dark"
            inputRef={darkLogoRef}
            bgClass="bg-foreground/90"
          />
        </div>
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
      </div>

      {/* Style References */}
      <div className="space-y-4">
        <Label>Style References <span className="text-muted-foreground font-normal text-[10px]">— up to 2, guides AI generation</span></Label>

        {styleAssets.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {styleAssets.map((a, i) => (
              <div key={i} className="relative rounded-lg border border-border overflow-hidden bg-card group">
                <img src={a.url} alt={a.name} className="w-full h-32 object-cover" />
                <button
                  onClick={() => removeAsset("style_reference", i)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-foreground/80 text-background opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
                <p className="text-xs text-muted-foreground p-2 truncate">{a.name}</p>
              </div>
            ))}
          </div>
        )}

        {styleAssets.length < 2 && (
          <div>
            <input
              ref={styleRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleUpload(e, "style_reference")}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => styleRef.current?.click()}
              disabled={uploading === "style_reference"}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              {uploading === "style_reference" ? "Uploading…" : "Upload Reference"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandIdentity;
