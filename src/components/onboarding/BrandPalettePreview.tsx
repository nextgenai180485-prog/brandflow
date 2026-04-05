import { useMemo } from "react";
import { generateBrandScale, type BrandColorScale } from "@/lib/colorEngine";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  seedHex: string;
  label: string;
}

const ROLE_LABELS: Record<string, string> = {
  "subtle-accent": "Subtle",
  "soft": "Soft",
  "vibrant-mixer": "Vibrant",
  "vibrant-mixer-peak": "Peak Vibrant",
  "vibrant": "Bright",
  "primary-active": "Active",
  "deep": "Deep",
  "deeper": "Deeper",
  "text": "Text",
  "darkest": "Darkest",
};

const BrandPalettePreview = ({ seedHex, label }: Props) => {
  const scale: BrandColorScale = useMemo(() => generateBrandScale(seedHex), [seedHex]);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground capitalize">{label} Scale</p>
      <TooltipProvider delayDuration={150}>
        <div className="flex rounded-lg overflow-hidden border border-border">
          {scale.steps.map((s) => (
            <Tooltip key={s.step}>
              <TooltipTrigger asChild>
                <div
                  className="flex-1 h-10 transition-all hover:scale-y-125 cursor-pointer relative"
                  style={{ backgroundColor: s.hex }}
                />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <div className="space-y-0.5">
                  <p className="font-semibold">{s.step} · {ROLE_LABELS[s.role] || s.role}</p>
                  <p className="font-mono">{s.hex.toUpperCase()}</p>
                  <p className="text-muted-foreground">
                    L:{(s.oklch.L * 100).toFixed(0)}% C:{s.oklch.C.toFixed(3)} H:{s.oklch.H.toFixed(0)}°
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>

      {/* Semantic tokens preview */}
      <div className="flex gap-1.5 mt-1">
        {[
          { label: "Vibrant", hex: scale.tokens["--brand-vibrant"] },
          { label: "Active", hex: scale.tokens["--brand-active"] },
          { label: "Soft", hex: scale.tokens["--brand-soft"] },
          { label: "Text", hex: scale.tokens["--brand-text"] },
        ].map((t) => (
          <div key={t.label} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: t.hex }} />
            <span className="text-[10px] text-muted-foreground">{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BrandPalettePreview;
