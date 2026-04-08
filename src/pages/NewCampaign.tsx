import { useState, useCallback, useEffect, useMemo } from "react";
import type { LibrarySelection } from "@/components/LibraryBrowser";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, ImageIcon, Sparkles, Film, Camera, Check, VideoIcon, Layout, Brain, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FounderInterview from "@/components/FounderInterview";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AssetPlatformSelector from "@/components/AssetPlatformSelector";
import AssetLibraryPicker, { type LibraryAsset } from "@/components/AssetLibraryPicker";
import CreativeDirectionStep, { type DirectorOutput } from "@/components/CreativeDirectionStep";
import CreativeBriefBuilder, { type CreativeBrief as CreativeBriefType, type CampaignCopy } from "@/components/campaign/CreativeBriefBuilder";
import CampaignSimulator from "@/components/campaign/CampaignSimulator";
import SwapAssetStrip, { type SwapAsset } from "@/components/campaign/SwapAssetStrip";
import type { SourceTemplate } from "@/components/campaign/SourceGallery";
import SaveToLibraryModal from "@/components/campaign/SaveToLibraryModal";
import type { SocialPlatform, ContentType, BrandProfile } from "@/types/campaigns";
import { CONTENT_TYPE_LABELS } from "@/types/campaigns";

interface SelectedFormat {
  platform: SocialPlatform;
  format: string;
}

const ALL_STEPS = ["Details", "Platforms", "Content Type", "Creative Direction", "Review"];

const CONTENT_TYPE_ICONS: Record<ContentType, React.ReactNode> = {
  image: <ImageIcon className="w-5 h-5" />,
  ugc_video: <Camera className="w-5 h-5" />,
  pro_video: <Film className="w-5 h-5" />,
};

