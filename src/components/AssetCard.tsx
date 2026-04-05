import { useState } from "react";
import { Check, X, RefreshCw, ImageIcon, VideoIcon, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { GeneratedAsset, AssetStatus } from "@/types/campaigns";

const assetIcon = (type: string) => {
  if (type === "image") return <ImageIcon className="w-5 h-5 text-muted-foreground" />;
  if (type === "video") return <VideoIcon className="w-5 h-5 text-muted-foreground" />;
  return <FileText className="w-5 h-5 text-muted-foreground" />;
};

const statusBadge = (status: AssetStatus) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">Approved ✓</Badge>;
    case "rejected":
      return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">Rejected ✗</Badge>;
    case "regenerating":
      return <Badge variant="outline" className="animate-pulse border-blue-300 text-blue-700 bg-blue-50">Regenerating…</Badge>;
    default:
      return <Badge variant="secondary" className="text-xs">Pending Review</Badge>;
  }
};

interface AssetCardProps {
  asset: GeneratedAsset;
  onStatusChange: () => void;
}

const AssetCard = ({ asset, onStatusChange }: AssetCardProps) => {
  const [updating, setUpdating] = useState(false);

  const updateStatus = async (newStatus: AssetStatus) => {
    setUpdating(true);
    const { error } = await supabase
      .from("generated_assets")
      .update({ status: newStatus })
      .eq("id", asset.id);

    if (error) {
      toast.error("Failed to update asset status.");
    } else {
      toast.success(newStatus === "approved" ? "Asset approved!" : "Asset rejected.");
      onStatusChange();
    }
    setUpdating(false);
  };

  const handleRegenerate = async () => {
    setUpdating(true);
    await supabase
      .from("generated_assets")
      .update({ status: "regenerating" })
      .eq("id", asset.id);

    // Simulate regeneration
    setTimeout(async () => {
      await supabase
        .from("generated_assets")
        .update({ status: "pending_review" })
        .eq("id", asset.id);
      toast.success("Asset regenerated! Ready for review.");
      onStatusChange();
      setUpdating(false);
    }, 2000);
  };

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-center gap-2 mb-3">
        {assetIcon(asset.asset_type)}
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{asset.asset_type}</span>
        <div className="ml-auto">{statusBadge(asset.status)}</div>
      </div>

      {asset.asset_type === "copy" && asset.content_text ? (
        <p className="text-sm text-foreground leading-relaxed mb-4">{asset.content_text}</p>
      ) : asset.content_url ? (
        <img src={asset.content_url} alt={`Generated ${asset.asset_type}`} className="w-full rounded-md max-h-48 object-cover mb-4" />
      ) : (
        <Skeleton className="h-32 w-full rounded-md mb-4" />
      )}

      {/* Action buttons */}
      {asset.status === "pending_review" && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50" onClick={() => updateStatus("approved")} disabled={updating}>
            <Check className="w-3.5 h-3.5 mr-1" /> Approve
          </Button>
          <Button size="sm" variant="outline" className="flex-1 text-red-700 border-red-200 hover:bg-red-50" onClick={() => updateStatus("rejected")} disabled={updating}>
            <X className="w-3.5 h-3.5 mr-1" /> Reject
          </Button>
        </div>
      )}

      {asset.status === "rejected" && (
        <Button size="sm" variant="outline" className="w-full" onClick={handleRegenerate} disabled={updating}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Regenerate
        </Button>
      )}
    </div>
  );
};

export default AssetCard;
