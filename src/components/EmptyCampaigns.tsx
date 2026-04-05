import { Plus, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyCampaignsProps {
  onCreateClick: () => void;
  hasProfile?: boolean;
}

const steps = [
  { label: "Create your account", done: true },
  { label: "Create first campaign", done: false },
  { label: "Review AI-generated content", done: false },
];

const EmptyCampaigns = ({ onCreateClick, hasProfile = true }: EmptyCampaignsProps) => {
  const completedSteps = hasProfile ? [true, false, false] : [false, false, false];

  return (
    <div className="flex flex-col items-center justify-center py-24">
      {/* Illustration */}
      <div className="w-20 h-20 rounded-3xl bg-secondary flex items-center justify-center mb-8">
        <Plus className="w-9 h-9 text-muted-foreground" />
      </div>

      <h2 className="text-2xl font-semibold text-foreground mb-2">
        Welcome to Brandflow
      </h2>
      <p className="text-sm text-muted-foreground mb-2 max-w-sm text-center">
        Create your first campaign to start generating social media content with AI.
      </p>
      <p className="text-xs text-muted-foreground mb-8 max-w-sm text-center">
        Your first campaign will bring a fresh look to your Instagram feed.
      </p>

      {/* Onboarding checklist */}
      <div className="w-full max-w-xs mb-8 space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            {completedSteps[i] ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground/40 shrink-0" />
            )}
            <span className={completedSteps[i] ? "text-muted-foreground line-through" : "text-foreground"}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      <Button onClick={onCreateClick} size="lg" className="gap-2">
        <Plus className="w-4 h-4" />
        Create Your First Campaign
      </Button>
    </div>
  );
};

export default EmptyCampaigns;
