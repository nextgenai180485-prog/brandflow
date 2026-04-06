import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import type { IntelligenceBrief } from "@/components/ResearchPreviewPanel";
import { Check, X, RefreshCw, Pencil, CalendarIcon, Send, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { GeneratedAsset, AssetStatus, SocialPlatform } from "@/types/campaigns";
import { PLATFORM_LABELS } from "@/types/campaigns";

/** Platform-native dimensions for pixel-perfect preview */
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

/** Video Player with play/pause, scrub, and mute controls */
const VideoPlayer = ({ src, aspectRatio, maxHeight }: { src: string; aspectRatio: string; maxHeight: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress((v.currentTime / v.duration) * 100);
  };

  const handleScrub = (val: number[]) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    v.currentTime = (val[0] / 100) * v.duration;
    setProgress(val[0]);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative w-full rounded-lg overflow-hidden bg-black border border-border shadow-sm" style={{ aspectRatio, maxHeight }}>
      <video
        ref={videoRef}
        src={src}
        muted={muted}
        loop
        playsInline
        className="w-full h-full object-cover"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onEnded={() => setPlaying(false)}
      />
      {/* Controls overlay */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
        {/* Scrub bar */}
        <Slider
          value={[progress]}
          max={100}
          step={0.1}
          onValueChange={handleScrub}
          className="mb-2 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={togglePlay} className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors">
              {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>
            <button onClick={() => setMuted(!muted)} className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors">
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <span className="text-[10px] text-white/80 font-mono">
              {formatTime((progress / 100) * duration)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Carousel Slide Navigator */
const CarouselNavigator = ({
  contentUrl,
  aspectRatio,
  maxHeight,
  slideCount = 5,
}: {
  contentUrl: string;
  aspectRatio: string;
  maxHeight: string;
  slideCount?: number;
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // For now, use the same image with different overlays to simulate slides
  return (
    <div className="relative w-full rounded-lg overflow-hidden bg-muted border border-border shadow-sm" style={{ aspectRatio, maxHeight }}>
      <img src={contentUrl} alt={`Slide ${currentSlide + 1}`} className="w-full h-full object-cover" />

      {/* Slide indicator dots */}
      <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5">
        {Array.from({ length: slideCount }).map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentSlide(i)}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all",
              i === currentSlide ? "bg-white w-3" : "bg-white/50 hover:bg-white/70"
            )}
          />
        ))}
      </div>

      {/* Prev/Next buttons */}
      {currentSlide > 0 && (
        <button
          onClick={() => setCurrentSlide((s) => s - 1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      {currentSlide < slideCount - 1 && (
        <button
          onClick={() => setCurrentSlide((s) => s + 1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Slide counter badge */}
      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-[10px] text-white font-medium">
        {currentSlide + 1} / {slideCount}
      </div>
    </div>
  );
};

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
}

const AssetInspector = ({
  asset, open, onOpenChange, onStatusChange,
  campaignId, campaignStatus, onScheduled,
  onNavigate, hasPrev, hasNext,
}: AssetInspectorProps) => {
  const isMobile = useIsMobile();
  const [updating, setUpdating] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState("");
  const [schedDate, setSchedDate] = useState<Date | undefined>(undefined);
  const [schedTime, setSchedTime] = useState("09:00");
  const [schedPlatforms, setSchedPlatforms] = useState<string[]>(["instagram"]);
  const [scheduling, setScheduling] = useState(false);

  if (!asset) return null;

  const meta = parseSocialMeta(asset);
  const caption = stripMeta(asset.content_text);
  const status = statusBadge[asset.status];
  const nativeAspect = meta?.aspectRatio || "4 / 5";
  const platformLabel = meta ? `${PLATFORM_LABELS[meta.platform as SocialPlatform]} · ${meta.format}` : "";
  const dimensionLabel = meta ? `${meta.width}×${meta.height}` : "";

  const isVideo = asset.asset_type === "video";
  const isCarousel = asset.asset_type === "carousel";

  const updateStatus = async (newStatus: AssetStatus) => {
    setUpdating(true);
    const { error } = await supabase.from("generated_assets").update({ status: newStatus }).eq("id", asset.id);
    if (error) toast.error("Failed to update.");
    else {
      toast.success(newStatus === "approved" ? "Approved!" : "Rejected.");
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
    const { error } = await supabase.from("campaigns").update({
      status: "scheduled", scheduled_at: at.toISOString(), publish_platforms: schedPlatforms,
    }).eq("id", campaignId);
    setScheduling(false);
    if (error) toast.error("Failed to schedule.");
    else {
      toast.success(`Scheduled for ${format(at, "MMM d 'at' h:mm a")}`);
      onScheduled();
    }
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Navigation arrows + close context */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={!hasPrev} onClick={() => onNavigate?.("prev")}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={!hasNext} onClick={() => onNavigate?.("next")}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Badge variant="outline" className={`text-[10px] ${status.className}`}>{status.label}</Badge>
      </div>

      {/* Platform-native WYSIWYG preview */}
      {asset.asset_type !== "copy" && (
        <div className="px-4 pt-3 flex flex-col items-center">
          {meta && (
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-[10px] font-medium text-foreground uppercase tracking-wide">
                {platformLabel}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">{dimensionLabel}</span>
            </div>
          )}

          {/* Video Player */}
          {isVideo && asset.content_url ? (
            <VideoPlayer
              src={asset.content_url}
              aspectRatio={nativeAspect}
              maxHeight={isMobile ? "55vh" : "50vh"}
            />
          ) : isCarousel && asset.content_url ? (
            <CarouselNavigator
              contentUrl={asset.content_url}
              aspectRatio={nativeAspect}
              maxHeight={isMobile ? "55vh" : "50vh"}
            />
          ) : (
            <div
              className="w-full rounded-lg overflow-hidden bg-muted border border-border shadow-sm"
              style={{ aspectRatio: nativeAspect, maxHeight: isMobile ? "55vh" : "50vh" }}
            >
              {asset.content_url ? (
                <img src={asset.content_url} alt={meta?.format || "Asset"} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Loading…</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="preview" className="flex-1 flex flex-col px-4 pt-3">
        <TabsList className="h-8 w-full bg-secondary/50">
          <TabsTrigger value="preview" className="text-[11px] flex-1">Preview</TabsTrigger>
          <TabsTrigger value="strategy" className="text-[11px] flex-1">Strategy</TabsTrigger>
          <TabsTrigger value="schedule" className="text-[11px] flex-1" disabled={campaignStatus !== "approved"}>Schedule</TabsTrigger>
        </TabsList>

        {/* PREVIEW TAB */}
        <TabsContent value="preview" className="flex-1 mt-3 space-y-3">
          {caption && !editingCaption && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Caption</span>
                <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => { setCaptionDraft(caption); setEditingCaption(true); }}>
                  <Pencil className="w-3 h-3" />
                </Button>
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

          {/* Actions */}
          <div className="pt-2 space-y-2">
            {asset.status === "pending_review" && (
              <div className="flex gap-2">
                <Button
                  className="flex-1 h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => updateStatus("approved")}
                  disabled={updating}
                >
                  <Check className="w-3.5 h-3.5 mr-1" /> Approve
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-9 text-xs font-semibold text-red-700 border-red-200 hover:bg-red-50"
                  onClick={() => updateStatus("rejected")}
                  disabled={updating}
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Reject
                </Button>
              </div>
            )}
            {asset.status === "rejected" && (
              <Button variant="outline" className="w-full h-9 text-xs" onClick={handleRegenerate} disabled={updating}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Regenerate
              </Button>
            )}
            {asset.status === "approved" && (
              <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-800">Ready for publishing</span>
              </div>
            )}
          </div>
        </TabsContent>

        {/* STRATEGY TAB */}
        <TabsContent value="strategy" className="flex-1 mt-3 space-y-3">
          <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Decision Confidence</span>
              <span className="text-xs font-semibold text-foreground">—</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Strategy insights will appear here once the Research & Decision Engine is connected.
            </p>
          </div>
          <div className="rounded-lg border border-dashed border-border p-3">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Coming Soon</span>
            <ul className="mt-1.5 space-y-1 text-[11px] text-muted-foreground">
              <li>• Market trend analysis</li>
              <li>• Competitor creative patterns</li>
              <li>• Hook effectiveness scoring</li>
              <li>• Brand memory signals</li>
            </ul>
          </div>
        </TabsContent>

        {/* SCHEDULE TAB */}
        <TabsContent value="schedule" className="flex-1 mt-3 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Publish Date</Label>
            <Calendar
              mode="single"
              selected={schedDate}
              onSelect={setSchedDate}
              disabled={(d) => d < new Date()}
              className={cn("rounded-md border pointer-events-auto")}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Time</Label>
            <input
              type="time"
              value={schedTime}
              onChange={(e) => setSchedTime(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Platforms</Label>
            {schedulePlatforms.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-1">
                <span className="text-xs text-foreground">{p.label}</span>
                <Switch
                  checked={schedPlatforms.includes(p.id)}
                  onCheckedChange={() =>
                    setSchedPlatforms((prev) =>
                      prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]
                    )
                  }
                />
              </div>
            ))}
          </div>
          <Button onClick={handleSchedule} disabled={scheduling} className="w-full h-9 text-xs gap-1.5">
            <Send className="w-3.5 h-3.5" />
            {scheduling ? "Scheduling…" : "Schedule Campaign"}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );

  if (isMobile) {
    const isTallFormat = nativeAspect === "9 / 16";
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className={isTallFormat ? "max-h-[95vh]" : "max-h-[85vh]"}>
          <div className={`overflow-y-auto pb-6 ${isTallFormat ? "max-h-[92vh]" : "max-h-[80vh]"}`}>
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[420px] p-0 overflow-y-auto">
        {content}
      </SheetContent>
    </Sheet>
  );
};

export default AssetInspector;
