import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  Activity, AlertTriangle, ChevronLeft, ChevronRight,
  X, Brain, TrendingUp, Zap, Shield, Target,
  Sparkles, ImageIcon, Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { Drawer, DrawerContent } from "@/components/ui/drawer";

interface Insight {
  id: string;
  type: "critical" | "opportunity" | "info";
  title: string;
  body: string;
  action?: string;
  campaignId?: string;
  timestamp?: string;
}

const EXCLUDED_PATHS = ["/", "/login", "/signup", "/onboarding"];
const POLL_INTERVAL = 8000;

const SentientCMORail = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeToast, setActiveToast] = useState<Insight | null>(null);
  const [toastDismissed, setToastDismissed] = useState<Set<string>>(new Set());
  const [toastSuppressed, setToastSuppressed] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [systemStatus, setSystemStatus] = useState<"optimal" | "alert" | "critical">("optimal");
  const [campaignCount, setCampaignCount] = useState(0);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [recentAssetCount, setRecentAssetCount] = useState(0);
  const lastKnownCampaignIds = useRef<Set<string>>(new Set());
  const lastKnownAssetIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  const scanIntelligence = useCallback(async () => {
    if (!user) return;
    const newInsights: Insight[] = [];

    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id, title, status, created_at, updated_at")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const campaignList = campaigns || [];
    setCampaignCount(campaignList.length);

    const currentCampaignIds = new Set(campaignList.map((c) => c.id));
    if (initialized.current) {
      for (const campaign of campaignList) {
        if (!lastKnownCampaignIds.current.has(campaign.id)) {
          newInsights.push({
            id: `new-campaign-${campaign.id}`,
            type: "opportunity",
            title: `New Campaign: ${campaign.title}`,
            body: `Campaign "${campaign.title}" was just created. Status: ${campaign.status}. The CMO is now tracking its performance.`,
            campaignId: campaign.id,
            action: "View Campaign",
            timestamp: campaign.created_at,
          });
        }
      }
    }
    lastKnownCampaignIds.current = currentCampaignIds;

    const { data: pendingAssets } = await supabase
      .from("generated_assets")
      .select("id, campaign_id, asset_type, platform, format, status, created_at, content_url")
      .eq("profile_id", user.id)
      .eq("status", "pending_review")
      .order("created_at", { ascending: false })
      .limit(20);

    const pendingList = pendingAssets || [];
    setPendingReviewCount(pendingList.length);

    const currentAssetIds = new Set(pendingList.map((a) => a.id));
    if (initialized.current) {
      for (const asset of pendingList) {
        if (!lastKnownAssetIds.current.has(asset.id)) {
          newInsights.push({
            id: `new-asset-${asset.id}`,
            type: "opportunity",
            title: `Asset Ready for Review`,
            body: `A new ${asset.asset_type} (${asset.platform}/${asset.format}) has been generated and is ready for your review.`,
            campaignId: asset.campaign_id,
            action: "Review Now",
            timestamp: asset.created_at,
          });
        }
      }
    }
    lastKnownAssetIds.current = currentAssetIds;

    const stuckCampaigns = campaignList.filter((c) => {
      if (c.status !== "generating") return false;
      const updatedAt = new Date(c.updated_at).getTime();
      return Date.now() - updatedAt > 5 * 60 * 1000;
    });

    for (const stuck of stuckCampaigns) {
      newInsights.push({
        id: `stuck-${stuck.id}`,
        type: "critical",
        title: `Generation Stalled`,
        body: `Campaign "${stuck.title}" has been generating for over 5 minutes. This may indicate a provider issue.`,
        campaignId: stuck.id,
        action: "Investigate",
      });
    }

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [{ count: recentCount }, { count: templateCount }] = await Promise.all([
      supabase
        .from("generated_assets")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", user.id)
        .gte("created_at", dayAgo),
      supabase
        .from("ad_reference_library")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
    ]);
    setRecentAssetCount(recentCount || 0);

    // Template library signal
    if ((templateCount || 0) > 0 && campaignList.length === 0) {
      newInsights.push({
        id: "template-library-available",
        type: "opportunity",
        title: `${templateCount} Templates in Source Gallery`,
        body: `Your Source Gallery has ${templateCount} ready-to-use templates. Browse them in the Campaign Workspace to find proven formats for your vertical.`,
        action: "Create Campaign",
      });
    }

    if (pendingList.length > 0) {
      newInsights.push({
        id: "pending-review-summary",
        type: "info",
        title: `${pendingList.length} Asset${pendingList.length > 1 ? "s" : ""} Awaiting Review`,
        body: `You have ${pendingList.length} generated asset${pendingList.length > 1 ? "s" : ""} pending your approval across ${new Set(pendingList.map((a) => a.campaign_id)).size} campaign${new Set(pendingList.map((a) => a.campaign_id)).size > 1 ? "s" : ""}.`,
        action: "Review All",
      });
    }

    if (campaignList.length === 0) {
      newInsights.push({
        id: "no-campaigns",
        type: "info",
        title: "No Active Campaigns",
        body: "Create your first campaign to activate CMO intelligence monitoring.",
      });
    } else if (newInsights.length === 0) {
      newInsights.push({
        id: "system-ok",
        type: "info",
        title: "System Online",
        body: `Monitoring ${campaignList.length} campaign${campaignList.length > 1 ? "s" : ""}. All systems optimal. I'll alert you when I detect something actionable.`,
      });
    }

    const seenIds = new Set<string>();
    const deduplicated = newInsights.filter((i) => {
      if (seenIds.has(i.id)) return false;
      seenIds.add(i.id);
      return true;
    });

    setInsights(deduplicated);

    const toastable = deduplicated.find(
      (i) => (i.type === "critical" || i.type === "opportunity") && !toastDismissed.has(i.id)
    );
    if (toastable && !isExpanded && !toastSuppressed) {
      setActiveToast(toastable);
    }

    initialized.current = true;
  }, [user, isExpanded, toastDismissed]);

  useEffect(() => {
    if (!user) return;
    scanIntelligence();
    const interval = setInterval(scanIntelligence, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [user, scanIntelligence]);

  useEffect(() => {
    const hasCritical = insights.some((i) => i.type === "critical");
    const hasOpp = insights.some((i) => i.type === "opportunity");
    setSystemStatus(hasCritical ? "critical" : hasOpp ? "alert" : "optimal");
  }, [insights]);

  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setToastDismissed((prev) => new Set(prev).add(activeToast.id));
      setActiveToast(null);
    }, 15000);
    return () => clearTimeout(timer);
  }, [activeToast]);

  const dismissToast = useCallback(() => {
    if (activeToast) {
      setToastDismissed((prev) => new Set(prev).add(activeToast.id));
      setActiveToast(null);
    }
  }, [activeToast]);

  const handleInsightAction = useCallback((insight: Insight) => {
    if (insight.campaignId) {
      navigate(`/dashboard/campaign/${insight.campaignId}`);
    } else {
      navigate("/dashboard");
    }
    setIsExpanded(false);
  }, [navigate]);

  // Determine visibility
  const isExcluded = !user || EXCLUDED_PATHS.includes(location.pathname);
  const shouldHide = isExcluded || isMobile; // Desktop rail hides on mobile (mobile gets its own UI)

  const pulseConfig = isExcluded ? null : {
    optimal: { color: "bg-emerald-500", shadow: "shadow-[0_0_12px_hsl(160,60%,45%,0.5)]", speed: "animate-[pulse_3s_ease-in-out_infinite]" },
    alert: { color: "bg-amber-500", shadow: "shadow-[0_0_12px_hsl(40,90%,50%,0.5)]", speed: "animate-[pulse_1.5s_ease-in-out_infinite]" },
    critical: { color: "bg-destructive", shadow: "shadow-[0_0_12px_hsl(0,72%,51%,0.5)]", speed: "animate-[pulse_0.7s_ease-in-out_infinite]" },
  }[systemStatus];

  // Desktop rail width
  const railWidth = shouldHide ? "0px" : isExpanded ? "380px" : "48px";

  const toast_el = !shouldHide && !isExpanded && activeToast ? createPortal(
    <div className="fixed right-14 top-20 z-[55] w-72 animate-fade-in">
      <div className="bg-foreground text-background p-4 rounded-xl shadow-2xl border border-foreground/20 relative">
        <div className="absolute top-4 -right-1.5 w-3 h-3 bg-foreground rotate-45 border-r border-t border-foreground/20" />
        <div className="flex justify-between items-start mb-2">
          <Badge
            className={`text-[8px] ${
              activeToast.type === "critical"
                ? "bg-destructive text-destructive-foreground"
                : "bg-amber-500 text-foreground"
            }`}
          >
            {activeToast.type === "critical" ? "Action Required" : "New Activity"}
          </Badge>
          <button onClick={(e) => { e.stopPropagation(); dismissToast(); }}>
            <X className="w-3 h-3 text-background/50 hover:text-background" />
          </button>
        </div>
        <p className="text-xs font-semibold mb-1">{activeToast.title}</p>
        <p className="text-[11px] text-background/70 leading-relaxed">{activeToast.body}</p>
        <div className="mt-3 flex gap-2">
          {activeToast.campaignId && (
            <button
              onClick={() => { handleInsightAction(activeToast); dismissToast(); }}
              className="flex-1 py-1.5 bg-background text-foreground text-[10px] font-bold rounded-lg hover:bg-background/90 transition-colors"
            >
              {activeToast.action || "View"}
            </button>
          )}
          <button
            onClick={() => { setIsExpanded(true); dismissToast(); }}
            className={`${activeToast.campaignId ? "" : "flex-1"} py-1.5 bg-background text-foreground text-[10px] font-bold rounded-lg hover:bg-background/90 transition-colors px-3`}
          >
            Open CMO
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  // ── Mobile: Command Deck pill + half-height drawer ──
  if (isMobile && !isExcluded) {
    const critCount = insights.filter((i) => i.type === "critical").length;
    const oppCount = insights.filter((i) => i.type === "opportunity").length;
    const totalBadge = critCount + oppCount + pendingReviewCount;

    return (
      <>
        {/* Floating Command Deck pill — bottom center, left of CSO button */}
        <button
          onClick={() => setIsExpanded(true)}
          className="fixed bottom-20 right-4 z-[70] flex items-center gap-2 px-4 py-2.5 rounded-full bg-foreground text-background shadow-xl hover:scale-105 transition-transform"
        >
          <Brain className="w-4 h-4" />
          <span className="text-[11px] font-bold">CMO</span>
          {totalBadge > 0 && (
            <span className="ml-0.5 w-5 h-5 rounded-full bg-amber-500 text-[9px] font-bold text-foreground flex items-center justify-center">
              {totalBadge}
            </span>
          )}
          <div className={`w-2 h-2 rounded-full ${pulseConfig?.color} ${pulseConfig?.speed}`} />
        </button>

        <Drawer open={isExpanded} onOpenChange={setIsExpanded}>
          <DrawerContent className="h-[60vh] p-0">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="h-12 border-b border-border flex items-center justify-between px-5 bg-secondary/30 shrink-0">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">
                    CMO Intelligence
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {pendingReviewCount > 0 && (
                    <Badge variant="secondary" className="text-[8px]">
                      {pendingReviewCount} pending
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[8px] border-emerald-300 text-emerald-700 bg-emerald-50">
                    LIVE
                  </Badge>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {insights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`rounded-xl border p-3 space-y-1.5 ${
                      insight.type === "critical"
                        ? "border-destructive/30 bg-destructive/5"
                        : insight.type === "opportunity"
                        ? "border-amber-200 bg-amber-50/50"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {insight.type === "critical" ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                      ) : insight.type === "opportunity" ? (
                        <Zap className="w-3.5 h-3.5 text-amber-600" />
                      ) : (
                        <Shield className="w-3.5 h-3.5 text-primary" />
                      )}
                      <span className="text-xs font-bold text-foreground">{insight.title}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{insight.body}</p>
                    {insight.action && (
                      <Button
                        size="sm"
                        variant={insight.type === "critical" ? "destructive" : "outline"}
                        className="w-full text-[10px] h-7 mt-1"
                        onClick={() => handleInsightAction(insight)}
                      >
                        {insight.action}
                      </Button>
                    )}
                  </div>
                ))}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-secondary/50 rounded-xl border border-border text-center">
                    <p className="text-[7px] uppercase tracking-wider text-muted-foreground font-bold">Campaigns</p>
                    <p className="text-base font-black text-foreground">{campaignCount}</p>
                  </div>
                  <div className="p-2 bg-secondary/50 rounded-xl border border-border text-center">
                    <p className="text-[7px] uppercase tracking-wider text-muted-foreground font-bold">Review</p>
                    <p className={`text-base font-black ${pendingReviewCount > 0 ? "text-amber-600" : "text-foreground"}`}>
                      {pendingReviewCount}
                    </p>
                  </div>
                  <div className="p-2 bg-secondary/50 rounded-xl border border-border text-center">
                    <p className="text-[7px] uppercase tracking-wider text-muted-foreground font-bold">24h Assets</p>
                    <p className="text-base font-black text-foreground">{recentAssetCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // ── Desktop: Flex-child squeeze rail ──
  return (
    <>
      {/* Click-outside to close on desktop */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-[5]"
          onClick={() => { setIsExpanded(false); dismissToast(); }}
        />
      )}
      <aside
        className="shrink-0 border-l border-border bg-background overflow-hidden transition-[width] duration-500 ease-[cubic-bezier(0.2,0,0,1)]"
        style={{ width: railWidth }}
      >
        {!shouldHide && (
          <div className="flex h-full" style={{ width: "380px" }}>
            {/* The Sentinel Strip (always visible 48px) — FIRST so it's visible when collapsed */}
            <div
              className="w-12 h-full bg-background border-r border-border flex flex-col items-center py-4 gap-4 cursor-pointer shrink-0"
              onClick={() => {
                setIsExpanded(!isExpanded);
                dismissToast();
              }}
            >
              <div className="relative group mt-8">
                <div className={`w-2.5 h-2.5 rounded-full ${pulseConfig?.color} ${pulseConfig?.shadow} ${pulseConfig?.speed}`} />
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-foreground text-background text-[9px] font-semibold rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {systemStatus === "optimal" ? "System Optimal" : systemStatus === "alert" ? "Opportunity Detected" : "Action Required"}
                </div>
              </div>

              {pendingReviewCount > 0 && !isExpanded && (
                <div className="relative">
                  <ImageIcon className="w-4 h-4 text-amber-600" />
                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 text-[7px] font-bold text-foreground flex items-center justify-center">
                    {pendingReviewCount}
                  </span>
                </div>
              )}

              <div className="flex-1 flex flex-col gap-3 mt-4 items-center">
                {systemStatus === "critical" && (
                  <div className="p-1.5 rounded-lg bg-destructive/10 text-destructive">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                )}
                <div className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>

              <div className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                {isExpanded ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              </div>
            </div>

            {/* Expanded Panel Content — slides in from right */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Panel Header */}
              <div className="h-12 border-b border-border flex items-center justify-between px-5 bg-secondary/30 shrink-0">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">
                    CMO Intelligence
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {pendingReviewCount > 0 && (
                    <Badge variant="secondary" className="text-[8px]">
                      {pendingReviewCount} pending
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[8px] border-emerald-300 text-emerald-700 bg-emerald-50">
                    LIVE
                  </Badge>
                </div>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {insights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`rounded-xl border p-4 space-y-2 animate-fade-in ${
                      insight.type === "critical"
                        ? "border-destructive/30 bg-destructive/5"
                        : insight.type === "opportunity"
                        ? "border-amber-200 bg-amber-50/50"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {insight.type === "critical" ? (
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                      ) : insight.type === "opportunity" ? (
                        <Zap className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Shield className="w-4 h-4 text-primary" />
                      )}
                      <span className="text-xs font-bold text-foreground">{insight.title}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{insight.body}</p>
                    {insight.action && (
                      <Button
                        size="sm"
                        variant={insight.type === "critical" ? "destructive" : "outline"}
                        className="w-full text-[10px] h-8 mt-2"
                        onClick={() => handleInsightAction(insight)}
                      >
                        {insight.action}
                      </Button>
                    )}
                  </div>
                ))}

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 bg-secondary/50 rounded-xl border border-border text-center">
                    <p className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold">Campaigns</p>
                    <p className="text-lg font-black text-foreground">{campaignCount}</p>
                  </div>
                  <div className="p-3 bg-secondary/50 rounded-xl border border-border text-center">
                    <p className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold">Review</p>
                    <p className={`text-lg font-black ${pendingReviewCount > 0 ? "text-amber-600" : "text-foreground"}`}>
                      {pendingReviewCount}
                    </p>
                  </div>
                  <div className="p-3 bg-secondary/50 rounded-xl border border-border text-center">
                    <p className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold">24h Assets</p>
                    <p className="text-lg font-black text-foreground">{recentAssetCount}</p>
                  </div>
                </div>

                {/* Monitoring Status */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">
                      Live Monitoring
                    </span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: "Campaign Health", status: systemStatus === "critical" ? "Alert" : "Active", icon: Activity },
                      { label: "Pending Reviews", status: pendingReviewCount > 0 ? `${pendingReviewCount} waiting` : "Clear", icon: Clock },
                      { label: "Generation Pipeline", status: "Online", icon: Sparkles },
                    ].map(({ label, status, icon: Icon }) => (
                      <div key={label} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Icon className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">{label}</span>
                        </div>
                        <Badge variant="secondary" className="text-[8px]">{status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Toast portaled to body so it doesn't break flex layout */}
      {toast_el}
    </>
  );
};

export default SentientCMORail;
