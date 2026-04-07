import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth,
  eachDayOfInterval, addMonths, subMonths, getDay, isSameMonth,
  startOfDay, isToday as checkIsToday, addWeeks, subWeeks
} from "date-fns";
import {
  ChevronLeft, ChevronRight, CalendarIcon, Image as ImageIcon, Video,
  Send, Clock, CheckCircle2, XCircle, AlertCircle, Filter, LayoutGrid,
  List, Eye, ArrowUpRight, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Campaign, GeneratedAsset } from "@/types/campaigns";

type ViewMode = "week" | "month";
type QueueFilter = "all" | "scheduled" | "approved" | "pending_review" | "published";

interface AssetWithCampaign extends GeneratedAsset {
  campaign_title: string;
  campaign_status: string;
  scheduled_at: string | null;
}

const PUBLISH_STATUSES: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending_review: { label: "Pending Review", icon: <Clock className="w-3 h-3" />, color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  approved: { label: "Ready to Publish", icon: <CheckCircle2 className="w-3 h-3" />, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
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

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch all campaigns with their assets
    const { data: campaignData } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: assetData } = await supabase
      .from("generated_assets")
      .select("*")
      .order("created_at", { ascending: false });

    if (campaignData) setCampaigns(campaignData as Campaign[]);

    if (assetData && campaignData) {
      const campaignMap = new Map(
        (campaignData as Campaign[]).map((c) => [c.id, c])
      );
      const enriched: AssetWithCampaign[] = (assetData as GeneratedAsset[]).map((a) => {
        const camp = campaignMap.get(a.campaign_id);
        return {
          ...a,
          campaign_title: camp?.title || "Unknown Campaign",
          campaign_status: camp?.status || "draft",
          scheduled_at: camp?.scheduled_at || null,
        };
      });
      setAssets(enriched);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter assets for queue
  const filteredQueueAssets = useMemo(() => {
    let filtered = assets.filter((a) => a.content_url); // Only show generated assets
    if (queueFilter !== "all") {
      if (queueFilter === "scheduled") {
        filtered = filtered.filter((a) => a.scheduled_at);
      } else {
        filtered = filtered.filter((a) => a.status === queueFilter);
      }
    }
    return filtered;
  }, [assets, queueFilter]);

  // Get assets for a specific day
  const getAssetsForDay = useCallback(
    (day: Date) => {
      return assets.filter((a) => {
        if (!a.scheduled_at) return false;
        return isSameDay(new Date(a.scheduled_at), day);
      });
    },
    [assets]
  );

  // Stats
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

  // Navigation
  const goBack = () => {
    setCurrentDate((d) => (viewMode === "week" ? subWeeks(d, 1) : subMonths(d, 1)));
  };
  const goForward = () => {
    setCurrentDate((d) => (viewMode === "week" ? addWeeks(d, 1) : addMonths(d, 1)));
  };
  const goToday = () => setCurrentDate(new Date());

  // Calendar days
  const calendarDays = useMemo(() => {
    if (viewMode === "week") {
      return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    }
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = addDays(startOfWeek(addDays(monthEnd, 6), { weekStartsOn: 1 }), 6);
    return eachDayOfInterval({ start: calStart, end: calEnd > monthEnd ? addDays(monthEnd, (7 - getDay(monthEnd) + 1) % 7 || 7) : calEnd });
  }, [viewMode, currentDate, weekStart]);

  // Ensure month view has complete weeks (multiple of 7)
  const monthDays = useMemo(() => {
    if (viewMode !== "month") return calendarDays;
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    // Get enough days to fill complete weeks
    const totalDaysNeeded = Math.ceil(
      ((monthEnd.getTime() - calStart.getTime()) / (1000 * 60 * 60 * 24) + 1) / 7
    ) * 7;
    return Array.from({ length: totalDaysNeeded }, (_, i) => addDays(calStart, i));
  }, [viewMode, currentDate, calendarDays]);

  const displayDays = viewMode === "week" ? calendarDays : monthDays;

  const dateLabel = useMemo(() => {
    if (viewMode === "week") {
      return `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d, yyyy")}`;
    }
    return format(currentDate, "MMMM yyyy");
  }, [viewMode, currentDate, weekStart]);

  const AssetCard = ({ asset, compact = false }: { asset: AssetWithCampaign; compact?: boolean }) => {
    const statusInfo = PUBLISH_STATUSES[asset.status] || PUBLISH_STATUSES.pending_review;
    const isVideo = asset.asset_type === "video";
    const caption = parseCaption(asset.content_text);

    if (compact) {
      return (
        <div
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/dashboard/campaign/${asset.campaign_id}`);
          }}
          className="flex items-center gap-2 rounded-lg bg-background border border-border p-1.5 cursor-pointer hover:shadow-sm transition-all hover:border-foreground/15 group"
        >
          {/* Tiny thumbnail */}
          <div className="w-8 h-8 rounded-md overflow-hidden bg-muted flex-shrink-0">
            {asset.content_url ? (
              isVideo ? (
                <video src={asset.content_url} className="w-full h-full object-cover" muted />
              ) : (
                <img src={asset.content_url} alt="" className="w-full h-full object-cover" />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-3 h-3 text-muted-foreground/40" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-foreground truncate">{asset.campaign_title}</p>
            <div className="flex items-center gap-1 mt-0.5">
              {asset.platform && (
                <span className="text-[9px] text-muted-foreground capitalize">{asset.platform}</span>
              )}
              {isVideo && <Video className="w-2.5 h-2.5 text-muted-foreground" />}
            </div>
          </div>
          <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", 
            asset.status === "approved" ? "bg-emerald-500" : 
            asset.status === "pending_review" ? "bg-amber-500" : "bg-muted-foreground/30"
          )} />
        </div>
      );
    }

    return (
      <div
        onClick={() => navigate(`/dashboard/campaign/${asset.campaign_id}`)}
        className="group rounded-xl border border-border bg-card overflow-hidden cursor-pointer hover:shadow-lg hover:border-foreground/15 transition-all"
      >
        {/* Thumbnail */}
        <div className="relative aspect-[4/3] bg-muted overflow-hidden">
          {asset.content_url ? (
            isVideo ? (
              <video src={asset.content_url} className="w-full h-full object-cover" muted playsInline />
            ) : (
              <img src={asset.content_url} alt="" className="w-full h-full object-cover" />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-muted-foreground/20" />
            </div>
          )}

          {/* Overlay badges */}
          <div className="absolute top-2 left-2">
            <Badge variant="outline" className={cn("text-[9px] gap-1 backdrop-blur-md", statusInfo.color)}>
              {statusInfo.icon}
              {statusInfo.label}
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

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex items-center gap-1 bg-background/90 rounded-full px-3 py-1.5 shadow-lg">
              <Eye className="w-3.5 h-3.5 text-foreground" />
              <span className="text-xs font-medium text-foreground">View</span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 space-y-1.5">
          <p className="text-xs font-semibold text-foreground truncate">{asset.campaign_title}</p>
          {caption && (
            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{caption}</p>
          )}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-muted-foreground">
              {format(new Date(asset.created_at), "MMM d, h:mm a")}
            </span>
            {asset.format && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 capitalize">
                {asset.format}
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppShell>
      <div className="h-full flex flex-col">
        {/* Top Bar */}
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10 px-4 md:px-6 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-[1400px] mx-auto">
            <div>
              <h1 className="text-lg font-semibold text-foreground">Content Command Center</h1>
              <p className="text-xs text-muted-foreground">{dateLabel}</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Stats pills */}
              <div className="hidden md:flex items-center gap-1.5 mr-2">
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span className="text-[10px] font-medium text-amber-600">{stats.pending}</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span className="text-[10px] font-medium text-emerald-600">{stats.approved}</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-violet-500/10 border border-violet-500/20">
                  <CalendarIcon className="w-3 h-3 text-violet-600" />
                  <span className="text-[10px] font-medium text-violet-600">{stats.scheduled}</span>
                </div>
              </div>

              {/* View toggle */}
              <Tabs value={showQueue ? "queue" : viewMode} onValueChange={(v) => {
                if (v === "queue") { setShowQueue(true); }
                else { setShowQueue(false); setViewMode(v as ViewMode); }
              }}>
                <TabsList className="h-8">
                  <TabsTrigger value="week" className="text-xs px-3 h-6">Week</TabsTrigger>
                  <TabsTrigger value="month" className="text-xs px-3 h-6">Month</TabsTrigger>
                  <TabsTrigger value="queue" className="text-xs px-3 h-6 gap-1">
                    <List className="w-3 h-3" /> Queue
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Navigation */}
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={goBack}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToday}>
                  Today
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={goForward}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
              <div className="grid grid-cols-7 gap-3">
                {Array.from({ length: viewMode === "week" ? 7 : 35 }).map((_, i) => (
                  <Skeleton key={i} className={viewMode === "week" ? "h-48" : "h-24"} />
                ))}
              </div>
            </div>
          ) : showQueue ? (
            /* QUEUE VIEW */
            <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-4">
              {/* Queue filters */}
              <div className="flex items-center gap-2 flex-wrap">
                {(["all", "pending_review", "approved", "scheduled", "published"] as QueueFilter[]).map((f) => {
                  const labels: Record<QueueFilter, string> = {
                    all: "All Assets",
                    pending_review: "Pending Review",
                    approved: "Ready to Publish",
                    scheduled: "Scheduled",
                    published: "Published",
                  };
                  const counts: Record<QueueFilter, number> = {
                    all: stats.total,
                    pending_review: stats.pending,
                    approved: stats.approved,
                    scheduled: stats.scheduled,
                    published: stats.published,
                  };
                  return (
                    <Button
                      key={f}
                      variant={queueFilter === f ? "default" : "outline"}
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => setQueueFilter(f)}
                    >
                      {labels[f]}
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full",
                        queueFilter === f ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {counts[f]}
                      </span>
                    </Button>
                  );
                })}
              </div>

              {/* Queue grid */}
              {filteredQueueAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <LayoutGrid className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground mb-1">No assets found</h3>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    {queueFilter === "all"
                      ? "Create a campaign to generate content assets"
                      : `No assets with "${queueFilter.replace("_", " ")}" status`}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 gap-2"
                    onClick={() => navigate("/dashboard/campaigns/new")}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" /> Create Campaign
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredQueueAssets.map((asset) => (
                    <AssetCard key={asset.id} asset={asset} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* CALENDAR VIEW */
            <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d} className="text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <div className={cn(
                "grid grid-cols-7 gap-1",
                viewMode === "month" ? "auto-rows-[100px]" : ""
              )}>
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
                        isToday
                          ? "border-primary/30 bg-primary/5"
                          : isCurrentMonth
                            ? "border-border bg-card/50 hover:bg-card"
                            : "border-transparent bg-muted/30",
                      )}
                    >
                      {/* Day number */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={cn(
                          "text-xs font-medium",
                          isToday
                            ? "bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-[11px]"
                            : isCurrentMonth
                              ? "text-foreground"
                              : "text-muted-foreground/40"
                        )}>
                          {format(day, "d")}
                        </span>
                        {dayAssets.length > 0 && (
                          <span className="text-[9px] text-muted-foreground">{dayAssets.length}</span>
                        )}
                      </div>

                      {/* Assets */}
                      <div className="space-y-1 overflow-hidden">
                        {viewMode === "week" ? (
                          dayAssets.slice(0, 4).map((asset) => (
                            <AssetCard key={asset.id} asset={asset} compact />
                          ))
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
                              {asset.asset_type === "video" ? (
                                <Video className="w-2.5 h-2.5 flex-shrink-0" />
                              ) : (
                                <ImageIcon className="w-2.5 h-2.5 flex-shrink-0" />
                              )}
                              <span className="truncate">{asset.campaign_title}</span>
                            </div>
                          ))
                        )}
                        {dayAssets.length > (viewMode === "week" ? 4 : 2) && (
                          <span className="text-[9px] text-muted-foreground pl-1">
                            +{dayAssets.length - (viewMode === "week" ? 4 : 2)} more
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
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default CalendarView;
