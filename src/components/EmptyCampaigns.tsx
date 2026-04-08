import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Zap, Calendar, Megaphone, TrendingUp, ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import fashionImg from "@/assets/showcase/fashion-editorial.jpg";
import skincareImg from "@/assets/showcase/skincare-luxury.jpg";
import foodImg from "@/assets/showcase/food-hero.jpg";
import techImg from "@/assets/showcase/tech-watch.jpg";
import realestateImg from "@/assets/showcase/realestate-luxury.jpg";
import fitnessImg from "@/assets/showcase/fitness-energy.jpg";

interface EmptyCampaignsProps {
  onCreateClick: () => void;
  hasProfile?: boolean;
}

interface ShowcaseRef {
  id: string;
  title: string;
  media_url: string | null;
  thumbnail_url: string | null;
  industry_tags: string[] | null;
  mood_tags: string[] | null;
  platform_tags: string[] | null;
}

const CAMPAIGN_TEMPLATES = [
  {
    key: "weekly",
    title: "Weekly Social Pack",
    description: "7 posts across IG, TikTok & LinkedIn",
    icon: Calendar,
    platforms: ["instagram", "tiktok", "linkedin"],
    instructions: "Create a week of social content with a mix of educational, promotional, and engagement posts.",
  },
  {
    key: "launch",
    title: "Product Launch",
    description: "Launch sequence with teaser → reveal → CTA",
    icon: Megaphone,
    platforms: ["instagram", "tiktok"],
    instructions: "Create a product launch campaign: teaser post, reveal post, and direct CTA post.",
  },
  {
    key: "awareness",
    title: "Brand Awareness",
    description: "Top-of-funnel reach & engagement ads",
    icon: TrendingUp,
    platforms: ["instagram", "facebook"],
    instructions: "Create brand awareness content focused on reach, storytelling, and engagement.",
  },
];

const STATIC_REFS: ShowcaseRef[] = [
  { id: "s1", title: "Fashion Editorial", media_url: fashionImg, thumbnail_url: fashionImg, industry_tags: ["fashion"], mood_tags: ["editorial"], platform_tags: ["instagram"] },
  { id: "s2", title: "Luxury Skincare", media_url: skincareImg, thumbnail_url: skincareImg, industry_tags: ["beauty"], mood_tags: ["luxurious"], platform_tags: ["instagram"] },
  { id: "s3", title: "Food & Beverage", media_url: foodImg, thumbnail_url: foodImg, industry_tags: ["food"], mood_tags: ["warm"], platform_tags: ["instagram"] },
  { id: "s4", title: "Tech Product", media_url: techImg, thumbnail_url: techImg, industry_tags: ["technology"], mood_tags: ["sleek"], platform_tags: ["instagram"] },
  { id: "s5", title: "Real Estate", media_url: realestateImg, thumbnail_url: realestateImg, industry_tags: ["real_estate"], mood_tags: ["aspirational"], platform_tags: ["instagram"] },
  { id: "s6", title: "Fitness Brand", media_url: fitnessImg, thumbnail_url: fitnessImg, industry_tags: ["fitness"], mood_tags: ["energetic"], platform_tags: ["instagram"] },
];

