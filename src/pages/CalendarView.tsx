import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth,
  isSameMonth, isToday as checkIsToday, addWeeks, subWeeks, addMonths, subMonths
} from "date-fns";
import {
  ChevronLeft, ChevronRight, CalendarIcon, Image as ImageIcon, Video,
  Send, Clock, CheckCircle2, XCircle, LayoutGrid,
  List, Eye, ArrowUpRight, Loader2, Plus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Campaign, GeneratedAsset } from "@/types/campaigns";
import PublishModal from "@/components/PublishModal";

type ViewMode = "week" | "month";
type QueueFilter = "all" | "scheduled" | "approved" | "pending_review" | "published";

interface AssetWithCampaign extends GeneratedAsset {
  campaign_title: string;
  campaign_status: string;
  scheduled_at: string | null;
}

const PUBLISH_STATUSES: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending_review: { label: "Pending", icon: <Clock className="w-3 h-3" />, color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  approved: { label: "Ready", icon: <CheckCircle2 className="w-3 h-3" />, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  scheduled: { label: "Scheduled", icon: <CalendarIcon className="w-3 h-3" />, color: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
  published: { label: "Published", icon: <Send className="w-3 h-3" />, color: "bg-sky-500/10 text-sky-600 border-sky-500/20" },
  rejected: { label: "Rejected", icon: <XCircle className="w-3 h-3" />, color: "bg-red-500/10 text-red-600 border-red-500/20" },
  regenerating: { label: "Regenerating", icon: <Loader2 className="w-3 h-3 animate-spin" />, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
};

function parseCaption(contentText: string | null): string {
  if (!contentText) return "";
  return contentText.replace(/^\[meta:[^\]]*\]\s*/, "");
}

const CalendarView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [assets, setAssets] = useState<AssetWithCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showQueue, setShowQueue] = useState(false);
  const [selectedMobileDay, setSelectedMobileDay] = useState<Date>(new Date());
  const [publishAsset, setPublishAsset] = useState<AssetWithCampaign | null>(null);

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: campaignData }, { data: assetData }] = await Promise.all([
      supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("generated_assets").select("*").order("created_at", { ascending: false }),
    ]);
    if (campaignData) setCampaigns(campaignData as Campaign[]);
    if (assetData && campaignData) {
      const campaignMap = new Map((campaignData as Campaign[]).map((c) => [c.id, c]));
      setAssets(
        (assetData as GeneratedAsset[]).map((a) => {
          const camp = campaignMap.get(a.campaign_id);
          return {
            ...a,
            campaign_title: camp?.title || "Unknown Campaign",
            campaign_status: camp?.status || "draft",
            scheduled_at: camp?.scheduled_at || null,
          };
        })
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredQueueAssets = useMemo(() => {
    let filtered = assets.filter((a) => a.content_url);
    if (queueFilter !== "all") {
      if (queueFilter === "scheduled") {
        filtered = filtered.filter((a) => a.scheduled_at);
      } else {
        filtered = filtered.filter((a) => a.status === queueFilter);
      }
    }
    return filtered;
  }, [assets, queueFilter]);

  const getAssetsForDay = useCallback(
    (day: Date) => assets.filter((a) => a.scheduled_at && isSameDay(new Date(a.scheduled_at), day)),
    [assets]
  );

  const stats = useMemo(() => {
    const withContent = assets.filter((a) => a.content_url);
    return {
      total: withContent.length,
      pending: withContent.filter((a) => a.status === "pending_review").length,
      approved: withContent.filter((a) => a.status === "approved").length,
      scheduled: withContent.filter((a) => a.scheduled_at).length,
      published: withContent.filter((a) => a.campaign_status === "published").length,
    };
  }, [assets]);

  const goBack = () => setCurrentDate((d) => (viewMode === "week" ? subWeeks(d, 1) : subMonths(d, 1)));
  const goForward = () => setCurrentDate((d) => (viewMode === "week" ? addWeeks(d, 1) : addMonths(d, 1)));
  const goToday = () => { setCurrentDate(new Date()); setSelectedMobileDay(new Date()); };

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const monthDays = useMemo(() => {
    const ms = startOfMonth(currentDate);
    const me = endOfMonth(currentDate);
    const calStart = startOfWeek(ms, { weekStartsOn: 1 });
    const totalDays = Math.ceil(((me.getTime() - calStart.getTime()) / 86400000 + 1) / 7) * 7;
    return Array.from({ length: totalDays }, (_, i) => addDays(calStart, i));
  }, [currentDate]);

  const displayDays = viewMode === "week" ? weekDays : monthDays;

  const dateLabel = useMemo(() => {
    if (viewMode === "week") return `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d, yyyy")}`;
    return format(currentDate, "MMMM yyyy");
  }, [viewMode, currentDate, weekStart]);

  // Mobile: assets for the selected day
  const mobileDayAssets = useMemo(() => getAssetsForDay(selectedMobileDay), [selectedMobileDay, getAssetsForDay]);

  /* ─── Asset Card (full) ─── */
  const AssetCard = ({ asset }: { asset: AssetWithCampaign }) => {
    const statusInfo = PUBLISH_STATUSES[asset.status] || PUBLISH_STATUSES.pending_review;
    const isVideo = asset.asset_type === "video";
    const caption = parseCaption(asset.content_text);

    return (
      <div
        onClick={() => navigate(`/dashboard/campaign/${asset.campaign_id}`)}
        className="group rounded-xl border border-border bg-card overflow-hidden cursor-pointer hover:shadow-lg hover:border-foreground/15 transition-all active:scale-[0.98]"
      >
        <div className="relative aspect-[4/3] bg-muted overflow-hidden">
          {asset.content_url ? (
            isVideo ? (
              <video src={asset.content_url} className="w-full h-full object-cover" muted playsInline />
            ) : (
              <img src={asset.content_url} alt="" className="w-full h-full object-cover" loading="lazy" />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-muted-foreground/20" />
            </div>
          )}
          <div className="absolute top-2 left-2">
            <Badge variant="outline" className={cn("text-[9px] gap-1 backdrop-blur-md", statusInfo.color)}>
              {statusInfo.icon}{statusInfo.label}
            </Badge>
          </div>
          {asset.platform && (
            <div className="absolute top-2 right-2">
              <Badge variant="outline" className="text-[9px] backdrop-blur-md bg-background/80 capitalize">
                {asset.platform}
              </Badge>
            </div>
          )}
          {isVideo && (
            <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-foreground/60 backdrop-blur-sm flex items-center justify-center">
              <Video className="w-3 h-3 text-background" />
            </div>
          )}
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex items-center gap-1 bg-background/90 rounded-full px-3 py-1.5 shadow-lg">
              <Eye className="w-3.5 h-3.5 text-foreground" />
              <span className="text-xs font-medium text-foreground">View</span>
            </div>
          </div>
        </div>
        <div className="p-3 space-y-1.5">
          <p className="text-xs font-semibold text-foreground truncate">{asset.campaign_title}</p>
          {caption && <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{caption}</p>}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-muted-foreground">{format(new Date(asset.created_at), "MMM d, h:mm a")}</span>
            {asset.format && <Badge variant="secondary" className="text-[9px] px-1.5 py-0 capitalize">{asset.format}</Badge>}
          </div>
        </div>
      </div>
    );
  };

  /* ─── Compact Asset Row (for mobile day detail + desktop week) ─── */
  const AssetRow = ({ asset }: { asset: AssetWithCampaign }) => {
    const statusInfo = PUBLISH_STATUSES[asset.status] || PUBLISH_STATUSES.pending_review;
    const isVideo = asset.asset_type === "video";

    return (
      <div
        onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/campaign/${asset.campaign_id}`); }}
        className="flex items-center gap-3 rounded-xl bg-background border border-border p-2.5 cursor-pointer hover:shadow-sm transition-all hover:border-foreground/15 active:scale-[0.98]"
      >
        {/* Thumbnail */}
        <div className="w-12 h-12 sm:w-10 sm:h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative">
          {asset.content_url ? (
            isVideo ? (
              <video src={asset.content_url} className="w-full h-full object-cover" muted />
            ) : (
              <img src={asset.content_url} alt="" className="w-full h-full object-cover" loading="lazy" />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
            </div>
          )}
          {isVideo && (
            <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-foreground/60 flex items-center justify-center">
              <Video className="w-2 h-2 text-background" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate">{asset.campaign_title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {asset.platform && <span className="text-[10px] text-muted-foreground capitalize">{asset.platform}</span>}
            {asset.format && <span className="text-[10px] text-muted-foreground capitalize">· {asset.format}</span>}
          </div>
        </div>

        {/* Status */}
        <Badge variant="outline" className={cn("text-[9px] gap-1 flex-shrink-0", statusInfo.color)}>
          {statusInfo.icon}{statusInfo.label}
        </Badge>
      </div>
    );
  };

  return (
    <AppShell>
      <div className="h-full flex flex-col">
        {/* ─── TOP BAR ─── */}
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="px-4 md:px-6 py-3 max-w-[1400px] mx-auto">
            {/* Row 1: Title + Nav */}
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">Content Command Center</h1>
                <p className="text-[11px] text-muted-foreground truncate">{dateLabel}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={goBack}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-[11px] px-2.5" onClick={goToday}>
                  Today
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={goForward}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Row 2: Stats (mobile) + View Tabs */}
            <div className="flex items-center justify-between gap-2 mt-2.5">
              {/* Stats - always visible */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 flex-shrink-0">
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span className="text-[10px] font-medium text-amber-600">{stats.pending}</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex-shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span className="text-[10px] font-medium text-emerald-600">{stats.approved}</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 flex-shrink-0">
                  <CalendarIcon className="w-3 h-3 text-violet-600" />
                  <span className="text-[10px] font-medium text-violet-600">{stats.scheduled}</span>
                </div>
              </div>

              {/* View Tabs */}
              <Tabs
                value={showQueue ? "queue" : viewMode}
                onValueChange={(v) => {
                  if (v === "queue") setShowQueue(true);
                  else { setShowQueue(false); setViewMode(v as ViewMode); }
                }}
              >
                <TabsList className="h-8">
                  <TabsTrigger value="week" className="text-[11px] px-2.5 sm:px-3 h-6">Week</TabsTrigger>
                  <TabsTrigger value="month" className="text-[11px] px-2.5 sm:px-3 h-6">Month</TabsTrigger>
                  <TabsTrigger value="queue" className="text-[11px] px-2.5 sm:px-3 h-6 gap-1">
                    <List className="w-3 h-3" /><span className="hidden sm:inline">Queue</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        {/* ─── CONTENT ─── */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-3">
              {/* Mobile: vertical skeleton, Desktop: grid */}
              <div className="block sm:hidden space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
              <div className="hidden sm:grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
              </div>
            </div>
          ) : showQueue ? (
            /* ═══ QUEUE VIEW ═══ */
            <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-4">
              {/* Filters: horizontal scroll on mobile */}
              <div className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                <div className="flex items-center gap-2 w-max md:w-auto md:flex-wrap">
                  {(["all", "pending_review", "approved", "scheduled", "published"] as QueueFilter[]).map((f) => {
                    const labels: Record<QueueFilter, string> = {
                      all: "All", pending_review: "Pending", approved: "Ready",
                      scheduled: "Scheduled", published: "Published",
                    };
                    const counts: Record<QueueFilter, number> = {
                      all: stats.total, pending_review: stats.pending, approved: stats.approved,
                      scheduled: stats.scheduled, published: stats.published,
                    };
                    return (
                      <Button
                        key={f}
                        variant={queueFilter === f ? "default" : "outline"}
                        size="sm"
                        className="h-8 text-[11px] gap-1.5 flex-shrink-0"
                        onClick={() => setQueueFilter(f)}
                      >
                        {labels[f]}
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full",
                          queueFilter === f ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>{counts[f]}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {filteredQueueAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <LayoutGrid className="w-6 h-6 sm:w-7 sm:h-7 text-muted-foreground/40" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground mb-1">No assets found</h3>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    {queueFilter === "all" ? "Create a campaign to generate content" : `No "${queueFilter.replace("_", " ")}" assets`}
                  </p>
                  <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={() => navigate("/dashboard/campaigns/new")}>
                    <Plus className="w-3.5 h-3.5" /> Create Campaign
                  </Button>
                </div>
              ) : (
                <>
                  {/* Mobile: list layout. Desktop: grid */}
                  <div className="block sm:hidden space-y-2">
                    {filteredQueueAssets.map((asset) => <AssetRow key={asset.id} asset={asset} />)}
                  </div>
                  <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredQueueAssets.map((asset) => <AssetCard key={asset.id} asset={asset} />)}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* ═══ CALENDAR VIEW ═══ */
            <>
              {/* ─── MOBILE CALENDAR (< sm) ─── */}
              <div className="block sm:hidden">
                {/* Horizontal day selector strip */}
                <div className="border-b border-border bg-card/30">
                  <div className="overflow-x-auto no-scrollbar">
                    <div className="flex px-2 py-2 gap-1 w-max">
                      {(viewMode === "week" ? weekDays : monthDays.filter((d) => isSameMonth(d, currentDate))).map((day) => {
                        const isToday = checkIsToday(day);
                        const isSelected = isSameDay(day, selectedMobileDay);
                        const dayAssetCount = getAssetsForDay(day).length;

                        return (
                          <button
                            key={day.toISOString()}
                            onClick={() => setSelectedMobileDay(day)}
                            className={cn(
                              "flex flex-col items-center justify-center min-w-[48px] py-2 px-1.5 rounded-xl transition-all",
                              isSelected
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : isToday
                                  ? "bg-primary/10 text-primary"
                                  : "text-muted-foreground hover:bg-muted"
                            )}
                          >
                            <span className="text-[10px] font-medium uppercase">{format(day, "EEE")}</span>
                            <span className={cn("text-base font-semibold mt-0.5", isSelected ? "" : "")}>{format(day, "d")}</span>
                            {dayAssetCount > 0 && (
                              <div className={cn(
                                "w-1.5 h-1.5 rounded-full mt-1",
                                isSelected ? "bg-primary-foreground" : "bg-primary"
                              )} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Selected day's assets */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold text-foreground">
                      {checkIsToday(selectedMobileDay) ? "Today" : format(selectedMobileDay, "EEEE, MMM d")}
                    </h2>
                    {mobileDayAssets.length > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        {mobileDayAssets.length} asset{mobileDayAssets.length !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>

                  {mobileDayAssets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <CalendarIcon className="w-10 h-10 text-muted-foreground/20 mb-3" />
                      <p className="text-xs text-muted-foreground">No content scheduled for this day</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 gap-1.5 text-xs"
                        onClick={() => navigate("/dashboard/campaigns/new")}
                      >
                        <Plus className="w-3 h-3" /> Schedule Content
                      </Button>
                    </div>
                  ) : (
                    mobileDayAssets.map((asset) => <AssetRow key={asset.id} asset={asset} />)
                  )}
                </div>
              </div>

              {/* ─── DESKTOP CALENDAR (≥ sm) ─── */}
              <div className="hidden sm:block p-4 md:p-6 max-w-[1400px] mx-auto">
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <div key={d} className="text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider py-2">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Day grid */}
                <div className={cn("grid grid-cols-7 gap-1", viewMode === "month" ? "auto-rows-[100px]" : "")}>
                  {displayDays.map((day) => {
                    const dayAssets = getAssetsForDay(day);
                    const isCurrentMonth = viewMode === "month" ? isSameMonth(day, currentDate) : true;
                    const isToday = checkIsToday(day);

                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "rounded-xl border p-2 transition-colors min-h-0",
                          viewMode === "week" ? "min-h-[180px]" : "",
                          isToday ? "border-primary/30 bg-primary/5"
                            : isCurrentMonth ? "border-border bg-card/50 hover:bg-card"
                            : "border-transparent bg-muted/30",
                        )}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={cn(
                            "text-xs font-medium",
                            isToday
                              ? "bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-[11px]"
                              : isCurrentMonth ? "text-foreground" : "text-muted-foreground/40"
                          )}>
                            {format(day, "d")}
                          </span>
                          {dayAssets.length > 0 && <span className="text-[9px] text-muted-foreground">{dayAssets.length}</span>}
                        </div>

                        <div className="space-y-1 overflow-hidden">
                          {viewMode === "week" ? (
                            dayAssets.slice(0, 3).map((asset) => {
                              const isVideo = asset.asset_type === "video";
                              return (
                                <div
                                  key={asset.id}
                                  onClick={() => navigate(`/dashboard/campaign/${asset.campaign_id}`)}
                                  className="flex items-center gap-2 rounded-lg bg-background border border-border p-1.5 cursor-pointer hover:shadow-sm transition-all hover:border-foreground/15"
                                >
                                  <div className="w-8 h-8 rounded-md overflow-hidden bg-muted flex-shrink-0">
                                    {asset.content_url ? (
                                      isVideo ? <video src={asset.content_url} className="w-full h-full object-cover" muted /> :
                                      <img src={asset.content_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <ImageIcon className="w-3 h-3 text-muted-foreground/40" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-medium text-foreground truncate">{asset.campaign_title}</p>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      {asset.platform && <span className="text-[9px] text-muted-foreground capitalize">{asset.platform}</span>}
                                    </div>
                                  </div>
                                  <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0",
                                    asset.status === "approved" ? "bg-emerald-500" :
                                    asset.status === "pending_review" ? "bg-amber-500" : "bg-muted-foreground/30"
                                  )} />
                                </div>
                              );
                            })
                          ) : (
                            dayAssets.slice(0, 2).map((asset) => (
                              <div
                                key={asset.id}
                                onClick={() => navigate(`/dashboard/campaign/${asset.campaign_id}`)}
                                className={cn(
                                  "flex items-center gap-1 rounded px-1.5 py-0.5 cursor-pointer text-[9px] font-medium truncate",
                                  asset.status === "approved" ? "bg-emerald-500/10 text-emerald-700" :
                                  asset.status === "pending_review" ? "bg-amber-500/10 text-amber-700" :
                                  "bg-muted text-muted-foreground"
                                )}
                              >
                                {asset.asset_type === "video" ? <Video className="w-2.5 h-2.5 flex-shrink-0" /> : <ImageIcon className="w-2.5 h-2.5 flex-shrink-0" />}
                                <span className="truncate">{asset.campaign_title}</span>
                              </div>
                            ))
                          )}
                          {dayAssets.length > (viewMode === "week" ? 3 : 2) && (
                            <span className="text-[9px] text-muted-foreground pl-1">
                              +{dayAssets.length - (viewMode === "week" ? 3 : 2)} more
                            </span>
                          )}
                          {dayAssets.length === 0 && viewMode === "week" && (
                            <div className="flex items-center justify-center h-12 opacity-30">
                              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default CalendarView;
