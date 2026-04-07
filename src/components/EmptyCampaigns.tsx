import { useState } from "react";
import { Plus, CheckCircle2, Circle, Sparkles, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
  tabs: string[]; // which tabs this item appears in
  filters: string[]; // which filter chips apply
};

const showcaseItems: ShowcaseCard[] = [
  { id: "1", src: fashionImg, label: "Fashion Editorial", category: "Fashion", tabs: ["templates", "foryou"], filters: ["trending"] },
  { id: "2", src: skincareImg, label: "Luxury Skincare", category: "Beauty", tabs: ["templates", "foryou"], filters: ["trending", "top"] },
  { id: "3", src: sneakerImg, label: "Product Showcase", category: "Ecommerce", tabs: ["templates"], filters: ["top"] },
  { id: "4", src: foodImg, label: "Food & Beverage", category: "Restaurant", tabs: ["templates", "foryou"], filters: ["trending"] },
  { id: "5", src: techImg, label: "Tech Product Ad", category: "Technology", tabs: ["templates"], filters: ["top"] },
  { id: "6", src: realestateImg, label: "Real Estate", category: "Property", tabs: ["templates", "foryou"], filters: ["trending", "top"] },
  { id: "7", src: fitnessImg, label: "Fitness Brand", category: "Health", tabs: ["templates"], filters: ["trending"] },
  { id: "8", src: coffeeImg, label: "Lifestyle Brand", category: "Lifestyle", tabs: ["templates", "foryou"], filters: ["top"] },
  { id: "9", src: jewelryImg, label: "Luxury Jewelry", category: "Luxury", tabs: ["templates", "foryou"], filters: ["trending", "top"] },
  { id: "10", src: travelImg, label: "Travel & Tourism", category: "Travel", tabs: ["templates"], filters: ["trending"] },
];

const filterChips = [
  { key: "all", label: "All" },
  { key: "trending", label: "Trending" },
  { key: "top", label: "Top Ads" },
];

const EmptyCampaigns = ({ onCreateClick, hasProfile = true }: EmptyCampaignsProps) => {
  const completedSteps = hasProfile ? [true, false, false] : [false, false, false];
  const [activeTab, setActiveTab] = useState("templates");
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredItems = showcaseItems.filter((item) => {
    const matchesTab = item.tabs.includes(activeTab);
    const matchesFilter = activeFilter === "all" || item.filters.includes(activeFilter);
    return matchesTab && matchesFilter;
  });

  const hasEmptyState = activeTab === "competitors" || activeTab === "generations";

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

      {/* Inspiration Showcase with Tabs + Filter Chips */}
      <div className="w-full max-w-5xl mt-16 px-4">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setActiveFilter("all"); }}>
          {/* Tab Navigation */}
          <div className="overflow-x-auto scrollbar-hide">
            <TabsList className="w-full justify-start bg-transparent p-0 h-auto gap-0 border-b border-border rounded-none">
              <TabsTrigger value="templates" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm">
                Templates
              </TabsTrigger>
              <TabsTrigger value="competitors" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm">
                Competitors
              </TabsTrigger>
              <TabsTrigger value="generations" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm">
                Your Generations
              </TabsTrigger>
              <TabsTrigger value="foryou" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm">
                For You
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Filter Chips */}
          {!hasEmptyState && (
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {filterChips.map((chip) => (
                <Button
                  key={chip.key}
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveFilter(chip.key)}
                  className={`text-xs h-7 px-3 rounded-full transition-colors ${
                    activeFilter === chip.key
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {chip.label}
                </Button>
              ))}
            </div>
          )}

          {/* Tab Content — shared masonry grid or empty state */}
          <div className="mt-6">
            {hasEmptyState ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <SearchX className="w-10 h-10 text-muted-foreground/30 mb-4" />
                <p className="text-sm font-medium text-foreground mb-1">
                  {activeTab === "competitors" ? "No competitor analysis yet" : "No generated content yet"}
                </p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  {activeTab === "competitors"
                    ? "Create your first campaign and Brandflow will analyze competitor strategies for you."
                    : "Your AI-generated content will appear here after your first campaign."}
                </p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <SearchX className="w-10 h-10 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground">No items match this filter</p>
              </div>
            ) : (
              <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3 space-y-3">
                {filteredItems.map((item) => (
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
                    <Badge className="absolute top-2.5 right-2.5 bg-primary text-primary-foreground text-[10px] font-medium px-2 py-0.5 border-0 shadow-sm">
                      {item.filters.includes("trending") ? "Trending" : "Top"}
                    </Badge>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-3 pt-8">
                      <p className="text-[11px] font-medium text-white/90 truncate">{item.label}</p>
                      <p className="text-[9px] text-white/60">{item.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Tabs>

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
