import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useUserRole = () => {
  const { user, loading: authLoading } = useAuth();

  const { data: roles = [], isLoading: queryLoading } = useQuery({
    queryKey: ["user-roles", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data || []).map((r: any) => r.role as string);
    },
  });

  // Still loading if auth hasn't resolved OR if user exists but role query is pending
  const isLoading = authLoading || (!!user?.id && queryLoading);

  return {
    roles,
    isAdmin: roles.includes("admin"),
    isModerator: roles.includes("moderator"),
    isLoading,
  };
};
