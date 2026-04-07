import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  Film, Users, Image, Megaphone, Zap,
  TrendingUp, Database, Activity, ArrowRight,
} from "lucide-react";

const LIBRARIES = [
  { key: "video_templates", label: "Video Templates", icon: Film, tab: "video_templates" },
  { key: "character_library", label: "Characters", icon: Users, tab: "character_library" },
  { key: "ad_reference_library", label: "Ad References", icon: Megaphone, tab: "ad_reference_library" },
  { key: "image_templates", label: "Image Templates", icon: Image, tab: "image_templates" },
  { key: "hooks", label: "Hooks", icon: Zap, tab: "hooks" },
] as const;

const AdminDashboard = () => {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const results = await Promise.all(
        LIBRARIES.map(async (lib) => {
          const { data, error } = await supabase.functions.invoke("admin-library", {
            body: { action: "list", table: lib.key },
          });
          const items = data?.items || [];
          return {
            key: lib.key,
            total: items.length,
            active: items.filter((i: any) => i.is_active !== false).length,
            inactive: items.filter((i: any) => i.is_active === false).length,
            totalUsage: items.reduce((sum: number, i: any) => sum + (i.usage_count || 0), 0),
            recentItems: items.slice(0, 3),
          };
        })
      );
      return results;
    },
  });

  const totalItems = stats?.reduce((sum, s) => sum + s.total, 0) || 0;
  const totalActive = stats?.reduce((sum, s) => sum + s.active, 0) || 0;
  const totalUsage = stats?.reduce((sum, s) => sum + s.totalUsage, 0) || 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground mt-1">Overview of all content libraries and system health.</p>
          </div>
          <Button
            size="sm"
            onClick={() => navigate("/dashboard/admin/libraries")}
            className="text-xs gap-1"
          >
            Manage Libraries <ArrowRight className="h-3 w-3" />
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {isLoading ? "—" : totalItems}
                </p>
                <p className="text-[10px] text-muted-foreground">Total Items</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {isLoading ? "—" : totalActive}
                </p>
                <p className="text-[10px] text-muted-foreground">Active Items</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {isLoading ? "—" : totalUsage.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground">Total Usage</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Per-library breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {LIBRARIES.map((lib, idx) => {
            const s = stats?.[idx];
            const Icon = lib.icon;
            return (
              <Card
                key={lib.key}
                className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
                onClick={() => navigate(`/dashboard/admin/libraries?tab=${lib.tab}`)}
              >
                <CardHeader className="pb-2 flex flex-row items-center gap-2">
                  <div className="h-8 w-8 rounded-md bg-accent flex items-center justify-center">
                    <Icon className="h-4 w-4 text-foreground" />
                  </div>
                  <CardTitle className="text-xs font-medium">{lib.label}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {isLoading ? (
                    <div className="h-12 bg-muted animate-pulse rounded" />
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-foreground font-medium">{s?.total || 0} total</span>
                        <Badge variant="secondary" className="text-[9px]">
                          {s?.active || 0} active
                        </Badge>
                        {(s?.inactive || 0) > 0 && (
                          <Badge variant="outline" className="text-[9px]">
                            {s.inactive} off
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {(s?.totalUsage || 0).toLocaleString()} total uses
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
};

export default AdminDashboard;
