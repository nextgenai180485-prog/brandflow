import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { SOCIAL_FORMATS } from "@/types/campaigns";
import type { IntelligenceBrief } from "@/components/ResearchPreviewPanel";

interface GenerateButtonProps {
  campaignId: string;
  onGenerated: () => void;
  onResearchReady?: (brief: IntelligenceBrief, researchId: string) => void;
  onResearchLoading?: (loading: boolean) => void;
  disabled?: boolean;
  researchApproved?: boolean;
  researchId?: string | null;
  intelligenceBrief?: IntelligenceBrief | null;
}

const GenerateButton = ({
  campaignId, onGenerated, onResearchReady, onResearchLoading,
  disabled, researchApproved, researchId: existingResearchId, intelligenceBrief: existingBrief,
}: GenerateButtonProps) => {
  const { user } = useAuth();
  const [researching, setResearching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const loadBrandContext = useCallback(async () => {
    if (!user) return null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("brand_colors, brand_palette, brand_voice_tone, business_name, industry, target_audience, website_url")
      .eq("id", user.id)
      .single();
    return {
      businessName: (profile as any)?.business_name || "Brand",
      industry: (profile as any)?.industry || "beauty",
      brandVoice: (profile as any)?.brand_voice_tone || "professional, warm",
      targetAudience: (profile as any)?.target_audience || "health-conscious consumers",
      websiteUrl: (profile as any)?.website_url || null,
    };
  }, [user]);

  // Step 1: Run research
  const handleResearch = async () => {
    if (!user || researching) return;
    setResearching(true);
    onResearchLoading?.(true);
    setStatus("Analyzing your brand & market…");

    try {
      const brandContext = await loadBrandContext();
      if (!brandContext) throw new Error("No brand context");

      // Get uploaded assets for this campaign
      const { data: campaignAssets } = await supabase
        .from("generated_assets")
        .select("content_url")
        .eq("campaign_id", campaignId)
        .not("content_url", "is", null);

      const uploadedAssetUrls = campaignAssets?.map((a: any) => a.content_url).filter(Boolean) || [];

      const { data: researchData, error: researchError } = await supabase.functions.invoke("research", {
        body: {
          campaignId,
          ...brandContext,
          uploadedAssetUrls,
        },
      });

      if (researchError) {
        console.error("Research error:", researchError);
        toast.error("Research failed. Please try again.");
        return;
      }

      const brief = researchData?.intelligenceBrief;
      const researchId = researchData?.research?.id;

      if (brief && researchId) {
        toast.success(`Research complete — ${brief.trending_topics?.length || 0} trends, ${brief.competitors?.length || 0} competitors found`);
        onResearchReady?.(brief, researchId);
      }
    } catch (e) {
      console.error("Research error:", e);
      toast.error("Research failed. Please try again.");
    } finally {
      setResearching(false);
      onResearchLoading?.(false);
      setStatus("");
    }
  };

  // Step 2: Generate content (only after research approved)
  const handleGenerate = async () => {
    if (!user || generating || !researchApproved) return;
    setGenerating(true);

    try {
      const brandContext = await loadBrandContext();
      if (!brandContext) throw new Error("No brand context");

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

      setStatus(`Starting generation of ${assets.length} assets…`);
      const { data: genData, error: genError } = await supabase.functions.invoke("generate-content", {
        body: {
          campaignId,
          assets,
          researchId: existingResearchId || null,
          intelligenceBrief: existingBrief || null,
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

      toast.success(`Generation started for ${genData?.placeholders || assets.length} assets.`);
      onGenerated();

      // Poll for completion
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
          onGenerated();
          setStatus(`${completedCount}/${totalAssets} assets ready…`);
        }

        if (done >= totalAssets) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setGenerating(false);
          setStatus("");
          const errors = genAssets?.filter((a: any) => a.provider === "error").length || 0;
          if (errors > 0) toast.warning(`${done - errors}/${totalAssets} generated · ${errors} failed`);
          else toast.success(`All ${totalAssets} assets generated!`);
          onGenerated();
        }
      }, 4000);

      setTimeout(() => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setGenerating(false);
          setStatus("");
          toast.info("Generation still running. Refresh to see updates.");
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

  const isWorking = researching || generating;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        {/* Research status indicator — no manual button, research is automatic */}
        {!researchApproved && !existingBrief && researching && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing market…
          </span>
        )}

        {/* Generate button — only enabled after research approved */}
        <Button
          size="sm"
          onClick={handleGenerate}
          disabled={disabled || isWorking || !researchApproved}
          className="gap-1.5 h-8 text-xs"
        >
          {generating ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5" /> Generate Content</>
          )}
        </Button>
      </div>
      {status && (
        <span className="text-[10px] text-muted-foreground animate-pulse max-w-[250px] text-right">
          {status}
        </span>
      )}
    </div>
  );
};

export default GenerateButton;
