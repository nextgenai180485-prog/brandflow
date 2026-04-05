import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ImageIcon, Clock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import type { Campaign, CampaignStatus } from "@/types/campaigns";

interface CampaignListProps {
  campaigns: Campaign[];
}

const statusConfig: Record<CampaignStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-secondary text-secondary-foreground" },
  generating: { label: "Generating", className: "animate-pulse border-blue-300 text-blue-700 bg-blue-50" },
  review: { label: "In Review", className: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  scheduled: { label: "Scheduled", className: "bg-violet-100 text-violet-800 border-violet-200" },
  published: { label: "Published", className: "bg-sky-100 text-sky-800 border-sky-200" },
};

const CampaignList = ({ campaigns }: CampaignListProps) => {
  const navigate = useNavigate();
  const [assetCounts, setAssetCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchCounts = async () => {
      const ids = campaigns.map((c) => c.id);
      if (ids.length === 0) return;
      const { data } = await supabase
        .from("generated_assets")
        .select("campaign_id")
        .in("campaign_id", ids);
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((row) => {
          counts[row.campaign_id] = (counts[row.campaign_id] || 0) + 1;
        });
        setAssetCounts(counts);
      }
    };
    fetchCounts();
  }, [campaigns]);

  return (
    <div className="grid gap-4">
      {campaigns.map((campaign) => {
        const status = statusConfig[campaign.status];
        const count = assetCounts[campaign.id] || 0;

        return (
          <div
            key={campaign.id}
            onClick={() => navigate(`/dashboard/campaigns/${campaign.id}`)}
            className="group flex items-center justify-between rounded-xl border border-border bg-card p-5 cursor-pointer transition-all hover:shadow-md hover:border-foreground/10"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1.5">
                <h3 className="text-base font-semibold text-foreground truncate">{campaign.title}</h3>
                <Badge variant="outline" className={status.className}>{status.label}</Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {format(new Date(campaign.created_at), "MMM d, yyyy")}
                </span>
                {count > 0 && (
                  <span className="flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5" />
                    {count} asset{count !== 1 ? "s" : ""}
                  </span>
                )}
                {campaign.scheduled_at && (
                  <span className="text-violet-600">
                    Scheduled: {format(new Date(campaign.scheduled_at), "MMM d 'at' h:mm a")}
                  </span>
                )}
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        );
      })}
    </div>
  );
};

export default CampaignList;
