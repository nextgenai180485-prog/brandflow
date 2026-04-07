import { Plus, CheckCircle2, Circle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Static showcase images — these represent the types of ads Brandflow creates
import fashionImg from "@/assets/showcase/fashion-editorial.jpg";
import skincareImg from "@/assets/showcase/skincare-luxury.jpg";
import foodImg from "@/assets/showcase/food-hero.jpg";
import techImg from "@/assets/showcase/tech-watch.jpg";
import realestateImg from "@/assets/showcase/realestate-luxury.jpg";
import fitnessImg from "@/assets/showcase/fitness-energy.jpg";
import coffeeImg from "@/assets/showcase/coffee-lifestyle.jpg";
import jewelryImg from "@/assets/showcase/jewelry-gold.jpg";
import travelImg from "@/assets/showcase/travel-tropical.jpg";
import sneakerImg from "@/assets/showcase/sneaker-minimal.jpg";

interface EmptyCampaignsProps {
  onCreateClick: () => void;
  hasProfile?: boolean;
}

const steps = [
  { label: "Create your account", done: true },
  { label: "Create first campaign", done: false },
  { label: "Review AI-generated content", done: false },
];

type ShowcaseCard = {
  id: string;
  src: string;
  label: string;
  category: string;
};

// Curated showcase grid — varied heights create the masonry effect
const showcaseItems: ShowcaseCard[] = [
  { id: "1", src: fashionImg, label: "Fashion Editorial", category: "Fashion" },
  { id: "2", src: skincareImg, label: "Luxury Skincare", category: "Beauty" },
  { id: "3", src: sneakerImg, label: "Product Showcase", category: "Ecommerce" },
  { id: "4", src: foodImg, label: "Food & Beverage", category: "Restaurant" },
  { id: "5", src: techImg, label: "Tech Product Ad", category: "Technology" },
  { id: "6", src: realestateImg, label: "Real Estate", category: "Property" },
  { id: "7", src: fitnessImg, label: "Fitness Brand", category: "Health" },
  { id: "8", src: coffeeImg, label: "Lifestyle Brand", category: "Lifestyle" },
  { id: "9", src: jewelryImg, label: "Luxury Jewelry", category: "Luxury" },
  { id: "10", src: travelImg, label: "Travel & Tourism", category: "Travel" },
];

const EmptyCampaigns = ({ onCreateClick, hasProfile = true }: EmptyCampaignsProps) => {
  const completedSteps = hasProfile ? [true, false, false] : [false, false, false];

  return (
    <div className="flex flex-col items-center justify-center py-16 md:py-24">
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

      {/* Inspiration Showcase — Masonry Grid */}
      <div className="w-full max-w-5xl mt-16 px-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            See what Brandflow creates
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* CSS Columns masonry — responsive */}
        <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3 space-y-3">
          {showcaseItems.map((item) => (
            <div
              key={item.id}
              className="break-inside-avoid rounded-xl overflow-hidden bg-card border border-border/50 group relative"
            >
              <img
                src={item.src}
                alt={item.label}
                className="w-full h-auto object-cover"
                loading="lazy"
              />
              {/* Trending badge */}
              <Badge
                className="absolute top-2.5 right-2.5 bg-primary text-primary-foreground text-[10px] font-medium px-2 py-0.5 border-0 shadow-sm"
              >
                Trending
              </Badge>
              {/* Bottom gradient overlay with label */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-3 pt-8">
                <p className="text-[11px] font-medium text-white/90 truncate">{item.label}</p>
                <p className="text-[9px] text-white/60">{item.category}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA hint */}
        <div className="flex justify-center mt-8">
          <p className="text-xs text-muted-foreground/70 bg-muted/50 px-4 py-2 rounded-full">
            Click "Create Your First Campaign" to build ads like these
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmptyCampaigns;
