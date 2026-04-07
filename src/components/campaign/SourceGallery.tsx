import { useState, useEffect, useMemo } from "react";
import { Check, Loader2, SearchX, RotateCcw, Star, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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

interface GeneratedItem {
  id: string;
  content_url: string | null;
  content_text: string | null;
  asset_type: string;
  platform: string | null;
  format: string | null;
  status: string;
  provider: string | null;
  campaign_id: string;
  campaign_title?: string;
  created_at: string;
}

interface CompetitorItem {
  id: string;
  campaign_id: string;
  campaign_title?: string;
  research_type: string;
  query: string;
  intelligence_brief: Record<string, any> | null;
  created_at: string;
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

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_review: { label: "Pending", color: "bg-amber-500/80" },
  approved: { label: "Approved", color: "bg-emerald-500/80" },
  rejected: { label: "Rejected", color: "bg-destructive/80" },
  pending: { label: "Generating", color: "bg-blue-500/80" },
};

export default function SourceGallery({ selectedId, onSelect, className }: SourceGalleryProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("templates");
  const [dbItems, setDbItems] = useState<SourceTemplate[]>([]);
  const [generations, setGenerations] = useState<GeneratedItem[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Enterprise filters
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterAssetType, setFilterAssetType] = useState("all");
  const [filterCampaign, setFilterCampaign] = useState("all");

  // Fetch all data in parallel
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      // Templates query
      const templatesPromise = supabase
        .from("ad_reference_library")
        .select("id, title, description, media_url, thumbnail_url, industry_tags, mood_tags, platform_tags, sealcam_analysis, performance_notes")
        .eq("is_active", true)
        .not("thumbnail_url", "is", null)
        .order("usage_count", { ascending: false })
        .limit(30)
        .then(r => r);

      const generationsPromise = user
        ? supabase
            .from("generated_assets")
            .select("id, content_url, content_text, asset_type, platform, format, status, provider, campaign_id, created_at")
            .eq("profile_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50)
            .then(r => r)
        : Promise.resolve({ data: null });

      const researchPromise = user
        ? supabase
            .from("campaign_research")
            .select("id, campaign_id, research_type, query, intelligence_brief, created_at")
            .eq("profile_id", user.id)
            .order("created_at", { ascending: false })
            .limit(30)
            .then(r => r)
        : Promise.resolve({ data: null });

      const campaignsPromise = user
        ? supabase
            .from("campaigns")
            .select("id, title")
            .eq("profile_id", user.id)
            .limit(100)
            .then(r => r)
        : Promise.resolve({ data: null });

      const results = await Promise.all([templatesPromise, generationsPromise, researchPromise, campaignsPromise]);

      // Templates
      const templateData = results[0]?.data;
      if (templateData?.length > 0) {
        setDbItems(templateData.map((d: any) => ({
          ...d,
          sealcam_analysis: (d.sealcam_analysis as Record<string, string>) || {},
        })));
      }

      if (user && results.length > 1) {
        const campaignMap: Record<string, string> = {};
        if (results[3]?.data) {
          results[3].data.forEach((c: any) => { campaignMap[c.id] = c.title; });
        }

        // Generations
        if (results[1]?.data) {
          setGenerations(results[1].data.map((g: any) => ({
            ...g,
            campaign_title: campaignMap[g.campaign_id] || "Untitled",
          })));
        }

        // Competitors
        if (results[2]?.data) {
          setCompetitors(results[2].data.map((c: any) => ({
            ...c,
            intelligence_brief: (c.intelligence_brief as Record<string, any>) || null,
            campaign_title: campaignMap[c.campaign_id] || "Untitled",
          })));
        }
      }

      setLoading(false);
    };
    fetchAll();
  }, [user]);

  // Derive unique campaign names for filter
  const campaignNames = useMemo(() => {
    const names = new Map<string, string>();
    generations.forEach(g => { if (g.campaign_id) names.set(g.campaign_id, g.campaign_title || "Untitled"); });
    competitors.forEach(c => { if (c.campaign_id) names.set(c.campaign_id, c.campaign_title || "Untitled"); });
    return Array.from(names.entries());
  }, [generations, competitors]);

  const items = dbItems.length > 0 ? dbItems : STATIC_FALLBACKS;

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    return items.filter(item => {
      if (filterPlatform !== "all" && !item.platform_tags?.includes(filterPlatform)) return false;
      return true;
    });
  }, [items, filterPlatform]);

  // Filtered generations
  const filteredGenerations = useMemo(() => {
    return generations.filter(g => {
      if (filterPlatform !== "all" && g.platform !== filterPlatform) return false;
      if (filterAssetType !== "all" && g.asset_type !== filterAssetType) return false;
      if (filterCampaign !== "all" && g.campaign_id !== filterCampaign) return false;
      return true;
    });
  }, [generations, filterPlatform, filterAssetType, filterCampaign]);

  // Filtered competitors
  const filteredCompetitors = useMemo(() => {
    return competitors.filter(c => {
      if (filterCampaign !== "all" && c.campaign_id !== filterCampaign) return false;
      return true;
    });
  }, [competitors, filterCampaign]);

  // For You = approved generations + top templates
  const forYouItems = useMemo(() => {
    const approved = generations.filter(g => g.status === "approved" && g.content_url);
    const topTemplates = items.slice(0, 5);
    return { approved, topTemplates };
  }, [generations, items]);

  const handleClick = (item: SourceTemplate) => {
    onSelect(selectedId === item.id ? null : item);
  };

  const handleGenerationUse = (gen: GeneratedItem) => {
    if (!gen.content_url) return;
    const asTemplate: SourceTemplate = {
      id: gen.id,
      title: `${gen.campaign_title || "Campaign"} — ${gen.asset_type}`,
      description: gen.content_text,
      media_url: gen.content_url,
      thumbnail_url: gen.content_url,
      industry_tags: null,
      mood_tags: null,
      platform_tags: gen.platform ? [gen.platform] : null,
      sealcam_analysis: {},
      performance_notes: `Provider: ${gen.provider || "unknown"} · Status: ${gen.status}`,
    };
    onSelect(asTemplate);
  };

  const resetFilters = () => {
    setFilterPlatform("all");
    setFilterAssetType("all");
    setFilterCampaign("all");
  };

  const hasActiveFilters = filterPlatform !== "all" || filterAssetType !== "all" || filterCampaign !== "all";

  return (
    <div className={cn("flex flex-col", className)}>
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); resetFilters(); }}>
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
          <TabsList className="bg-transparent p-0 h-auto gap-0 rounded-none shrink-0">
            {[
              { value: "templates", label: "Templates" },
              { value: "competitors", label: "Competitors", count: competitors.length },
              { value: "generations", label: "Your Generations", count: generations.length },
              { value: "foryou", label: "For You" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2 text-xs gap-1.5"
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-semibold">{tab.count}</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Enterprise Filters */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <Select value={filterPlatform} onValueChange={setFilterPlatform}>
              <SelectTrigger className="h-6 text-[10px] w-auto min-w-[80px] border-border/50 rounded-full px-2.5">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Platforms</SelectItem>
                <SelectItem value="instagram" className="text-xs">Instagram</SelectItem>
                <SelectItem value="tiktok" className="text-xs">TikTok</SelectItem>
                <SelectItem value="facebook" className="text-xs">Facebook</SelectItem>
                <SelectItem value="linkedin" className="text-xs">LinkedIn</SelectItem>
                <SelectItem value="x" className="text-xs">X (Twitter)</SelectItem>
                <SelectItem value="youtube" className="text-xs">YouTube</SelectItem>
              </SelectContent>
            </Select>

            {(activeTab === "generations" || activeTab === "foryou") && (
              <Select value={filterAssetType} onValueChange={setFilterAssetType}>
                <SelectTrigger className="h-6 text-[10px] w-auto min-w-[80px] border-border/50 rounded-full px-2.5">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Types</SelectItem>
                  <SelectItem value="image" className="text-xs">Image</SelectItem>
                  <SelectItem value="video" className="text-xs">Video</SelectItem>
                  <SelectItem value="copy" className="text-xs">Copy</SelectItem>
                </SelectContent>
              </Select>
            )}

            {(activeTab === "generations" || activeTab === "competitors") && campaignNames.length > 0 && (
              <Select value={filterCampaign} onValueChange={setFilterCampaign}>
                <SelectTrigger className="h-6 text-[10px] w-auto min-w-[90px] max-w-[140px] border-border/50 rounded-full px-2.5">
                  <SelectValue placeholder="Campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Campaigns</SelectItem>
                  {campaignNames.map(([id, name]) => (
                    <SelectItem key={id} value={id} className="text-xs truncate">{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-6 px-2 text-[10px] text-muted-foreground gap-1">
                <RotateCcw className="w-3 h-3" /> Clear
              </Button>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className="mt-3">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* ═══ Templates Tab ═══ */}
              {activeTab === "templates" && (
                filteredTemplates.length === 0 ? (
                  <EmptyState message="No templates match this filter" />
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
                    {filteredTemplates.map((item) => (
                      <TemplateCard key={item.id} item={item} isSelected={selectedId === item.id} onClick={() => handleClick(item)} />
                    ))}
                  </div>
                )
              )}

              {/* ═══ Generations Tab ═══ */}
              {activeTab === "generations" && (
                filteredGenerations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <SearchX className="w-8 h-8 text-muted-foreground/30 mb-3" />
                    <p className="text-xs font-medium text-foreground mb-0.5">No generated content yet</p>
                    <p className="text-[10px] text-muted-foreground max-w-xs">
                      Your AI-generated images, videos, and copy will appear here after your first campaign.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
                    {filteredGenerations.map((gen) => (
                      <GenerationCard key={gen.id} gen={gen} isSelected={selectedId === gen.id} onUse={() => handleGenerationUse(gen)} />
                    ))}
                  </div>
                )
              )}

              {/* ═══ Competitors Tab ═══ */}
              {activeTab === "competitors" && (
                filteredCompetitors.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <SearchX className="w-8 h-8 text-muted-foreground/30 mb-3" />
                    <p className="text-xs font-medium text-foreground mb-0.5">No competitor analysis yet</p>
                    <p className="text-[10px] text-muted-foreground max-w-xs">
                      Create your first campaign and Brandflow will analyze competitor strategies.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {filteredCompetitors.map((comp) => (
                      <CompetitorCard key={comp.id} comp={comp} />
                    ))}
                  </div>
                )
              )}

              {/* ═══ For You Tab ═══ */}
              {activeTab === "foryou" && (
                <ForYouGrid
                  approved={forYouItems.approved}
                  topTemplates={forYouItems.topTemplates}
                  selectedId={selectedId}
                  onSelectTemplate={handleClick}
                  onUseGeneration={handleGenerationUse}
                />
              )}
            </>
          )}
        </div>
      </Tabs>
    </div>
  );
}

/* ─── Sub-Components ─── */

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-10">
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

function TemplateCard({ item, isSelected, onClick }: { item: SourceTemplate; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative rounded-lg overflow-hidden aspect-[4/5] group transition-all duration-200 border-2",
        isSelected
          ? "border-primary ring-2 ring-primary/20 scale-[1.02]"
          : "border-transparent hover:border-foreground/20 hover:scale-[1.01]"
      )}
    >
      <img src={item.thumbnail_url || item.media_url || ""} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-lg z-10">
          <Check className="w-3 h-3 text-primary-foreground" />
        </div>
      )}
      <Badge className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[8px] font-medium px-1.5 py-0 border-0 backdrop-blur-sm">
        {item.mood_tags?.[0] ? item.mood_tags[0].charAt(0).toUpperCase() + item.mood_tags[0].slice(1) : "Template"}
      </Badge>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-2 pt-6">
        <p className="text-[9px] font-medium text-white/90 truncate">{item.title}</p>
      </div>
    </button>
  );
}