const NewCampaign = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const showcaseState = location.state as { fromShowcase?: boolean; templateRef?: { id: string; title: string; mediaUrl?: string; industryTags?: string[]; moodTags?: string[]; platformTags?: string[] }; bulkRefs?: { id: string; title: string; mediaUrl?: string; industryTags?: string[]; moodTags?: string[]; platformTags?: string[] }[] } | null;

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState(showcaseState?.templateRef?.title || "");
  const [instructions, setInstructions] = useState(
    showcaseState?.fromShowcase
      ? `Inspired by: ${showcaseState.templateRef?.title || "showcase template"}. Tags: ${[...(showcaseState.templateRef?.moodTags || []), ...(showcaseState.templateRef?.industryTags || [])].join(", ")}`
      : ""
  );
  const [structuredBrief, setStructuredBrief] = useState<CreativeBriefType>({
    objective: "", messageAngle: "", tone: [], ctaGoal: "", targetEmotion: [], freeformNotes: "",
  });
  const [campaignCopy, setCampaignCopy] = useState<CampaignCopy>({
    headline: "", subheadline: "", ctaText: "", bodyCopy: "",
  });
  const [selectedAssets, setSelectedAssets] = useState<LibraryAsset[]>([]);
  const [platforms, setPlatforms] = useState<SelectedFormat[]>([]);
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [creating, setCreating] = useState(false);
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [creativeBrief, setCreativeBrief] = useState("");
  const [creativeReferenceAssets, setCreativeReferenceAssets] = useState<LibraryAsset[]>([]);
  const [creativeDirection, setCreativeDirection] = useState<DirectorOutput | null>(null);
  const [librarySelections, setLibrarySelections] = useState<LibrarySelection[]>([]);

  // Source gallery + simulator state
  const [selectedTemplate, setSelectedTemplate] = useState<SourceTemplate | null>(null);
  const [mobileTab, setMobileTab] = useState<"builder" | "preview">("builder");
  const [isStarred, setIsStarred] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [swapAssets, setSwapAssets] = useState<SwapAsset[]>([]);
  const [activeSwapIndex, setActiveSwapIndex] = useState(0);

  // Inline strategy gate
  const [needsStrategy, setNeedsStrategy] = useState(false);
  const [strategyChecked, setStrategyChecked] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");

  const hasVideoContent = contentTypes.some(ct => ct === "ugc_video" || ct === "pro_video");

  const STEPS = useMemo(() => {
    if (hasVideoContent) return ALL_STEPS;
    return ALL_STEPS.filter(s => s !== "Creative Direction");
  }, [hasVideoContent]);

  // Auto-populate from showcase template
  useEffect(() => {
    if (!showcaseState?.fromShowcase || !showcaseState.templateRef) return;
    const ref = showcaseState.templateRef;
    if (ref.mediaUrl) {
      setCreativeReferenceAssets([{
        id: ref.id, file_name: ref.title, file_url: ref.mediaUrl,
        asset_type: "reference", created_at: new Date().toISOString(),
      }]);
      // Also set as selected template for simulator
      setSelectedTemplate({
        id: ref.id, title: ref.title, description: null,
        media_url: ref.mediaUrl, thumbnail_url: ref.mediaUrl,
        industry_tags: ref.industryTags || null, mood_tags: ref.moodTags || null,
        platform_tags: ref.platformTags || null, sealcam_analysis: {}, performance_notes: null,
      });
    }
    if (ref.platformTags?.length) {
      const platformFormats: SelectedFormat[] = ref.platformTags.map(tag => ({
        platform: tag as SocialPlatform,
        format: tag === "tiktok" ? "reel" : tag === "linkedin" ? "post" : tag === "youtube" ? "post" : "post",
      }));
      setPlatforms(platformFormats);
    }
    if (contentTypes.length === 0) setContentTypes(["image"]);
  }, []);

  // Auto-populate from bulk refs (multi-select from dashboard)
  useEffect(() => {
    if (!showcaseState?.bulkRefs?.length) return;
    const assets: LibraryAsset[] = showcaseState.bulkRefs
      .filter(r => r.mediaUrl)
      .map(r => ({
        id: r.id, file_name: r.title, file_url: r.mediaUrl!,
        asset_type: "reference", created_at: new Date().toISOString(),
      }));
    if (assets.length > 0) {
      setSelectedAssets(assets);
      setCreativeReferenceAssets(assets);
      const first = showcaseState.bulkRefs[0];
      if (first.mediaUrl) {
        setSelectedTemplate({
          id: first.id, title: first.title, description: null,
          media_url: first.mediaUrl, thumbnail_url: first.mediaUrl,
          industry_tags: first.industryTags || null, mood_tags: first.moodTags || null,
          platform_tags: first.platformTags || null, sealcam_analysis: {}, performance_notes: null,
        });
      }
    }
    if (contentTypes.length === 0) setContentTypes(["image"]);
  }, []);

  // Check for brand strategy + load brand profile
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Check strategy existence
      const { data: stratRows } = await supabase
        .from("brand_strategy")
        .select("id, strategy_generated")
        .eq("profile_id", user.id)
        .limit(1);
      
      const hasStrategy = stratRows && stratRows.length > 0 && (stratRows[0] as any).strategy_generated;
      
      if (!hasStrategy) {
        // Check if they have brand_memory or research (website users skip interview)
        const { data: memCheck } = await supabase
          .from("brand_memory").select("id").eq("profile_id", user.id)
          .eq("memory_type", "brand_profile").limit(1);
        
        if (!memCheck || memCheck.length === 0) {
          // Get profile info for the interview
          const { data: profile } = await supabase
            .from("profiles").select("business_name, industry")
            .eq("id", user.id).single();
          setBusinessName(profile?.business_name || "");
          setIndustry(profile?.industry || "");
          setNeedsStrategy(true);
        }
      }
      setStrategyChecked(true);

      // Load brand profile
      const { data } = await supabase
        .from("brand_memory").select("context").eq("profile_id", user.id)
        .eq("memory_type", "brand_profile").eq("pattern_category", "auto_research")
        .limit(1).single();
      if (data?.context) setBrandProfile(data.context as unknown as BrandProfile);
      setLoadingProfile(false);
    };
    load();
  }, [user]);

  // When user selects a template from source gallery
  const handleTemplateSelect = useCallback((template: SourceTemplate | null) => {
    setSelectedTemplate(template);
    if (template) {
      // Auto-fill title if empty
      if (!title.trim()) setTitle(template.title);
      // Set as reference asset
      if (template.media_url) {
        setCreativeReferenceAssets([{
          id: template.id, file_name: template.title, file_url: template.media_url,
          asset_type: "reference", created_at: new Date().toISOString(),
        }]);
      }
      // Auto-switch to preview on mobile
      if (isMobile) setMobileTab("preview");
    } else {
      setCreativeReferenceAssets([]);
    }
  }, [title, isMobile]);

  const toggleContentType = (ct: ContentType) => {
    setContentTypes((prev) => prev.includes(ct) ? prev.filter((t) => t !== ct) : [...prev, ct]);
  };

  const routeFamily = useCallback((ct: ContentType, platform: SocialPlatform): string => {
    if (ct === "ugc_video") return "F1";
    if (ct === "pro_video") {
      if (platform === "linkedin" || platform === "youtube") return "F2";
      return "F5";
    }
    if (platform === "facebook" || platform === "x" || platform === "linkedin") return "F7";
    return "F9";
  }, []);

  const FAMILY_LABELS: Record<string, string> = {
    F1: "UGC Video", F2: "AI Spokesperson", F3: "Product Video",
    F4: "Social Batch", F5: "Cinematic Ad", F6: "Elements Board",
    F7: "Ad Creator", F8: "Creative Cloner", F9: "Image Template",
  };

  const handleCreate = async () => {
    if (!user || !title.trim()) return;
    setCreating(true);

    const publishPlatforms = platforms.map((p) => `${p.platform}|${p.format}`);
    const ctEntries = contentTypes.map((ct) => `ct:${ct}`);

    const { data: campaign, error } = await supabase
      .from("campaigns").insert({
        profile_id: user.id, title: title.trim(),
        instructions: instructions.trim() || null, status: "draft",
        publish_platforms: [...publishPlatforms, ...ctEntries],
      }).select().single();

    if (error || !campaign) { toast.error("Failed to create campaign."); setCreating(false); return; }

    if (selectedAssets.length > 0) {
      const assetRefs = selectedAssets.map((a, i) => ({
        campaign_id: campaign.id, brand_asset_id: a.id, profile_id: user.id,
        asset_role: "reference", sort_order: i,
      }));
      await supabase.from("campaign_assets" as any).insert(assetRefs);
    }

    const SOCIAL_FORMAT_MAP: Record<string, { width: number; height: number; aspectRatio: string }> = {
      "instagram|post": { width: 1080, height: 1350, aspectRatio: "4:5" },
      "instagram|story": { width: 1080, height: 1920, aspectRatio: "9:16" },
      "instagram|reel": { width: 1080, height: 1920, aspectRatio: "9:16" },
      "instagram|carousel": { width: 1080, height: 1080, aspectRatio: "1:1" },
      "tiktok|reel": { width: 1080, height: 1920, aspectRatio: "9:16" },
      "facebook|post": { width: 1200, height: 1200, aspectRatio: "1:1" },
      "facebook|story": { width: 1080, height: 1920, aspectRatio: "9:16" },
      "linkedin|post": { width: 1200, height: 1200, aspectRatio: "1:1" },
      "linkedin|carousel": { width: 1080, height: 1350, aspectRatio: "4:5" },
      "x|post": { width: 1200, height: 675, aspectRatio: "16:9" },
      "snapchat|story": { width: 1080, height: 1920, aspectRatio: "9:16" },
      "youtube|post": { width: 1280, height: 720, aspectRatio: "16:9" },
    };

    const assetTypeMap: Record<string, string> = { image: "image", ugc_video: "video", pro_video: "video" };
    const generationAssets = platforms.flatMap((p) =>
      contentTypes.map((ct) => {
        const key = `${p.platform}|${p.format}`;
        const dims = SOCIAL_FORMAT_MAP[key] || { width: 1080, height: 1080, aspectRatio: "1:1" };
        return { platform: p.platform, format: p.format, assetType: assetTypeMap[ct] || "image", contentType: ct, family: routeFamily(ct, p.platform), ...dims };
      })
    );

    const brandContext = {
      businessName: brandProfile?.summary?.split(".")[0] || title,
      industry: "general",
      brandVoice: brandProfile?.brand_voice_detected || "professional",
      targetAudience: brandProfile?.target_audience_detected || "general audience",
    };

    const primaryPlatform = platforms[0]?.platform || "instagram";
    const primaryFormat = platforms[0]?.format || "reel";

    if (creativeDirection) {
      await supabase.from("creative_history" as any).insert({
        profile_id: user.id, campaign_id: campaign.id, family: creativeDirection.family,
        sealcam_scenes: creativeDirection.scenes, direction_output: creativeDirection,
        generation_params: { platform: primaryPlatform, format: primaryFormat },
        result_status: "pending",
      });
    }

    toast.success("Campaign created — generation starting…");

    const referenceImageUrl = selectedTemplate?.media_url || showcaseState?.templateRef?.mediaUrl || undefined;

    supabase.functions.invoke("generate-content", {
      body: {
        campaignId: campaign.id, assets: generationAssets, brandContext,
        intelligenceBrief: brandProfile ? {
          summary: brandProfile.summary, competitors: brandProfile.competitors,
          hooks: brandProfile.content_pillars || [], content_angles: brandProfile.key_themes || [],
          visual_direction: brandProfile.visual_style,
        } : null,
        creativeDirection: creativeDirection || null,
        referenceImageUrl: referenceImageUrl || null,
      },
    }).then(({ error: genError }) => {
      if (genError) console.error("[Generation] Trigger error:", genError);
    });

    navigate(`/dashboard?open=${campaign.id}`);
  };

  const currentStepName = STEPS[step];
  const canProceedStep0 = title.trim().length > 0;
  const canProceedStep1 = platforms.length > 0;
  const canProceedStep2 = contentTypes.length > 0;
  const canProceedCreativeDirection = !hasVideoContent || !!creativeDirection;
  const canCreate = canProceedStep0 && canProceedStep1 && canProceedStep2 && canProceedCreativeDirection && !creating;

  const handleNext = () => {
    if (currentStepName === "Details" && !canProceedStep0) { toast.error("Enter a campaign name."); return; }
    if (currentStepName === "Platforms" && !canProceedStep1) { toast.error("Select at least one platform."); return; }
    if (currentStepName === "Content Type" && !canProceedStep2) { toast.error("Select at least one content type."); return; }
    if (currentStepName === "Creative Direction" && !canProceedCreativeDirection) { toast.error("Structure your creative brief before proceeding."); return; }
    setStep(step + 1);
  };

  const isImageUrl = (url: string) => !/\.(mp4|mov|avi|webm|mkv)(\?|$)/i.test(url);

  // Derive simulator preview URL: active selected asset > selectedTemplate > null
  const simulatorPreviewUrl = selectedAssets.length > 0
    ? selectedAssets[Math.min(activePreviewIndex, selectedAssets.length - 1)]?.file_url || null
    : selectedTemplate?.media_url || null;

  // ── Builder Panel Content ──
  const builderContent = (
    <div className="space-y-6">
      {/* ═══ Details ═══ */}
      {currentStepName === "Details" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="campaign-title" className="text-sm font-medium">Campaign Name</Label>
            <Input id="campaign-title" placeholder="e.g. Summer Product Launch" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus className="h-11 text-sm" />
          </div>
          <CreativeBriefBuilder
            brief={structuredBrief}
            onBriefChange={setStructuredBrief}
            copy={campaignCopy}
            onCopyChange={setCampaignCopy}
            brandContext={{
              businessName: businessName || undefined,
              industry: industry || undefined,
              voiceTone: brandProfile?.brand_voice_detected || undefined,
              targetAudience: brandProfile?.target_audience_detected || undefined,
            }}
          />

          {/* Selected reference assets strip */}
          {selectedAssets.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Selected References ({selectedAssets.length})</Label>
                <button
                  onClick={() => { setSelectedAssets([]); setActivePreviewIndex(0); }}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {selectedAssets.map((asset, i) => {
                  const isActive = i === Math.min(activePreviewIndex, selectedAssets.length - 1);
                  return (
                    <div
                      key={asset.id}
                      className={cn(
                        "relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer transition-all group",
                        isActive ? "border-primary ring-1 ring-primary/30 shadow-sm" : "border-border hover:border-foreground/20"
                      )}
                      onClick={() => setActivePreviewIndex(i)}
                    >
                      {isImageUrl(asset.file_url) ? (
                        <img src={asset.file_url} alt={asset.file_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <VideoIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = selectedAssets.filter((_, idx) => idx !== i);
                          setSelectedAssets(next);
                          if (activePreviewIndex >= next.length) setActivePreviewIndex(Math.max(0, next.length - 1));
                        }}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-foreground/70 text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0 bg-primary/80 py-0.5">
                          <p className="text-[7px] text-primary-foreground text-center font-bold">Preview</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected template from showcase (legacy) */}
          {selectedTemplate && selectedAssets.length === 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Reference Asset</Label>
              <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5">
                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-border">
                  <img src={selectedTemplate.thumbnail_url || selectedTemplate.media_url || ""} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{selectedTemplate.title}</p>
                  <p className="text-[10px] text-muted-foreground">{selectedTemplate.mood_tags?.[0] || "Template"} · {selectedTemplate.industry_tags?.[0] || "General"}</p>
                </div>
                <button onClick={() => handleTemplateSelect(null)} className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-secondary transition-colors">
                  Remove
                </button>
              </div>
            </div>
          )}

          <AssetLibraryPicker selectedAssets={selectedAssets} onChange={setSelectedAssets} />

          {/* Swap assets: product, model, logo */}
          <SwapAssetStrip
            assets={swapAssets}
            onChange={setSwapAssets}
            activeIndex={activeSwapIndex}
            onActiveChange={setActiveSwapIndex}
          />
        </>
      )}

      {/* ═══ Platforms ═══ */}
      {currentStepName === "Platforms" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Target Platforms</h2>
            <p className="text-xs text-muted-foreground mt-1">Select where this content will be published.</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <AssetPlatformSelector selected={platforms} onChange={setPlatforms} assetType="image" />
          </div>
          {platforms.length > 0 && (
            <p className="text-[10px] text-muted-foreground">{platforms.length} format{platforms.length !== 1 ? "s" : ""} selected</p>
          )}
        </div>
      )}

      {/* ═══ Content Type ═══ */}
      {currentStepName === "Content Type" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Content Types</h2>
            <p className="text-xs text-muted-foreground mt-1">What should the engine produce?</p>
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {(Object.keys(CONTENT_TYPE_LABELS) as ContentType[]).map((ct) => {
              const info = CONTENT_TYPE_LABELS[ct];
              const selected = contentTypes.includes(ct);
              return (
                <button
                  key={ct}
                  type="button"
                  onClick={() => toggleContentType(ct)}
                  className={`relative flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                    selected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-foreground/20 hover:bg-secondary/50"
                  }`}
                >
                  {selected && (
                    <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                  <div className={`p-2.5 rounded-xl ${selected ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                    {CONTENT_TYPE_ICONS[ct]}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">{info.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{info.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Creative Direction ═══ */}
      {currentStepName === "Creative Direction" && (
        <CreativeDirectionStep
          brief={creativeBrief}
          onBriefChange={setCreativeBrief}
          referenceAssets={creativeReferenceAssets}
          onReferenceAssetsChange={setCreativeReferenceAssets}
          direction={creativeDirection}
          onDirectionChange={setCreativeDirection}
          platform={platforms[0]?.platform || "instagram"}
          format={platforms[0]?.format || "reel"}
          librarySelections={librarySelections}
          onLibrarySelectionsChange={setLibrarySelections}
        />
      )}

      {/* ═══ Review ═══ */}
      {currentStepName === "Review" && (
        <div className="space-y-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">Review & Launch</h2>
            <p className="text-xs text-muted-foreground mt-1">Confirm your campaign configuration.</p>
          </div>
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            <div className="p-3">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Campaign</p>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              {instructions && <p className="text-[10px] text-muted-foreground mt-0.5">{instructions}</p>}
            </div>
            <div className="p-3">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Platforms ({platforms.length})</p>
              <div className="flex flex-wrap gap-1">
                {platforms.map((p) => (
                  <span key={`${p.platform}-${p.format}`} className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-medium text-foreground capitalize">
                    {p.platform} · {p.format}
                  </span>
                ))}
              </div>
            </div>
            <div className="p-3">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Content Types</p>
              <div className="flex flex-wrap gap-1">
                {contentTypes.map((ct) => {
                  const primaryFamily = platforms[0] ? routeFamily(ct, platforms[0].platform) : "F9";
                  return (
                    <span key={ct} className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-medium text-foreground">
                      {CONTENT_TYPE_LABELS[ct].label} → {FAMILY_LABELS[primaryFamily] || primaryFamily}
                    </span>
                  );
                })}
              </div>
            </div>
            {selectedTemplate && (
              <div className="p-3">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Reference Template</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md overflow-hidden border border-border">
                    <img src={selectedTemplate.thumbnail_url || selectedTemplate.media_url || ""} alt="" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-medium text-foreground">{selectedTemplate.title}</span>
                </div>
              </div>
            )}
            {selectedAssets.length > 0 && (
              <div className="p-3">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Reference Assets ({selectedAssets.length})</p>
                <div className="flex gap-1.5 overflow-x-auto">
                  {selectedAssets.map((a) => (
                    <div key={a.id} className="w-10 h-10 rounded-md overflow-hidden shrink-0 border border-border">
                      {isImageUrl(a.file_url) ? (
                        <img src={a.file_url} alt={a.file_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center"><VideoIcon className="w-3 h-3 text-muted-foreground" /></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Total generations: {selectedAssets.length > 0 ? `${selectedAssets.length} ref${selectedAssets.length !== 1 ? "s" : ""} × ` : ""}{platforms.length} platform{platforms.length !== 1 ? "s" : ""} × {contentTypes.length} type{contentTypes.length !== 1 ? "s" : ""} = <strong>{Math.max(1, selectedAssets.length) * platforms.length * contentTypes.length}</strong> assets
          </p>
        </div>
      )}
    </div>
  );

  // ── Footer Navigation ──
  const footerNav = (
    <div className="flex items-center justify-between pt-3 border-t border-border/50">
      {step > 0 ? (
        <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)} className="gap-1.5 text-xs">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Button>
      ) : <div />}

      {step < STEPS.length - 1 ? (
        <Button size="sm" onClick={handleNext} className="gap-1.5 text-xs">
          Next <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      ) : (
        <Button size="sm" onClick={handleCreate} disabled={!canCreate} className="gap-1.5 text-xs">
          {creating ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5" /> Generate Campaign</>
          )}
        </Button>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════
  // INLINE STRATEGY GATE — compact founder interview
  // ══════════════════════════════════════════════════════
  if (!strategyChecked) {
    return (
      <AppShell>
        <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (needsStrategy) {
    return (
      <AppShell>
        <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
          <div className="flex-1 flex items-center justify-center">
            <div className="max-w-lg w-full px-6 py-8">
              <div className="flex items-center gap-2 mb-6">
                <Brain className="w-5 h-5 text-primary" />
                <div>
                  <h1 className="text-lg font-bold text-foreground">Quick Strategy Setup</h1>
                  <p className="text-xs text-muted-foreground">3 questions to unlock personalized campaigns — takes 2 minutes</p>
                </div>
              </div>
              <FounderInterview
                businessName={businessName}
                industry={industry}
                onStrategyGenerated={() => {
                  setNeedsStrategy(false);
                  toast.success("Strategy locked — let's create!");
                }}
              />
              <button
                onClick={() => setNeedsStrategy(false)}
                className="mt-4 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full text-center"
              >
                Skip for now — I'll set this up later
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // ══════════════════════════════════════════════════════
  // MOBILE LAYOUT: Tab-switched (Builder / Preview / Source)
  // ══════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <AppShell>
        <div className="flex flex-col h-[calc(100vh-3.5rem)]">
          {/* Header */}
          <div className="shrink-0 px-4 pt-3 pb-2 border-b border-border bg-background">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <h1 className="text-sm font-semibold text-foreground">Create Campaign</h1>
              <div className="w-12" />
            </div>

            {/* Mobile tab switcher */}
            <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as any)}>
              <TabsList className="w-full bg-secondary/50 h-8">
                <TabsTrigger value="builder" className="flex-1 text-[10px] data-[state=active]:bg-background h-6">
                  Builder
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex-1 text-[10px] data-[state=active]:bg-background h-6">
                  Preview
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {mobileTab === "builder" && (
              <div className="px-4 py-4">
                {/* Progress */}
                <div className="flex gap-1.5 mb-6">
                  {STEPS.map((s, i) => (
                    <div key={s} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className={`h-1 w-full rounded-full transition-colors ${i <= step ? "bg-foreground" : "bg-border"}`} />
                      <span className={`text-[8px] uppercase tracking-wider ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
                    </div>
                  ))}
                </div>
                {builderContent}
              </div>
            )}

            {mobileTab === "preview" && (
              <div className="flex items-center justify-center py-6 px-4">
                <CampaignSimulator
                  imageUrl={simulatorPreviewUrl}
                  brandName={title || "Brand"}
                  caption={instructions || "Your campaign content preview"}
                />
              </div>
            )}

          </div>

          {/* Sticky footer */}
          <div className="shrink-0 px-4 py-3 bg-background border-t border-border">
            {footerNav}
          </div>
        </div>
      </AppShell>
    );
  }

  // ══════════════════════════════════════════════════════
  // DESKTOP LAYOUT: Three-zone workspace
  // ══════════════════════════════════════════════════════
  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* ── Top Zone: Builder (left) + Simulator (right) ── */}
        <div className="flex-1 flex min-h-0">
          {/* LEFT: Campaign Builder — 50% */}
          <div className="w-1/2 max-w-[560px] shrink-0 border-r border-border flex flex-col bg-background">
            <div className="shrink-0 px-5 pt-3 pb-2">
              <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </button>
              <h1 className="text-base font-semibold text-foreground mb-2">Create Campaign</h1>

              {/* Progress Steps */}
              <div className="flex gap-1.5">
                {STEPS.map((s, i) => (
                  <div key={s} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className={`h-1 w-full rounded-full transition-colors ${i <= step ? "bg-foreground" : "bg-border"}`} />
                    <span className={`text-[8px] uppercase tracking-wider ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-3">
              {builderContent}
            </div>

            <div className="shrink-0 px-5 pb-3">
              {footerNav}
            </div>
          </div>

          {/* RIGHT: Phone Simulator + Actions Panel */}
          <div className="flex-1 flex items-center justify-center bg-secondary/20 relative overflow-hidden py-2 px-4">
            <CampaignSimulator
              imageUrl={simulatorPreviewUrl}
              brandName={title || "Brand"}
              caption={instructions || "Your campaign content preview"}
              isStarred={isStarred}
              onStar={() => { setIsStarred(!isStarred); toast.success(isStarred ? "Removed star" : "Starred!"); }}
              onEdit={() => toast.info("Opening SeedEdit editor…")}
              onDownload={() => {
                if (selectedTemplate?.media_url) {
                  const a = document.createElement("a");
                  a.href = selectedTemplate.media_url;
                  a.download = `${selectedTemplate.title || "asset"}.jpg`;
                  a.click();
                  toast.success("Downloading…");
                }
              }}
              onSaveToLibrary={() => setShowSaveModal(true)}
              onHide={() => { handleTemplateSelect(null); toast.success("Asset hidden"); }}
            />

            {/* Subtle label */}
            <div className="absolute top-3 left-4 flex items-center gap-2 text-muted-foreground">
              <Layout className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-widest">Simulator</span>
            </div>
          </div>
        </div>

      </div>

      {/* Save to Library Modal */}
      {showSaveModal && selectedTemplate?.media_url && (
        <SaveToLibraryModal
          open={showSaveModal}
          onOpenChange={setShowSaveModal}
          imageUrl={selectedTemplate.media_url}
          title={selectedTemplate.title}
          tags={[...(selectedTemplate.mood_tags || []), ...(selectedTemplate.industry_tags || [])]}
        />
      )}
    </AppShell>
  );
};

export default NewCampaign;