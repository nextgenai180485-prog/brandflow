import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Rocket, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateFullBrandPalette, injectFullBrandPalette, type BrandPalette } from "@/lib/colorEngine";
import BusinessBasics from "@/components/onboarding/BusinessBasics";
import BrandIdentity from "@/components/onboarding/BrandIdentity";
import BrandVoice from "@/components/onboarding/BrandVoice";
import ReviewLaunch from "@/components/onboarding/ReviewLaunch";

const STEPS = ["Business", "Identity", "Voice", "Review"];

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [business, setBusiness] = useState({
    business_name: "",
    website_url: "",
    industry: "medspa",
    target_audience: "",
  });
  const [colors, setColors] = useState({ primary: "#D35400", secondary: "#F8F5F1", accent: "#2C3E50" });
  const [uploadedAssets, setUploadedAssets] = useState<{ url: string; name: string; type: string }[]>([]);
  const [tone, setTone] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [sampleText, setSampleText] = useState("");

  // Generate and inject OKLCH brand tokens whenever colors change
  const [palette, setPalette] = useState<BrandPalette | null>(null);
  useEffect(() => {
    const p = generateFullBrandPalette(colors);
    setPalette(p);
    injectFullBrandPalette(p);
  }, [colors]);

  // Load existing profile data
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setBusiness({
          business_name: data.business_name || "",
          website_url: (data as any).website_url || "",
          industry: (data as any).industry || "medspa",
          target_audience: (data as any).target_audience || "",
        });
        const bc = (data as any).brand_colors as any;
        if (bc && bc.primary) setColors(bc);
        if ((data as any).brand_voice_tone) setTone((data as any).brand_voice_tone);
        if ((data as any).brand_voice_keywords) setKeywords((data as any).brand_voice_keywords || []);
        const savedStep = (data as any).onboarding_step;
        if (typeof savedStep === "number" && savedStep > 0) setStep(savedStep);
      }
      // Load brand assets
      const { data: assets } = await supabase
        .from("brand_assets")
        .select("*")
        .eq("profile_id", user.id);
      if (assets && assets.length > 0) {
        setUploadedAssets(assets.map((a: any) => ({ url: a.file_url, name: a.file_name, type: a.asset_type })));
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const serializePalette = () => {
    if (!palette) return {};
    return {
      primary: palette.primary.steps.map(s => ({ step: s.step, hex: s.hex, role: s.role })),
      secondary: palette.secondary.steps.map(s => ({ step: s.step, hex: s.hex, role: s.role })),
      accent: palette.accent.steps.map(s => ({ step: s.step, hex: s.hex, role: s.role })),
      tokens: palette.primary.tokens,
    };
  };

  const saveProgress = async (nextStep: number) => {
    if (!user) return;
    await supabase.from("profiles").update({
      business_name: business.business_name,
      website_url: business.website_url,
      industry: business.industry,
      target_audience: business.target_audience,
      brand_colors: colors,
      brand_palette: serializePalette(),
      brand_voice_tone: tone,
      brand_voice_keywords: keywords,
      onboarding_step: nextStep,
    } as any).eq("id", user.id);
  };

  const handleNext = async () => {
    if (step === 0 && !business.business_name.trim()) {
      toast.error("Please enter your business name.");
      return;
    }
    // Trigger silent brand research when leaving Step 1 (Business) with a website URL
    if (step === 0 && business.website_url.trim()) {
      triggerSilentResearch();
    }
    await saveProgress(step + 1);
    setStep(step + 1);
  };

  const triggerSilentResearch = async () => {
    try {
      console.log("[Onboarding] Triggering silent brand research for:", business.website_url);
      supabase.functions.invoke("auto-brand-research", {
        body: {
          websiteUrl: business.website_url.trim(),
          businessName: business.business_name.trim(),
          industry: business.industry,
          targetAudience: business.target_audience,
          brandVoice: tone || "professional",
        },
      }).then(({ data, error }) => {
        if (error) {
          console.error("[Onboarding] Silent research failed:", error);
          return;
        }
        console.log("[Onboarding] Silent research complete:", data?.brandProfile?.summary);
        // Auto-populate detected voice if user hasn't set one
        if (data?.brandProfile?.brand_voice_detected && !tone) {
          setTone(data.brandProfile.brand_voice_detected);
        }
      });
    } catch (e) {
      console.error("[Onboarding] Silent research trigger error:", e);
    }
  };

  const handleBack = () => setStep(step - 1);

  const handleLaunch = async () => {
    if (!user) return;
    setSaving(true);

    // Save brand assets to DB
    if (uploadedAssets.length > 0) {
      const existing = await supabase.from("brand_assets").select("id").eq("profile_id", user.id);
      if (!existing.data || existing.data.length === 0) {
        await supabase.from("brand_assets").insert(
          uploadedAssets.map((a) => ({
            profile_id: user.id,
            asset_type: a.type,
            file_url: a.url,
            file_name: a.name,
          }))
        );
      }
    }

    // Mark onboarding complete
    await supabase.from("profiles").update({
      business_name: business.business_name,
      website_url: business.website_url,
      industry: business.industry,
      target_audience: business.target_audience,
      brand_colors: colors,
      brand_palette: serializePalette(),
      brand_voice_tone: tone,
      brand_voice_keywords: keywords,
      onboarding_completed: true,
      onboarding_step: 4,
    } as any).eq("id", user.id);

    // Fire silent research in background (Process B)
    if (business.website_url.trim()) {
      console.log("[Onboarding] Firing post-launch silent research");
      supabase.functions.invoke("auto-brand-research", {
        body: {
          websiteUrl: business.website_url.trim(),
          businessName: business.business_name.trim(),
          industry: business.industry,
          targetAudience: business.target_audience,
          brandVoice: tone || "professional",
        },
      }).then(({ data, error }) => {
        if (error) console.error("[Onboarding] Post-launch research failed:", error);
        else console.log("[Onboarding] Post-launch research complete");
      });
    }

    toast.success("Welcome to Brandflow! 🚀");
    setSaving(false);
    // Route immediately — no loading screen (Process A)
    navigate("/dashboard?welcome=1");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-lg font-semibold text-foreground tracking-tight">Brandflow</span>
          <span className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}</span>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="max-w-2xl mx-auto w-full px-6 pt-6">
        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`h-1.5 w-full rounded-full transition-colors ${
                  i <= step ? "bg-foreground" : "bg-border"
                }`}
              />
              <span className={`text-[10px] uppercase tracking-wider ${
                i <= step ? "text-foreground" : "text-muted-foreground"
              }`}>
                {s}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
        {step === 0 && (
          <BusinessBasics
            data={business}
            onChange={(d) => setBusiness((prev) => ({ ...prev, ...d }))}
          />
        )}
        {step === 1 && (
          <BrandIdentity
            colors={colors}
            onColorsChange={setColors}
            uploadedAssets={uploadedAssets}
            onAssetsChange={setUploadedAssets}
          />
        )}
        {step === 2 && (
          <BrandVoice
            tone={tone}
            keywords={keywords}
            sampleText={sampleText}
            onToneChange={setTone}
            onKeywordsChange={setKeywords}
            onSampleTextChange={setSampleText}
          />
        )}
        {step === 3 && (
          <ReviewLaunch
            data={{
              ...business,
              colors,
              tone,
              keywords,
              uploadedAssets,
            }}
            onEdit={(s) => setStep(s)}
          />
        )}
      </div>

      {/* Footer Navigation */}
      <footer className="border-t border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          {step > 0 ? (
            <Button variant="ghost" onClick={handleBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          ) : (
            <div />
          )}

          {step < STEPS.length - 1 ? (
            <Button onClick={handleNext} className="gap-2">
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleLaunch} disabled={saving} className="gap-2">
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Launching…</>
              ) : (
                <><Rocket className="w-4 h-4" /> Launch Brandflow</>
              )}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default Onboarding;
