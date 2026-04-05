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

    // Set campaign to generating
    await supabase
      .from("campaigns")
      .update({ status: "generating" })
      .eq("id", campaignId);

    // Simulate AI generation with a 2-second delay
    setTimeout(async () => {
      // Create 3 stub generated assets
      const stubAssets = [
        {
          campaign_id: campaignId,
          profile_id: user.id,
          asset_type: "image",
          content_url: "https://placehold.co/1080x1080/F8F5F1/1A1A1A?text=Generated+Image",
          status: "pending_review",
        },
        {
          campaign_id: campaignId,
          profile_id: user.id,
          asset_type: "video",
          content_url: "https://placehold.co/1080x1920/F8F5F1/1A1A1A?text=Generated+Video",
          status: "pending_review",
        },
        {
          campaign_id: campaignId,
          profile_id: user.id,
          asset_type: "copy",
          content_text:
            "✨ Transform your look this season! Book your complimentary consultation today and discover our exclusive treatment packages. Limited spots available. #MedSpa #Beauty #SelfCare",
          status: "pending_review",
        },
      ];

      await supabase.from("generated_assets").insert(stubAssets);

      // Update campaign to review
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
