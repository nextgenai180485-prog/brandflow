import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Loader2, Palette, Type, Zap, Check, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import CMOStrategyPanel from "@/components/CMOStrategyPanel";
import type { BrandProfile } from "@/types/campaigns";

// ── Genesis Archetypes ──
interface BrandArchetype {
  id: string;
  name: string;
  tagline: string;
  description: string;
  colors: { primary: string; secondary: string; accent: string };
  font: string;
  mood: string;
}

const FALLBACK_ARCHETYPES: BrandArchetype[] = [
  {
    id: "the-purist",
    name: "The Purist",
    tagline: "Minimalist · Clean · Trustworthy",
    description: "Stripped-back aesthetic with maximum whitespace. Signals quality through restraint.",
    colors: { primary: "#1A1A1A", secondary: "#FAFAFA", accent: "#3B82F6" },
    font: "Inter",
    mood: "premium-minimal",
  },
  {
    id: "the-disruptor",
    name: "The Disruptor",
    tagline: "Bold · Electric · Unapologetic",
    description: "High-contrast, attention-grabbing visuals. Built to stop the scroll.",
    colors: { primary: "#FF6B35", secondary: "#0D0D0D", accent: "#FFD60A" },
    font: "Space Grotesk",
    mood: "bold-energetic",
  },
  {
    id: "the-sage",
    name: "The Sage",
    tagline: "Refined · Warm · Authoritative",
    description: "Earthy tones with editorial sophistication. Positions as the expert voice.",
    colors: { primary: "#2C3E50", secondary: "#F8F5F1", accent: "#D35400" },
    font: "Playfair Display",
    mood: "editorial-warm",
  },
];

type Mode = "OPTIMIZATION" | "GENESIS";