const EmptyCampaigns = ({ onCreateClick }: EmptyCampaignsProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [refs, setRefs] = useState<ShowcaseRef[]>(STATIC_REFS);
  const [loading, setLoading] = useState(true);
  const [brandReadiness, setBrandReadiness] = useState({ score: 0, missing: [] as string[] });

  // Fetch showcase refs
  useEffect(() => {
    supabase
      .from("ad_reference_library")
      .select("id, title, media_url, thumbnail_url, industry_tags, mood_tags, platform_tags")
      .eq("is_active", true)
      .not("thumbnail_url", "is", null)
      .order("usage_count", { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (data && data.length > 0) setRefs(data as ShowcaseRef[]);
        setLoading(false);
      });
  }, []);

  // Calculate brand readiness from profile
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      if (!data) return;
      const checks = [
        { key: "business_name", label: "Business name" },
        { key: "website_url", label: "Website URL" },
        { key: "industry", label: "Industry" },
        { key: "brand_voice_tone", label: "Brand voice" },
        { key: "target_audience", label: "Target audience" },
      ];
      const filled = checks.filter((c) => !!(data as any)[c.key]);
      const missing = checks.filter((c) => !(data as any)[c.key]).map((c) => c.label);
      const score = Math.round((filled.length / checks.length) * 100);
      setBrandReadiness({ score, missing });
    });
  }, [user]);

  const handleTemplate = (template: typeof CAMPAIGN_TEMPLATES[0]) => {
    navigate("/dashboard/campaigns/new", {
      state: {
        fromTemplate: true,
        templateConfig: {
          title: template.title,
          platforms: template.platforms,
          instructions: template.instructions,
        },
      },
    });
  };

  const handleShowcaseRef = (ref: ShowcaseRef) => {
    navigate("/dashboard/campaigns/new", {
      state: {
        fromShowcase: true,
        templateRef: {
          id: ref.id,
          title: ref.title,
          mediaUrl: ref.media_url || ref.thumbnail_url,
          industryTags: ref.industry_tags,
          moodTags: ref.mood_tags,
          platformTags: ref.platform_tags,
        },
      },
    });
  };

  return (
    <div className="space-y-8">
      {/* Hero section */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Launch your first campaign</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Choose a template or start from an inspiration reference</p>
      </div>

      {/* Brand readiness + templates row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Brand readiness card */}
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              {brandReadiness.score >= 80 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-500" />
              )}
              <span className="text-xs font-semibold text-foreground">Brand Profile</span>
            </div>
            <Progress value={brandReadiness.score} className="h-1.5 mb-2" />
            <p className="text-[11px] text-muted-foreground">{brandReadiness.score}% complete</p>
          </div>
          {brandReadiness.missing.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] text-muted-foreground mb-1">Missing:</p>
              <div className="flex flex-wrap gap-1">
                {brandReadiness.missing.slice(0, 3).map((m) => (
                  <Badge key={m} variant="outline" className="text-[9px] px-1.5 py-0 text-amber-600 border-amber-200">
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Campaign templates */}
        {CAMPAIGN_TEMPLATES.map((t) => (
          <div
            key={t.key}
            onClick={() => handleTemplate(t)}
            className="rounded-xl border border-border bg-card p-4 cursor-pointer group transition-all hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
              <t.icon className="w-4.5 h-4.5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-0.5">{t.title}</h3>
            <p className="text-[11px] text-muted-foreground mb-3">{t.description}</p>
            <div className="flex items-center gap-1.5">
              {t.platforms.map((p) => (
                <Badge key={p} variant="secondary" className="text-[9px] px-1.5 py-0 capitalize">{p}</Badge>
              ))}
              <ArrowRight className="w-3 h-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}
      </div>

      {/* Inspiration quick-starts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Quick Start from Inspiration</h3>
          </div>
          <p className="text-[10px] text-muted-foreground">Click to create instantly</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {refs.map((ref) => (
              <div
                key={ref.id}
                onClick={() => handleShowcaseRef(ref)}
                className="rounded-xl overflow-hidden border border-border/50 group cursor-pointer transition-all hover:shadow-md hover:border-border hover:scale-[1.02]"
              >
                <div className="aspect-[4/5] relative overflow-hidden">
                  <img
                    src={ref.thumbnail_url || ref.media_url || ""}
                    alt={ref.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-white">
                      <Zap className="w-3 h-3" /> Use This
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-[11px] font-medium text-foreground truncate">{ref.title}</p>
                  <p className="text-[9px] text-muted-foreground capitalize">{ref.mood_tags?.[0] || ref.industry_tags?.[0] || "Template"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmptyCampaigns;
