import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

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

    // Fetch the user's brand palette for generation context
    const { data: profile } = await supabase
      .from("profiles")
      .select("brand_colors, brand_palette, brand_voice_tone, business_name")
      .eq("id", user.id)
      .single();

    const palette = (profile as any)?.brand_palette;
    const brandColors = (profile as any)?.brand_colors;

    // Extract vibrant mixer colors (steps 300-500) for generation prompts
    const vibrantMixers: string[] = [];
    if (palette?.primary) {
      for (const step of palette.primary) {
        if ([300, 400, 500].includes(step.step)) {
          vibrantMixers.push(step.hex);
        }
      }
    }

    // Build brand color directive for AI prompts
    const colorDirective = vibrantMixers.length > 0
      ? `Use brand colors: ${vibrantMixers.join(", ")} as the primary color palette. Mix these vibrant brand tones for visual consistency.`
      : brandColors?.primary
        ? `Use ${brandColors.primary} as the primary brand color.`
        : "";

    const brandContext = [
      profile?.business_name ? `Brand: ${profile.business_name}` : "",
      profile?.brand_voice_tone ? `Tone: ${profile.brand_voice_tone}` : "",
      colorDirective,
    ].filter(Boolean).join(". ");

    // Set campaign to generating
    await supabase
      .from("campaigns")
      .update({ status: "generating" })
      .eq("id", campaignId);

    // Simulate AI generation with brand-aware context
    setTimeout(async () => {
      const primaryHex = brandColors?.primary || "#D35400";
      const accentHex = brandColors?.accent || "#2C3E50";

      const stubAssets = [
        {
          campaign_id: campaignId,
          profile_id: user.id,
          asset_type: "image",
          content_url: `https://placehold.co/1080x1080/${primaryHex.replace("#", "")}/${accentHex.replace("#", "")}?text=Brand+Image`,
          content_text: "✨ Transform your look this season! Book your complimentary consultation today and discover our exclusive treatment packages. Limited spots available. #MedSpa #Beauty #SelfCare",
          status: "pending_review",
        },
        {
          campaign_id: campaignId,
          profile_id: user.id,
          asset_type: "video",
          content_url: `https://placehold.co/1080x1920/${primaryHex.replace("#", "")}/${accentHex.replace("#", "")}?text=Brand+Video`,
          content_text: "🌟 Your transformation journey starts now. Watch how our expert team delivers results you'll love. Book today — link in bio. #GlowUp #BeautyGoals #Wellness",
          status: "pending_review",
        },
        {
          campaign_id: campaignId,
          profile_id: user.id,
          asset_type: "copy",
          content_text:
            "💫 Radiance redefined. Experience the difference our personalized treatment plans can make. DM us for a free consultation. #MedSpa #SkinCare #Confidence",
          status: "pending_review",
        },
      ];

      await supabase.from("generated_assets").insert(stubAssets);

      await supabase
        .from("campaigns")
        .update({ status: "review" })
        .eq("id", campaignId);

      setGenerating(false);
      toast.success("Content generated! Ready for your review.");
      onGenerated();
    }, 2000);
  };

  return (
    <Button
      size="lg"
      onClick={handleGenerate}
      disabled={disabled || generating}
      className="gap-2"
    >
      {generating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating…
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4" />
          Generate Content
        </>
      )}
    </Button>
  );
};

export default GenerateButton;