function GenerationCard({ gen, isSelected, onUse }: { gen: GeneratedItem; isSelected: boolean; onUse: () => void }) {
  const statusCfg = STATUS_CONFIG[gen.status] || { label: gen.status, color: "bg-muted" };
  const hasImage = gen.content_url && /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(gen.content_url);
  const date = new Date(gen.created_at);
  const timeAgo = getTimeAgo(date);

  return (
    <button
      onClick={onUse}
      className={cn(
        "relative rounded-lg overflow-hidden aspect-[4/5] group transition-all duration-200 border-2 text-left",
        isSelected
          ? "border-primary ring-2 ring-primary/20 scale-[1.02]"
          : "border-transparent hover:border-foreground/20 hover:scale-[1.01]"
      )}
    >
      {hasImage ? (
        <img src={gen.content_url!} alt={gen.campaign_title} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-secondary to-muted flex flex-col items-center justify-center p-3 gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          {gen.content_text && (
            <p className="text-[9px] text-muted-foreground text-center line-clamp-3">{gen.content_text}</p>
          )}
        </div>
      )}

      {/* Status badge */}
      <div className={cn("absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[8px] font-semibold text-white backdrop-blur-sm", statusCfg.color)}>
        {statusCfg.label}
      </div>

      {/* Selected check */}
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-lg z-10">
          <Check className="w-3 h-3 text-primary-foreground" />
        </div>
      )}

      {/* Bottom overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2 pt-6">
        <p className="text-[9px] font-medium text-white/90 truncate">{gen.campaign_title}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[8px] text-white/60 capitalize">{gen.platform || "—"} · {gen.asset_type}</span>
          <span className="text-[8px] text-white/40 flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" /> {timeAgo}
          </span>
        </div>
      </div>

      {/* Hover: Use as Reference */}
      {gen.content_url && (
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-[10px] font-semibold text-white bg-primary px-3 py-1.5 rounded-full shadow-lg">Use as Reference</span>
        </div>
      )}
    </button>
  );
}

