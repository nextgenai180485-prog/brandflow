import { useState, useEffect, useRef } from "react";
import {
  Search, TrendingUp, Palette, Target, ExternalLink, Star,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Loader2,
  Sparkles, BarChart3, Eye, Users, RefreshCw, Globe, FileText, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Competitor {
  name: string;
  strength: string;
  weakness: string;
  instagram_style?: string;
}

interface RecommendedFormat {
  platform: string;
  format: string;
  reason: string;
}

interface Source {
  title: string;
  url: string;
}

interface ExtractedColor {
  hex: string;
  source: string;
}

interface ExtractedAssets {
  logos: string[];
  ogImage: string | null;
  heroImages: string[];
}

export interface IntelligenceBrief {
  summary: string;
  competitors: Competitor[];
  trending_topics: string[];
  content_angles: string[];
  visual_direction: string;
  hooks: string[];
  avoid: string[];
  brand_gap_analysis: string;
  recommended_formats?: RecommendedFormat[];
  research_quality: number;
  sources: Source[];
  extracted_colors?: ExtractedColor[];
  extracted_assets?: ExtractedAssets;
}

export interface StreamPhase {
  phase: string;
  message: string;
}

interface ResearchPreviewPanelProps {
  brief: IntelligenceBrief | null;
  loading: boolean;
  onApprove: () => void;
  onRerun: () => void;
  approved: boolean;
  // Streaming props
  streamPhases?: StreamPhase[];
  streamColors?: ExtractedColor[];
  streamPages?: string[];
  streamAssets?: ExtractedAssets | null;
  isStreaming?: boolean;
}

// ── Typewriter Text ──────────────────────────────────────
const TypewriterText = ({ text, speed = 18, className }: { text: string; speed?: number; className?: string }) => {
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
    <span className={className}>
      {displayed}
      {!done && <span className="inline-block w-0.5 h-3.5 bg-primary ml-0.5 animate-pulse" />}
    </span>
  );
};

// ── Quality Stars ──────────────────────────────────────
const QualityStars = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} className={cn("w-3 h-3", i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
    ))}
    <span className="text-[10px] text-muted-foreground ml-1">{rating}/5</span>
  </div>
);

// ── Section Card ──────────────────────────────────────
const SectionCard = ({
  icon: Icon, title, children, defaultOpen = true, badge,
}: {
  icon: any; title: string; children: React.ReactNode; defaultOpen?: boolean; badge?: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-3 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-xs font-semibold text-foreground">{title}</span>
          {badge}
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
};

// ── Color Swatch ──────────────────────────────────────
const ColorSwatch = ({ color }: { color: ExtractedColor }) => (
  <div className="group relative">
    <div
      className="w-10 h-10 rounded-full border border-border shadow-sm cursor-default transition-transform hover:scale-110"
      style={{ backgroundColor: color.hex }}
    />
    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] bg-foreground text-background px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
      {color.hex} · {color.source}
    </span>
  </div>
);

// ── Streaming Phase Indicator ──────────────────────────
const PHASE_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  connecting: { icon: Globe, label: "Connecting", color: "text-blue-500" },
  crawling: { icon: FileText, label: "Crawling", color: "text-violet-500" },
  extracting: { icon: Palette, label: "Extracting", color: "text-emerald-500" },
  competitors: { icon: Users, label: "Competitors", color: "text-amber-500" },
  trends: { icon: TrendingUp, label: "Trends", color: "text-rose-500" },
  synthesis: { icon: Sparkles, label: "Synthesis", color: "text-primary" },
  complete: { icon: CheckCircle2, label: "Complete", color: "text-emerald-600" },
};

