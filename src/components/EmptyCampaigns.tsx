import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyCampaignsProps {
  onCreateClick: () => void;
}

const EmptyCampaigns = ({ onCreateClick }: EmptyCampaignsProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-32">
      <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-6">
        <Plus className="w-7 h-7 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        No campaigns yet
      </h2>
      <p className="text-sm text-muted-foreground mb-8 max-w-sm text-center">
        Create your first campaign to start generating social media content with AI.
      </p>
      <Button onClick={onCreateClick} size="lg">
        Create New Campaign
      </Button>
    </div>
  );
};

export default EmptyCampaigns;
