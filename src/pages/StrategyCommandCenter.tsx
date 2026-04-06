import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Loader2, Palette, Type, Zap, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const ARCHETYPES: Record<string, BrandArchetype[]> = {
  default: [
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
  ],
};

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
  const [archetypes, setArchetypes] = useState<BrandArchetype[]>(ARCHETYPES.default);
  const [savingArchetype, setSavingArchetype] = useState(false);

  // Determine mode on mount
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Check for brand research data
      const { data: memoryData } = await supabase
        .from("brand_memory")
        .select("context")
        .eq("profile_id", user.id)
        .eq("memory_type", "brand_profile")
        .eq("pattern_category", "auto_research")
        .limit(1)
        .single();

      if (memoryData?.context) {
        setBrandProfile(memoryData.context as unknown as BrandProfile);
        setMode("OPTIMIZATION");
      } else {
        // Check if user has a website
        const { data: profile } = await supabase
          .from("profiles")
          .select("website_url")
          .eq("id", user.id)
          .single();

        if (profile?.website_url?.trim()) {
          // Has website but research not done yet — still optimization mode, CMO will show standby
          setMode("OPTIMIZATION");
        } else {
          setMode("GENESIS");
        }
      }
      setLoading(false);
    };
    load();
  }, [user]);

  // Save archetype as brand profile
  const handleSelectArchetype = useCallback(async (archetype: BrandArchetype) => {
    setSelectedArchetype(archetype);
  }, []);

  const handleLockArchetype = useCallback(async () => {
    if (!user || !selectedArchetype) return;
    setSavingArchetype(true);

    // Save as brand_colors in profile
    await supabase.from("profiles").update({
      brand_colors: selectedArchetype.colors,
      brand_voice_tone: selectedArchetype.mood,
    } as any).eq("id", user.id);

    // Create a synthetic brand profile in brand_memory
    const syntheticProfile: BrandProfile = {
      summary: `${elevatorPitch}. Brand archetype: ${selectedArchetype.name} — ${selectedArchetype.description}`,
      brand_voice_detected: selectedArchetype.mood,
      visual_style: selectedArchetype.tagline,
      color_palette_suggestion: selectedArchetype.colors,
      key_differentiators: [elevatorPitch],
      content_themes: [selectedArchetype.mood, selectedArchetype.name.toLowerCase()],
      target_audience_insights: "New brand — audience to be defined through initial campaigns",
      competitor_landscape: "No competitive data yet — Genesis Mode active",
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
          {/* LEFT: Elevator Pitch Input */}
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
              </div>

              {/* Archetype Cards */}
              {elevatorPitch.trim().length > 10 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Choose Your Visual DNA</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Select a provisional brand identity. You can refine later.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {archetypes.map((arch) => {
                      const isSelected = selectedArchetype?.id === arch.id;
                      return (
                        <button
                          key={arch.id}
                          onClick={() => handleSelectArchetype(arch)}
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
                            {/* Color swatches */}
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
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-border px-5 py-3">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
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
                    {elevatorPitch.trim().length > 10
                      ? "I see you're building something new. I've prepared 3 Visual DNA archetypes based on your description. Select one and I'll configure your entire brand system."
                      : "I see you're starting fresh. Tell me what you're building and I'll define your Visual DNA — colors, typography, and strategic positioning."}
                  </p>
                </div>

                {selectedArchetype && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3 animate-in fade-in duration-500">
                    <p className="text-[9px] uppercase tracking-wider text-primary font-bold">Selected Identity</p>
                    <p className="text-lg font-bold text-foreground">{selectedArchetype.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedArchetype.description}</p>
                    <div className="flex gap-2 mt-2">
                      {Object.values(selectedArchetype.colors).map((c, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: c }} />
                          <span className="text-[10px] font-mono text-muted-foreground">{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Safe Mode Protocol */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] border-emerald-300 text-emerald-700 bg-emerald-50">
                      Safe Mode Active
                    </Badge>
                  </div>
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

  // ── OPTIMIZATION MODE — redirect to campaign creation ──
  return (
    <AppShell>
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* LEFT: Quick Campaign Setup */}
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

        {/* RIGHT: CMO Strategy Panel */}
        <div className="hidden lg:flex w-[420px] xl:w-[480px] border-l border-border bg-secondary/20 flex-col shrink-0">
          <CMOStrategyPanel
            brandProfile={brandProfile}
            loadingProfile={false}
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
