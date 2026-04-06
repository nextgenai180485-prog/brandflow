import { useState, useEffect, useRef } from "react";
import {
  Search, TrendingUp, Palette, Target, ExternalLink, Star,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Loader2,
  Sparkles, BarChart3, Eye, Users, RefreshCw, Globe, FileText, Zap,
  Crosshair, Rocket, Lightbulb, ArrowRight, Shield, Swords
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

interface AttackVector {
  label: string;
  type: "low_hanging_fruit" | "wedge" | "moonshot";
  platform: string;
  insight: string;
  strategy: string;
  action: string;
}

interface CompetitorMatrixRow {
  dimension: string;
  market_standard: string;
  your_edge: string;
}

export interface IntelligenceBrief {
  brand_diagnosis?: string;
  market_gap?: string;
  competitor_matrix?: CompetitorMatrixRow[];
  attack_vectors?: AttackVector[];
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
      {!done && <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse" />}
    </span>
  );
};

// ── Quality Stars ──────────────────────────────────────
const QualityStars = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} className={cn("w-3.5 h-3.5", i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20")} />
    ))}
  </div>
);

// ── Color Swatch ──────────────────────────────────────
const ColorSwatch = ({ color }: { color: ExtractedColor }) => (
  <div className="group relative">
    <div
      className="w-10 h-10 rounded-full border-2 border-background shadow-md cursor-default transition-transform hover:scale-110"
      style={{ backgroundColor: color.hex }}
    />
    <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[9px] bg-foreground text-background px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 font-mono">
      {color.hex}
    </span>
  </div>
);

// ── Collapsible Section ──────────────────────────────────
const Section = ({
  icon: Icon, title, children, defaultOpen = true, badge, accent,
}: {
  icon: any; title: string; children: React.ReactNode; defaultOpen?: boolean; badge?: React.ReactNode; accent?: string;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-5 py-3.5 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", accent || "bg-primary/10")}>
            <Icon className={cn("w-4 h-4", accent ? "text-white" : "text-primary")} />
          </div>
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {badge}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  );
};

// ── Phase progress config ──────────────────────────────
const PHASE_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  connecting: { icon: Globe, label: "Connecting", color: "text-blue-500" },
  crawling: { icon: FileText, label: "Crawling", color: "text-violet-500" },
  extracting: { icon: Palette, label: "Extracting", color: "text-emerald-500" },
  competitors: { icon: Users, label: "Competitors", color: "text-amber-500" },
  trends: { icon: TrendingUp, label: "Trends", color: "text-rose-500" },
  synthesis: { icon: Sparkles, label: "CMO Analysis", color: "text-primary" },
  complete: { icon: CheckCircle2, label: "Complete", color: "text-emerald-600" },
};

// ── Attack Vector Card ──────────────────────────────────
const VECTOR_META: Record<string, { icon: any; label: string; badge: string; gradient: string }> = {
  low_hanging_fruit: { icon: Lightbulb, label: "Quick Win", badge: "Vector A", gradient: "from-emerald-500/10 to-emerald-600/5" },
  wedge: { icon: Crosshair, label: "The Wedge", badge: "Vector B", gradient: "from-amber-500/10 to-amber-600/5" },
  moonshot: { icon: Rocket, label: "Moonshot", badge: "Vector C", gradient: "from-violet-500/10 to-violet-600/5" },
};