const StreamingLoader = ({
  phases, currentPhase, colors, pages, assets,
}: {
  phases: StreamPhase[]; currentPhase: string; colors: ExtractedColor[]; pages: string[]; assets: ExtractedAssets | null;
}) => {
  const phaseOrder = ["connecting", "crawling", "extracting", "competitors", "trends", "synthesis"];
  const currentIdx = phaseOrder.indexOf(currentPhase);
  const latestMessage = phases.length > 0 ? phases[phases.length - 1].message : "Initializing...";

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
      {/* Terminal-style header */}
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
        <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-[0.15em]">
          Exa Neural Crawler Active
        </span>
      </div>

      {/* Phase progress */}
      <div className="flex items-center gap-4 flex-wrap">
        {phaseOrder.map((phase, i) => {
          const config = PHASE_CONFIG[phase];
          const Icon = config.icon;
          const isActive = phase === currentPhase;
          const isDone = i < currentIdx;
          return (
            <div key={phase} className="flex items-center gap-1.5">
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center transition-all",
                isDone ? "bg-emerald-100" : isActive ? "bg-primary/10 ring-2 ring-primary/30" : "bg-muted"
              )}>
                {isDone ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Icon className={cn("w-3 h-3", isActive ? config.color : "text-muted-foreground/40")} />
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium",
                isDone ? "text-emerald-600" : isActive ? "text-foreground" : "text-muted-foreground/50"
              )}>
                {config.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Live status message with typewriter */}
      <div className="rounded-lg bg-secondary/50 border border-border/50 px-4 py-3">
        <TypewriterText text={latestMessage} speed={12} className="text-xs text-foreground font-mono" />
      </div>

      {/* Found pages badges */}
      {pages.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Pages Found</span>
          <div className="flex flex-wrap gap-1.5">
            {pages.map((page, i) => (
              <Badge key={i} variant="outline" className="text-[10px] bg-violet-50 text-violet-700 border-violet-200 animate-in fade-in duration-300" style={{ animationDelay: `${i * 100}ms` }}>
                <FileText className="w-2.5 h-2.5 mr-1" /> {page || "Homepage"}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Extracted colors (appear as they're found) */}
      {colors.length > 0 && (
        <div className="space-y-2">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Detected Brand Palette</span>
          <div className="flex gap-2.5 flex-wrap">
            {colors.map((color, i) => (
              <div key={i} className="animate-in fade-in zoom-in duration-300" style={{ animationDelay: `${i * 80}ms` }}>
                <ColorSwatch color={color} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extracted logo */}
      {assets?.ogImage && (
        <div className="space-y-1.5">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Brand Asset</span>
          <img src={assets.ogImage} className="h-12 object-contain rounded animate-in fade-in duration-500" alt="Brand" />
        </div>
      )}
    </div>
  );
};

// ── Main Component ──────────────────────────────────────
const ResearchPreviewPanel = ({
  brief, loading, onApprove, onRerun, approved,
  streamPhases = [], streamColors = [], streamPages = [], streamAssets = null, isStreaming = false,
}: ResearchPreviewPanelProps) => {
  const [showSources, setShowSources] = useState(false);

  // Show streaming UI
  if (isStreaming || (loading && streamPhases.length > 0)) {
    const currentPhase = streamPhases.length > 0 ? streamPhases[streamPhases.length - 1].phase : "connecting";
    return (
      <StreamingLoader
        phases={streamPhases}
        currentPhase={currentPhase}
        colors={streamColors}
        pages={streamPages}
        assets={streamAssets}
      />
    );
  }

  // Fallback loading (non-streaming)
  if (loading) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 p-8 flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Analyzing Market Intelligence</p>
          <p className="text-xs text-muted-foreground mt-1">Crawling website, extracting brand DNA, analyzing competitors…</p>
        </div>
      </div>
    );
  }

  if (!brief) return null;

  const colors = brief.extracted_colors || [];
  const assets = brief.extracted_assets;

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Brand DNA & Market Intelligence</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <QualityStars rating={brief.research_quality || 3} />
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] text-muted-foreground">{brief.sources?.length || 0} sources</span>
              {colors.length > 0 && (
                <>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-[10px] text-emerald-600 font-medium">{colors.length} colors extracted</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={onRerun}>
            <RefreshCw className="w-3 h-3" /> Re-run
          </Button>
          {!approved && (
            <Button size="sm" className="h-7 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onApprove}>
              <CheckCircle2 className="w-3 h-3" /> Approve & Generate
            </Button>
          )}
          {approved && (
            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
            </Badge>
          )}
        </div>
      </div>

      {/* Brand DNA Dashboard — 3-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Column 1-2: Summary + Voice (streamed typewriter) */}
        <div className="md:col-span-2 space-y-3">
          <div className="rounded-xl bg-secondary/50 border border-border p-4">
            <TypewriterText text={brief.summary} speed={10} className="text-xs text-foreground leading-relaxed" />
          </div>

          {brief.brand_gap_analysis && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Gap Analysis</span>
              </div>
              <p className="text-[11px] text-amber-900 leading-relaxed">{brief.brand_gap_analysis}</p>
            </div>
          )}
        </div>

        {/* Column 3: Visual Extraction (the "proof") */}
        <div className="space-y-3">
          {colors.length > 0 && (
            <div className="rounded-xl bg-secondary/30 border border-border p-4">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-3">Detected Palette</h3>
              <div className="flex gap-2 flex-wrap">
                {colors.map((color, i) => <ColorSwatch key={i} color={color} />)}
              </div>
            </div>
          )}

          {assets?.ogImage && (
            <div className="rounded-xl bg-secondary/30 border border-border p-4">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Primary Asset</h3>
              <img src={assets.ogImage} className="h-10 object-contain" alt="Brand" />
            </div>
          )}

          {assets && assets.logos.length > 0 && (
            <div className="rounded-xl bg-secondary/30 border border-border p-4">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Logos Detected</h3>
              <div className="space-y-1.5">
                {assets.logos.map((url, i) => (
                  <img key={i} src={url} className="h-8 object-contain" alt={`Logo ${i + 1}`} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Competitor Analysis */}
      {brief.competitors?.length > 0 && (
        <SectionCard icon={Users} title="Competitor Analysis" badge={
          <Badge variant="secondary" className="text-[9px] h-4">{brief.competitors.length} brands</Badge>
        }>
          <div className="space-y-2">
            {brief.competitors.map((c, i) => (
              <div key={i} className="rounded-lg border border-border bg-secondary/20 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-foreground">{c.name}</span>
                  <Badge variant="outline" className="text-[8px] h-3.5">#{i + 1}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[9px] text-emerald-600 font-medium uppercase tracking-wide">Strength</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{c.strength}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-red-500 font-medium uppercase tracking-wide">Weakness</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{c.weakness}</p>
                  </div>
                </div>
                {c.instagram_style && (
                  <div className="mt-1.5">
                    <span className="text-[9px] text-primary font-medium uppercase tracking-wide">IG Style</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{c.instagram_style}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Content Trends */}
      <SectionCard icon={TrendingUp} title="Content Trends" badge={
        <Badge variant="secondary" className="text-[9px] h-4">{brief.trending_topics?.length || 0} topics</Badge>
      }>
        <div className="flex flex-wrap gap-1.5">
          {brief.trending_topics?.map((topic, i) => (
            <Badge key={i} variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
              <TrendingUp className="w-2.5 h-2.5 mr-1" /> {topic}
            </Badge>
          ))}
        </div>
        {brief.content_angles?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">Recommended Angles</span>
            <ul className="mt-1.5 space-y-1">
              {brief.content_angles.map((angle, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <Sparkles className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                  <span className="text-[10px] text-foreground">{angle}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </SectionCard>

      {/* Visual Direction */}
      <SectionCard icon={Palette} title="Visual Style Guide">
        <p className="text-[11px] text-foreground leading-relaxed">{brief.visual_direction}</p>
      </SectionCard>

      {/* Hooks */}
      <SectionCard icon={Target} title="Hook Library" badge={
        <Badge variant="secondary" className="text-[9px] h-4">{brief.hooks?.length || 0} hooks</Badge>
      } defaultOpen={false}>
        <div className="space-y-1.5">
          {brief.hooks?.map((hook, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-secondary/30 px-3 py-2">
              <span className="text-[10px] font-bold text-primary mt-0.5">#{i + 1}</span>
              <p className="text-[10px] text-foreground leading-relaxed">{hook}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Avoid */}
      {brief.avoid?.length > 0 && (
        <SectionCard icon={AlertTriangle} title="Avoid" defaultOpen={false}>
          <ul className="space-y-1">
            {brief.avoid.map((item, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                <span className="text-[10px] text-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Sources */}
      {brief.sources?.length > 0 && (
        <div>
          <button
            onClick={() => setShowSources(!showSources)}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Search className="w-3 h-3" />
            <span>{showSources ? "Hide" : "View"} Research Sources ({brief.sources.length})</span>
            {showSources ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showSources && (
            <div className="mt-2 space-y-1 pl-4">
              {brief.sources.map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] text-primary hover:underline truncate">
                  <ExternalLink className="w-2.5 h-2.5 shrink-0" /> {s.title || s.url}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResearchPreviewPanel;
