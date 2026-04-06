import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Loader2, Zap, Brain, MessageSquare, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CMOStrategyPanel from "@/components/CMOStrategyPanel";
import CMOChat from "@/components/CMOChat";
import FounderInterview from "@/components/FounderInterview";
import type { BrandProfile } from "@/types/campaigns";

type Mode = "OPTIMIZATION" | "GENESIS";

const StrategyCommandCenter = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode | null>(null);
  const [loading, setLoading] = useState(true);
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [researchLoading, setResearchLoading] = useState(false);

  // Genesis state
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [strategyBoard, setStrategyBoard] = useState<any>(null);

  // Determine mode on mount
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Check for existing brand_strategy first
      const { data: existingStrategy } = await supabase
        .from("brand_strategy" as any)
        .select("*")
        .eq("profile_id", user.id)
        .limit(1);

      if (existingStrategy && existingStrategy.length > 0) {
        const strat = existingStrategy[0] as any;
        if (strat.strategy_generated) {
          setStrategyBoard(strat);
        }
      }

      // Try brand_memory first
      const { data: memoryRows } = await supabase
        .from("brand_memory")
        .select("context")
        .eq("profile_id", user.id)
        .eq("memory_type", "brand_profile")
        .eq("pattern_category", "auto_research")
        .limit(1);

      const memoryData = memoryRows?.[0];

      if (memoryData?.context) {
        setBrandProfile(memoryData.context as unknown as BrandProfile);
        setMode("OPTIMIZATION");
        setLoading(false);
        return;
      }

      // Fallback: build profile from campaign_research intelligence_brief
      const { data: researchRows } = await supabase
        .from("campaign_research")
        .select("intelligence_brief, results")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const research = researchRows?.[0];
      if (research?.intelligence_brief) {
        const brief = research.intelligence_brief as any;
        const branding = (research.results as any)?.firecrawl_branding;
        const syntheticProfile: BrandProfile = {
          summary: brief.summary || "Brand analyzed from research data.",
          brand_voice_detected: branding?.personality?.tone || "professional",
          visual_style: branding?.colorScheme || "modern",
          color_palette_suggestion: branding?.colors
            ? { primary: branding.colors.primary, secondary: branding.colors.secondary, accent: branding.colors.accent }
            : undefined,
          target_audience_detected: brief.market_gap || "",
          competitors: brief.competitors || [],
          key_themes: brief.hooks || [],
          content_pillars: brief.avoid || [],
        };
        setBrandProfile(syntheticProfile);
        setMode("OPTIMIZATION");
        setLoading(false);
        return;
      }

      // No data at all — check for website URL
      const { data: profile } = await supabase
        .from("profiles")
        .select("website_url, business_name, industry, target_audience")
        .eq("id", user.id)
        .single();

      setBusinessName(profile?.business_name || "");
      setIndustry(profile?.industry || "");

      if (profile?.website_url?.trim()) {
        const minimalProfile: BrandProfile = {
          summary: `Analyzing ${profile.business_name || 'your brand'} (${profile.website_url}). ${profile.industry ? `Industry: ${profile.industry}.` : ''} ${profile.target_audience ? `Target: ${profile.target_audience}.` : ''} Deep brand intelligence is being synthesized — the CSO is crawling your website for competitive positioning.`,
          brand_voice_detected: "analyzing",
          visual_style: "pending deep-crawl",
          color_palette_suggestion: undefined,
          target_audience_detected: profile.target_audience || "",
          competitors: [],
          key_themes: [],
          content_pillars: [],
        };
        setBrandProfile(minimalProfile);
        setMode("OPTIMIZATION");
        setLoading(false);

        setResearchLoading(true);
        supabase.functions.invoke("auto-brand-research", {
          body: { websiteUrl: profile.website_url, profileId: user.id },
        }).then(async ({ data }) => {
          if (data?.brandProfile) {
            setBrandProfile(data.brandProfile as BrandProfile);
          }
          setResearchLoading(false);
        }).catch(() => setResearchLoading(false));
      } else {
        setMode("GENESIS");
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleStrategyGenerated = useCallback((board: any) => {
    setStrategyBoard(board);
    // Build a brand profile from the strategy for the CMO panel
    const syntheticProfile: BrandProfile = {
      summary: board.cmo_directive,
      brand_voice_detected: board.core_identity?.brand_voice || "strategic",
      visual_style: board.core_identity?.visual_direction || "custom",
      color_palette_suggestion: board.suggested_colors,
      target_audience_detected: board.persona_card?.psychographic || "",
      competitors: [],
      key_themes: [board.core_identity?.archetype, board.core_identity?.hero_journey].filter(Boolean),
      content_pillars: [
        board.funnel_stages?.tof?.strategy_name,
        board.funnel_stages?.mof?.strategy_name,
        board.funnel_stages?.bof?.strategy_name,
      ].filter(Boolean),
    };
    setBrandProfile(syntheticProfile);
    setMode("OPTIMIZATION");
  }, []);

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  // ── GENESIS MODE — Founder Interview ──
  if (mode === "GENESIS") {
    return (
      <AppShell>
        <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
          {/* LEFT: Founder Interview */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-lg mx-auto py-12 px-6">
              <FounderInterview
                businessName={businessName}
                industry={industry}
                onStrategyGenerated={handleStrategyGenerated}
              />
            </div>
          </div>

          {/* RIGHT: CMO Genesis Brain */}
          <div className="hidden lg:flex w-[420px] xl:w-[480px] border-l border-border bg-secondary/20 flex-col shrink-0">
            <div className="h-full flex flex-col">
              <div className="flex items-center gap-3 border-b border-border px-5 py-3">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.15em]">
                  CSO Intelligence — Founding Sprint
                </span>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
                <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Strategy Sprint Active
                    </span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">
                    I'm conducting a Founding Strategy Sprint — the same diagnostic a $20K branding agency performs. Answer the 3 questions and I'll generate your complete Brand Strategy Board: Persona Card, Funnel Architecture, and Launch Roadmap.
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Every recommendation will trace back to YOUR specific answers. No generic templates. No cookie-cutter brands.
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">
                    Safe Mode Active
                  </Badge>
                  <p className="text-[10px] text-muted-foreground">
                    All generations will follow the Swiss-Grid protocol: 60-30-10 color law, typographic hierarchy, and Rule of Thirds composition.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // ── OPTIMIZATION MODE ──
  return (
    <AppShell>
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-lg mx-auto py-12 px-6 space-y-8">
            <div>
              <Badge variant="outline" className="text-[10px] mb-4 border-primary/30 text-primary bg-primary/5">
                {strategyBoard ? "Strategy Board Ready" : "Brand Analyzed"}
              </Badge>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                {strategyBoard ? "Your strategy is locked." : "Your CMO has 3 strategies ready."}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                {strategyBoard
                  ? "Your Brand Strategy Board is active. Let's create your first campaign."
                  : "Based on your brand intelligence, let's create your first campaign."}
              </p>
            </div>

            {/* Show strategy board summary if from founder interview */}
            {strategyBoard?.core_identity && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Strategy Summary</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">Archetype</p>
                    <p className="text-sm font-bold text-foreground">{strategyBoard.core_identity.archetype}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">Focus</p>
                    <p className="text-sm font-medium text-foreground capitalize">{strategyBoard.current_focus || "Top of Funnel"}</p>
                  </div>
                </div>
                {strategyBoard.cmo_directive && (
                  <p className="text-xs text-foreground leading-relaxed border-t border-border pt-3 mt-3">
                    {strategyBoard.cmo_directive}
                  </p>
                )}
              </div>
            )}

            {brandProfile && !strategyBoard?.core_identity && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Brand Summary</p>
                <p className="text-sm text-foreground leading-relaxed line-clamp-4">{brandProfile.summary}</p>
                {brandProfile.color_palette_suggestion && (
                  <div className="flex gap-2">
                    {Object.entries(brandProfile.color_palette_suggestion).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: val }} />
                        <span className="text-[9px] text-muted-foreground capitalize">{key}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button
              size="lg"
              className="w-full h-12 text-sm font-bold gap-2"
              onClick={() => navigate("/dashboard/campaigns/new")}
            >
              <ArrowRight className="w-4 h-4" />
              Create Your First Campaign
            </Button>

            <button
              onClick={() => navigate("/dashboard")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
            >
              Skip to Dashboard →
            </button>
          </div>
        </div>

        <div className="hidden lg:flex w-[420px] xl:w-[480px] border-l border-border bg-secondary/20 flex-col shrink-0">
          <CMOStrategyPanel
            brandProfile={brandProfile}
            loadingProfile={researchLoading}
            selectedPlatforms={[]}
            selectedContentTypes={[]}
            campaignTitle=""
            campaignInstructions=""
          />
        </div>
      </div>
    </AppShell>
  );
};

export default StrategyCommandCenter;
