import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Campaign } from "@/types/campaigns";

const CalendarView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const fetchScheduled = useCallback(async () => {
    if (!user) return;
    const weekEnd = addDays(weekStart, 7);
    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .not("scheduled_at", "is", null)
      .gte("scheduled_at", weekStart.toISOString())
      .lt("scheduled_at", weekEnd.toISOString())
      .order("scheduled_at", { ascending: true });

    if (data) setCampaigns(data as Campaign[]);
    setLoading(false);
  }, [user, weekStart]);

  useEffect(() => {
    fetchScheduled();
  }, [fetchScheduled]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto py-12 px-4 md:px-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Content Calendar</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Week of {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setWeekStart((d) => addDays(d, -7))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => setWeekStart((d) => addDays(d, 7))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-3">
            {days.map((day) => {
              const dayCampaigns = campaigns.filter(
                (c) => c.scheduled_at && isSameDay(new Date(c.scheduled_at), day)
              );
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={`rounded-xl border p-3 min-h-[160px] ${
                    isToday ? "border-foreground/20 bg-card" : "border-border bg-card/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-medium uppercase tracking-wide ${isToday ? "text-foreground" : "text-muted-foreground"}`}>
                      {format(day, "EEE")}
                    </span>
                    <span className={`text-lg font-semibold ${isToday ? "text-foreground" : "text-muted-foreground/60"}`}>
                      {format(day, "d")}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {dayCampaigns.map((campaign) => (
                      <div
                        key={campaign.id}
                        onClick={() => navigate(`/dashboard/strategy/new?campaign=${campaign.id}`)}
                        className="rounded-lg bg-background border border-border p-2 cursor-pointer hover:shadow-sm transition-shadow"
                      >
                        <p className="text-xs font-medium text-foreground truncate">{campaign.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {campaign.scheduled_at && format(new Date(campaign.scheduled_at), "h:mm a")}
                        </p>
                        {campaign.publish_platforms && campaign.publish_platforms.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {campaign.publish_platforms.map((p) => (
                              <Badge key={p} variant="secondary" className="text-[9px] px-1.5 py-0">
                                {p}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {dayCampaigns.length === 0 && (
                      <div className="flex items-center justify-center h-16">
                        <CalendarIcon className="w-4 h-4 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default CalendarView;
