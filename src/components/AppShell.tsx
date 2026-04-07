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
import { LogOut, ChevronDown, Menu, X } from "lucide-react";
import SentientCMORail from "@/components/SentientCMORail";
import { useState } from "react";

const baseNavItems = [
  { label: "Campaigns", path: "/dashboard" },
  { label: "Creative Sandbox", path: "/dashboard/visual-director" },
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

  // Derive current page title for mobile header
  const currentPageTitle =
    navItems.find((item) =>
      item.path === "/dashboard"
        ? location.pathname === "/dashboard"
        : location.pathname.startsWith(item.path)
    )?.label ?? "Brandflow";

  const initials = user?.user_metadata?.first_name
    ? `${(user.user_metadata.first_name as string)[0]}${(user.user_metadata.last_name as string)?.[0] ?? ""}`
    : user?.email?.[0]?.toUpperCase() ?? "U";

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
      {/* Left + Center column (canvas) */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-500 ease-[cubic-bezier(0.2,0,0,1)]">
        <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
          <div className="mx-auto flex h-12 items-center justify-between px-4 sm:px-6">
            {/* Left: Logo + Desktop Nav */}
            <div className="flex items-center gap-6">
              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <span
                className="text-base font-semibold tracking-tight text-foreground cursor-pointer hidden md:block"
                onClick={() => navigate("/dashboard")}
              >
                Brandflow
              </span>

              {/* Mobile: contextual page title */}
              <span className="md:hidden text-sm font-semibold text-foreground">
                {currentPageTitle}
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

          {/* Mobile slide-down nav */}
          <div
            className={`md:hidden overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              mobileMenuOpen ? "max-h-80 border-t border-border" : "max-h-0"
            }`}
          >
            <div className="px-4 py-3 space-y-1 bg-background">
              {navItems.map((item) => {
                const isActive =
                  item.path === "/dashboard"
                    ? location.pathname === "/dashboard"
                    : location.pathname.startsWith(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => handleMobileNav(item.path)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* Right: CMO Sentient Rail (flex child — squeezes canvas, no blur) */}
      <SentientCMORail />
    </div>
  );
};

export default AppShell;
