import { useState } from "react";
import {
  Search, TrendingUp, Palette, Target, ExternalLink, Star,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Loader2,
  Sparkles, BarChart3, Eye, Users, RefreshCw
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
}

interface ResearchPreviewPanelProps {
  brief: IntelligenceBrief | null;
  loading: boolean;
  onApprove: () => void;
  onRerun: () => void;
  approved: boolean;
}

const QualityStars = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        className={cn("w-3 h-3", i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")}
      />
    ))}
    <span className="text-[10px] text-muted-foreground ml-1">{rating}/5</span>
  </div>
);

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

const ResearchPreviewPanel = ({ brief, loading, onApprove, onRerun, approved }: ResearchPreviewPanelProps) => {
  const [showSources, setShowSources] = useState(false);

  if (loading) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 p-8 flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Analyzing Market Intelligence</p>
          <p className="text-xs text-muted-foreground mt-1">Researching competitors, trends, and content patterns…</p>
        </div>
        <div className="flex items-center gap-6 mt-2">
          {["Brand Analysis", "Competitors", "Trends", "Synthesis"].map((step, i) => (
            <div key={step} className="flex items-center gap-1.5">
              <div className={cn(
                "w-2 h-2 rounded-full",
                i < 2 ? "bg-primary" : "bg-muted-foreground/30 animate-pulse"
              )} />
              <span className="text-[10px] text-muted-foreground">{step}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!brief) return null;

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Research Intelligence</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <QualityStars rating={brief.research_quality || 3} />
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] text-muted-foreground">{brief.sources?.length || 0} sources</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[10px] gap-1"
            onClick={onRerun}
          >
            <RefreshCw className="w-3 h-3" /> Re-run
          </Button>
          {!approved && (
            <Button
              size="sm"
              className="h-7 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={onApprove}
            >
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

      {/* Summary */}
      <div className="rounded-xl bg-secondary/50 border border-border p-4">
        <p className="text-xs text-foreground leading-relaxed">{brief.summary}</p>
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
      <SectionCard icon={Palette} title="Visual Style Guide" defaultOpen={true}>
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

      {/* Brand Gap Analysis */}
      {brief.brand_gap_analysis && (
        <SectionCard icon={Eye} title="Brand Gap Analysis" defaultOpen={false}>
          <p className="text-[11px] text-foreground leading-relaxed">{brief.brand_gap_analysis}</p>
        </SectionCard>
      )}

      {/* Things to Avoid */}
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
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] text-primary hover:underline truncate"
                >
                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  {s.title || s.url}
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
