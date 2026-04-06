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

    // Platform-specific captions for realistic preview
    const platformCaptions: Record<string, string[]> = {
      "instagram|post": [
        "✨ Your glow-up starts here. Our expert team crafts natural, radiant results you'll love. Tap the link in bio to book your free consultation today.\n\n#Aesthetics #NaturalBeauty #GlowUp #SkinCare",
        "Before → After says it all 💫 See why 500+ clients trust us with their confidence. Limited spots available this month.\n\n#BeforeAndAfter #MedSpa #Transformation",
      ],
      "instagram|story": [
        "🔥 FLASH SALE\n\n20% off all injectables this week only.\n\nSwipe up to book →",
        "POV: You just left your appointment feeling like a new person ✨\n\nBook yours today →",
      ],
      "instagram|reel": [
        "Watch the transformation unfold 🎬 From consultation to confident — this is what natural beauty looks like.\n\n🎵 Trending audio\n#Reels #BeautyTransformation #MedSpa",
      ],
      "instagram|carousel": [
        "Swipe through our most popular treatments → \n\n1️⃣ Lip Enhancement\n2️⃣ Botox\n3️⃣ Dermal Fillers\n4️⃣ Skin Rejuvenation\n5️⃣ Body Contouring\n\nWhich one is calling your name? 👇",
      ],
      "tiktok|reel": [
        "POV: Your friends ask why you look so good lately 😏✨ #MedSpa #GlowUp #BeautyTok #Aesthetic",
      ],
      "facebook|post": [
        "We believe everyone deserves to feel confident in their own skin. 🌟\n\nOur certified specialists use the latest techniques to deliver natural-looking results. Book your complimentary consultation today — link in comments.",
      ],
      "facebook|story": [
        "📍 NOW OPEN — Extended hours every Thursday!\n\nBook your evening appointment today.",
      ],
      "linkedin|post": [
        "We're proud to announce our expansion into a second location — serving more clients with the same commitment to excellence.\n\nOur team has grown to 12 certified specialists, and we're just getting started. 🚀\n\n#BusinessGrowth #MedSpa #Healthcare",
      ],
      "linkedin|carousel": [
        "5 trends reshaping the aesthetics industry in 2026 →\n\nFrom AI-powered consultations to personalized treatment plans, here's what forward-thinking practices are doing differently.\n\n#AestheticMedicine #Innovation #Trends",
      ],
      "x|post": [
        "Natural results. Zero downtime. That's the standard we set for every client. ✨\n\nBook a free consult → link in bio",
      ],
      "snapchat|story": [
        "Behind the scenes at the clinic today 👀✨ Watch us work our magic!",
      ],
      "youtube|post": [
        "NEW VIDEO: \"Everything You Need to Know Before Your First Botox Appointment\" — We answer the top 10 questions from first-time clients. Watch now! 🎬",
      ],
    };

    const getCaption = (platform: string, format: string) => {
      const key = `${platform}|${format}`;
      const options = platformCaptions[key] || [`Elevate your brand with ${platform}. #${platform}`];
      return options[Math.floor(Math.random() * options.length)];
    };

    // Generate one asset per social format
    const stubAssets = SOCIAL_FORMATS.map((fmt) => {
      const isVideo = fmt.format === "reel";
      const isCarousel = fmt.format === "carousel";
      return {
        campaign_id: campaignId,
        profile_id: user.id,
        asset_type: isCarousel ? "carousel" : isVideo ? "video" : "image",
        content_url: `https://placehold.co/${fmt.width}x${fmt.height}/${primaryHex.replace("#", "")}/${accentHex.replace("#", "")}?text=${encodeURIComponent(fmt.label)}`,
        content_text: `[meta:${fmt.platform}|${fmt.format}|${fmt.aspectRatio}] ${getCaption(fmt.platform, fmt.format)}`,
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
