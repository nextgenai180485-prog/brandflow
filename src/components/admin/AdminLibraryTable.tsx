import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Upload, Search, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import AdminLibraryForm from "./AdminLibraryForm";

type TableName = "video_templates" | "character_library" | "ad_reference_library" | "image_templates";

interface AdminLibraryTableProps {
  tableName: TableName;
}

const TABLE_CONFIGS: Record<TableName, {
  nameField: string;
  columns: { key: string; label: string }[];
  tagFields: string[];
}> = {
  video_templates: {
    nameField: "template_name",
    columns: [
      { key: "template_name", label: "Name" },
      { key: "family", label: "Family" },
      { key: "mood", label: "Mood" },
      { key: "aspect_ratio", label: "Ratio" },
      { key: "duration_s", label: "Duration" },
      { key: "usage_count", label: "Uses" },
    ],
    tagFields: ["tags"],
  },
  character_library: {
    nameField: "name",
    columns: [
      { key: "name", label: "Name" },
      { key: "gender", label: "Gender" },
      { key: "age_range", label: "Age" },
      { key: "voice_style", label: "Voice" },
      { key: "usage_count", label: "Uses" },
    ],
    tagFields: ["mood_tags", "industry_tags", "ethnicity_tags"],
  },
  ad_reference_library: {
    nameField: "title",
    columns: [
      { key: "title", label: "Title" },
      { key: "media_type", label: "Type" },
      { key: "usage_count", label: "Uses" },
    ],
    tagFields: ["industry_tags", "mood_tags", "platform_tags"],
  },
  image_templates: {
    nameField: "style_name",
    columns: [
      { key: "style_name", label: "Style" },
      { key: "vertical", label: "Vertical" },
      { key: "quality_tier", label: "Tier" },
      { key: "usage_count", label: "Uses" },
    ],
    tagFields: ["tags"],
  },
};

const AdminLibraryTable = ({ tableName }: AdminLibraryTableProps) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const config = TABLE_CONFIGS[tableName];

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-library", tableName],
    queryFn: async () => {
      // Use service role via edge function for admin access
      const { data, error } = await supabase.functions.invoke("admin-library", {
        body: { action: "list", table: tableName },
      });
      if (error) throw error;
      return data?.items || [];
    },
  });

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase.functions.invoke("admin-library", {
      body: { action: "toggle", table: tableName, id, is_active: !currentActive },
    });
    if (error) {
      toast.error("Failed to update status");
      return;
    }
    toast.success(currentActive ? "Deactivated" : "Activated");
    refetch();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item? This cannot be undone.")) return;
    const { error } = await supabase.functions.invoke("admin-library", {
      body: { action: "delete", table: tableName, id },
    });
    if (error) {
      toast.error("Failed to delete");
      return;
    }
    toast.success("Deleted");
    refetch();
  };

  const filtered = items.filter((item: any) => {
    if (!search) return true;
    const name = (item[config.nameField] || "").toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="h-8 gap-1 text-xs">
          <RefreshCw className="h-3 w-3" /> Refresh
        </Button>
        <Button size="sm" onClick={() => { setEditingItem(null); setShowForm(true); }} className="h-8 gap-1 text-xs">
          <Plus className="h-3 w-3" /> Add New
        </Button>
      </div>

      {/* Form modal */}
      {showForm && (
        <AdminLibraryForm
          tableName={tableName}
          editingItem={editingItem}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
          onSaved={() => { setShowForm(false); setEditingItem(null); refetch(); }}
        />
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Upload className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-medium text-foreground">No items yet</p>
            <p className="text-xs text-muted-foreground mt-1">Click "Add New" to populate your library.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {config.columns.map((col) => (
                  <th key={col.key} className="text-left px-3 py-2 font-medium text-muted-foreground">{col.label}</th>
                ))}
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Tags</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Active</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item: any) => (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                  {config.columns.map((col) => (
                    <td key={col.key} className="px-3 py-2.5 text-foreground max-w-[160px] truncate">
                      {String(item[col.key] ?? "—")}
                    </td>
                  ))}
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {config.tagFields.flatMap((field) =>
                        (item[field] || []).slice(0, 3).map((tag: string, i: number) => (
                          <Badge key={`${field}-${i}`} variant="secondary" className="text-[9px]">{tag}</Badge>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={() => handleToggleActive(item.id, item.is_active)}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => { setEditingItem(item); setShowForm(true); }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">{filtered.length} items • {items.filter((i: any) => i.is_active).length} active</p>
    </div>
  );
};

export default AdminLibraryTable;
