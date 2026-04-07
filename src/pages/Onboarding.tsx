import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Rocket, Loader2, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateFullBrandPalette, injectFullBrandPalette, type BrandPalette } from "@/lib/colorEngine";
import BusinessBasics from "@/components/onboarding/BusinessBasics";
import BrandIdentity from "@/components/onboarding/BrandIdentity";
import BrandVoice from "@/components/onboarding/BrandVoice";
import ReviewLaunch from "@/components/onboarding/ReviewLaunch";

const STEPS = ["Brand Intake", "Visual System", "Voice", "Review"];

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);

  // Form state
  const [business, setBusiness] = useState({
    business_name: "",
    website_url: "",
    industry: "other",
    target_audience: "",
  });
  const [colors, setColors] = useState({ primary: "#D35400", secondary: "#F8F5F1", accent: "#2C3E50" });
  const [uploadedAssets, setUploadedAssets] = useState<{ url: string; name: string; type: string }[]>([]);
  const [tone, setTone] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [sampleText, setSampleText] = useState("");
  const [brandResearchComplete, setBrandResearchComplete] = useState(false);

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
          industry: (data as any).industry || "other",
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
      toast.error("Please enter your brand name.");
      return;
    }
    
    // If leaving Step 1 with a website URL, run Firecrawl and wait for results
    if (step === 0 && business.website_url.trim()) {
      setResearching(true);
      await saveProgress(step + 1);
      setStep(step + 1);
      
      try {
        console.log("[Onboarding] Running brand research for:", business.website_url);
        const { data, error } = await supabase.functions.invoke("auto-brand-research", {
          body: {
            websiteUrl: business.website_url.trim(),
            businessName: business.business_name.trim(),
            industry: business.industry,
            targetAudience: business.target_audience,
            brandVoice: tone || "professional",
          },
        });

        if (!error && data?.brandProfile) {
          const bp = data.brandProfile;
          
          // Auto-populate colors from Firecrawl extraction
          if (bp.color_palette_suggestion) {
            const extracted = bp.color_palette_suggestion;
            setColors({
              primary: extracted.primary || colors.primary,
              secondary: extracted.secondary || colors.secondary,
              accent: extracted.accent || colors.accent,
            });
            console.log("[Onboarding] Colors auto-populated:", extracted);
          }
          
          // Auto-populate tone if detected
          if (bp.brand_voice_detected && !tone) {
            setTone(bp.brand_voice_detected);
            console.log("[Onboarding] Voice auto-populated:", bp.brand_voice_detected);
          }
          
          // Auto-populate target audience if detected
          if (bp.target_audience_detected && !business.target_audience) {
            setBusiness(prev => ({ ...prev, target_audience: bp.target_audience_detected }));
            console.log("[Onboarding] Audience auto-populated:", bp.target_audience_detected);
          }
          
          // Auto-populate keywords from key_themes
          if (bp.key_themes?.length > 0 && keywords.length === 0) {
            setKeywords(bp.key_themes.slice(0, 5));
            console.log("[Onboarding] Keywords auto-populated:", bp.key_themes);
          }
          
          setBrandResearchComplete(true);
          toast.success("Brand DNA extracted from your website.");
        } else {
          console.error("[Onboarding] Research failed:", error);
          toast.info("Couldn't extract brand data. You can set it manually.");
        }
      } catch (e) {
        console.error("[Onboarding] Research error:", e);
      } finally {
        setResearching(false);
      }
      return;
    }
    
    await saveProgress(step + 1);
    setStep(step + 1);
  };

  const handleBack = () => setStep(step - 1);

  const handleLaunch = async () => {
    if (!user) return;
    setSaving(true);

    // Upsert brand assets — clear old entries then insert current set
    // This ensures logo_bright, logo_dark, and style_reference are always in sync
    await supabase.from("brand_assets").delete().eq("profile_id", user.id);
    if (uploadedAssets.length > 0) {
      await supabase.from("brand_assets").insert(
        uploadedAssets.map((a) => ({
          profile_id: user.id,
          asset_type: a.type,
          file_url: a.url,
          file_name: a.name,
        }))
      );
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

    // Fire background research if not already done
    if (business.website_url.trim() && !brandResearchComplete) {
      console.log("[Onboarding] Firing post-launch research");
      supabase.functions.invoke("auto-brand-research", {
        body: {
          websiteUrl: business.website_url.trim(),
          businessName: business.business_name.trim(),
          industry: business.industry,
          targetAudience: business.target_audience,
          brandVoice: tone || "professional",
        },
      }).then(({ error }) => {
        if (error) console.error("[Onboarding] Post-launch research failed:", error);
      });
    }

    toast.success("Welcome to Brandflow! 🚀");
    setSaving(false);
    navigate("/dashboard/strategy/new");
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
          <span className="text-lg font-bold text-foreground tracking-tight">Brandflow</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </span>
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
        {/* Research Loading Overlay on Step 2 */}
        {step === 1 && researching && (
          <div className="mb-6 rounded-xl border-2 border-primary/20 bg-primary/5 p-5 flex items-center gap-4 animate-in fade-in duration-300">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Brain className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Extracting brand DNA from your website…</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Analyzing colors, typography, voice, and competitive landscape. Your colors will auto-populate below.
              </p>
            </div>
          </div>
        )}
        
        {step === 1 && brandResearchComplete && !researching && (
          <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-3 animate-in fade-in duration-300">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Brand DNA extracted successfully</p>
              <p className="text-[10px] text-muted-foreground">Colors, voice, and audience have been auto-populated from your website.</p>
            </div>
          </div>
        )}

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
            <Button onClick={handleNext} disabled={researching} className="gap-2">
              {researching ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
              ) : (
                <>Next <ArrowRight className="w-4 h-4" /></>
              )}
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
