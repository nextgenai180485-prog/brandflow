import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { SOCIAL_FORMATS } from "@/types/campaigns";

interface GenerateButtonProps {
  campaignId: string;
  onGenerated: () => void;
  disabled?: boolean;
}

const GenerateButton = ({ campaignId, onGenerated, disabled }: GenerateButtonProps) => {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState("");

  const handleGenerate = async () => {
    if (!user || generating) return;
    setGenerating(true);
    setStatus("Researching market trends…");

    try {
      // 1. Load brand context
      const { data: profile } = await supabase
        .from("profiles")
        .select("brand_colors, brand_palette, brand_voice_tone, business_name, industry, target_audience")
        .eq("id", user.id)
        .single();

      const brandContext = {
        businessName: (profile as any)?.business_name || "Brand",
        industry: (profile as any)?.industry || "beauty",
        brandVoice: (profile as any)?.brand_voice_tone || "professional, warm",
        targetAudience: (profile as any)?.target_audience || "health-conscious consumers",
      };

      // 2. Research phase — call Exa via edge function
      setStatus("Analyzing market intelligence…");
      const { data: researchData, error: researchError } = await supabase.functions.invoke("research", {
        body: {
          campaignId,
          ...brandContext,
        },
      });

      if (researchError) {
        console.error("Research error:", researchError);
        toast.error("Research phase failed — generating with default intelligence");
      }

      const researchId = researchData?.research?.id || null;
      const intelligenceBrief = researchData?.intelligenceBrief || null;

      if (intelligenceBrief) {
        toast.success(`Research complete: ${intelligenceBrief.trending_topics?.length || 0} trends found`);
      }

      // 3. Build asset list from social formats
      const assets = SOCIAL_FORMATS.map((fmt) => {
        const isVideo = fmt.format === "reel";
        const isCarousel = fmt.format === "carousel";
        return {
          platform: fmt.platform,
          format: fmt.format,
          aspectRatio: fmt.aspectRatio,
          width: fmt.width,
          height: fmt.height,
          assetType: isCarousel ? "carousel" : isVideo ? "video" : "image",
        };
      });

      // 4. Generate content via edge function
      setStatus(`Generating ${assets.length} assets with AI…`);
      const { data: genData, error: genError } = await supabase.functions.invoke("generate-content", {
        body: {
          campaignId,
          assets,
          researchId,
          intelligenceBrief,
          brandContext,
        },
      });

      if (genError) {
        console.error("Generation error:", genError);
        toast.error("Content generation failed. Please try again.");
        setGenerating(false);
        setStatus("");
        return;
      }

      const summary = genData?.summary;
      if (summary) {
        const msg = `Generated ${summary.succeeded}/${summary.total} assets · $${summary.totalCost} cost`;
        if (summary.failed > 0) {
          toast.warning(`${msg} · ${summary.failed} failed (tap to regenerate)`);
        } else {
          toast.success(msg);
        }
      }

      onGenerated();
    } catch (e) {
      console.error("Generate error:", e);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
      setStatus("");
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" onClick={handleGenerate} disabled={disabled || generating} className="gap-1.5 h-8 text-xs">
        {generating ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
        ) : (
          <><Sparkles className="w-3.5 h-3.5" /> Generate Content</>
        )}
      </Button>
      {status && (
        <span className="text-[10px] text-muted-foreground animate-pulse max-w-[200px] text-right">
          {status}
        </span>
      )}
    </div>
  );
};

export default GenerateButton;
