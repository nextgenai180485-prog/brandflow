import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Film, Users, Image, Megaphone, Eye, Zap, Radar, Globe, Loader2, VideoIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TABS = [
  { value: "video_templates", label: "Video Templates", icon: Film, table: "video_templates" as const, nameField: "template_name",
    categories: [
      { key: "family", label: "Family", options: ["F1_UGC", "F2_SPOKESPERSON", "F5_CINEMATIC"] },
      { key: "mood", label: "Mood", options: ["aspirational", "authentic", "cinematic", "dramatic", "educational", "energetic", "epic", "inspirational", "luxurious", "professional", "urgent", "warm"] },
    ]},
  { value: "character_library", label: "Characters", icon: Users, table: "character_library" as const, nameField: "name",
    categories: [
      { key: "gender", label: "Gender", options: ["male", "female", "neutral"] },
      { key: "voice_style", label: "Voice", options: ["authoritative", "calm", "casual", "conversational", "elegant", "energetic", "inspiring", "motivational", "passionate", "professional", "trendy"] },
    ]},
  { value: "ad_reference_library", label: "Ad References", icon: Megaphone, table: "ad_reference_library" as const, nameField: "title",
    categories: [
      { key: "media_type", label: "Type", options: ["image", "video"] },
    ]},
  { value: "image_templates", label: "Image Templates", icon: Image, table: "image_templates" as const, nameField: "style_name",
    categories: [
      { key: "vertical", label: "Vertical", options: ["beauty", "ecommerce", "fashion", "fitness", "food", "general", "lifestyle", "luxury", "real_estate", "technology"] },
      { key: "quality_tier", label: "Quality", options: ["standard", "premium"] },
      { key: "platform", label: "Platform", options: ["facebook", "instagram"] },
    ]},
  { value: "hooks", label: "Hooks", icon: Zap, table: "hooks" as const, nameField: "hook_text",
    categories: [
      { key: "hook_type", label: "Type", options: ["bold_claim", "curiosity", "question", "statistic", "story"] },
      { key: "family", label: "Family", options: ["F1_UGC", "F2_SPOKESPERSON", "F5_CINEMATIC"] },
      { key: "platform", label: "Platform", options: ["facebook", "instagram_reels", "tiktok", "youtube_shorts"] },
    ]},
  { value: "ad_intelligence", label: "Ad Intel", icon: Radar, table: "foreplay" as const, nameField: "name", categories: [] },
] as const;

type TabValue = (typeof TABS)[number]["value"];

