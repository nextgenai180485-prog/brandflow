import { Plus, CheckCircle2, Circle, Play, Image, Film, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

interface EmptyCampaignsProps {
  onCreateClick: () => void;
  hasProfile?: boolean;
}

const steps = [
  { label: "Create your account", done: true },
  { label: "Create first campaign", done: false },
  { label: "Review AI-generated content", done: false },
];

type ShowcaseItem = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  type: "video" | "image" | "ad";
  tags: string[];
};

const useShowcaseItems = () =>
  useQuery({
    queryKey: ["showcase-items"],
    queryFn: async () => {
      const items: ShowcaseItem[] = [];

      const [vids, imgs, ads] = await Promise.all([
        supabase
          .from("video_templates")
          .select("id, template_name, example_url, mood, tags")
          .eq("is_active", true)
          .not("example_url", "is", null)
          .limit(4),
        supabase
          .from("image_templates")
          .select("id, style_name, tags, platform")
          .eq("is_active", true)
          .limit(4),
        supabase
          .from("ad_reference_library")
          .select("id, title, thumbnail_url, mood_tags")
          .eq("is_active", true)
          .not("thumbnail_url", "is", null)
          .limit(4),
      ]);

      vids.data?.forEach((v) =>
        items.push({
          id: v.id,
          title: v.template_name,
          thumbnail_url: v.example_url,
          type: "video",
          tags: [v.mood, ...(v.tags ?? [])].filter(Boolean).slice(0, 2) as string[],
        })
      );

      imgs.data?.forEach((v) =>
        items.push({
          id: v.id,
          title: v.style_name,
          thumbnail_url: null,
          type: "image",
          tags: (v.tags ?? []).slice(0, 2),
        })
      );

      ads.data?.forEach((v) =>
        items.push({
          id: v.id,
          title: v.title,
          thumbnail_url: v.thumbnail_url,
          type: "ad",
          tags: (v.mood_tags ?? []).slice(0, 2),
        })
      );

      return items;
    },
    staleTime: 60_000,
  });

const typeConfig = {
  video: { label: "Video Template", icon: Play, color: "bg-purple-500/90" },
  image: { label: "Image Style", icon: Image, color: "bg-blue-500/90" },
  ad: { label: "Ad Reference", icon: Film, color: "bg-amber-500/90" },
};

const EmptyCampaigns = ({ onCreateClick, hasProfile = true }: EmptyCampaignsProps) => {
  const completedSteps = hasProfile ? [true, false, false] : [false, false, false];
  const { data: showcaseItems } = useShowcaseItems();
  const hasShowcase = showcaseItems && showcaseItems.length > 0;

  return (
    <div className="flex flex-col items-center justify-center py-24">
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

      {hasShowcase && (
        <div className="w-full max-w-3xl mt-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              See what Brandflow creates
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-thin">
            {showcaseItems.map((item) => {
              const cfg = typeConfig[item.type];
              const Icon = cfg.icon;
              return (
                <div
                  key={item.id}
                  className="snap-start shrink-0 w-52 rounded-xl overflow-hidden border bg-card group"
                >
                  <div className="aspect-video bg-muted relative flex items-center justify-center">
                    {item.thumbnail_url ? (
                      <img
                        src={item.thumbnail_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Icon className="w-8 h-8 text-muted-foreground/30" />
                    )}
                    <Badge
                      className={`absolute top-2 left-2 ${cfg.color} text-white text-[10px] px-1.5 py-0.5 border-0`}
                    >
                      {cfg.label}
                    </Badge>
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                    {item.tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmptyCampaigns;
