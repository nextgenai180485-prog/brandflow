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

  const handleGenerate = async () => {
    if (!user || generating) return;
    setGenerating(true);

    const { data: profile } = await supabase
      .from("profiles")
      .select("brand_colors, brand_palette, brand_voice_tone, business_name")
      .eq("id", user.id)
      .single();

    const brandColors = (profile as any)?.brand_colors;
    const primaryHex = brandColors?.primary || "#D35400";
    const accentHex = brandColors?.accent || "#2C3E50";

    await supabase.from("campaigns").update({ status: "generating" }).eq("id", campaignId);

    // Generate one asset per social format
    const stubAssets = SOCIAL_FORMATS.map((fmt) => {
      const isVideo = fmt.format === "reel";
      const isCarousel = fmt.format === "carousel";
      return {
        campaign_id: campaignId,
        profile_id: user.id,
        asset_type: isCarousel ? "carousel" : isVideo ? "video" : "image",
        content_url: `https://placehold.co/${fmt.width}x${fmt.height}/${primaryHex.replace("#", "")}/${accentHex.replace("#", "")}?text=${encodeURIComponent(fmt.label)}`,
        content_text: `[meta:${fmt.platform}|${fmt.format}|${fmt.aspectRatio}] ✨ Transform your look this season! Book your complimentary consultation today. #${fmt.platform} #Beauty`,
        status: "pending_review",
      };
    });

    setTimeout(async () => {
      await supabase.from("generated_assets").insert(stubAssets);
      await supabase.from("campaigns").update({ status: "review" }).eq("id", campaignId);
      setGenerating(false);
      toast.success("Content generated for all platforms!");
      onGenerated();
    }, 2000);
  };

  return (
    <Button size="sm" onClick={handleGenerate} disabled={disabled || generating} className="gap-1.5 h-8 text-xs">
      {generating ? (
        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
      ) : (
        <><Sparkles className="w-3.5 h-3.5" /> Generate Content</>
      )}
    </Button>
  );
};

export default GenerateButton;
