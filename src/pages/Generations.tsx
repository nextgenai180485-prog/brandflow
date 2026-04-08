import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Image,
  Video,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  RefreshCw,
  Eye,
  Sparkles,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; colorClass: string }> = {
  pending_review: { label: "Ready", icon: CheckCircle2, colorClass: "bg-emerald-500" },
  approved: { label: "Approved", icon: CheckCircle2, colorClass: "bg-primary" },
  rejected: { label: "Rejected", icon: XCircle, colorClass: "bg-destructive" },
  generating: { label: "Generating", icon: Loader2, colorClass: "bg-amber-500" },
};

const TYPE_ICONS: Record<string, typeof Image> = {
  image: Image,
  video: Video,
  carousel: Image,
  copy: FileText,
};

const Generations = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [previewAsset, setPreviewAsset] = useState<any>(null);

  const { data: assets = [], isLoading, refetch } = useQuery({
    queryKey: ["generations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("generated_assets")
        .select("*, campaigns(title)")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 10_000,
  });

  const filtered = assets.filter((a: any) => {
    if (activeTab !== "all" && a.asset_type !== activeTab) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (a.platform || "").toLowerCase().includes(q) ||
      (a.campaigns?.title || "").toLowerCase().includes(q) ||
      (a.provider || "").toLowerCase().includes(q)
    );
  });

  const stats = {
    total: assets.length,
    ready: assets.filter((a: any) => a.content_url && a.status === "pending_review").length,
    generating: assets.filter((a: any) => !a.content_url && a.provider !== "error").length,
    failed: assets.filter((a: any) => a.provider === "error").length,
  };

  return (
    <AppShell>
      <div className="px-4 sm:px-6 pt-4 pb-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generations
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              All AI-generated creatives across your campaigns
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs">
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { label: "Total", value: stats.total, color: "text-foreground" },
            { label: "Ready", value: stats.ready, color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Generating", value: stats.generating, color: "text-amber-600 dark:text-amber-400" },
            { label: "Failed", value: stats.failed, color: "text-destructive" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-3 text-center">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-muted-foreground font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by platform, campaign, or provider..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="image" className="text-xs gap-1"><Image className="h-3 w-3" />Images</TabsTrigger>
            <TabsTrigger value="video" className="text-xs gap-1"><Video className="h-3 w-3" />Videos</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No generations yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Create a campaign to start generating</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filtered.map((asset: any) => (
                  <GenerationCard key={asset.id} asset={asset} onPreview={setPreviewAsset} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Preview Dialog */}
        <Dialog open={!!previewAsset} onOpenChange={() => setPreviewAsset(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-sm flex items-center gap-2">
                <Badge variant="outline" className="text-[9px]">{previewAsset?.platform}</Badge>
                {previewAsset?.campaigns?.title || "Generation"}
              </DialogTitle>
            </DialogHeader>
            {previewAsset && <GenerationDetail asset={previewAsset} />}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
};

const GenerationCard = ({ asset, onPreview }: { asset: any; onPreview: (a: any) => void }) => {
  const isGenerating = !asset.content_url && asset.provider !== "error";
  const isFailed = asset.provider === "error";
  const statusCfg = STATUS_CONFIG[asset.status] || STATUS_CONFIG.pending_review;
  const TypeIcon = TYPE_ICONS[asset.asset_type] || Image;

  return (
    <Card
      className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30 overflow-hidden"
      onClick={() => onPreview(asset)}
    >
      <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
        {isGenerating ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
            <span className="text-[10px] text-muted-foreground">Generating...</span>
          </div>
        ) : isFailed ? (
          <div className="flex flex-col items-center gap-2">
            <XCircle className="h-6 w-6 text-destructive/50" />
            <span className="text-[10px] text-destructive/70">Failed</span>
          </div>
        ) : asset.content_url ? (
          asset.asset_type === "video" ? (
            <video src={asset.content_url} className="w-full h-full object-cover" muted />
          ) : (
            <img src={asset.content_url} alt="" className="w-full h-full object-cover" />
          )
        ) : (
          <TypeIcon className="h-8 w-8 text-muted-foreground/30" />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors flex items-center justify-center">
          <Eye className="h-5 w-5 text-foreground/0 group-hover:text-foreground/60 transition-colors" />
        </div>

        {/* Status dot */}
        <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ${statusCfg.colorClass} border-2 border-background`} />

        {/* Platform badge */}
        <Badge
          variant="secondary"
          className="absolute bottom-2 left-2 text-[8px] px-1.5 py-0 bg-background/80 backdrop-blur-sm"
        >
          {asset.platform}
        </Badge>
      </div>

      <CardContent className="p-2.5">
        <p className="text-[11px] font-medium text-foreground truncate">
          {asset.campaigns?.title || "Untitled Campaign"}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[9px] text-muted-foreground">
            {asset.provider?.replace(/_/g, " ") || "pending"}
          </span>
          <span className="text-[9px] text-muted-foreground">
            {new Date(asset.created_at).toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

const GenerationDetail = ({ asset }: { asset: any }) => {
  const caption = asset.content_text?.replace(/^\[meta:[^\]]*\]\s*/, "") || "";
  let rationaleData: any = {};
  try { rationaleData = JSON.parse(asset.rationale || "{}"); } catch { /* */ }

  return (
    <div className="space-y-4">
      {asset.content_url && (
        <div className="rounded-lg overflow-hidden bg-muted aspect-square">
          {asset.asset_type === "video" ? (
            <video src={asset.content_url} controls className="w-full h-full object-contain" />
          ) : (
            <img src={asset.content_url} alt="" className="w-full h-full object-contain" />
          )}
        </div>
      )}

      {caption && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground mb-1">Caption</p>
          <p className="text-xs text-foreground">{caption}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <span className="text-muted-foreground">Platform:</span>{" "}
          <span className="font-medium text-foreground">{asset.platform}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Type:</span>{" "}
          <span className="font-medium text-foreground">{asset.asset_type}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Provider:</span>{" "}
          <span className="font-medium text-foreground">{asset.provider}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Cost:</span>{" "}
          <span className="font-medium text-foreground">${(asset.generation_cost || 0).toFixed(4)}</span>
        </div>
        {rationaleData.direction && (
          <div className="col-span-2">
            <span className="text-muted-foreground">Direction:</span>{" "}
            <span className="font-medium text-foreground">{rationaleData.direction}</span>
          </div>
        )}
      </div>

      {asset.content_url && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs gap-1.5"
          onClick={() => window.open(asset.content_url, "_blank")}
        >
          <Download className="h-3 w-3" /> Download
        </Button>
      )}

      <div className="text-[10px] text-muted-foreground pt-2 border-t border-border">
        Generated {new Date(asset.created_at).toLocaleString()}
        {asset.generation_time_ms > 0 && ` · ${(asset.generation_time_ms / 1000).toFixed(1)}s`}
      </div>
    </div>
  );
};

export default Generations;
