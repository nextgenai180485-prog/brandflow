import { useState, useEffect, useRef } from "react";
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

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

      // 2. Research phase
      setStatus("Analyzing market intelligence…");
      const { data: researchData, error: researchError } = await supabase.functions.invoke("research", {
        body: { campaignId, ...brandContext },
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

      // 3. Build asset list
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

      // 4. Kick off generation (returns immediately now)
      setStatus(`Starting generation of ${assets.length} assets…`);
      const { data: genData, error: genError } = await supabase.functions.invoke("generate-content", {
        body: { campaignId, assets, researchId, intelligenceBrief, brandContext },
      });

      if (genError) {
        console.error("Generation error:", genError);
        toast.error("Content generation failed. Please try again.");
        setGenerating(false);
        setStatus("");
        return;
      }

      toast.success(`Generation started for ${genData?.placeholders || assets.length} assets. They'll appear as they complete.`);
      onGenerated(); // Refresh to show placeholders

      // 5. Poll for completion
      setStatus("Assets generating in background…");
      let completedCount = 0;
      const totalAssets = assets.length;

      pollRef.current = setInterval(async () => {
        const { data: genAssets } = await supabase
          .from("generated_assets")
          .select("id, content_url, provider")
          .eq("campaign_id", campaignId);

        const done = genAssets?.filter((a: any) => a.content_url != null || a.provider === "error").length || 0;

        if (done > completedCount) {
          completedCount = done;
          onGenerated(); // Refresh UI
          setStatus(`${completedCount}/${totalAssets} assets ready…`);
        }

        if (done >= totalAssets) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setGenerating(false);
          setStatus("");
          const errors = genAssets?.filter((a: any) => a.provider === "error").length || 0;
          if (errors > 0) {
            toast.warning(`${done - errors}/${totalAssets} assets generated · ${errors} failed`);
          } else {
            toast.success(`All ${totalAssets} assets generated!`);
          }
          onGenerated();
        }
      }, 4000);

      // Safety timeout: stop polling after 8 minutes
      setTimeout(() => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setGenerating(false);
          setStatus("");
          toast.info("Generation is still running in the background. Refresh to see updates.");
          onGenerated();
        }
      }, 8 * 60 * 1000);

    } catch (e) {
      console.error("Generate error:", e);
      toast.error("Something went wrong. Please try again.");
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