const AttackVectorCard = ({ vector }: { vector: AttackVector }) => {
  const meta = VECTOR_META[vector.type] || VECTOR_META.wedge;
  const Icon = meta.icon;
  return (
    <div className={cn("rounded-xl border border-border p-5 bg-gradient-to-br", meta.gradient)}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center">
          <Icon className="w-4 h-4 text-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[9px] h-4 font-bold">{meta.badge}</Badge>
            <span className="text-xs font-semibold text-foreground">{vector.label}</span>
          </div>
          <span className="text-[10px] text-muted-foreground">{vector.platform}</span>
        </div>
      </div>
      <div className="space-y-2.5">
        <div className="flex items-start gap-2">
          <Eye className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">The Insight</span>
            <p className="text-[11px] text-foreground mt-0.5">{vector.insight}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Swords className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">The Strategy</span>
            <p className="text-[11px] text-foreground mt-0.5">{vector.strategy}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <ArrowRight className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
          <div>
            <span className="text-[9px] font-bold text-primary uppercase tracking-wide">The Action</span>
            <p className="text-[11px] text-foreground mt-0.5 font-medium">{vector.action}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Streaming Loader (Terminal UI) ──────────────────────
const StreamingLoader = ({
  phases, currentPhase, colors, pages, assets,
}: {
  phases: StreamPhase[]; currentPhase: string; colors: ExtractedColor[]; pages: string[]; assets: ExtractedAssets | null;
}) => {
  const phaseOrder = ["connecting", "crawling", "extracting", "competitors", "trends", "synthesis"];
  const currentIdx = phaseOrder.indexOf(currentPhase);
  const latestMessage = phases.length > 0 ? phases[phases.length - 1].message : "Initializing...";

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-sm">
      {/* Terminal header */}
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-[0.15em]">
          CMO Intelligence Engine — Active
        </span>
      </div>

      {/* Phase progress */}
      <div className="flex items-center gap-3 flex-wrap">
        {phaseOrder.map((phase, i) => {
          const config = PHASE_CONFIG[phase];
          const Icon = config.icon;
          const isActive = phase === currentPhase;
          const isDone = i < currentIdx;
          return (
            <div key={phase} className="flex items-center gap-1.5">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                isDone ? "bg-emerald-100" : isActive ? "bg-primary/10 ring-2 ring-primary/30" : "bg-muted"
              )}>
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : isActive ? (
                  <Loader2 className={cn("w-3.5 h-3.5 animate-spin", config.color)} />
                ) : (
                  <Icon className="w-3.5 h-3.5 text-muted-foreground/30" />
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium",
                isDone ? "text-emerald-600" : isActive ? "text-foreground" : "text-muted-foreground/40"
              )}>
                {config.label}
              </span>
              {i < phaseOrder.length - 1 && (
                <div className={cn("w-6 h-px", isDone ? "bg-emerald-300" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>

      {/* Live status */}
      <div className="rounded-lg bg-foreground/[0.03] border border-border/50 px-4 py-3">
        <TypewriterText text={latestMessage} speed={12} className="text-xs text-foreground font-mono" />
      </div>

      {/* Found pages */}
      {pages.length > 0 && (
        <div className="space-y-2">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Pages Discovered</span>
          <div className="flex flex-wrap gap-1.5">
            {pages.map((page, i) => (
              <Badge key={i} variant="outline" className="text-[10px] bg-violet-50 text-violet-700 border-violet-200 animate-in fade-in duration-300" style={{ animationDelay: `${i * 100}ms` }}>
                <FileText className="w-2.5 h-2.5 mr-1" /> {page || "Homepage"}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Extracted colors */}
      {colors.length > 0 && (
        <div className="space-y-2">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Brand Palette Extracted</span>
          <div className="flex gap-3 flex-wrap">
            {colors.map((color, i) => (
              <div key={i} className="animate-in fade-in zoom-in duration-300" style={{ animationDelay: `${i * 80}ms` }}>
                <ColorSwatch color={color} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logo/OG */}
      {assets?.ogImage && (
        <div className="space-y-2">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Brand Asset</span>
          <img src={assets.ogImage} className="h-14 object-contain rounded-lg animate-in fade-in duration-500" alt="Brand" />
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════
// ── Main Component ───────────────────────────────────────
// ══════════════════════════════════════════════════════════
const ResearchPreviewPanel = ({
  brief, loading, onApprove, onRerun, approved,
  streamPhases = [], streamColors = [], streamPages = [], streamAssets = null, isStreaming = false,
}: ResearchPreviewPanelProps) => {
  const [showSources, setShowSources] = useState(false);
  const [activeSection, setActiveSection] = useState<"diagnosis" | "vectors" | "matrix" | "details">("diagnosis");

  // Streaming UI
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

  // Fallback loading
  if (loading) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 p-10 flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="w-7 h-7 text-primary animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Shadow CMO Analyzing Your Brand</p>
          <p className="text-xs text-muted-foreground mt-1">Crawling website, extracting DNA, running competitor intelligence…</p>
        </div>
      </div>
    );
  }

  if (!brief) return null;

  const colors = brief.extracted_colors || [];
  const assets = brief.extracted_assets;
  const hasVectors = brief.attack_vectors && brief.attack_vectors.length > 0;
  const hasMatrix = brief.competitor_matrix && brief.competitor_matrix.length > 0;
  const hasDiagnosis = !!brief.brand_diagnosis;

  return (
    <div className="space-y-4">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground tracking-tight">CMO Intelligence Briefing</h3>
            <div className="flex items-center gap-3 mt-0.5">
              <QualityStars rating={brief.research_quality || 3} />
              <span className="text-[10px] text-muted-foreground">{brief.sources?.length || 0} sources analyzed</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={onRerun}>
            <RefreshCw className="w-3.5 h-3.5" /> Re-analyze
          </Button>
          {!approved && (
            <Button size="sm" className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" onClick={onApprove}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Generate
            </Button>
          )}
          {approved && (
            <Badge className="text-xs bg-emerald-100 text-emerald-800 border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approved
            </Badge>
          )}
        </div>
      </div>

      {/* ── Phase 1: The Diagnosis (Hero) ─────────────────── */}
      {hasDiagnosis && (
        <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-secondary/30 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">Strategic Diagnosis</span>
          </div>
          <div className="text-sm text-foreground leading-relaxed font-medium">
            <TypewriterText text={brief.brand_diagnosis!} speed={15} />
          </div>
        </div>
      )}

      {/* ── Tab Navigation ───────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-border pb-px">
        {[
          { key: "diagnosis" as const, label: "Strategic Recon", icon: BarChart3 },
          ...(hasVectors ? [{ key: "vectors" as const, label: "Attack Vectors", icon: Crosshair }] : []),
          ...(hasMatrix ? [{ key: "matrix" as const, label: "Competitor Matrix", icon: Swords }] : []),
          { key: "details" as const, label: "Deep Intelligence", icon: Search },
        ].map(({ key, label, icon: TabIcon }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2",
              activeSection === key
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            <TabIcon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ──────────────────────────────────── */}

      {/* Strategic Recon */}
      {activeSection === "diagnosis" && (
        <div className="space-y-4">
          {/* 3-column: Summary + Gap | Colors + Assets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-4">
              <div className="rounded-xl bg-secondary/40 border border-border p-5">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Brand Overview</span>
                <p className="text-xs text-foreground leading-relaxed">{brief.summary}</p>
              </div>

              {brief.market_gap && (
                <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-primary uppercase tracking-wide">Unclaimed Territory</span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">{brief.market_gap}</p>
                </div>
              )}

              {brief.brand_gap_analysis && !brief.market_gap && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Gap Analysis</span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed">{brief.brand_gap_analysis}</p>
                </div>
              )}
            </div>

            {/* Visual DNA column */}
            <div className="space-y-4">
              {colors.length > 0 && (
                <div className="rounded-xl bg-secondary/30 border border-border p-4">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-3 block">Visual DNA</span>
                  <div className="flex gap-2.5 flex-wrap">
                    {colors.map((c, i) => <ColorSwatch key={i} color={c} />)}
                  </div>
                </div>
              )}

              {assets?.ogImage && (
                <div className="rounded-xl bg-secondary/30 border border-border p-4">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Primary Asset</span>
                  <img src={assets.ogImage} className="h-12 object-contain rounded" alt="Brand" />
                </div>
              )}

              {assets && assets.logos.length > 0 && (
                <div className="rounded-xl bg-secondary/30 border border-border p-4">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Detected Logos</span>
                  <div className="space-y-2">
                    {assets.logos.map((url, i) => (
                      <img key={i} src={url} className="h-8 object-contain" alt={`Logo ${i + 1}`} />
                    ))}
                  </div>
                </div>
              )}

              {brief.visual_direction && (
                <div className="rounded-xl bg-secondary/30 border border-border p-4">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Visual Direction</span>
                  <p className="text-[11px] text-foreground leading-relaxed">{brief.visual_direction}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attack Vectors */}
      {activeSection === "vectors" && hasVectors && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">Three strategic attack vectors derived from your competitive landscape. Each is a concrete campaign concept ready to execute.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {brief.attack_vectors!.map((v, i) => (
              <AttackVectorCard key={i} vector={v} />
            ))}
          </div>
          {/* Hook to continue */}
          <div className="rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Ready to execute {brief.attack_vectors![0]?.label}?</p>
              <p className="text-xs text-muted-foreground mt-0.5">We'll generate campaign concepts based on this strategy.</p>
            </div>
            {!approved && (
              <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground shadow-sm" onClick={onApprove}>
                <Sparkles className="w-3.5 h-3.5" /> Reveal Concepts
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Competitor Matrix */}
      {activeSection === "matrix" && hasMatrix && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">Direct positioning comparison showing where you can win against market incumbents.</p>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-secondary/50">
                  <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wide px-4 py-3">Dimension</th>
                  <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wide px-4 py-3">Market Standard</th>
                  <th className="text-left text-[10px] font-bold text-primary uppercase tracking-wide px-4 py-3">Your Edge</th>
                </tr>
              </thead>
              <tbody>
                {brief.competitor_matrix!.map((row, i) => (
                  <tr key={i} className={cn("border-t border-border", i % 2 === 0 ? "bg-card" : "bg-secondary/20")}>
                    <td className="px-4 py-3 text-xs font-semibold text-foreground">{row.dimension}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{row.market_standard}</td>
                    <td className="px-4 py-3 text-xs text-primary font-medium">{row.your_edge}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Competitor cards */}
          {brief.competitors?.length > 0 && (
            <Section icon={Users} title="Competitor Deep Dive" badge={
              <Badge variant="secondary" className="text-[9px] h-4">{brief.competitors.length} brands</Badge>
            } defaultOpen={false}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {brief.competitors.map((c, i) => (
                  <div key={i} className="rounded-lg border border-border bg-secondary/20 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-foreground">{c.name}</span>
                      <Badge variant="outline" className="text-[8px] h-4">#{i + 1}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wide">Strength</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{c.strength}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-red-500 font-bold uppercase tracking-wide">Weakness</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{c.weakness}</p>
                      </div>
                    </div>
                    {c.instagram_style && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <span className="text-[9px] text-primary font-bold uppercase tracking-wide">IG Style</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{c.instagram_style}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      {/* Deep Intelligence */}
      {activeSection === "details" && (
        <div className="space-y-3">
          {/* Trends */}
          <Section icon={TrendingUp} title="Content Trends" badge={
            <Badge variant="secondary" className="text-[9px] h-4">{brief.trending_topics?.length || 0}</Badge>
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
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Recommended Angles</span>
                <ul className="mt-2 space-y-1.5">
                  {brief.content_angles.map((angle, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Sparkles className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                      <span className="text-[11px] text-foreground">{angle}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>

          {/* Hooks */}
          <Section icon={Target} title="Hook Library" badge={
            <Badge variant="secondary" className="text-[9px] h-4">{brief.hooks?.length || 0}</Badge>
          } defaultOpen={false}>
            <div className="space-y-2">
              {brief.hooks?.map((hook, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-lg bg-secondary/30 px-4 py-2.5">
                  <span className="text-xs font-bold text-primary mt-0.5">#{i + 1}</span>
                  <p className="text-[11px] text-foreground leading-relaxed">{hook}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Avoid */}
          {brief.avoid?.length > 0 && (
            <Section icon={AlertTriangle} title="Strategic Avoidance" defaultOpen={false} accent="bg-amber-500">
              <ul className="space-y-1.5">
                {brief.avoid.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                    <span className="text-[11px] text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Recommended Formats */}
          {brief.recommended_formats && brief.recommended_formats.length > 0 && (
            <Section icon={Eye} title="Recommended Formats" defaultOpen={false}>
              <div className="space-y-2">
                {brief.recommended_formats.map((f, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg bg-secondary/30 px-4 py-2.5">
                    <Badge variant="outline" className="text-[9px] h-4 shrink-0">{f.platform}</Badge>
                    <div>
                      <span className="text-[11px] font-semibold text-foreground">{f.format}</span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{f.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Sources */}
          {brief.sources?.length > 0 && (
            <div className="pt-2">
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
      )}
    </div>
  );
};

export default ResearchPreviewPanel;
