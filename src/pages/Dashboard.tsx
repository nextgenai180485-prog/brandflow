import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import EmptyCampaigns from "@/components/EmptyCampaigns";
import CampaignList from "@/components/CampaignList";
import { Button } from "@/components/ui/button";
import type { Campaign } from "@/types/campaigns";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCampaigns(data as Campaign[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return (
    <AppShell>
      <div className="px-4 sm:px-6 pt-4 pb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Campaigns</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage your content generation campaigns.
            </p>
          </div>
          {campaigns.length > 0 && (
            <Button size="sm" onClick={() => navigate("/dashboard/campaigns/new")} className="h-8 text-xs gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              New Campaign
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-5 h-5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyCampaigns onCreateClick={() => navigate("/dashboard/campaigns/new")} />
        ) : (
          <CampaignList campaigns={campaigns} onDelete={fetchCampaigns} />
        )}
      </div>
    </AppShell>
  );
};

export default Dashboard;
