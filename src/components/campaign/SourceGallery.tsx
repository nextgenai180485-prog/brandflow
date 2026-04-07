import { useState, useEffect } from "react";
import { Check, Loader2, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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

export interface SourceTemplate {
  id: string;
  title: string;
  description: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  industry_tags: string[] | null;
  mood_tags: string[] | null;
  platform_tags: string[] | null;
  sealcam_analysis: Record<string, string>;
  performance_notes: string | null;
}

interface SourceGalleryProps {
  selectedId: string | null;
  onSelect: (template: SourceTemplate | null) => void;
  className?: string;
}

const STATIC_FALLBACKS: SourceTemplate[] = [
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

const FILTER_CHIPS = [
  { key: "all", label: "All" },
  { key: "trending", label: "Trending" },
  { key: "top", label: "Top Ads" },
];

export default function SourceGallery({ selectedId, onSelect, className }: SourceGalleryProps) {
  const [activeTab, setActiveTab] = useState("templates");
  const [activeFilter, setActiveFilter] = useState("all");
  const [dbItems, setDbItems] = useState<SourceTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      const { data } = await supabase
        .from("ad_reference_library")
        .select("id, title, description, media_url, thumbnail_url, industry_tags, mood_tags, platform_tags, sealcam_analysis, performance_notes")
        .eq("is_active", true)
        .not("thumbnail_url", "is", null)
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

  const items = dbItems.length > 0 ? dbItems : STATIC_FALLBACKS;

  const filteredItems = items.filter((_, i) => {
    if (activeTab === "competitors" || activeTab === "generations") return false;
    if (activeTab === "foryou" && i % 2 !== 0) return false;
    if (activeFilter === "all") return true;
    if (activeFilter === "trending") return i % 2 === 0;
    if (activeFilter === "top") return i % 3 === 0;
    return true;
  });

  const hasEmptyState = activeTab === "competitors" || activeTab === "generations";

  const handleClick = (item: SourceTemplate) => {
    if (selectedId === item.id) {
      onSelect(null); // deselect
    } else {
      onSelect(item);
    }
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setActiveFilter("all"); }}>
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
          <TabsList className="bg-transparent p-0 h-auto gap-0 rounded-none shrink-0">
            {[
              { value: "templates", label: "Templates" },
              { value: "competitors", label: "Competitors" },
              { value: "generations", label: "Your Generations" },
              { value: "foryou", label: "For You" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2 text-xs"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Filter chips */}
          {!hasEmptyState && (
            <div className="flex items-center gap-1.5 shrink-0">
              {FILTER_CHIPS.map((chip) => (
                <Button
                  key={chip.key}
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveFilter(chip.key)}
                  className={cn(
                    "text-[10px] h-6 px-2.5 rounded-full transition-colors",
                    activeFilter === chip.key
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {chip.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="mt-3">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : hasEmptyState ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <SearchX className="w-8 h-8 text-muted-foreground/30 mb-3" />
              <p className="text-xs font-medium text-foreground mb-0.5">
                {activeTab === "competitors" ? "No competitor analysis yet" : "No generated content yet"}
              </p>
              <p className="text-[10px] text-muted-foreground max-w-xs">
                {activeTab === "competitors"
                  ? "Create your first campaign and Brandflow will analyze competitor strategies."
                  : "Your AI-generated content will appear here after your first campaign."}
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <p className="text-xs text-muted-foreground">No items match this filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
              {filteredItems.map((item) => {
                const isSelected = selectedId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleClick(item)}
                    className={cn(
                      "relative rounded-lg overflow-hidden aspect-[4/5] group transition-all duration-200 border-2",
                      isSelected
                        ? "border-primary ring-2 ring-primary/20 scale-[1.02]"
                        : "border-transparent hover:border-foreground/20 hover:scale-[1.01]"
                    )}
                  >
                    <img
                      src={item.thumbnail_url || item.media_url || ""}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />

                    {/* Selection checkmark */}
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-lg z-10">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}

                    {/* Mood badge */}
                    <Badge className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[8px] font-medium px-1.5 py-0 border-0 backdrop-blur-sm">
                      {item.mood_tags?.[0] ? item.mood_tags[0].charAt(0).toUpperCase() + item.mood_tags[0].slice(1) : "Template"}
                    </Badge>

                    {/* Title overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-2 pt-6">
                      <p className="text-[9px] font-medium text-white/90 truncate">{item.title}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}