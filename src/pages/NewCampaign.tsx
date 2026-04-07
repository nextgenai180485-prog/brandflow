import { useState, useCallback, useEffect, useMemo } from "react";
import type { LibrarySelection } from "@/components/LibraryBrowser";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, ImageIcon, Sparkles, Film, Camera, Check, VideoIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AssetPlatformSelector from "@/components/AssetPlatformSelector";
import AssetLibraryPicker, { type LibraryAsset } from "@/components/AssetLibraryPicker";

import CreativeDirectionStep, { type DirectorOutput } from "@/components/CreativeDirectionStep";
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
  const showcaseState = location.state as { fromShowcase?: boolean; templateRef?: { id: string; title: string; mediaUrl?: string; industryTags?: string[]; moodTags?: string[]; platformTags?: string[] } } | null;

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState(showcaseState?.templateRef?.title || "");
  const [instructions, setInstructions] = useState(
    showcaseState?.fromShowcase
      ? `Inspired by: ${showcaseState.templateRef?.title || "showcase template"}. Tags: ${[...(showcaseState.templateRef?.moodTags || []), ...(showcaseState.templateRef?.industryTags || [])].join(", ")}`
      : ""
  );
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

  const hasVideoContent = contentTypes.some(ct => ct === "ugc_video" || ct === "pro_video");

  const STEPS = useMemo(() => {
    if (hasVideoContent) return ALL_STEPS;
    return ALL_STEPS.filter(s => s !== "Creative Direction");
  }, [hasVideoContent]);

  // Auto-populate from showcase template
  useEffect(() => {
    if (!showcaseState?.fromShowcase || !showcaseState.templateRef) return;
    const ref = showcaseState.templateRef;

    // Auto-attach media as creative reference asset
    if (ref.mediaUrl) {
      setCreativeReferenceAssets([{
        id: ref.id,
        file_name: ref.title,
        file_url: ref.mediaUrl,
        asset_type: "reference",
        created_at: new Date().toISOString(),
      }]);
    }

    // Pre-select platforms from template tags
    if (ref.platformTags?.length) {
      const platformFormats: SelectedFormat[] = ref.platformTags.map(tag => ({
        platform: tag as SocialPlatform,
        format: tag === "tiktok" ? "reel" : tag === "linkedin" ? "post" : tag === "youtube" ? "post" : "post",
      }));
      setPlatforms(platformFormats);
    }

    // Default to image content type for showcase templates
    if (contentTypes.length === 0) {
      setContentTypes(["image"]);
    }
  }, []); // Run once on mount

  // Load brand profile from brand_memory
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("brand_memory")
        .select("context")
        .eq("profile_id", user.id)
        .eq("memory_type", "brand_profile")
        .eq("pattern_category", "auto_research")
        .limit(1)
        .single();
      if (data?.context) {
        setBrandProfile(data.context as unknown as BrandProfile);
      }
      setLoadingProfile(false);
    };
    load();
  }, [user]);

  const toggleContentType = (ct: ContentType) => {
    setContentTypes((prev) => prev.includes(ct) ? prev.filter((t) => t !== ct) : [...prev, ct]);
  };
  // Auto-route to generation family based on content type + platform
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

    // 1. Create campaign
    const { data: campaign, error } = await supabase
      .from("campaigns")
      .insert({
        profile_id: user.id,
        title: title.trim(),
        instructions: instructions.trim() || null,
        status: "draft",
        publish_platforms: [...publishPlatforms, ...ctEntries],
      })
      .select()
      .single();

    if (error || !campaign) { toast.error("Failed to create campaign."); setCreating(false); return; }

    // 2. Persist campaign_assets references
    if (selectedAssets.length > 0) {
      const assetRefs = selectedAssets.map((a, i) => ({
        campaign_id: campaign.id,
        brand_asset_id: a.id,
        profile_id: user.id,
        asset_role: "reference",
        sort_order: i,
      }));
      await supabase.from("campaign_assets" as any).insert(assetRefs);
    }

    // 3. Build generation matrix: platforms × content types
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

    const assetTypeMap: Record<string, string> = {
      image: "image",
      ugc_video: "video",
      pro_video: "video",
    };


    const generationAssets = platforms.flatMap((p) =>
      contentTypes.map((ct) => {
        const key = `${p.platform}|${p.format}`;
        const dims = SOCIAL_FORMAT_MAP[key] || { width: 1080, height: 1080, aspectRatio: "1:1" };
        return {
          platform: p.platform,
          format: p.format,
          assetType: assetTypeMap[ct] || "image",
          contentType: ct,
          family: routeFamily(ct, p.platform),
          ...dims,
        };
      })
    );

    // 4. Build brand context from profile + brand memory
    const brandContext = {
      businessName: brandProfile?.summary?.split(".")[0] || title,
      industry: "general",
      brandVoice: brandProfile?.brand_voice_detected || "professional",
      targetAudience: brandProfile?.target_audience_detected || "general audience",
    };

    // 5. Persist creative history if direction exists
    if (creativeDirection) {
      await supabase.from("creative_history" as any).insert({
        profile_id: user.id,
        campaign_id: campaign.id,
        family: creativeDirection.family,
        sealcam_scenes: creativeDirection.scenes,
        direction_output: creativeDirection,
        generation_params: { platform: primaryPlatform, format: primaryFormat },
        result_status: "pending",
      });
    }

    // 6. Trigger generation pipeline
    toast.success("Campaign created — generation starting…");

    const referenceImageUrl = showcaseState?.fromShowcase ? showcaseState.templateRef?.mediaUrl : undefined;

    supabase.functions.invoke("generate-content", {
      body: {
        campaignId: campaign.id,
        assets: generationAssets,
        brandContext,
        intelligenceBrief: brandProfile ? {
          summary: brandProfile.summary,
          competitors: brandProfile.competitors,
          hooks: brandProfile.content_pillars || [],
          content_angles: brandProfile.key_themes || [],
          visual_direction: brandProfile.visual_style,
        } : null,
        creativeDirection: creativeDirection || null,
        referenceImageUrl: referenceImageUrl || null,
      },
    }).then(({ error: genError }) => {
      if (genError) console.error("[Generation] Trigger error:", genError);
    });

    navigate("/dashboard");
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

  const primaryPlatform = platforms[0]?.platform || "instagram";
  const primaryFormat = platforms[0]?.format || "reel";

  const isImageUrl = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url);

  // ── Left Panel (Tactical Builder) ──
  const renderLeftPanel = () => (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <h1 className="text-2xl font-semibold text-foreground mb-2">Create Campaign</h1>

        {/* Progress Steps */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1">
              <div className={`h-1.5 w-full rounded-full transition-colors ${i <= step ? "bg-foreground" : "bg-border"}`} />
              <span className={`text-[10px] uppercase tracking-wider ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
            </div>
          ))}
        </div>

        <div className="space-y-8">
          {/* ═══ Details ═══ */}
          {currentStepName === "Details" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="campaign-title" className="text-sm font-medium">Campaign Name</Label>
                <Input id="campaign-title" placeholder="e.g. Summer Product Launch" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus className="h-12 text-base" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-instructions" className="text-sm font-medium">Brief <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea id="campaign-instructions" placeholder="Describe the goal, tone, or specific requirements…" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} className="resize-none text-base" />
              </div>

              {/* Asset Library Picker */}
              <AssetLibraryPicker selectedAssets={selectedAssets} onChange={setSelectedAssets} />
            </>
          )}

          {/* ═══ Platforms ═══ */}
          {currentStepName === "Platforms" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Target Platforms</h2>
                <p className="text-sm text-muted-foreground mt-1">Select where this content will be published.</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <AssetPlatformSelector selected={platforms} onChange={setPlatforms} assetType="image" />
              </div>
              {platforms.length > 0 && (
                <p className="text-xs text-muted-foreground">{platforms.length} format{platforms.length !== 1 ? "s" : ""} selected</p>
              )}
            </div>
          )}

          {/* ═══ Content Type ═══ */}
          {currentStepName === "Content Type" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Content Types</h2>
                <p className="text-sm text-muted-foreground mt-1">What should the engine produce?</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(Object.keys(CONTENT_TYPE_LABELS) as ContentType[]).map((ct) => {
                  const info = CONTENT_TYPE_LABELS[ct];
                  const selected = contentTypes.includes(ct);
                  return (
                    <button
                      key={ct}
                      type="button"
                      onClick={() => toggleContentType(ct)}
                      className={`relative flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all ${
                        selected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-foreground/20 hover:bg-secondary/50"
                      }`}
                    >
                      {selected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                      <div className={`p-3 rounded-full ${selected ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                        {CONTENT_TYPE_ICONS[ct]}
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-foreground">{info.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{info.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ Creative Direction (conditional — video only) ═══ */}
          {currentStepName === "Creative Direction" && (
            <CreativeDirectionStep
              brief={creativeBrief}
              onBriefChange={setCreativeBrief}
              referenceAssets={creativeReferenceAssets}
              onReferenceAssetsChange={setCreativeReferenceAssets}
              direction={creativeDirection}
              onDirectionChange={setCreativeDirection}
              platform={primaryPlatform}
              format={primaryFormat}
              librarySelections={librarySelections}
              onLibrarySelectionsChange={setLibrarySelections}
            />
          )}

          {/* ═══ Review ═══ */}
          {currentStepName === "Review" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Review & Launch</h2>
                <p className="text-sm text-muted-foreground mt-1">Confirm your campaign configuration.</p>
              </div>

              <div className="rounded-xl border border-border bg-card divide-y divide-border">
                <div className="p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Campaign</p>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  {instructions && <p className="text-xs text-muted-foreground mt-1">{instructions}</p>}
                </div>
                <div className="p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Platforms ({platforms.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {platforms.map((p) => (
                      <span key={`${p.platform}-${p.format}`} className="px-2 py-0.5 rounded-full bg-secondary text-[11px] font-medium text-foreground capitalize">
                        {p.platform} · {p.format}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Content Types</p>
                  <div className="flex flex-wrap gap-1.5">
                    {contentTypes.map((ct) => {
                      const primaryFamily = platforms[0] ? routeFamily(ct, platforms[0].platform) : "F9";
                      return (
                        <span key={ct} className="px-2 py-0.5 rounded-full bg-secondary text-[11px] font-medium text-foreground">
                          {CONTENT_TYPE_LABELS[ct].label} → {FAMILY_LABELS[primaryFamily] || primaryFamily}
                        </span>
                      );
                    })}
                  </div>
                </div>
                {creativeDirection && (
                  <div className="p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Creative Direction</p>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-secondary text-[11px] font-medium text-foreground">{creativeDirection.family_label}</span>
                      <span className="text-[10px] text-muted-foreground">{creativeDirection.scenes.length} scenes · {creativeDirection.estimated_duration_s}s · {creativeDirection.aspect_ratio}</span>
                    </div>
                  </div>
                )}
                {selectedAssets.length > 0 && (
                  <div className="p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Reference Assets ({selectedAssets.length})</p>
                    <div className="flex gap-2 overflow-x-auto">
                      {selectedAssets.map((a) => (
                        <div key={a.id} className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-border">
                          {isImageUrl(a.file_url) ? (
                            <img src={a.file_url} alt={a.file_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center"><VideoIcon className="w-4 h-4 text-muted-foreground" /></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Total generations: {platforms.length} × {contentTypes.length} = <strong>{platforms.length * contentTypes.length}</strong> assets
              </p>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 pt-4 border-t border-border/50 flex items-center justify-between">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          ) : <div />}

          {step < STEPS.length - 1 ? (
            <Button onClick={handleNext} className="gap-2">
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button size="lg" onClick={handleCreate} disabled={!canCreate} className="gap-2">
              {creating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Create Campaign</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Tactical Builder — full width, CMO intelligence is now in the global Sentient Rail */}
        {renderLeftPanel()}
      </div>
    </AppShell>
  );
};

export default NewCampaign;
