import { useState, useEffect, useRef, useCallback } from "react";
import {
  Shield, Sparkles, Loader2, Globe, Zap, Target, Lightbulb,
  Crosshair, Eye, ArrowRight, CheckCircle2, Brain, Radio
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { BrandProfile, SocialPlatform, ContentType } from "@/types/campaigns";

interface CMOStrategyPanelProps {
  brandProfile: BrandProfile | null;
  loadingProfile: boolean;
  selectedPlatforms: { platform: SocialPlatform; format: string }[];
  selectedContentTypes: ContentType[];
  campaignTitle: string;
  campaignInstructions: string;
  onGenerateConcepts?: () => void;
}

interface CMOStrategy {
  detected_strategy: string;
  reasoning: string;
  visual_lock: string;
  intent: string;
  platform_adjustment?: string;
  content_blueprint?: string;
}

// Typewriter
const TypewriterText = ({ text, speed = 12 }: { text: string; speed?: number }) => {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const idx = useRef(0);

  useEffect(() => {
    idx.current = 0;
    setDisplayed("");
    setDone(false);
    if (!text) return;
    const interval = setInterval(() => {
      idx.current++;
      if (idx.current >= text.length) {
        setDisplayed(text);
        setDone(true);
        clearInterval(interval);
      } else {
        setDisplayed(text.substring(0, idx.current));
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {!done && <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse" />}
    </span>
  );
};

const CMOStrategyPanel = ({
  brandProfile,
  loadingProfile,
  selectedPlatforms,
  selectedContentTypes,
  campaignTitle,
  campaignInstructions,
  onGenerateConcepts,
}: CMOStrategyPanelProps) => {
  const [strategy, setStrategy] = useState<CMOStrategy | null>(null);
  const [loadingStrategy, setLoadingStrategy] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const lastRequestRef = useRef("");

  // Reactive CMO Agent: debounced call on form changes
  const fetchStrategy = useCallback(async () => {
    if (!brandProfile || selectedPlatforms.length === 0) {
      setStrategy(null);
      return;
    }

    const requestKey = JSON.stringify({
      platforms: selectedPlatforms,
      contentTypes: selectedContentTypes,
      title: campaignTitle,
    });

    if (requestKey === lastRequestRef.current) return;
    lastRequestRef.current = requestKey;

    setLoadingStrategy(true);
    try {
      const { data, error } = await supabase.functions.invoke("cmo-agent", {
        body: {
          brandProfile,
          selectedPlatforms,
          selectedContentTypes,
          campaignTitle,
          campaignGoal: "conversion",
        },
      });

      if (!error && data?.strategy) {
        setStrategy(data.strategy);
      }
    } catch (e) {
      console.error("CMO Agent error:", e);
    } finally {
      setLoadingStrategy(false);
    }
  }, [brandProfile, selectedPlatforms, selectedContentTypes, campaignTitle]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchStrategy, 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [fetchStrategy]);

  // ── Loading state ──
  if (loadingProfile) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 px-6">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="w-7 h-7 text-primary animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Loading Brand Intelligence…</p>
          <p className="text-xs text-muted-foreground mt-1">Retrieving your brand DNA profile</p>
        </div>
      </div>
    );
  }

  // ── No brand data ──
  if (!brandProfile) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 px-6">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
          <Globe className="w-7 h-7 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">CMO Standby</p>
          <p className="text-xs text-muted-foreground mt-1">
            Your brand intelligence will appear here once research completes.
          </p>
        </div>
      </div>
    );
  }

  const colors = brandProfile.color_palette_suggestion;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <div className={cn("w-2 h-2 rounded-full", strategy ? "bg-emerald-400 animate-pulse" : brandProfile ? "bg-emerald-400" : "bg-muted-foreground/30")} />
        </div>
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.15em]">
          CMO Intelligence — {strategy ? "Active" : brandProfile ? "Ready" : "Standby"}
        </span>
        {loadingStrategy && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground ml-auto" />}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

        {/* ═══ CMO Intelligence Card ═══ */}
        {strategy ? (
          <div className="space-y-4 animate-in fade-in duration-500">
            {/* Strategy Header */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  CMO Intelligence
                </span>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">Detected Strategy</p>
                  <p className="text-sm font-bold text-primary leading-tight">
                    <TypewriterText text={strategy.detected_strategy} speed={20} />
                  </p>
                </div>

                <div>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">Reasoning</p>
                  <p className="text-[11px] text-foreground leading-relaxed">
                    <TypewriterText text={strategy.reasoning} speed={8} />
                  </p>
                </div>

                <div>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">Visual Lock</p>
                  <p className="text-xs font-semibold text-foreground">
                    {strategy.visual_lock}
                  </p>
                </div>
              </div>
            </div>

            {/* Platform Adjustment */}
            {strategy.platform_adjustment && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-2 animate-in fade-in slide-in-from-right-3 duration-300">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                    Strategic Adjustment
                  </span>
                </div>
                <p className="text-[11px] text-foreground leading-relaxed">
                  <TypewriterText text={strategy.platform_adjustment} speed={8} />
                </p>
              </div>
            )}

            {/* Content Blueprint */}
            {strategy.content_blueprint && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-2 animate-in fade-in slide-in-from-right-3 duration-300" style={{ animationDelay: "100ms" }}>
                <div className="flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                    Content Blueprint
                  </span>
                </div>
                <p className="text-[11px] text-foreground leading-relaxed">
                  <TypewriterText text={strategy.content_blueprint} speed={8} />
                </p>
              </div>
            )}
          </div>
        ) : (
          /* ── Brand-aware idle state ── */
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  CMO Intelligence — Active
                </span>
              </div>
              <p className="text-[11px] text-foreground leading-relaxed">
                {brandProfile?.summary
                  ? `I've analyzed your brand positioning. ${brandProfile.summary.substring(0, 200)}${brandProfile.summary.length > 200 ? '…' : ''}`
                  : "Your brand intelligence is loaded. Select platforms in a campaign to activate real-time strategic guidance."}
              </p>
              {brandProfile?.key_themes && brandProfile.key_themes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {brandProfile.key_themes.slice(0, 4).map((theme, i) => (
                    <Badge key={i} variant="secondary" className="text-[9px]">{theme}</Badge>
                  ))}
                </div>
              )}
            </div>

            {brandProfile?.competitors && brandProfile.competitors.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                    Competitive Landscape
                  </span>
                </div>
                <div className="space-y-1.5">
                  {brandProfile.competitors.slice(0, 3).map((comp: any, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 mt-1.5 shrink-0" />
                      <p className="text-[10px] text-foreground">
                        <span className="font-semibold">{comp.name || comp}</span>
                        {comp.weakness && <span className="text-muted-foreground"> — {comp.weakness}</span>}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ Status Bar ═══ */}
        <div className="rounded-xl border border-border bg-card">
          <div className="grid grid-cols-3 divide-x divide-border">
            <div className="p-3 text-center">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">System</p>
              <p className="text-xs font-bold text-foreground">
                {strategy ? "Online" : "Standby"}
              </p>
            </div>
            <div className="p-3 text-center">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">Format</p>
              <p className="text-xs font-bold text-foreground">
                {selectedPlatforms.length > 0
                  ? `${selectedPlatforms.length} format${selectedPlatforms.length !== 1 ? "s" : ""}`
                  : "—"}
              </p>
            </div>
            <div className="p-3 text-center">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">Intent</p>
              <p className="text-xs font-bold text-foreground">
                {strategy?.intent || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* ═══ Brand DNA (compact) ═══ */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">Brand DNA</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">{brandProfile.summary}</p>
          <div className="flex flex-wrap gap-1.5">
            {brandProfile.brand_voice_detected && (
              <Badge variant="outline" className="text-[9px]">
                {brandProfile.brand_voice_detected}
              </Badge>
            )}
            {brandProfile.visual_style && (
              <Badge variant="outline" className="text-[9px]">
                {brandProfile.visual_style}
              </Badge>
            )}
          </div>
          {/* Color swatches */}
          {colors && (
            <div className="flex gap-2 items-center">
              <div className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: colors.primary }} />
              <div className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: colors.secondary }} />
              <div className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: colors.accent }} />
              <span className="text-[9px] text-muted-foreground ml-1">Extracted palette</span>
            </div>
          )}
        </div>

        {/* ═══ Safe Mode Protocol ═══ */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-foreground" />
            <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">
              Generation Protocol
            </span>
            <Badge variant="outline" className="text-[9px] ml-auto border-emerald-300 text-emerald-700 bg-emerald-50">
              Safe Mode
            </Badge>
          </div>
          <div className="space-y-2">
            {[
              { law: "60-30-10 Color Rule", desc: "60% neutral, 30% brand primary, 10% accent CTAs" },
              { law: "Typographic Hierarchy", desc: "Inter/SF, Bold headlines, Left-aligned body" },
              { law: "Hero Composition", desc: "Rule of Thirds, product center-right, negative space text" },
            ].map(({ law, desc }, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-foreground">Law {i + 1}: {law}</span>
                  <p className="text-[10px] text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      {onGenerateConcepts && (
        <div className="border-t border-border px-5 py-4">
          <Button
            onClick={onGenerateConcepts}
            className="w-full h-12 text-sm font-bold gap-2"
            size="lg"
          >
            <Sparkles className="w-4 h-4" />
            Generate Campaign Concepts
          </Button>
        </div>
      )}
    </div>
  );
};

export default CMOStrategyPanel;
