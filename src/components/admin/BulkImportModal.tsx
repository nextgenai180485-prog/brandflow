import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, FileUp, Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface BulkImportModalProps {
  tableName: string;
  onImported: () => void;
}

const REQUIRED_COLUMNS: Record<string, string[]> = {
  video_templates: ["template_name", "family"],
  character_library: ["name"],
  ad_reference_library: ["title"],
  image_templates: ["style_name"],
  hooks: ["hook_text"],
};

const BulkImportModal = ({ tableName, onImported }: BulkImportModalProps) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): Record<string, any>[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const obj: Record<string, any> = {};
      headers.forEach((h, i) => {
        const val = values[i] || "";
        // Auto-detect arrays (pipe-separated)
        if (val.includes("|")) {
          obj[h] = val.split("|").map((s) => s.trim());
        } else if (val === "true" || val === "false") {
          obj[h] = val === "true";
        } else if (!isNaN(Number(val)) && val !== "") {
          obj[h] = Number(val);
        } else {
          obj[h] = val || null;
        }
      });
      return obj;
    });
  };

  const handleFile = useCallback((file: File) => {
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        if (file.name.endsWith(".json")) {
          const parsed = JSON.parse(text);
          setRows(Array.isArray(parsed) ? parsed : [parsed]);
        } else {
          setRows(parseCSV(text));
        }
      } catch {
        toast.error("Failed to parse file");
        setRows([]);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleImport = async () => {
    setImporting(true);
    let success = 0;
    let failed = 0;

    // Batch in chunks of 10
    for (let i = 0; i < rows.length; i += 10) {
      const batch = rows.slice(i, i + 10);
      const promises = batch.map((row) =>
        supabase.functions.invoke("admin-library", {
          body: { action: "create", table: tableName, data: row },
        })
      );
      const results = await Promise.allSettled(promises);
      results.forEach((r) => {
        if (r.status === "fulfilled" && !r.value.error) success++;
        else failed++;
      });
    }

    setResult({ success, failed });
    setImporting(false);
    if (success > 0) {
      toast.success(`Imported ${success} items`);
      onImported();
    }
  };

  const reset = () => {
    setRows([]);
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1 text-xs">
          <FileUp className="h-3 w-3" /> Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm">Bulk Import — {tableName.replace(/_/g, " ")}</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-3 py-4 text-center">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
            <p className="text-sm font-medium text-foreground">Import Complete</p>
            <div className="flex justify-center gap-4 text-xs">
              <span className="text-green-600">{result.success} succeeded</span>
              {result.failed > 0 && <span className="text-destructive">{result.failed} failed</span>}
            </div>
            <Button size="sm" variant="outline" onClick={() => { reset(); setOpen(false); }} className="text-xs">
              Done
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/40 transition-colors"
          >
            <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Drop a CSV or JSON file</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              CSV: comma-separated, first row as headers. Arrays use pipe (|) separator.
            </p>
            <p className="text-[10px] text-muted-foreground">
              JSON: array of objects matching the table schema.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-[9px] mr-1">{rows.length}</Badge>
                rows parsed
              </p>
              <Button size="sm" variant="ghost" onClick={reset} className="text-xs h-7">
                Clear
              </Button>
            </div>

            {/* Preview table */}
            <div className="max-h-48 overflow-auto border border-border rounded-md">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-muted/50">
                    {Object.keys(rows[0]).slice(0, 5).map((k) => (
                      <th key={k} className="px-2 py-1.5 text-left font-medium text-muted-foreground">{k}</th>
                    ))}
                    {Object.keys(rows[0]).length > 5 && (
                      <th className="px-2 py-1.5 text-muted-foreground">+{Object.keys(rows[0]).length - 5}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      {Object.values(row).slice(0, 5).map((v: any, j) => (
                        <td key={j} className="px-2 py-1 text-foreground max-w-[120px] truncate">
                          {Array.isArray(v) ? v.join(", ") : String(v ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 5 && (
                <p className="text-[9px] text-muted-foreground text-center py-1">
                  ...and {rows.length - 5} more rows
                </p>
              )}
            </div>

            <Button
              size="sm"
              onClick={handleImport}
              disabled={importing}
              className="w-full text-xs gap-1"
            >
              {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              {importing ? `Importing...` : `Import ${rows.length} items`}
            </Button>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".csv,.json"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          className="hidden"
        />
      </DialogContent>
    </Dialog>
  );
};

export default BulkImportModal;
