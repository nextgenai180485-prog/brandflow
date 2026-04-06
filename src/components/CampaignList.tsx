import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ImageIcon, Clock, ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Campaign, CampaignStatus } from "@/types/campaigns";

interface CampaignListProps {
  campaigns: Campaign[];
  onDelete: () => void;
}

const statusConfig: Record<CampaignStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-secondary text-secondary-foreground" },
  generating: { label: "Generating", className: "animate-pulse border-blue-300 text-blue-700 bg-blue-50" },
  review: { label: "In Review", className: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  scheduled: { label: "Scheduled", className: "bg-violet-100 text-violet-800 border-violet-200" },
  published: { label: "Published", className: "bg-sky-100 text-sky-800 border-sky-200" },
};

const CampaignList = ({ campaigns, onDelete }: CampaignListProps) => {
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

  const handleDelete = async (e: React.MouseEvent, campaignId: string) => {
    e.stopPropagation();
    // Delete assets first, then campaign
    await supabase.from("generated_assets").delete().eq("campaign_id", campaignId);
    const { error } = await supabase.from("campaigns").delete().eq("id", campaignId);
    if (error) {
      toast.error("Failed to delete campaign.");
    } else {
      toast.success("Campaign deleted.");
      onDelete();
    }
  };

  return (
    <div className="grid gap-2">
      {campaigns.map((campaign) => {
        const status = statusConfig[campaign.status];
        const count = assetCounts[campaign.id] || 0;

        return (
          <div
            key={campaign.id}
            onClick={() => navigate(`/dashboard/strategy/new?campaign=${campaign.id}`)}
            className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 cursor-pointer transition-all hover:shadow-sm hover:border-foreground/10"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-sm font-semibold text-foreground truncate">{campaign.title}</h3>
                <Badge variant="outline" className={`text-[10px] ${status.className}`}>{status.label}</Badge>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(campaign.created_at), "MMM d, yyyy")}
                </span>
                {count > 0 && (
                  <span className="flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
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

            <div className="flex items-center gap-1.5">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{campaign.title}" and all its generated assets. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => handleDelete(e as any, campaign.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CampaignList;
