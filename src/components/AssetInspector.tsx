import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import type { IntelligenceBrief } from "@/components/ResearchPreviewPanel";
import {
  Check, X, RefreshCw, Pencil, CalendarIcon, Send, ChevronLeft, ChevronRight,
  Play, Pause, Volume2, VolumeX, Star, Sparkles, HelpCircle, Brain, Shield, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { GeneratedAsset, AssetStatus, SocialPlatform } from "@/types/campaigns";
import { PLATFORM_LABELS } from "@/types/campaigns";

const PLATFORM_DIMENSIONS: Record<string, { width: number; height: number; aspectRatio: string }> = {
  "instagram|story": { width: 1080, height: 1920, aspectRatio: "9 / 16" },
  "instagram|reel": { width: 1080, height: 1920, aspectRatio: "9 / 16" },
  "instagram|post": { width: 1080, height: 1350, aspectRatio: "4 / 5" },
  "instagram|carousel": { width: 1080, height: 1350, aspectRatio: "4 / 5" },
  "tiktok|video": { width: 1080, height: 1920, aspectRatio: "9 / 16" },
  "tiktok|reel": { width: 1080, height: 1920, aspectRatio: "9 / 16" },
  "tiktok|story": { width: 1080, height: 1920, aspectRatio: "9 / 16" },
  "facebook|post": { width: 1200, height: 1200, aspectRatio: "1 / 1" },
  "facebook|story": { width: 1080, height: 1920, aspectRatio: "9 / 16" },
  "linkedin|post": { width: 1200, height: 1200, aspectRatio: "1 / 1" },
  "linkedin|carousel": { width: 1080, height: 1350, aspectRatio: "4 / 5" },
  "youtube|thumbnail": { width: 1280, height: 720, aspectRatio: "16 / 9" },
  "youtube|post": { width: 1280, height: 720, aspectRatio: "16 / 9" },
  "x|post": { width: 1200, height: 675, aspectRatio: "16 / 9" },
  "snapchat|story": { width: 1080, height: 1920, aspectRatio: "9 / 16" },
};

const parseSocialMeta = (asset: GeneratedAsset) => {
  const text = asset.content_text || "";
  const match = text.match(/^\[meta:([a-z]+)\|([a-z]+)\|([0-9/]+)\]/);
  if (match) {
    const key = `${match[1]}|${match[2]}`;
    const dims = PLATFORM_DIMENSIONS[key];
    return {
      platform: match[1],
      format: match[2],
      aspectRatio: dims?.aspectRatio || match[3].replace("/", " / "),
      width: dims?.width || 0,
      height: dims?.height || 0,
    };
  }
  return null;
};

const stripMeta = (text: string | null): string | null => {
  if (!text) return null;
  return text.replace(/^\[meta:[^\]]+\]\s*/, "").replace(/^\[Generation context:[^\]]*\]\s*/, "").trim() || null;
};

const statusBadge: Record<AssetStatus, { label: string; className: string }> = {
  pending_review: { label: "Pending Review", className: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "Approved ✓", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  rejected: { label: "Rejected ✗", className: "bg-red-100 text-red-800 border-red-200" },
  regenerating: { label: "Regenerating…", className: "animate-pulse bg-blue-50 text-blue-700 border-blue-200" },
};

const schedulePlatforms = [
  { id: "instagram" as const, label: "Instagram" },
  { id: "tiktok" as const, label: "TikTok" },
  { id: "facebook" as const, label: "Facebook" },
  { id: "linkedin" as const, label: "LinkedIn" },
  { id: "x" as const, label: "X" },
];

/** Video Player */
const VideoPlayer = ({ src, aspectRatio }: { src: string; aspectRatio: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
  };

  return (
    <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ aspectRatio }}>
      <video ref={videoRef} src={src} muted={muted} loop playsInline className="w-full h-full object-contain"
        onTimeUpdate={() => { const v = videoRef.current; if (v?.duration) setProgress((v.currentTime / v.duration) * 100); }}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
      />
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
        <Slider value={[progress]} max={100} step={0.1} onValueChange={(v) => { const el = videoRef.current; if (el?.duration) { el.currentTime = (v[0] / 100) * el.duration; setProgress(v[0]); } }} className="mb-2 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3" />
        <div className="flex items-center gap-2">
          <button onClick={togglePlay} className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30">
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>
          <button onClick={() => setMuted(!muted)} className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30">
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <span className="text-[10px] text-white/80 font-mono">
            {Math.floor((progress / 100) * duration / 60)}:{Math.floor((progress / 100) * duration % 60).toString().padStart(2, "0")} / {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, "0")}
          </span>
        </div>
      </div>
    </div>
  );
};

