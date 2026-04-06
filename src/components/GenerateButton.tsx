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

    const palette = (profile as any)?.brand_palette;
    const brandColors = (profile as any)?.brand_colors;

    const vibrantMixers: string[] = [];
    if (palette?.primary) {
      for (const step of palette.primary) {
        if ([300, 400, 500].includes(step.step)) {
          vibrantMixers.push(step.hex);
        }
      }
    }

    const primaryHex = brandColors?.primary || "#D35400";
    const accentHex = brandColors?.accent || "#2C3E50";

    await supabase.from("campaigns").update({ status: "generating" }).eq("id", campaignId);

    const captions = [
      "✨ Transform your look this season! Book your complimentary consultation today. #MedSpa #Beauty #SelfCare",
      "🌟 Your transformation journey starts now. Expert-led treatments, stunning results. #GlowUp #Wellness",
      "💫 Radiance redefined. Personalized treatment plans designed just for you. #SkinCare #Confidence",
      "🔥 Exclusive this month — complimentary skin analysis with every booking. DM us! #MedSpa #BeautyGoals",
      "💎 Discover the glow that turns heads. Premium treatments, real results. #Luxury #SelfCare",
      "✨ New year, new you. Start your beauty journey with our expert team today. #Transformation #Beauty",
    ];

    // Generate assets for multiple social formats
    const stubAssets = [
      // Instagram Post (4:5)
      {
        campaign_id: campaignId,
        profile_id: user.id,
        asset_type: "image",
        content_url: `https://placehold.co/1080x1350/${primaryHex.replace("#", "")}/${accentHex.replace("#", "")}?text=IG+Post`,
        content_text: `[meta:instagram|post|4/5] ${captions[0]}`,
        status: "pending_review",
      },
      // Instagram Story (9:16)
      {
        campaign_id: campaignId,
        profile_id: user.id,
        asset_type: "image",
        content_url: `https://placehold.co/1080x1920/${primaryHex.replace("#", "")}/${accentHex.replace("#", "")}?text=IG+Story`,
        content_text: `[meta:instagram|story|9/16] ${captions[1]}`,
        status: "pending_review",
      },
      // Instagram Reel (9:16)
      {
        campaign_id: campaignId,
        profile_id: user.id,
        asset_type: "video",
        content_url: `https://placehold.co/1080x1920/${primaryHex.replace("#", "")}/${accentHex.replace("#", "")}?text=IG+Reel`,
        content_text: `[meta:instagram|reel|9/16] ${captions[2]}`,
        status: "pending_review",
      },
      // TikTok Video (9:16)
      {
        campaign_id: campaignId,
        profile_id: user.id,
        asset_type: "video",
        content_url: `https://placehold.co/1080x1920/${primaryHex.replace("#", "")}/${accentHex.replace("#", "")}?text=TikTok`,
        content_text: `[meta:tiktok|reel|9/16] ${captions[3]}`,
        status: "pending_review",
      },
      // Facebook Post (1:1)
      {
        campaign_id: campaignId,
        profile_id: user.id,
        asset_type: "image",
        content_url: `https://placehold.co/1080x1080/${primaryHex.replace("#", "")}/${accentHex.replace("#", "")}?text=FB+Post`,
        content_text: `[meta:facebook|post|1/1] ${captions[4]}`,
        status: "pending_review",
      },
      // Caption Copy
      {
        campaign_id: campaignId,
        profile_id: user.id,
        asset_type: "copy",
        content_text: captions[5],
        status: "pending_review",
      },
    ];

    setTimeout(async () => {
      await supabase.from("generated_assets").insert(stubAssets);
      await supabase.from("campaigns").update({ status: "review" }).eq("id", campaignId);
      setGenerating(false);
      toast.success("Content generated! Ready for your review.");
      onGenerated();
    }, 2000);
  };

  return (
    <Button size="lg" onClick={handleGenerate} disabled={disabled || generating} className="gap-2">
      {generating ? (
        <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
      ) : (
        <><Sparkles className="w-4 h-4" /> Generate Content</>
      )}
    </Button>
  );
};

export default GenerateButton;
