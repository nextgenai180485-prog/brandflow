import { useState, useEffect } from "react";
import { Plus, CheckCircle2, Circle, Sparkles, SearchX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import ShowcaseDetailModal, { type ShowcaseItem } from "@/components/ShowcaseDetailModal";

// Static fallback images
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

const STATIC_FALLBACKS: ShowcaseItem[] = [
  { id: "s1", title: "Fashion Editorial", description: null, media_url: fashionImg, thumbnail_url: fashionImg, industry_tags: ["fashion"], mood_tags: ["editorial"], platform_tags: ["instagram"], sealcam_analysis: {}, performance_notes: null },
  { id: "s2", title: "Luxury Skincare", description: null, media_url: skincareImg, thumbnail_url: skincareImg, industry_tags: ["beauty"], mood_tags: ["luxurious"], platform_tags: ["instagram"], sealcam_analysis: {}, performance_notes: null },
  { id: "s3", title: "Product Showcase", description: null, media_url: sneakerImg, thumbnail_url: sneakerImg, industry_tags: ["ecommerce"], mood_tags: ["minimal"], platform_tags: ["instagram"], sealcam_analysis: {}, performance_notes: null },
  { id: "s4", title: "Food & Beverage", description: null, media_url: foodImg, thumbnail_url: foodImg, industry_tags: ["food"], mood_tags: ["warm"], platform_tags: ["instagram"], sealcam_analysis: {}, performance_notes: null },
  { id: "s5", title: "Tech Product Ad", description: null, media_url: techImg, thumbnail_url: techImg, industry_tags: ["technology"], mood_tags: ["sleek"], platform_tags: ["instagram"], sealcam_analysis: {}, performance_notes: null },
  { id: "s6", title: "Real Estate", description: null, media_url: realestateImg, thumbnail_url: realestateImg, industry_tags: ["real_estate"], mood_tags: ["aspirational"], platform_tags: ["instagram"], sealcam_analysis: {}, performance_notes: null },
  { id: "s7", title: "Fitness Brand", description: null, media_url: fitnessImg, thumbnail_url: fitnessImg, industry_tags: ["fitness"], mood_tags: ["energetic"], platform_tags: ["instagram"], sealcam_analysis: {}, performance_notes: null },
  { id: "s8", title: "Lifestyle Brand", description: null, media_url: coffeeImg, thumbnail_url: coffeeImg, industry_tags: ["lifestyle"], mood_tags: ["cozy"], platform_tags: ["instagram"], sealcam_analysis: {}, performance_notes: null },
  { id: "s9", title: "Luxury Jewelry", description: null, media_url: jewelryImg, thumbnail_url: jewelryImg, industry_tags: ["jewelry"], mood_tags: ["luxurious"], platform_tags: ["instagram"], sealcam_analysis: {}, performance_notes: null },
  { id: "s10", title: "Travel & Tourism", description: null, media_url: travelImg, thumbnail_url: travelImg, industry_tags: ["travel"], mood_tags: ["dreamy"], platform_tags: ["instagram"], sealcam_analysis: {}, performance_notes: null },
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
  const [dbItems, setDbItems] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ShowcaseItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch from ad_reference_library
  useEffect(() => {
    const fetchItems = async () => {
      const { data } = await supabase
        .from("ad_reference_library")
        .select("id, title, description, media_url, thumbnail_url, industry_tags, mood_tags, platform_tags, sealcam_analysis, performance_notes")
        .eq("is_active", true)
        .order("usage_count", { ascending: false })
        .limit(20);

      if (data && data.length > 0) {
        setDbItems(data.map((d) => ({
          ...d,
          sealcam_analysis: (d.sealcam_analysis as Record<string, string>) || {},
        })));
      }
      setLoading(false);
    };
    fetchItems();
  }, []);

  const showcaseItems = dbItems.length > 0 ? dbItems : STATIC_FALLBACKS;

  // Simple filter: "trending" = first half, "top" = second half (for demo)
  const filteredItems = showcaseItems.filter((_, i) => {
    if (activeTab === "competitors" || activeTab === "generations") return false;
    if (activeTab === "foryou" && i % 2 !== 0) return false;
    if (activeFilter === "all") return true;
    if (activeFilter === "trending") return i % 2 === 0;
    if (activeFilter === "top") return i % 3 === 0;
    return true;
  });

  const hasEmptyState = activeTab === "competitors" || activeTab === "generations";

  const handleCardClick = (item: ShowcaseItem) => {
    setSelectedItem(item);
    setModalOpen(true);
  };

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
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
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

      {/* Inspiration Showcase */}
      <div className="w-full mt-16">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setActiveFilter("all"); }}>
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

          {/* Content */}
          <div className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : hasEmptyState ? (
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
                    onClick={() => handleCardClick(item)}
                    className="break-inside-avoid rounded-xl overflow-hidden bg-card border border-border/50 group relative cursor-pointer transition-all duration-200 hover:shadow-md hover:border-border hover:scale-[1.01]"
                  >
                    <img
                      src={item.thumbnail_url || item.media_url || ""}
                      alt={item.title}
                      className="w-full h-auto object-cover"
                      loading="lazy"
                    />
                    <Badge className="absolute top-2.5 right-2.5 bg-primary text-primary-foreground text-[10px] font-medium px-2 py-0.5 border-0 shadow-sm">
                      {item.mood_tags?.[0] ? item.mood_tags[0].charAt(0).toUpperCase() + item.mood_tags[0].slice(1) : "Template"}
                    </Badge>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-3 pt-8">
                      <p className="text-[11px] font-medium text-white/90 truncate">{item.title}</p>
                      <p className="text-[9px] text-white/60">{item.industry_tags?.[0] || "General"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Tabs>

        <div className="flex justify-center mt-8">
          <p className="text-xs text-muted-foreground/70 bg-muted/50 px-4 py-2 rounded-full">
            Click any template to preview details and create a campaign
          </p>
        </div>
      </div>

      <ShowcaseDetailModal
        item={selectedItem}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
};

export default EmptyCampaigns;
