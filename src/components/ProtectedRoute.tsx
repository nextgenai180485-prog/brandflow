import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, user, loading } = useAuth();
  const location = useLocation();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setCheckingOnboarding(false);
      return;
    }
    const check = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Profile check error:", error);
          // If profile doesn't exist yet, treat as not completed
          setOnboardingCompleted(false);
        } else {
          setOnboardingCompleted(data?.onboarding_completed ?? false);
        }
      } catch (e) {
        console.error("Profile check exception:", e);
        setOnboardingCompleted(false);
      }
      setCheckingOnboarding(false);
    };
    check();
  }, [user]);

  if (loading || checkingOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (onboardingCompleted === false) {
    // Avoid redirect loop if already on onboarding
    if (location.pathname === "/onboarding") return <>{children}</>;
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