function CompetitorCard({ comp }: { comp: CompetitorItem }) {
  const brief = comp.intelligence_brief;
  const summary = brief?.summary || brief?.analysis || comp.query;
  const competitors = brief?.competitors || brief?.brands || [];
  const date = new Date(comp.created_at);
  const timeAgo = getTimeAgo(date);

  return (
    <div className="rounded-xl border border-border bg-card p-3 hover:border-foreground/20 transition-colors group">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-foreground truncate">{comp.campaign_title}</p>
          <p className="text-[9px] text-muted-foreground capitalize">{comp.research_type.replace(/_/g, " ")}</p>
        </div>
        <span className="text-[8px] text-muted-foreground flex items-center gap-0.5 shrink-0">
          <Clock className="w-2.5 h-2.5" /> {timeAgo}
        </span>
      </div>

      {typeof summary === "string" && summary && (
        <p className="text-[9px] text-muted-foreground line-clamp-3 mb-2">{summary}</p>
      )}

      {Array.isArray(competitors) && competitors.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {competitors.slice(0, 4).map((c: any, i: number) => (
            <Badge key={i} variant="secondary" className="text-[8px] px-1.5 py-0 font-normal">
              {typeof c === "string" ? c : c.name || c.brand || "Competitor"}
            </Badge>
          ))}
          {competitors.length > 4 && (
            <Badge variant="outline" className="text-[8px] px-1.5 py-0 font-normal">+{competitors.length - 4}</Badge>
          )}
        </div>
      )}

      <div className="mt-2 pt-2 border-t border-border/50">
        <p className="text-[8px] text-muted-foreground truncate">Query: {comp.query}</p>
      </div>
    </div>
  );
}

function ForYouGrid({
  approved,
  topTemplates,
  selectedId,
  onSelectTemplate,
  onUseGeneration,
}: {
  approved: GeneratedItem[];
  topTemplates: SourceTemplate[];
  selectedId: string | null;
  onSelectTemplate: (t: SourceTemplate) => void;
  onUseGeneration: (g: GeneratedItem) => void;
}) {
  if (approved.length === 0 && topTemplates.length === 0) {
    return <EmptyState message="Complete your first campaign to get personalized recommendations" />;
  }

  return (
    <div className="space-y-3">
      {approved.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Star className="w-3 h-3 text-primary" />
            <p className="text-[10px] font-semibold text-foreground uppercase tracking-wider">Your Best Work</p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
            {approved.map((gen) => (
              <GenerationCard key={gen.id} gen={gen} isSelected={selectedId === gen.id} onUse={() => onUseGeneration(gen)} />
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Zap className="w-3 h-3 text-primary" />
          <p className="text-[10px] font-semibold text-foreground uppercase tracking-wider">Recommended Templates</p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
          {topTemplates.map((item) => (
            <TemplateCard key={item.id} item={item} isSelected={selectedId === item.id} onClick={() => onSelectTemplate(item)} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Utility ─── */

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}
