import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, Eye, Palette, Sun, Focus, Layers } from "lucide-react";

export interface ShowcaseItem {
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

interface ShowcaseDetailModalProps {
  item: ShowcaseItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SEALCAM_ICONS: Record<string, React.ReactNode> = {
  composition: <Layers className="w-3.5 h-3.5" />,
  lighting: <Sun className="w-3.5 h-3.5" />,
  color_palette: <Palette className="w-3.5 h-3.5" />,
  mood: <Eye className="w-3.5 h-3.5" />,
  focal_point: <Focus className="w-3.5 h-3.5" />,
};

const formatLabel = (key: string) =>
  key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const ShowcaseDetailModal = ({ item, open, onOpenChange }: ShowcaseDetailModalProps) => {
  const navigate = useNavigate();

  if (!item) return null;

  const sealcam = item.sealcam_analysis || {};
  const sealcamEntries = Object.entries(sealcam).filter(([, v]) => v);

  const handleCreateCampaign = () => {
    onOpenChange(false);
    navigate("/dashboard/campaigns/new", {
      state: {
        fromShowcase: true,
        templateRef: {
          id: item.id,
          title: item.title,
          industryTags: item.industry_tags,
          moodTags: item.mood_tags,
          platformTags: item.platform_tags,
        },
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
        <DialogTitle className="sr-only">{item.title}</DialogTitle>

        {/* Hero Image */}
        <div className="relative aspect-video bg-muted">
          <img
            src={item.media_url || item.thumbnail_url || ""}
            alt={item.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-5 pt-12">
            <h3 className="text-lg font-semibold text-white">{item.title}</h3>
            {item.description && (
              <p className="text-sm text-white/70 mt-1 line-clamp-2">{item.description}</p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {item.industry_tags?.map((tag) => (
              <Badge key={`i-${tag}`} variant="secondary" className="text-[10px] px-2 py-0.5">
                {formatLabel(tag)}
              </Badge>
            ))}
            {item.mood_tags?.map((tag) => (
              <Badge key={`m-${tag}`} variant="outline" className="text-[10px] px-2 py-0.5">
                {formatLabel(tag)}
              </Badge>
            ))}
            {item.platform_tags?.map((tag) => (
              <Badge key={`p-${tag}`} className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-primary/20">
                {formatLabel(tag)}
              </Badge>
            ))}
          </div>

          {/* SEALCaM Analysis */}
          {sealcamEntries.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                SEALCaM Analysis
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {sealcamEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <span className="text-muted-foreground mt-0.5">
                      {SEALCAM_ICONS[key] || <Layers className="w-3.5 h-3.5" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {formatLabel(key)}
                      </p>
                      <p className="text-xs font-medium text-foreground truncate">
                        {formatLabel(value)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance Notes */}
          {item.performance_notes && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-xs font-medium text-primary mb-0.5">Performance Insight</p>
              <p className="text-xs text-muted-foreground">{item.performance_notes}</p>
            </div>
          )}

          {/* CTA */}
          <Button onClick={handleCreateCampaign} className="w-full gap-2" size="lg">
            <Sparkles className="w-4 h-4" />
            Create Campaign from This
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShowcaseDetailModal;
