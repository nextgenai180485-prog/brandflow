import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import EmptyCampaigns from "@/components/EmptyCampaigns";
import CampaignList from "@/components/CampaignList";
import { Button } from "@/components/ui/button";
import type { Campaign } from "@/types/campaigns";

const Dashboard = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchCampaigns = async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setCampaigns(data as Campaign[]);
      }
      setLoading(false);
    };

    fetchCampaigns();
  }, [user]);

  const handleCreateClick = () => {
    // Placeholder — will be wired in a future phase
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Campaigns</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your content generation campaigns.
            </p>
          </div>
          {campaigns.length > 0 && (
            <Button onClick={handleCreateClick}>
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyCampaigns onCreateClick={handleCreateClick} />
        ) : (
          <CampaignList campaigns={campaigns} />
        )}
      </div>
    </AppShell>
  );
};

export default Dashboard;
