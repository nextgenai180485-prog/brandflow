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
import { LogOut, ChevronDown, Sparkles, Share2 } from "lucide-react";

const baseNavItems = [
  { label: "Campaigns", path: "/dashboard" },
  { label: "Creative Sandbox", path: "/dashboard/visual-director" },
  { label: "Libraries", path: "/dashboard/libraries" },
  { label: "Calendar", path: "/calendar" },
  { label: "Channels", path: "/dashboard/social-settings" },
];

const adminNavItems = [
  { label: "Admin", path: "/dashboard/admin/libraries" },
];

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const initials = user?.user_metadata?.first_name
    ? `${(user.user_metadata.first_name as string)[0]}${(user.user_metadata.last_name as string)?.[0] ?? ""}`
    : user?.email?.[0]?.toUpperCase() ?? "U";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const openCSO = () => {
    window.dispatchEvent(new CustomEvent("toggle-cso"));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-12 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <span
              className="text-base font-semibold tracking-tight text-foreground cursor-pointer"
              onClick={() => navigate("/dashboard")}
            >
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
            {/* CSO Trigger */}
            <button
              onClick={openCSO}
              className="relative flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/20 hover:scale-[1.02] active:scale-[0.98]"
              title="Open Chief Strategy Officer (⌘K)"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Strategy</span>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full p-0.5 pr-2 transition-colors hover:bg-accent focus:outline-none">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
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

      <main>{children}</main>
    </div>
  );
};

export default AppShell;
