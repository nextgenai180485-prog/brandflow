import { useState, useEffect, useRef, useCallback } from "react";
import {
  Shield, Sparkles, Loader2, Globe, Zap, Target, Lightbulb,
  Crosshair, Rocket, Eye, Swords, ArrowRight, RefreshCw, CheckCircle2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

// Typewriter
const TypewriterText = ({ text, speed = 16 }: { text: string; speed?: number }) => {
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

// Strategy card for each form change
interface StrategyInsight {
  id: string;
  title: string;
  message: string;
  type: "adjustment" | "blueprint" | "why";
}

const getInsightsForContext = (
  bp: BrandProfile | null,
  platforms: { platform: SocialPlatform; format: string }[],
  contentTypes: ContentType[],
  title: string,
  instructions: string
): StrategyInsight[] => {
  const insights: StrategyInsight[] = [];

  if (!bp) return insights;

  // Platform-specific insights
  const platformNames = [...new Set(platforms.map((p) => p.platform))];

  if (platformNames.includes("linkedin")) {
    insights.push({
      id: "linkedin-authority",
      title: "Strategic Adjustment",
      message: `Your website copy suggests a ${bp.brand_voice_detected || "professional"} tone — this performs 40% better on LinkedIn than visual-first platforms. Shifting generation mode to "Authority."`,
      type: "adjustment",
    });
  }

  if (platformNames.includes("tiktok") || platformNames.includes("instagram")) {
    insights.push({
      id: "social-visual",
      title: "Content Blueprint",
      message: `Your visual style (${bp.visual_style || "modern"}) is optimized for high-contrast, scroll-stopping content. Applying the "Visual ASMM" protocol for short-form engagement.`,
      type: "blueprint",
    });
  }

  if (platformNames.includes("facebook")) {
    insights.push({
      id: "fb-community",
      title: "The Why",
      message: `Competitors in ${bp.key_themes?.[0] || "your sector"} focus on product shots. We'll use "Social Proof Storytelling" — testimonial-style layouts that build community trust.`,
      type: "why",
    });
  }

  if (platformNames.includes("youtube")) {
    insights.push({
      id: "yt-long",
      title: "Strategic Adjustment",
      message: `YouTube rewards depth. Generating "Cinematic Authority" content using your brand palette to establish thought leadership in the ${bp.key_themes?.[0] || "market"}.`,
      type: "adjustment",
    });
  }

  // Content type insights
  if (contentTypes.includes("ugc_video")) {
    insights.push({
      id: "ugc-approach",
      title: "Content Blueprint",
      message: `UGC-style videos will use your ${bp.brand_voice_detected || "authentic"} voice DNA. Applying "Raw Authenticity" filter — no polish, maximum relatability.`,
      type: "blueprint",
    });
  }

  if (contentTypes.includes("pro_video")) {
    insights.push({
      id: "pro-approach",
      title: "The Why",
      message: `Pro video will follow the "60-30-10 Color Rule" — 60% neutral, 30% brand primary, 10% accent for CTAs. This ensures enterprise-grade visual consistency.`,
      type: "why",
    });
  }

  // Title/instructions insight
  if (title && title.length > 5) {
    insights.push({
      id: "campaign-context",
      title: "Strategic Adjustment",
      message: `Campaign "${title}" detected. Cross-referencing with your brand positioning to identify optimal messaging angles and visual hooks.`,
      type: "adjustment",
    });
  }

  // Always add brand overview if we have data
  if (insights.length === 0 && bp.summary) {
    insights.push({
      id: "brand-overview",
      title: "Brand Intelligence",
      message: bp.summary,
      type: "adjustment",
    });
  }

  return insights;
};

const INSIGHT_ICONS: Record<string, any> = {
  adjustment: Zap,
  blueprint: Target,
  why: Lightbulb,
};

const INSIGHT_COLORS: Record<string, string> = {
  adjustment: "bg-blue-500/10 text-blue-600",
  blueprint: "bg-emerald-500/10 text-emerald-600",
  why: "bg-amber-500/10 text-amber-600",
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
  const [insights, setInsights] = useState<StrategyInsight[]>([]);
  const [activeInsight, setActiveInsight] = useState(0);

  // Update insights reactively when form changes
  useEffect(() => {
    const newInsights = getInsightsForContext(
      brandProfile,
      selectedPlatforms,
      selectedContentTypes,
      campaignTitle,
      campaignInstructions
    );
    setInsights(newInsights);
    setActiveInsight(0);
  }, [brandProfile, selectedPlatforms, selectedContentTypes, campaignTitle, campaignInstructions]);

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
            Your brand intelligence will appear here once research completes. Start building your campaign on the left.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.15em]">
          CMO Strategy Engine — Live
        </span>
      </div>

      {/* Scrollable strategy content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* Brand DNA Card */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wide">Brand DNA</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{brandProfile.summary}</p>
          <div className="flex flex-wrap gap-1.5">
            {brandProfile.brand_voice_detected && (
              <Badge variant="outline" className="text-[9px]">
                Voice: {brandProfile.brand_voice_detected}
              </Badge>
            )}
            {brandProfile.visual_style && (
              <Badge variant="outline" className="text-[9px]">
                Style: {brandProfile.visual_style}
              </Badge>
            )}
            {brandProfile.key_themes?.slice(0, 3).map((t) => (
              <Badge key={t} variant="outline" className="text-[9px] bg-secondary">
                {t}
              </Badge>
            ))}
          </div>
        </div>

        {/* Reactive Insights */}
        {insights.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                Live Strategic Guidance
              </span>
              <Badge variant="secondary" className="text-[9px] ml-auto">
                {insights.length} insight{insights.length !== 1 ? "s" : ""}
              </Badge>
            </div>

            {insights.map((insight, i) => {
              const Icon = INSIGHT_ICONS[insight.type] || Zap;
              const colorClass = INSIGHT_COLORS[insight.type] || "bg-primary/10 text-primary";
              return (
                <div
                  key={insight.id}
                  className="rounded-xl border border-border bg-card p-4 space-y-2 animate-in fade-in slide-in-from-right-5 duration-300"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", colorClass)}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {insight.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-foreground leading-relaxed">
                    <TypewriterText text={insight.message} speed={8} />
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-border bg-secondary/30 p-6 flex flex-col items-center gap-3">
            <Target className="w-6 h-6 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground text-center">
              Select platforms and content types on the left to see real-time strategic guidance.
            </p>
          </div>
        )}

        {/* Safe Mode Design Laws */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-foreground" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wide">
              Generation Protocol
            </span>
            <Badge variant="outline" className="text-[9px] ml-auto border-emerald-300 text-emerald-700 bg-emerald-50">
              Safe Mode
            </Badge>
          </div>
          <div className="space-y-2">
            {[
              { law: "60-30-10 Color Rule", desc: "60% neutral, 30% brand primary, 10% accent CTAs" },
              { law: "Typographic Hierarchy", desc: "San Francisco/Inter, Bold headlines, Left-aligned body" },
              { law: "Hero Composition", desc: "Rule of Thirds, product center-right, text in negative space" },
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
        <div className="border-t border-border px-6 py-4">
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
