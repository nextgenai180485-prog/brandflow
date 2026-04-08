import { format } from "date-fns";
import { Clock, ImageIcon, Video, Layers, FileText, LayoutGrid, CheckCircle2, Loader2, Trash2, Copy, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Campaign, GeneratedAsset, CampaignStatus } from "@/types/campaigns";

const statusConfig: Record<CampaignStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-secondary text-secondary-foreground" },
  generating: { label: "Generating", className: "animate-pulse bg-blue-50 text-blue-700 border-blue-200" },
  review: { label: "In Review", className: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  scheduled: { label: "Scheduled", className: "bg-violet-100 text-violet-800 border-violet-200" },
  published: { label: "Published", className: "bg-sky-100 text-sky-800 border-sky-200" },
};

interface CampaignCardProps {
  campaign: Campaign;
  assets: GeneratedAsset[];
  isDraft?: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onDuplicate?: (e: React.MouseEvent) => void;
}

export default function CampaignCard({ campaign, assets, isDraft, onClick, onDelete, onDuplicate }: CampaignCardProps) {
  const status = statusConfig[campaign.status as CampaignStatus] || statusConfig.draft;
  const thumbnails = assets.filter(a => a.content_url && a.asset_type !== "copy").slice(0, 4);
  const isGenerating = campaign.status === "generating";
  const completedCount = assets.filter(a => a.content_url).length;
  const totalCount = assets.length;
  const approvedCount = assets.filter(a => a.status === "approved").length;
  const pendingCount = assets.filter(a => a.status === "pending_review" && a.content_url).length;

  const typeBreakdown = assets.reduce<Record<string, number>>((acc, a) => {
    acc[a.asset_type] = (acc[a.asset_type] || 0) + 1;
    return acc;
  }, {});

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video": return <Video className="w-3 h-3" />;
      case "carousel": return <Layers className="w-3 h-3" />;
      case "copy": return <FileText className="w-3 h-3" />;
      default: return <ImageIcon className="w-3 h-3" />;
    }
  };

  // Platform breakdown
  const platforms = [...new Set(assets.map(a => a.platform).filter(Boolean))];

  return (
    <div
      onClick={onClick}
      className={cn(
        "group rounded-xl border overflow-hidden bg-card cursor-pointer transition-all hover:shadow-lg hover:border-foreground/15 hover:-translate-y-0.5 relative",
        isGenerating && "ring-2 ring-blue-400/30",
        "border-border"
      )}
    >
      {/* Generating pulse ring */}
      {isGenerating && (
        <div className="absolute inset-0 rounded-xl ring-2 ring-blue-400/40 animate-pulse pointer-events-none z-10" />
      )}

      {/* Thumbnail Grid */}
      <div className="aspect-video bg-muted relative overflow-hidden">
        {thumbnails.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="text-[10px] text-muted-foreground font-medium">Generating…</span>
              </div>
            ) : (
              <LayoutGrid className="w-8 h-8 text-muted-foreground/30" />
            )}
          </div>
        ) : thumbnails.length === 1 ? (
          <img src={thumbnails[0].content_url!} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className={`grid h-full w-full ${thumbnails.length === 2 ? "grid-cols-2" : "grid-cols-2 grid-rows-2"}`}>
            {thumbnails.map((t, i) => (
              <div key={t.id} className={`relative overflow-hidden ${thumbnails.length === 3 && i === 0 ? "row-span-2" : ""}`}>
                <img src={t.content_url!} alt="" className="w-full h-full object-cover" />
                {t.asset_type === "video" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-foreground/40 flex items-center justify-center">
                      <Video className="w-3 h-3 text-background" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Status overlay */}
        <div className="absolute top-2 left-2">
          <Badge variant="outline" className={cn("text-[9px] backdrop-blur-md", status.className)}>
            {status.label}
          </Badge>
        </div>

        {/* Asset count overlay */}
        {totalCount > 0 && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-foreground/70 backdrop-blur-sm text-[9px] font-medium text-background">
            {totalCount} asset{totalCount !== 1 ? "s" : ""}
          </div>
        )}

        {/* Progress bar for generating */}
        {isGenerating && totalCount > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
            <div
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        )}

        {/* Hover quick stats */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
            {approvedCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                <CheckCircle2 className="w-3 h-3" /> {approvedCount}
              </span>
            )}
            {pendingCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400">
                <Clock className="w-3 h-3" /> {pendingCount}
              </span>
            )}
            {platforms.map(p => (
              <span key={p} className="text-[9px] font-semibold text-white/70 uppercase">{p}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {campaign.title}
          </h3>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {onDuplicate && (
              <button
                className="h-6 w-6 shrink-0 flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                onClick={onDuplicate}
                title="Duplicate"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              className="h-6 w-6 shrink-0 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              onClick={onDelete}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(new Date(campaign.created_at), "MMM d, yyyy")}
          </span>
          {Object.entries(typeBreakdown).map(([type, count]) => (
            <span key={type} className="flex items-center gap-0.5">
              {getTypeIcon(type)} {count}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
