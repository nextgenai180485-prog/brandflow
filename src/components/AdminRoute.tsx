import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ShieldAlert } from "lucide-react";

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, isLoading } = useUserRole();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <ShieldAlert className="h-10 w-10 text-muted-foreground/40" />
        <h2 className="text-sm font-medium text-foreground">Access Denied</h2>
        <p className="text-xs text-muted-foreground max-w-xs text-center">
          You need admin privileges to access this area.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-2 text-xs text-primary hover:underline"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;
