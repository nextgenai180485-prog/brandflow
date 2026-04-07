import { Check, X, Download, Calendar, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BatchActionBarProps {
  selectedCount: number;
  onApprove: () => void;
  onReject: () => void;
  onDownload: () => void;
  onClear: () => void;
  loading?: boolean;
}

export default function BatchActionBar({ selectedCount, onApprove, onReject, onDownload, onClear, loading }: BatchActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-foreground text-background shadow-2xl border border-foreground/10">
        <span className="text-[12px] font-semibold mr-1">{selectedCount} selected</span>
        <div className="w-px h-5 bg-background/20" />
        <Button size="sm" variant="ghost" className="h-8 text-[11px] gap-1.5 text-background hover:text-background hover:bg-background/10" disabled={loading} onClick={onApprove}>
          <Check className="w-3.5 h-3.5" /> Approve
        </Button>
        <Button size="sm" variant="ghost" className="h-8 text-[11px] gap-1.5 text-background hover:text-background hover:bg-background/10" disabled={loading} onClick={onReject}>
          <X className="w-3.5 h-3.5" /> Reject
        </Button>
        <Button size="sm" variant="ghost" className="h-8 text-[11px] gap-1.5 text-background hover:text-background hover:bg-background/10" onClick={onDownload}>
          <Download className="w-3.5 h-3.5" /> Download
        </Button>
        <div className="w-px h-5 bg-background/20" />
        <button onClick={onClear} className="p-1.5 rounded-lg hover:bg-background/10 transition-colors">
          <XCircle className="w-4 h-4 text-background/60" />
        </button>
      </div>
    </div>
  );
}