const UserLibraries = () => {
  const [activeTab, setActiveTab] = useState<TabValue>("video_templates");
  const [search, setSearch] = useState("");
  const [previewItem, setPreviewItem] = useState<any>(null);

  const currentTab = TABS.find((t) => t.value === activeTab)!;

  return (
    <AppShell>
      <div className="px-4 sm:px-6 pt-4 pb-8">
        <div className="mb-6">
          <h1 className="text-lg font-bold text-foreground">Content Library</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Browse curated templates, characters, references, and competitor ad intelligence.
          </p>
        </div>

        {activeTab !== "ad_intelligence" && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, mood, style, platform, format, tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
          <TabsList className="mb-5 w-full grid grid-cols-6 h-auto p-1">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="gap-1.5 text-[10px] sm:text-xs px-2 py-2 flex flex-col sm:flex-row items-center"
              >
                <tab.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.value === "ad_intelligence" ? (
                <AdIntelligenceGallery onPreview={setPreviewItem} />
              ) : (
                <LibraryGallery
                  table={tab.table}
                  nameField={tab.nameField}
                  icon={tab.icon}
                  search={search}
                  onPreview={setPreviewItem}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Preview Dialog */}
        <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-sm">
                {previewItem?.name || previewItem?.headline || previewItem?.[currentTab.nameField] || "Details"}
              </DialogTitle>
            </DialogHeader>
            {previewItem && (
              activeTab === "ad_intelligence"
                ? <AdIntelDetail item={previewItem} />
                : <ItemDetail item={previewItem} tab={currentTab} />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
};

// ── Ad Intelligence Gallery (Foreplay) ──
const AdIntelligenceGallery = ({ onPreview }: { onPreview: (item: any) => void }) => {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<string>("all");
  const [format, setFormat] = useState<string>("all");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  const searchAds = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);

    try {
      const body: any = { endpoint: "discovery/ads", limit: 25 };

      if (query.includes(".") && !query.includes(" ")) {
        body.domain = query.trim();
      } else {
        body.keyword = query.trim();
      }

      if (platform !== "all") body.platform = platform;
      if (format !== "all") body.display_format = format;

      const { data, error } = await supabase.functions.invoke("foreplay-search", { body });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setResults(data.data || []);
      if (data.metadata?.credits_remaining != null) {
        setCredits(data.metadata.credits_remaining);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to search ads");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, platform, format]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") searchAds();
  };

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by keyword or domain (e.g. nike.com)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="w-[110px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
          </SelectContent>
        </Select>
        <Select value={format} onValueChange={setFormat}>
          <SelectTrigger className="w-[100px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Formats</SelectItem>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="carousel">Carousel</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={searchAds} disabled={loading || !query.trim()} className="h-9 px-4">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </div>

      {credits !== null && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Radar className="w-3.5 h-3.5" />
          <span>{credits.toLocaleString()} Foreplay credits remaining</span>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {results.map((ad: any) => {
            const thumb = ad.thumbnail || ad.image || ad.avatar;
            const name = ad.name || ad.headline || "Ad";
            const brandName = ad.brand_name || ad.brand?.name;

            return (
              <Card
                key={ad.id || ad.ad_id}
                className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30 overflow-hidden"
                onClick={() => onPreview(ad)}
              >
                <div className="relative aspect-[4/5] bg-muted flex items-center justify-center overflow-hidden">
                  {thumb ? (
                    <img src={thumb} alt={name} className="w-full h-full object-cover" />
                  ) : ad.display_format === "video" ? (
                    <VideoIcon className="h-8 w-8 text-muted-foreground/30" />
                  ) : (
                    <Radar className="h-8 w-8 text-muted-foreground/30" />
                  )}
                  {ad.live && (
                    <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-emerald-500/90 text-white px-2 py-0.5 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span className="text-[8px] font-semibold">LIVE</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors flex items-center justify-center">
                    <Eye className="h-5 w-5 text-foreground/0 group-hover:text-foreground/60 transition-colors" />
                  </div>
                </div>
                <CardContent className="p-2.5">
                  <p className="text-xs font-medium text-foreground truncate">{name}</p>
                  {brandName && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{brandName}</p>}
                  <div className="flex flex-wrap gap-0.5 mt-1.5">
                    {ad.display_format && <Badge variant="secondary" className="text-[7px] px-1 py-0">{ad.display_format}</Badge>}
                    {ad.running_duration?.days > 0 && <Badge variant="outline" className="text-[7px] px-1 py-0">{ad.running_duration.days}d active</Badge>}
                    {Array.isArray(ad.publisher_platform) && ad.publisher_platform[0] && <Badge variant="outline" className="text-[7px] px-1 py-0">{ad.publisher_platform[0]}</Badge>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : searched ? (
        <div className="text-center py-16">
          <Radar className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No ads found. Try different keywords or filters.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Radar className="h-8 w-8 text-primary/60" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-foreground">Ad Intelligence</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Search 100M+ real competitor ads by keyword or domain. Discover winning creative patterns and clone their style.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Ad Intel Detail ──
const AdIntelDetail = ({ item }: { item: any }) => {
  const thumb = item.thumbnail || item.image || item.avatar;
  return (
    <div className="space-y-4">
      {thumb && (
        <div className="rounded-lg overflow-hidden bg-muted aspect-video">
          <img src={thumb} alt={item.name || "Ad"} className="w-full h-full object-cover" />
        </div>
      )}
      {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
      {item.headline && <p className="text-sm font-medium text-foreground">{item.headline}</p>}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {item.brand_name && (
          <div><span className="text-muted-foreground">Brand:</span> <span className="font-medium text-foreground">{item.brand_name}</span></div>
        )}
        {item.display_format && (
          <div><span className="text-muted-foreground">Format:</span> <span className="font-medium text-foreground">{item.display_format}</span></div>
        )}
        {item.publisher_platform && (
          <div><span className="text-muted-foreground">Platform:</span> <span className="font-medium text-foreground">{item.publisher_platform}</span></div>
        )}
        {item.cta_title && (
          <div><span className="text-muted-foreground">CTA:</span> <span className="font-medium text-foreground">{item.cta_title}</span></div>
        )}
        {item.running_duration?.days > 0 && (
          <div><span className="text-muted-foreground">Running:</span> <span className="font-medium text-foreground">{item.running_duration.days} days</span></div>
        )}
        {item.live !== undefined && (
          <div><span className="text-muted-foreground">Status:</span> <span className="font-medium text-foreground">{item.live ? "🟢 Live" : "⏸ Inactive"}</span></div>
        )}
        {item.market_target && (
          <div><span className="text-muted-foreground">Market:</span> <span className="font-medium text-foreground">{item.market_target}</span></div>
        )}
      </div>
      {item.categories?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.categories.map((cat: string, i: number) => (
            <Badge key={i} variant="secondary" className="text-[9px]">{cat}</Badge>
          ))}
        </div>
      )}
      {item.niches?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.niches.map((n: string, i: number) => (
            <Badge key={i} variant="outline" className="text-[9px]">{n}</Badge>
          ))}
        </div>
      )}
      {item.full_transcription && (
        <div className="pt-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground font-medium mb-1">Transcription:</p>
          <p className="text-[11px] text-foreground/80 line-clamp-4">{item.full_transcription}</p>
        </div>
      )}
    </div>
  );
};

// ── Standard Library Gallery ──
interface LibraryGalleryProps {
  table: string;
  nameField: string;
  icon: any;
  search: string;
  onPreview: (item: any) => void;
}

const LibraryGallery = ({ table, nameField, icon: Icon, search, onPreview }: LibraryGalleryProps) => {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["user-library", table],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table as any)
        .select("*")
        .eq("is_active", true)
        .order("usage_count", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = items.filter((item: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const searchable = [
      item[nameField],
      item.description,
      item.mood,
      item.family,
      item.vertical,
      item.hook_type,
      item.platform,
      item.media_type,
      item.voice_style,
      item.age_range,
      item.gender,
      item.quality_tier,
      item.format,
      item.aspect_ratio,
      item.performance_notes,
      ...(item.tags || []),
      ...(item.mood_tags || []),
      ...(item.industry_tags || []),
      ...(item.platform_tags || []),
      ...(item.ethnicity_tags || []),
      ...(item.compatible_families || []),
      ...(item.prompt_modifiers || []),
    ].filter(Boolean).join(" ").toLowerCase();
    return searchable.includes(q);
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16">
        <Icon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No items found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {filtered.map((item: any) => {
        const name = item[nameField] || "Untitled";
        const thumb = item.preview_url || item.example_url || item.avatar_url || item.thumbnail_url || item.media_url;
        const tags = [
          ...(item.tags || []),
          ...(item.mood_tags || []),
          ...(item.industry_tags || []),
        ].slice(0, 3);

        return (
          <Card
            key={item.id}
            className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30 overflow-hidden"
            onClick={() => onPreview(item)}
          >
            <div className="relative aspect-[4/5] bg-muted flex items-center justify-center overflow-hidden">
              {thumb ? (
                <img src={thumb} alt={name} className="w-full h-full object-cover" />
              ) : (
                <Icon className="h-8 w-8 text-muted-foreground/30" />
              )}
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors flex items-center justify-center">
                <Eye className="h-5 w-5 text-foreground/0 group-hover:text-foreground/60 transition-colors" />
              </div>
            </div>

            <CardContent className="p-2.5">
              <p className="text-xs font-medium text-foreground truncate">{name}</p>
              {item.mood && <p className="text-[10px] text-muted-foreground mt-0.5">{item.mood}</p>}
              {item.family && <Badge variant="outline" className="text-[8px] mt-1 mr-1">{item.family}</Badge>}
              {item.vertical && <Badge variant="outline" className="text-[8px] mt-1">{item.vertical}</Badge>}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-0.5 mt-1.5">
                  {tags.map((tag: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[7px] px-1 py-0">{tag}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

const ItemDetail = ({ item, tab }: { item: any; tab: (typeof TABS)[number] }) => {
  const thumb = item.preview_url || item.example_url || item.avatar_url || item.thumbnail_url || item.media_url;
  const allTags = [
    ...(item.tags || []),
    ...(item.mood_tags || []),
    ...(item.industry_tags || []),
    ...(item.platform_tags || []),
    ...(item.ethnicity_tags || []),
  ];

  return (
    <div className="space-y-4">
      {thumb && (
        <div className="rounded-lg overflow-hidden bg-muted aspect-video">
          <img src={thumb} alt={item[tab.nameField]} className="w-full h-full object-cover" />
        </div>
      )}

      {item.description && (
        <p className="text-xs text-muted-foreground">{item.description}</p>
      )}

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {item.family && (
          <div>
            <span className="text-muted-foreground">Family:</span>{" "}
            <span className="font-medium text-foreground">{item.family}</span>
          </div>
        )}
        {item.mood && (
          <div>
            <span className="text-muted-foreground">Mood:</span>{" "}
            <span className="font-medium text-foreground">{item.mood}</span>
          </div>
        )}
        {item.vertical && (
          <div>
            <span className="text-muted-foreground">Vertical:</span>{" "}
            <span className="font-medium text-foreground">{item.vertical}</span>
          </div>
        )}
        {item.aspect_ratio && (
          <div>
            <span className="text-muted-foreground">Aspect:</span>{" "}
            <span className="font-medium text-foreground">{item.aspect_ratio}</span>
          </div>
        )}
        {item.duration_s && (
          <div>
            <span className="text-muted-foreground">Duration:</span>{" "}
            <span className="font-medium text-foreground">{item.duration_s}s</span>
          </div>
        )}
        {item.gender && (
          <div>
            <span className="text-muted-foreground">Gender:</span>{" "}
            <span className="font-medium text-foreground">{item.gender}</span>
          </div>
        )}
        {item.age_range && (
          <div>
            <span className="text-muted-foreground">Age:</span>{" "}
            <span className="font-medium text-foreground">{item.age_range}</span>
          </div>
        )}
        {item.quality_tier && (
          <div>
            <span className="text-muted-foreground">Quality:</span>{" "}
            <span className="font-medium text-foreground">{item.quality_tier}</span>
          </div>
        )}
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {allTags.map((tag: string, i: number) => (
            <Badge key={i} variant="secondary" className="text-[9px]">{tag}</Badge>
          ))}
        </div>
      )}

      <div className="text-[10px] text-muted-foreground pt-2 border-t border-border">
        Used {item.usage_count || 0} times
      </div>
    </div>
  );
};

export default UserLibraries;