const StrategyCommandCenter = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode | null>(null);
  const [loading, setLoading] = useState(true);
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);

  // Genesis state
  const [elevatorPitch, setElevatorPitch] = useState("");
  const [selectedArchetype, setSelectedArchetype] = useState<BrandArchetype | null>(null);
  const [archetypes, setArchetypes] = useState<BrandArchetype[]>(FALLBACK_ARCHETYPES);
  const [generatingArchetypes, setGeneratingArchetypes] = useState(false);
  const [genesisAnalysis, setGenesisAnalysis] = useState("");
  const [savingArchetype, setSavingArchetype] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const lastPitchRef = useRef("");

  // Determine mode on mount
  const [researchLoading, setResearchLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
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

      if (profile?.website_url?.trim()) {
        // Has website but no research yet — trigger auto-research and show profile-based CMO
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

        // Fire auto-research in background
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

  // Debounced LLM archetype generation
  const generateArchetypes = useCallback(async (pitch: string) => {
    if (pitch.trim().length < 15 || pitch.trim() === lastPitchRef.current) return;
    lastPitchRef.current = pitch.trim();

    setGeneratingArchetypes(true);
    setSelectedArchetype(null);
    setGenesisAnalysis("");

    try {
      const { data, error } = await supabase.functions.invoke("cmo-agent", {
        body: { mode: "genesis", elevatorPitch: pitch.trim() },
      });

      if (error) {
        console.error("[Genesis] CMO error:", error);
        setArchetypes(FALLBACK_ARCHETYPES);
        toast.error("Using default archetypes — AI generation temporarily unavailable.");
      } else if (data?.genesis) {
        setArchetypes(data.genesis.archetypes || FALLBACK_ARCHETYPES);
        setGenesisAnalysis(data.genesis.analysis || "");
      } else {
        setArchetypes(FALLBACK_ARCHETYPES);
      }
    } catch (e) {
      console.error("[Genesis] Error:", e);
      setArchetypes(FALLBACK_ARCHETYPES);
    } finally {
      setGeneratingArchetypes(false);
    }
  }, []);

  // Trigger generation on pitch change (debounced 1.5s)
  useEffect(() => {
    if (mode !== "GENESIS" || elevatorPitch.trim().length < 15) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => generateArchetypes(elevatorPitch), 1500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [elevatorPitch, mode, generateArchetypes]);

  // Save archetype as brand profile
  const handleLockArchetype = useCallback(async () => {
    if (!user || !selectedArchetype) return;
    setSavingArchetype(true);

    await supabase.from("profiles").update({
      brand_colors: selectedArchetype.colors,
      brand_voice_tone: selectedArchetype.mood,
    } as any).eq("id", user.id);

    const syntheticProfile: BrandProfile = {
      summary: `${elevatorPitch}. Brand archetype: ${selectedArchetype.name} — ${selectedArchetype.description}`,
      brand_voice_detected: selectedArchetype.mood,
      visual_style: selectedArchetype.tagline,
      color_palette_suggestion: selectedArchetype.colors,
      target_audience_detected: "New brand — audience to be defined through initial campaigns",
      competitors: [],
      key_themes: [selectedArchetype.mood, selectedArchetype.name.toLowerCase()],
      content_pillars: [elevatorPitch],
    };

    await supabase.from("brand_memory").insert({
      profile_id: user.id,
      memory_type: "brand_profile",
      pattern_category: "auto_research",
      pattern_value: "genesis_archetype",
      context: syntheticProfile as any,
      frequency: 1,
    });

    setBrandProfile(syntheticProfile);
    setMode("OPTIMIZATION");
    setSavingArchetype(false);
    toast.success(`"${selectedArchetype.name}" locked as your brand identity.`);
  }, [user, selectedArchetype, elevatorPitch]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  // ── GENESIS MODE ──
  if (mode === "GENESIS") {
    return (
      <AppShell>
        <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
          {/* LEFT: Elevator Pitch + Archetypes */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-lg mx-auto py-12 px-6 space-y-8">
              <div>
                <Badge variant="outline" className="text-[10px] mb-4 border-primary/30 text-primary">
                  Genesis Mode
                </Badge>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                  Let's architect your brand.
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  No website? No problem. Tell me what you're building and I'll generate your Visual DNA.
                </p>
              </div>

              {/* Elevator Pitch */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  In one sentence, what are you building?
                </label>
                <Textarea
                  placeholder="e.g. A luxury medspa offering non-invasive anti-aging treatments in Lagos…"
                  value={elevatorPitch}
                  onChange={(e) => setElevatorPitch(e.target.value)}
                  rows={3}
                  className="text-base resize-none"
                  autoFocus
                />
                {elevatorPitch.trim().length > 0 && elevatorPitch.trim().length < 15 && (
                  <p className="text-[11px] text-muted-foreground">Keep typing… need a bit more to analyze.</p>
                )}
              </div>

              {/* Loading state */}
              {generatingArchetypes && (
                <div className="flex items-center gap-3 py-6 animate-in fade-in duration-300">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-primary animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">CMO is analyzing your concept…</p>
                    <p className="text-xs text-muted-foreground">Generating 3 custom brand archetypes</p>
                  </div>
                </div>
              )}

              {/* Archetype Cards */}
              {!generatingArchetypes && elevatorPitch.trim().length >= 15 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Choose Your Visual DNA</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {genesisAnalysis || "Select a provisional brand identity. You can refine later."}
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {archetypes.map((arch) => {
                      const isSelected = selectedArchetype?.id === arch.id;
                      return (
                        <button
                          key={arch.id}
                          onClick={() => setSelectedArchetype(arch)}
                          className={`relative text-left rounded-xl border-2 p-5 transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 shadow-md"
                              : "border-border bg-card hover:border-foreground/20 hover:shadow-sm"
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-primary-foreground" />
                            </div>
                          )}

                          <div className="flex items-start gap-4">
                            <div className="flex flex-col gap-1.5 shrink-0 mt-0.5">
                              <div className="w-8 h-8 rounded-lg border border-border" style={{ backgroundColor: arch.colors.primary }} />
                              <div className="w-8 h-8 rounded-lg border border-border" style={{ backgroundColor: arch.colors.secondary }} />
                              <div className="w-8 h-8 rounded-lg border border-border" style={{ backgroundColor: arch.colors.accent }} />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-foreground">{arch.name}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{arch.tagline}</p>
                              <p className="text-xs text-foreground/80 mt-2 leading-relaxed">{arch.description}</p>
                              <div className="flex items-center gap-2 mt-3">
                                <Badge variant="secondary" className="text-[9px] gap-1">
                                  <Type className="w-2.5 h-2.5" /> {arch.font}
                                </Badge>
                                <Badge variant="secondary" className="text-[9px] gap-1">
                                  <Palette className="w-2.5 h-2.5" /> {arch.mood}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Lock Button */}
                  {selectedArchetype && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <Button
                        size="lg"
                        className="w-full h-12 text-sm font-bold gap-2"
                        onClick={handleLockArchetype}
                        disabled={savingArchetype}
                      >
                        {savingArchetype ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Locking Identity…</>
                        ) : (
                          <><Zap className="w-4 h-4" /> Lock "{selectedArchetype.name}" & Enter Command Center</>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: CMO Genesis Brain */}
          <div className="hidden lg:flex w-[420px] xl:w-[480px] border-l border-border bg-secondary/20 flex-col shrink-0">
            <div className="h-full flex flex-col">
              <div className="flex items-center gap-3 border-b border-border px-5 py-3">
                <div className="flex gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${generatingArchetypes ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.15em]">
                  CMO Intelligence — Genesis Mode
                </span>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
                <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Brand Architect
                    </span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">
                    {generatingArchetypes
                      ? "Analyzing your concept… Identifying market positioning, competitive gaps, and visual language opportunities."
                      : genesisAnalysis
                        ? genesisAnalysis
                        : elevatorPitch.trim().length >= 15
                          ? "I've prepared 3 Visual DNA archetypes based on your concept. Each represents a distinct strategic positioning. Select one to lock your brand identity."
                          : "I see you're starting fresh. Tell me what you're building and I'll architect your Visual DNA — AI-generated colors, typography, and strategic positioning tailored to your concept."}
                  </p>
                </div>

                {selectedArchetype && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3 animate-in fade-in duration-500">
                    <p className="text-[9px] uppercase tracking-wider text-primary font-bold">Selected Identity</p>
                    <p className="text-lg font-bold text-foreground">{selectedArchetype.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedArchetype.description}</p>
                    <div className="flex gap-2 mt-2">
                      {Object.entries(selectedArchetype.colors).map(([key, c]) => (
                        <div key={key} className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: c }} />
                          <span className="text-[10px] font-mono text-muted-foreground">{c}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary" className="text-[9px]">
                        <Type className="w-2.5 h-2.5 mr-1" /> {selectedArchetype.font}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Safe Mode Protocol */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <Badge variant="outline" className="text-[9px] border-emerald-300 text-emerald-700 bg-emerald-50">
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
              <Badge variant="outline" className="text-[10px] mb-4 border-emerald-300 text-emerald-700 bg-emerald-50">
                Brand Analyzed
              </Badge>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Your CMO has 3 strategies ready.
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                Based on your brand intelligence, let's create your first campaign.
              </p>
            </div>

            {brandProfile && (
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
