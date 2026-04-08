import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getFamilyLabel } from "@/lib/familyLabels";
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
import { Search, Film, Users, Image, Megaphone, Eye, Zap, Radar, Globe, Loader2, VideoIcon, Tag, Building2, Check, ArrowRight, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LibrarySelectionItem {
  id: string;
  type: string;
  name: string;
  thumbnail?: string;
  data: any;
}

const TABS = [
  { value: "video_templates", label: "Video Templates", icon: Film, table: "video_templates" as const, nameField: "template_name",
    categories: [
      { key: "family", label: "Family", options: ["F1_UGC", "F2_SPOKESPERSON", "F3_PRODUCT_VIDEO", "F4_SOCIAL_CONTENT", "F5_CINEMATIC", "F6_CORE_ELEMENTS", "F7_AD_CREATOR", "F8_CREATIVE_CLONER", "F9_IMAGE_TEMPLATE"] },
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
      { key: "family", label: "Family", options: ["F1_UGC", "F2_SPOKESPERSON", "F3_PRODUCT_VIDEO", "F4_SOCIAL_CONTENT", "F5_CINEMATIC", "F6_CORE_ELEMENTS", "F7_AD_CREATOR", "F8_CREATIVE_CLONER", "F9_IMAGE_TEMPLATE"] },
      { key: "platform", label: "Platform", options: ["facebook", "instagram_reels", "tiktok", "youtube_shorts"] },
    ]},
  { value: "ad_intelligence", label: "Ad Intel", icon: Radar, table: "foreplay" as const, nameField: "name", categories: [] },
] as const;

type TabValue = (typeof TABS)[number]["value"];

const UserLibraries = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabValue>("video_templates");
  const [search, setSearch] = useState("");
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [categoryFilters, setCategoryFilters] = useState<Record<string, string>>({});
  const [selectedItems, setSelectedItems] = useState<LibrarySelectionItem[]>([]);

  const toggleSelection = (item: any, type: string, nameField: string) => {
    setSelectedItems(prev => {
      const exists = prev.find(s => s.id === item.id);
      if (exists) return prev.filter(s => s.id !== item.id);
      return [...prev, {
        id: item.id,
        type,
        name: item[nameField] || "Untitled",
        thumbnail: item.thumbnail_url || item.preview_url || item.avatar_url || item.media_url,
        data: item,
      }];
    });
  };

  const isSelected = (id: string) => selectedItems.some(s => s.id === id);

  const handleUseInCampaign = () => {
    navigate("/dashboard/campaigns/new", {
      state: {
        libraryRefs: selectedItems.map(s => ({
          id: s.id,
          title: s.name,
          mediaUrl: s.thumbnail,
          type: s.type,
          data: s.data,
        })),
      },
    });
  };

  const currentTab = TABS.find((t) => t.value === activeTab)!;
  const currentCategories = (currentTab.categories || []) as readonly { key: string; label: string; options: readonly string[] }[];

  const toggleCategory = (key: string, value: string) => {
    setCategoryFilters(prev => {
      const next = { ...prev };
      if (next[key] === value) delete next[key];
      else next[key] = value;
      return next;
    });
  };

  const handleTabChange = (v: string) => {
    setActiveTab(v as TabValue);
    setCategoryFilters({});
    setSearch("");
  };

  const activeFilterCount = Object.keys(categoryFilters).length + (search ? 1 : 0);

  return (
    <AppShell>
      <div className="px-4 sm:px-6 pt-4 pb-8">
        <div className="mb-4">
          <h1 className="text-lg font-bold text-foreground">Content Library</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Browse curated templates, characters, references, and competitor ad intelligence.
          </p>
        </div>

        {activeTab !== "ad_intelligence" && (
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, mood, style, platform, format, tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            {/* Category Filter Chips */}
            {currentCategories.length > 0 && (
              <div className="space-y-2">
                {currentCategories.map((cat) => (
                  <div key={cat.key} className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-14 shrink-0">{cat.label}</span>
                    {cat.options.map((opt) => (
                      <Badge
                        key={opt}
                        variant={categoryFilters[cat.key] === opt ? "default" : "outline"}
                        className="text-[10px] px-2 py-0.5 cursor-pointer hover:bg-primary/10 transition-colors capitalize"
                        onClick={() => toggleCategory(cat.key, opt)}
                      >
                        {cat.key === "family" ? getFamilyLabel(opt) : opt.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                ))}
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[10px] h-6 px-2 text-muted-foreground"
                    onClick={() => { setCategoryFilters({}); setSearch(""); }}
                  >
                    Clear all ({activeFilterCount})
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={handleTabChange}>
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
                  categoryFilters={categoryFilters}
                  onPreview={setPreviewItem}
                  selectedIds={selectedItems.map(s => s.id)}
                  onToggleSelect={(item) => toggleSelection(item, tab.value, tab.nameField)}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Floating Selection Bar */}
        {selectedItems.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground rounded-full shadow-lg px-5 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-4 fade-in duration-200">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {selectedItems.slice(0, 4).map((s) => (
                  <div key={s.id} className="w-8 h-8 rounded-full border-2 border-primary bg-primary-foreground/10 flex items-center justify-center overflow-hidden">
                    {s.thumbnail ? (
                      <img src={s.thumbnail} alt={s.name} className="w-full h-full object-cover" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                  </div>
                ))}
              </div>
              <span className="text-sm font-medium">{selectedItems.length} selected</span>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs gap-1.5 font-semibold"
              onClick={handleUseInCampaign}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Use in Campaign
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
            <button
              onClick={() => setSelectedItems([])}
              className="ml-1 p-1 rounded-full hover:bg-primary-foreground/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

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

// ── Foreplay Niches — display label → API enum value ──
const FOREPLAY_NICHE_MAP: Record<string, string> = {
  "Fashion": "fashion",
  "Beauty": "beauty",
  "Health & Wellness": "health/wellness",
  "Food & Beverage": "food/drink",
  "Real Estate": "real estate",
  "Education": "education",
  "Entertainment": "entertainment",
  "Home & Garden": "home/garden",
  "Pets": "pets",
  "Parenting": "parenting",
  "Service Business": "service business",
  "Jewelry": "jewelry/watches",
  "Accessories": "accessories",
  "App / Software": "app/software",
  "Business": "business/professional",
  "Medical": "medical",
  "Charity / NFP": "charity/nfp",
  "Kids / Baby": "kids/baby",
};
const FOREPLAY_NICHES = Object.keys(FOREPLAY_NICHE_MAP);

const NICHE_ICONS: Record<string, string> = {
  "Fashion": "👗", "Beauty": "💄", "Health & Wellness": "🏥",
  "Food & Beverage": "🍕", "Real Estate": "🏠", "Education": "📚",
  "Entertainment": "🎬", "Home & Garden": "🏡", "Pets": "🐾",
  "Parenting": "👶", "Service Business": "🔧", "Jewelry": "💍",
  "Accessories": "👜", "App / Software": "💻", "Business": "🏢",
  "Medical": "🏥", "Charity / NFP": "❤️", "Kids / Baby": "👶",
};

type SearchMode = "ads" | "brands";

// ── Ad Intelligence Gallery (Foreplay) ──
const AdIntelligenceGallery = ({ onPreview }: { onPreview: (item: any) => void }) => {
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("ads");
  const [platform, setPlatform] = useState<string>("all");
  const [format, setFormat] = useState<string>("all");
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [brandResults, setBrandResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [showAllNiches, setShowAllNiches] = useState(false);

  const doAdSearch = useCallback(async (searchQuery: string, niche?: string) => {
    setLoading(true);
    setSearched(true);
    setSearchMode("ads");
    setBrandResults([]);

    try {
      const body: any = { endpoint: "discovery/ads", limit: 25 };

      if (searchQuery.includes(".") && !searchQuery.includes(" ")) {
        body.domain = searchQuery.trim();
      } else if (searchQuery.trim()) {
        body.keyword = searchQuery.trim();
      }

      const nicheLabel = niche || selectedNiche;
      if (nicheLabel) body.niche = FOREPLAY_NICHE_MAP[nicheLabel] || nicheLabel.toLowerCase();
      if (platform !== "all") body.platform = platform;
      if (format !== "all") body.display_format = format;

      const { data, error } = await supabase.functions.invoke("foreplay-search", { body });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setResults(data.data || []);
      if (data.metadata?.credits_remaining != null) setCredits(data.metadata.credits_remaining);
    } catch (err: any) {
      toast.error(err.message || "Failed to search ads");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [platform, format, selectedNiche]);

  const doBrandSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearched(true);
    setSearchMode("brands");
    setResults([]);

    try {
      const body: any = { endpoint: "discovery/brands", keyword: searchQuery.trim(), limit: 25 };
      const { data, error } = await supabase.functions.invoke("foreplay-search", { body });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setBrandResults(data.data || []);
      if (data.metadata?.credits_remaining != null) setCredits(data.metadata.credits_remaining);
    } catch (err: any) {
      toast.error(err.message || "Failed to search brands");
      setBrandResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBrandClick = (brand: any) => {
    // Search ads by brand domain or name
    const domain = brand.websites?.[0]?.replace(/^https?:\/\//, "").replace(/\/$/, "") || brand.url?.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (domain) {
      setQuery(domain);
      doAdSearch(domain);
    } else {
      setQuery(brand.name);
      doAdSearch(brand.name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (searchMode === "brands") doBrandSearch(query);
      else doAdSearch(query);
    }
  };

  const handleNicheClick = (niche: string) => {
    setSelectedNiche(niche);
    setQuery("");
    doAdSearch("", niche);
  };

  const backToDiscovery = () => {
    setSearched(false);
    setResults([]);
    setBrandResults([]);
    setQuery("");
    setSelectedNiche(null);
  };

  const visibleNiches = showAllNiches ? FOREPLAY_NICHES : FOREPLAY_NICHES.slice(0, 12);

  return (
    <div className="space-y-4">
      {/* Search Mode Tabs + Search Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-md p-0.5">
            <Button
              variant={searchMode === "ads" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-[11px] rounded-sm"
              onClick={() => { setSearchMode("ads"); if (searched) backToDiscovery(); }}
            >
              <Radar className="w-3 h-3 mr-1" /> Ads
            </Button>
            <Button
              variant={searchMode === "brands" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-[11px] rounded-sm"
              onClick={() => { setSearchMode("brands"); if (searched) backToDiscovery(); }}
            >
              <Building2 className="w-3 h-3 mr-1" /> Brands
            </Button>
          </div>
          <span className="text-[10px] text-muted-foreground">582K+ brands indexed</span>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchMode === "brands"
                ? "Search brands (e.g. Nike, Apple, Shopify)..."
                : "Search ads by keyword or domain (e.g. skincare, nike.com)..."
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9 h-9 text-sm"
            />
          </div>
          {searchMode === "ads" && (
            <>
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
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
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
            </>
          )}
          <Button
            onClick={() => searchMode === "brands" ? doBrandSearch(query) : doAdSearch(query)}
            disabled={loading || !query.trim()}
            className="h-9 px-4"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {credits !== null && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Radar className="w-3.5 h-3.5" />
          <span>{credits.toLocaleString()} Foreplay credits remaining</span>
        </div>
      )}

      {/* Niche filter chips — always visible in ads mode */}
      {searchMode === "ads" && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Industry / Niche</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] h-5 px-2 text-muted-foreground"
              onClick={() => setShowAllNiches(!showAllNiches)}
            >
              {showAllNiches ? "Show less" : `Show all (${FOREPLAY_NICHES.length})`}
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {visibleNiches.map((niche) => (
              <Badge
                key={niche}
                variant={selectedNiche === niche ? "default" : "outline"}
                className="text-[10px] px-2 py-0.5 cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => {
                  if (selectedNiche === niche) {
                    setSelectedNiche(null);
                    if (searched && !query) backToDiscovery();
                  } else {
                    handleNicheClick(niche);
                  }
                }}
              >
                <span className="mr-1">{NICHE_ICONS[niche] || "📁"}</span>
                {niche}
              </Badge>
            ))}
            {selectedNiche && (
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] h-5 px-2 text-muted-foreground"
                onClick={() => { setSelectedNiche(null); backToDiscovery(); }}
              >
                Clear filter
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-52 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : searched && searchMode === "brands" && brandResults.length > 0 ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{brandResults.length} brands found</p>
            <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={backToDiscovery}>
              ← Back to discovery
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {brandResults.map((brand: any) => (
              <Card
                key={brand.id}
                className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30 overflow-hidden"
                onClick={() => handleBrandClick(brand)}
              >
                <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
                  {brand.avatar ? (
                    <img src={brand.avatar} alt={brand.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="h-10 w-10 text-muted-foreground/30" />
                  )}
                  {brand.verification_status === "BLUE_VERIFIED" && (
                    <div className="absolute top-1.5 right-1.5 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[8px]">✓</div>
                  )}
                </div>
                <CardContent className="p-2.5">
                  <p className="text-xs font-medium text-foreground truncate">{brand.name}</p>
                  {brand.category && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{brand.category}</p>}
                  {brand.description?.text && <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{brand.description.text}</p>}
                  <div className="flex flex-wrap gap-0.5 mt-1.5">
                    {brand.niches?.slice(0, 2).map((n: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-[7px] px-1 py-0">{n}</Badge>
                    ))}
                  </div>
                  <p className="text-[9px] text-primary mt-1.5">Click to see their ads →</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : searched && searchMode === "ads" && results.length > 0 ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {results.length} ads found
              {selectedNiche && <span className="ml-1">in <strong>{selectedNiche}</strong></span>}
            </p>
            <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={backToDiscovery}>
              ← Back to discovery
            </Button>
          </div>
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
                      {ad.display_format && <Badge variant="secondary" className="text-[7px] px-1 py-0 uppercase">{ad.display_format}</Badge>}
                      {Array.isArray(ad.publisher_platform) && ad.publisher_platform[0] && <Badge variant="outline" className="text-[7px] px-1 py-0">{ad.publisher_platform[0]}</Badge>}
                      {ad.niches?.[0] && <Badge variant="outline" className="text-[7px] px-1 py-0">{ad.niches[0]}</Badge>}
                      {ad.running_duration?.days > 0 && <Badge variant="outline" className="text-[7px] px-1 py-0">{ad.running_duration.days}d</Badge>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      ) : searched ? (
        <div className="text-center py-12">
          <Radar className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No {searchMode} found. Try different keywords or filters.</p>
          <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={backToDiscovery}>
            ← Back to discovery
          </Button>
        </div>
      ) : !loading && searchMode === "ads" ? (
        <div className="text-center py-8">
          <Radar className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">Search ads or click a niche above to discover winning creatives</p>
          <p className="text-xs text-muted-foreground mt-1">Or switch to Brands to browse 582K+ indexed brands</p>
        </div>
      ) : !loading && searchMode === "brands" ? (
        <div className="text-center py-8">
          <Building2 className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">Search for any brand to see their ad library</p>
          <p className="text-xs text-muted-foreground mt-1">Type a brand name and hit Enter or click Search</p>
        </div>
      ) : null}
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
  categoryFilters: Record<string, string>;
  onPreview: (item: any) => void;
  selectedIds: string[];
  onToggleSelect: (item: any) => void;
}

const LibraryGallery = ({ table, nameField, icon: Icon, search, categoryFilters, onPreview, selectedIds, onToggleSelect }: LibraryGalleryProps) => {
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
    for (const [key, value] of Object.entries(categoryFilters)) {
      const itemVal = item[key];
      if (Array.isArray(itemVal)) {
        if (!itemVal.some((v: string) => v?.toLowerCase() === value.toLowerCase())) return false;
      } else if ((itemVal || "").toLowerCase() !== value.toLowerCase()) {
        return false;
      }
    }
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
        const thumb = item.thumbnail_url || item.preview_url || item.avatar_url || item.media_url || item.example_url;
        const tags = [
          ...(item.tags || []),
          ...(item.mood_tags || []),
          ...(item.industry_tags || []),
        ].slice(0, 3);
        const selected = selectedIds.includes(item.id);

        return (
          <Card
            key={item.id}
            className={`group cursor-pointer transition-all overflow-hidden ${selected ? "ring-2 ring-primary border-primary shadow-md" : "hover:shadow-md hover:border-primary/30"}`}
            onClick={() => onToggleSelect(item)}
          >
            <div className="relative aspect-[4/5] bg-muted flex items-center justify-center overflow-hidden">
              {thumb ? (
                <img src={thumb} alt={name} className="w-full h-full object-cover" />
              ) : (
                <Icon className="h-8 w-8 text-muted-foreground/30" />
              )}
              {/* Selection checkmark */}
              {selected && (
                <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-sm">
                  <Check className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              )}
              {/* Preview eye button */}
              <button
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background shadow-sm"
                onClick={(e) => { e.stopPropagation(); onPreview(item); }}
              >
                <Eye className="h-3.5 w-3.5 text-foreground" />
              </button>
            </div>

            <CardContent className="p-2.5">
              <p className="text-xs font-medium text-foreground truncate">{name}</p>
              {item.mood && <p className="text-[10px] text-muted-foreground mt-0.5">{item.mood}</p>}
              {item.family && <Badge variant="outline" className="text-[8px] mt-1 mr-1">{getFamilyLabel(item.family)}</Badge>}
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
  const thumb = item.thumbnail_url || item.preview_url || item.avatar_url || item.media_url || item.example_url;
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
            <span className="font-medium text-foreground">{getFamilyLabel(item.family)}</span>
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
