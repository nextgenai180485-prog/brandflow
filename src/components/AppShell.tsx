import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate, useLocation } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, ChevronDown, Menu, X, Sparkles, TrendingUp, Clock, Layers, ChevronRight } from "lucide-react";
import SentientCMORail from "@/components/SentientCMORail";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const baseNavItems = [
  { label: "Campaigns", path: "/dashboard" },
  { label: "Generations", path: "/dashboard/generations" },
  { label: "Libraries", path: "/dashboard/libraries" },
  { label: "Calendar", path: "/calendar" },
  { label: "Channels", path: "/dashboard/social-settings" },
];

const adminNavItems = [
  { label: "Admin", path: "/dashboard/admin" },
];

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [...baseNavItems, ...(isAdmin ? adminNavItems : [])];

  const currentPageTitle =
    navItems.find((item) =>
      item.path === "/dashboard"
        ? location.pathname === "/dashboard"
        : location.pathname.startsWith(item.path)
    )?.label ?? "Brandflow";

  const initials = user?.user_metadata?.first_name
    ? `${(user.user_metadata.first_name as string)[0]}${(user.user_metadata.last_name as string)?.[0] ?? ""}`
    : user?.email?.[0]?.toUpperCase() ?? "U";

  // Live metrics from real data
  const { data: metrics } = useQuery({
    queryKey: ["header-metrics", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const [campaigns, pendingAssets, totalAssets] = await Promise.all([
        supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("profile_id", user.id),
        supabase.from("generated_assets").select("id", { count: "exact", head: true }).eq("profile_id", user.id).eq("status", "pending_review"),
        supabase.from("generated_assets").select("id", { count: "exact", head: true }).eq("profile_id", user.id),
      ]);
      return {
        campaignCount: campaigns.count ?? 0,
        pendingReview: pendingAssets.count ?? 0,
        totalAssets: totalAssets.count ?? 0,
      };
    },
    enabled: !!user?.id,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const metricDisplay = useMemo(() => {
    if (!metrics) return null;
    if (metrics.pendingReview > 0) {
      return {
        icon: Clock,
        label: `${metrics.pendingReview} pending review`,
        colorClasses: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950 dark:border-amber-800",
      };
    }
    if (metrics.campaignCount > 0) {
      return {
        icon: TrendingUp,
        label: `${metrics.campaignCount} campaign${metrics.campaignCount !== 1 ? "s" : ""} · ${metrics.totalAssets} assets`,
        colorClasses: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950 dark:border-emerald-800",
      };
    }
    return {
      icon: Layers,
      label: "Ready to create",
      colorClasses: "text-primary bg-primary/10 border-primary/20",
    };
  }, [metrics]);
  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleMobileNav = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-500 ease-[cubic-bezier(0.2,0,0,1)]">
        <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl shrink-0">
          <div className="mx-auto flex h-12 items-center justify-between px-4 sm:px-6">
            {/* Left: Logo + Desktop Nav */}
            <div className="flex items-center gap-6">
              {/* Mobile hamburger with AI pulse */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 -ml-2 rounded-full text-foreground active:bg-accent/50 transition-colors relative"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <div className="relative">
                    <Menu className="w-5 h-5" />
                    <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background flex items-center justify-center shadow-sm">
                      <div className="w-1 h-1 bg-primary-foreground rounded-full animate-pulse" />
                    </div>
                  </div>
                )}
              </button>

              {/* Brand name — static on both mobile & desktop */}
              <span
                className="text-base font-semibold tracking-tight text-foreground cursor-pointer hidden md:block"
                onClick={() => navigate("/dashboard")}
              >
                Brandflow
              </span>
              <span className="md:hidden text-base font-bold tracking-tight text-foreground">
                Brandflow
              </span>

              <nav className="hidden md:flex items-center gap-0.5">
                {navItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      (item.path === "/dashboard"
                        ? location.pathname === "/dashboard"
                        : location.pathname.startsWith(item.path))
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full p-0.5 pr-2 transition-colors hover:bg-accent focus:outline-none">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3 w-3 text-muted-foreground hidden md:block" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-destructive focus:text-destructive text-xs"
                  >
                    <LogOut className="mr-2 h-3.5 w-3.5" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Mobile Overlay Dropdown */}
        <div
          className={`md:hidden fixed top-12 left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-border shadow-2xl z-40 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] origin-top ${
            mobileMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
        >
          <div className="p-4 space-y-4">
            {/* Status Card */}
            {metricDisplay && (
              <div className="flex items-center justify-between p-3 bg-accent/50 rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">{metricDisplay.label}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{currentPageTitle}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Links */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  item.path === "/dashboard"
                    ? location.pathname === "/dashboard"
                    : location.pathname.startsWith(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => handleMobileNav(item.path)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
                      isActive
                        ? "bg-foreground text-background shadow-md"
                        : "text-muted-foreground hover:bg-accent/50"
                    }`}
                  >
                    <span className="flex-1 text-left">{item.label}</span>
                    {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
                  </button>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="pt-3 border-t border-border flex justify-end">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-xs font-bold text-destructive bg-destructive/10 px-3 py-2 rounded-lg"
              >
                <LogOut className="w-3 h-3" /> Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Backdrop — click to dismiss */}
        {mobileMenuOpen && (
          <div
            className="md:hidden fixed top-12 left-0 right-0 bottom-0 bg-foreground/10 z-30 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      <SentientCMORail />
    </div>
  );
};

export default AppShell;