/** Carousel Slide Navigator */
const CarouselNavigator = ({ contentUrl, aspectRatio, slideCount = 5 }: { contentUrl: string; aspectRatio: string; slideCount?: number }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  return (
    <div className="relative w-full rounded-lg overflow-hidden bg-muted" style={{ aspectRatio }}>
      <img src={contentUrl} alt={`Slide ${currentSlide + 1}`} className="w-full h-full object-contain" />
      <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5">
        {Array.from({ length: slideCount }).map((_, i) => (
          <button key={i} onClick={() => setCurrentSlide(i)} className={cn("w-1.5 h-1.5 rounded-full transition-all", i === currentSlide ? "bg-white w-3" : "bg-white/50")} />
        ))}
      </div>
      {currentSlide > 0 && (
        <button onClick={() => setCurrentSlide((s) => s - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"><ChevronLeft className="w-4 h-4" /></button>
      )}
      {currentSlide < slideCount - 1 && (
        <button onClick={() => setCurrentSlide((s) => s + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"><ChevronRight className="w-4 h-4" /></button>
      )}
      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-[10px] text-white font-medium">{currentSlide + 1} / {slideCount}</div>
    </div>
  );
};

// ── Decision Trace Dialog ──
interface DecisionTrace {
  id: string;
  decision_summary: string;
  creative_directions: any[];
  scoring_criteria: any;
  winner: any;
  rejected_alternatives: any[];
  confidence_score: number;
  brand_memory_influences: any[];
  research_sources: any[];
  assumptions: string[];
  next_test_recommendation: any;
}

const DecisionTraceDialog = ({ traceId, open, onOpenChange }: { traceId: string | null; open: boolean; onOpenChange: (open: boolean) => void }) => {
  const [trace, setTrace] = useState<DecisionTrace | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!traceId || !open) return;
    setLoading(true);
    supabase.from("decision_traces").select("*").eq("id", traceId).single().then(({ data }) => {
      if (data) setTrace(data as any);
      setLoading(false);
    });
  }, [traceId, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4 text-primary" /> Decision Trace — Why This?
          </DialogTitle>
        </DialogHeader>
        {loading && <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}
        {trace && (
          <div className="space-y-4">
            <div className="rounded-lg bg-secondary/50 border border-border p-3">
              <p className="text-xs text-foreground leading-relaxed">{trace.decision_summary}</p>
              <Badge variant="outline" className="text-[9px] mt-2">Confidence: {(trace.confidence_score * 100).toFixed(0)}%</Badge>
            </div>
            {trace.creative_directions?.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Creative Directions Evaluated</span>
                {trace.creative_directions.map((d: any, i: number) => {
                  const isWinner = d.name === trace.winner?.name;
                  return (
                    <div key={i} className={cn("rounded-lg border p-3", isWinner ? "border-primary bg-primary/5" : "border-border bg-card")}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-foreground">{d.name}</span>
                        <div className="flex items-center gap-1.5">
                          {isWinner && <Badge className="text-[8px] h-4 bg-primary text-primary-foreground">Winner</Badge>}
                          <Badge variant="outline" className="text-[8px] h-4">{d.total_score || "—"}</Badge>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{d.description}</p>
                    </div>
                  );
                })}
              </div>
            )}
            {trace.winner?.rationale && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">Why This Direction Won</span>
                <p className="text-[11px] text-foreground leading-relaxed mt-1">{trace.winner.rationale}</p>
              </div>
            )}
            {trace.brand_memory_influences?.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Brain className="w-3 h-3" /> Brand Memory Influences</span>
                <div className="flex flex-wrap gap-1">
                  {trace.brand_memory_influences.map((m: any, i: number) => (
                    <Badge key={i} variant="outline" className={cn("text-[9px]", m.type === "approval" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200")}>
                      {m.type === "approval" ? "✓" : "✗"} {m.category}: {m.value} ({m.frequency}x)
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {trace.research_sources?.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Research Sources ({trace.research_sources.length})</span>
                {trace.research_sources.slice(0, 6).map((s: any, i: number) => (
                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="block text-[9px] text-primary hover:underline truncate">{s.title || s.url}</a>
                ))}
              </div>
            )}
          </div>
        )}
        {!loading && !trace && <p className="text-xs text-muted-foreground py-8 text-center">No decision trace found.</p>}
      </DialogContent>
    </Dialog>
  );
};

// ── Phone Frame Preview ──
// Contains media within a stable device frame that never overflows
const PhoneFrame = ({ children, aspectRatio }: { children: React.ReactNode; aspectRatio: string }) => {
  const isTall = aspectRatio === "9 / 16";
  return (
    <div className={cn(
      "mx-auto rounded-2xl border-2 border-foreground/10 bg-black shadow-xl overflow-hidden flex items-center justify-center",
      isTall ? "w-[220px] max-h-[400px]" : "w-full max-w-[340px] max-h-[340px]"
    )} style={{ aspectRatio }}>
      {children}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════

interface AssetInspectorProps {
  asset: GeneratedAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: () => void;
  campaignId: string;
  campaignStatus: string;
  onScheduled: () => void;
  onNavigate?: (direction: "prev" | "next") => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  researchBrief?: IntelligenceBrief | null;
}

const AssetInspector = ({
  asset, open, onOpenChange, onStatusChange,
  campaignId, campaignStatus, onScheduled,
  onNavigate, hasPrev, hasNext, researchBrief,
}: AssetInspectorProps) => {
  const isMobile = useIsMobile();
  const [updating, setUpdating] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState("");
  const [schedDate, setSchedDate] = useState<Date | undefined>(undefined);
  const [schedTime, setSchedTime] = useState("09:00");
  const [schedPlatforms, setSchedPlatforms] = useState<string[]>(["instagram"]);
  const [scheduling, setScheduling] = useState(false);
  const [showDecisionTrace, setShowDecisionTrace] = useState(false);

  if (!asset) return null;

  const meta = parseSocialMeta(asset);
  const caption = stripMeta(asset.content_text);
  const status = statusBadge[asset.status];
  const nativeAspect = meta?.aspectRatio || "4 / 5";
  const platformLabel = meta ? `${PLATFORM_LABELS[meta.platform as SocialPlatform]} · ${meta.format}` : "";
  const dimensionLabel = meta ? `${meta.width}×${meta.height}` : "";
  const isVideo = asset.asset_type === "video";
  const isCarousel = asset.asset_type === "carousel";

  let decisionTraceId: string | null = null;
  let decisionMeta: any = null;
  try {
    if (asset.rationale) {
      const parsed = JSON.parse(asset.rationale);
      decisionTraceId = parsed.trace_id || null;
      decisionMeta = parsed;
    }
  } catch { /* rationale is plain text */ }

  const updateStatus = async (newStatus: AssetStatus) => {
    setUpdating(true);
    const { error } = await supabase.from("generated_assets").update({ status: newStatus }).eq("id", asset.id);
    if (error) toast.error("Failed to update.");
    else {
      toast.success(newStatus === "approved" ? "Approved!" : "Rejected.");
      const memoryPatterns = extractPatternsFromAsset(asset, meta, decisionMeta);
      if (memoryPatterns.length > 0) {
        try {
          const { data: memResult } = await supabase.functions.invoke("learn-from-feedback", {
            body: {
              assetId: asset.id,
              memoryType: newStatus === "approved" ? "approval" : "rejection",
              patterns: memoryPatterns.map((p) => ({
                category: p.category, value: p.value,
                context: { campaignId, assetId: asset.id, platform: meta?.platform },
              })),
            },
          });
          const flagged = memResult?.recorded?.filter((r: any) => r.flagged_do_not_use) || [];
          if (flagged.length > 0) toast.info(`${flagged.length} pattern(s) flagged as "do not use".`);
        } catch (e) { console.error("Memory recording failed:", e); }
      }
      onStatusChange();
    }
    setUpdating(false);
  };

  const handleRegenerate = async () => {
    setUpdating(true);
    await supabase.from("generated_assets").update({ status: "regenerating" }).eq("id", asset.id);
    setTimeout(async () => {
      await supabase.from("generated_assets").update({ status: "pending_review" }).eq("id", asset.id);
      toast.success("Regenerated!");
      onStatusChange();
      setUpdating(false);
    }, 2000);
  };

  const handleSaveCaption = async () => {
    const metaPrefix = asset.content_text?.match(/^\[meta:[^\]]+\]/)?.[0] || "";
    await supabase.from("generated_assets").update({ content_text: metaPrefix ? `${metaPrefix} ${captionDraft}` : captionDraft }).eq("id", asset.id);
    setEditingCaption(false);
    toast.success("Caption updated.");
    onStatusChange();
  };

  const handleSchedule = async () => {
    if (!schedDate) { toast.error("Pick a date."); return; }
    if (schedPlatforms.length === 0) { toast.error("Select at least one platform."); return; }
    setScheduling(true);
    const [h, m] = schedTime.split(":").map(Number);
    const at = new Date(schedDate);
    at.setHours(h, m, 0, 0);
    const { error } = await supabase.from("campaigns").update({ status: "scheduled", scheduled_at: at.toISOString(), publish_platforms: schedPlatforms }).eq("id", campaignId);
    setScheduling(false);
    if (error) toast.error("Failed to schedule.");
    else { toast.success(`Scheduled for ${format(at, "MMM d 'at' h:mm a")}`); onScheduled(); }
  };

  // ── Stable phone-frame media preview ──
  const renderMediaPreview = () => {
    if (asset.asset_type === "copy") return null;
    return (
      <div className="px-4 pt-3 flex flex-col items-center">
        {meta && (
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-[10px] font-medium text-foreground uppercase tracking-wide">{platformLabel}</span>
            <span className="text-[10px] text-muted-foreground font-mono">{dimensionLabel}</span>
          </div>
        )}
        <PhoneFrame aspectRatio={nativeAspect}>
          {isVideo && asset.content_url ? (
            <VideoPlayer src={asset.content_url} aspectRatio={nativeAspect} />
          ) : isCarousel && asset.content_url ? (
            <CarouselNavigator contentUrl={asset.content_url} aspectRatio={nativeAspect} />
          ) : asset.content_url ? (
            <img src={asset.content_url} alt={meta?.format || "Asset"} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Loading…</div>
          )}
        </PhoneFrame>
      </div>
    );
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Nav + status */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={!hasPrev} onClick={() => onNavigate?.("prev")}><ChevronLeft className="w-4 h-4" /></Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={!hasNext} onClick={() => onNavigate?.("next")}><ChevronRight className="w-4 h-4" /></Button>
        </div>
        <div className="flex items-center gap-1.5">
          {decisionTraceId && (
            <Button size="sm" variant="outline" className="h-6 text-[9px] gap-1 text-primary border-primary/30 hover:bg-primary/5" onClick={() => setShowDecisionTrace(true)}>
              <HelpCircle className="w-3 h-3" /> Why This?
            </Button>
          )}
          <Badge variant="outline" className={`text-[10px] ${status.className}`}>{status.label}</Badge>
        </div>
      </div>

      {/* Decision context bar */}
      {decisionMeta?.direction && decisionMeta.direction !== "default" && (
        <div className="mx-4 mt-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-2">
          <Brain className="w-3 h-3 text-primary shrink-0" />
          <span className="text-[9px] text-foreground">
            <span className="font-semibold">{decisionMeta.direction}</span>
            {decisionMeta.angle && <span className="text-muted-foreground"> · {decisionMeta.angle}</span>}
          </span>
        </div>
      )}

      {/* Stable phone-frame preview */}
      {renderMediaPreview()}

      {/* Tabs */}
      <Tabs defaultValue="preview" className="flex-1 flex flex-col px-4 pt-3">
        <TabsList className="h-8 w-full bg-secondary/50">
          <TabsTrigger value="preview" className="text-[11px] flex-1">Preview</TabsTrigger>
          <TabsTrigger value="strategy" className="text-[11px] flex-1">Strategy</TabsTrigger>
          <TabsTrigger value="schedule" className="text-[11px] flex-1" disabled={campaignStatus !== "approved"}>Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="flex-1 mt-3 space-y-3 overflow-y-auto">
          {caption && !editingCaption && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Caption</span>
                <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => { setCaptionDraft(caption); setEditingCaption(true); }}><Pencil className="w-3 h-3" /></Button>
              </div>
              <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">{caption}</p>
            </div>
          )}
          {editingCaption && (
            <div className="space-y-2">
              <Textarea value={captionDraft} onChange={(e) => setCaptionDraft(e.target.value)} className="text-xs min-h-[60px] resize-none" />
              <div className="flex gap-1.5">
                <Button size="sm" onClick={handleSaveCaption} className="text-xs h-7">Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditingCaption(false)} className="text-xs h-7">Cancel</Button>
              </div>
            </div>
          )}
          <div className="pt-2 space-y-2">
            {asset.status === "pending_review" && (
              <div className="flex gap-2">
                <Button className="flex-1 h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => updateStatus("approved")} disabled={updating}>
                  <Check className="w-3.5 h-3.5 mr-1" /> Approve
                </Button>
                <Button variant="outline" className="flex-1 h-9 text-xs font-semibold text-red-700 border-red-200 hover:bg-red-50" onClick={() => updateStatus("rejected")} disabled={updating}>
                  <X className="w-3.5 h-3.5 mr-1" /> Reject
                </Button>
              </div>
            )}
            {asset.status === "rejected" && (
              <Button variant="outline" className="w-full h-9 text-xs" onClick={handleRegenerate} disabled={updating}><RefreshCw className="w-3.5 h-3.5 mr-1" /> Regenerate</Button>
            )}
            {asset.status === "approved" && (
              <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-800">Ready for publishing</span>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="strategy" className="flex-1 mt-3 space-y-3 overflow-y-auto">
          {decisionMeta?.direction && decisionMeta.direction !== "default" && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-primary uppercase tracking-wide flex items-center gap-1"><Brain className="w-3 h-3" /> Decision Engine</span>
                {decisionMeta.confidence > 0 && <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">Score: {decisionMeta.confidence}</Badge>}
              </div>
              <p className="text-[11px] text-foreground font-semibold">{decisionMeta.direction}</p>
              {decisionTraceId && (
                <Button size="sm" variant="ghost" className="h-6 text-[9px] gap-1 text-primary p-0" onClick={() => setShowDecisionTrace(true)}>
                  <Shield className="w-3 h-3" /> View Full Decision Trace
                </Button>
              )}
            </div>
          )}
          {researchBrief ? (
            <>
              <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Research Quality</span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className={cn("w-3 h-3", i <= (researchBrief.research_quality || 3) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-foreground leading-relaxed">{researchBrief.summary}</p>
              </div>
              {researchBrief.visual_direction && (
                <div className="rounded-lg border border-border bg-secondary/30 p-3">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Visual Direction</span>
                  <p className="text-[11px] text-foreground leading-relaxed mt-1">{researchBrief.visual_direction}</p>
                </div>
              )}
              {researchBrief.content_angles?.length > 0 && (
                <div className="rounded-lg border border-border bg-secondary/30 p-3">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Content Angles</span>
                  <ul className="mt-1.5 space-y-1">
                    {researchBrief.content_angles.map((angle: string, i: number) => (
                      <li key={i} className="text-[10px] text-foreground flex items-start gap-1.5"><Sparkles className="w-3 h-3 text-primary mt-0.5 shrink-0" /> {angle}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : !decisionMeta?.direction && (
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <p className="text-[11px] text-muted-foreground">Run research first to see strategy insights.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="schedule" className="flex-1 mt-3 space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <Label className="text-xs">Publish Date</Label>
            <Calendar mode="single" selected={schedDate} onSelect={setSchedDate} disabled={(d) => d < new Date()} className="rounded-md border pointer-events-auto" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Time</Label>
            <input type="time" value={schedTime} onChange={(e) => setSchedTime(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-xs" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Platforms</Label>
            {schedulePlatforms.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-1">
                <span className="text-xs text-foreground">{p.label}</span>
                <Switch checked={schedPlatforms.includes(p.id)} onCheckedChange={() => setSchedPlatforms((prev) => prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id])} />
              </div>
            ))}
          </div>
          <Button onClick={handleSchedule} disabled={scheduling} className="w-full h-9 text-xs gap-1.5">
            <Send className="w-3.5 h-3.5" /> {scheduling ? "Scheduling…" : "Schedule Campaign"}
          </Button>
        </TabsContent>
      </Tabs>

      <DecisionTraceDialog traceId={decisionTraceId} open={showDecisionTrace} onOpenChange={setShowDecisionTrace} />
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh]">
          <div className="overflow-y-auto pb-6 max-h-[88vh]">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:w-[440px] p-0 overflow-y-auto">{content}</SheetContent>
    </Sheet>
  );
};

function extractPatternsFromAsset(asset: GeneratedAsset, meta: any, decisionMeta: any) {
  const patterns: Array<{ category: string; value: string }> = [];
  if (meta?.platform && meta?.format) patterns.push({ category: "format", value: `${meta.platform}_${meta.format}` });
  patterns.push({ category: "asset_type", value: asset.asset_type });
  if (decisionMeta?.angle) patterns.push({ category: "angle", value: decisionMeta.angle });
  if (decisionMeta?.hook) patterns.push({ category: "hook", value: decisionMeta.hook });
  if (decisionMeta?.direction && decisionMeta.direction !== "default") patterns.push({ category: "direction", value: decisionMeta.direction });
  return patterns;
}

export default AssetInspector;
