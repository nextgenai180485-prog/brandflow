import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Search, Film, Users, Image, Megaphone, Check, Library,
  Eye, Sparkles, X,
} from "lucide-react";

export interface LibrarySelection {
  type: "video_template" | "character" | "ad_reference" | "image_template";
  id: string;
  name: string;
  data: any;
}

interface LibraryBrowserProps {
  selections: LibrarySelection[];
  onSelectionsChange: (selections: LibrarySelection[]) => void;
  allowedTypes?: ("video_template" | "character" | "ad_reference" | "image_template")[];
}

const TYPE_CONFIG = {
  video_template: { label: "Video Templates", icon: Film, table: "video_templates", nameField: "template_name" },
  character: { label: "Characters", icon: Users, table: "character_library", nameField: "name" },
  ad_reference: { label: "Ad References", icon: Megaphone, table: "ad_reference_library", nameField: "title" },
  image_template: { label: "Image Templates", icon: Image, table: "image_templates", nameField: "style_name" },
} as const;

const LibraryBrowser = ({
  selections,
  onSelectionsChange,
  allowedTypes = ["video_template", "character", "ad_reference", "image_template"],
}: LibraryBrowserProps) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(allowedTypes[0]);
  const [search, setSearch] = useState("");

  const tabs = allowedTypes.map((t) => TYPE_CONFIG[t]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
          <Library className="h-3 w-3" /> Library References
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              <Sparkles className="h-3 w-3" /> Browse Library
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[70vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-sm">Content Library</DialogTitle>
            </DialogHeader>
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search templates, characters, references..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 min-h-0 flex flex-col">
              <TabsList className="mb-3">
                {allowedTypes.map((type) => {
                  const cfg = TYPE_CONFIG[type];
                  const count = selections.filter((s) => s.type === type).length;
                  return (
                    <TabsTrigger key={type} value={type} className="gap-1 text-xs">
                      <cfg.icon className="h-3 w-3" />
                      {cfg.label}
                      {count > 0 && <Badge variant="default" className="text-[9px] h-4 px-1 ml-1">{count}</Badge>}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              {allowedTypes.map((type) => (
                <TabsContent key={type} value={type} className="flex-1 overflow-y-auto">
                  <LibraryGrid
                    type={type}
                    search={search}
                    selections={selections}
                    onToggle={(item) => {
                      const cfg = TYPE_CONFIG[type];
                      const exists = selections.find((s) => s.id === item.id);
                      if (exists) {
                        onSelectionsChange(selections.filter((s) => s.id !== item.id));
                      } else {
                        onSelectionsChange([...selections, {
                          type,
                          id: item.id,
                          name: item[cfg.nameField],
                          data: item,
                        }]);
                      }
                    }}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Selected items */}
      {selections.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selections.map((sel) => {
            const cfg = TYPE_CONFIG[sel.type];
            return (
              <Badge key={sel.id} variant="secondary" className="gap-1 text-[10px] pr-1">
                <cfg.icon className="h-3 w-3" />
                {sel.name}
                <button
                  onClick={() => onSelectionsChange(selections.filter((s) => s.id !== sel.id))}
                  className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface LibraryGridProps {
  type: keyof typeof TYPE_CONFIG;
  search: string;
  selections: LibrarySelection[];
  onToggle: (item: any) => void;
}

const LibraryGrid = ({ type, search, selections, onToggle }: LibraryGridProps) => {
  const cfg = TYPE_CONFIG[type];

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["library", type],
    queryFn: async () => {
      const { data, error } = await supabase.from(cfg.table as any).select("*").eq("is_active", true).order("usage_count", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = items.filter((item: any) => {
    if (!search) return true;
    const name = (item[cfg.nameField] || "").toLowerCase();
    return name.includes(search.toLowerCase());
  });

  if (isLoading) return <div className="text-xs text-muted-foreground text-center py-8">Loading...</div>;
  if (filtered.length === 0) return <div className="text-xs text-muted-foreground text-center py-8">No items found</div>;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {filtered.map((item: any) => {
        const isSelected = selections.some((s) => s.id === item.id);
        const name = item[cfg.nameField] || "Untitled";
        const tags = [
          ...(item.tags || []),
          ...(item.mood_tags || []),
          ...(item.industry_tags || []),
        ].slice(0, 3);

        return (
          <Card
            key={item.id}
            className={`cursor-pointer transition-all hover:shadow-sm ${isSelected ? "ring-2 ring-primary border-primary" : "border-border"}`}
            onClick={() => onToggle(item)}
          >
            <CardContent className="p-3">
              {/* Thumbnail or icon */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  {item.avatar_url || item.thumbnail_url || item.media_url ? (
                    <img
                      src={item.avatar_url || item.thumbnail_url || item.media_url}
                      alt={name}
                      className="w-8 h-8 rounded object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                      <cfg.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </div>
              <p className="text-xs font-medium text-foreground truncate">{name}</p>
              {item.mood && <p className="text-[10px] text-muted-foreground">{item.mood}</p>}
              {item.family && <Badge variant="outline" className="text-[9px] mt-1">{item.family}</Badge>}
              {item.vertical && <Badge variant="outline" className="text-[9px] mt-1">{item.vertical}</Badge>}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-0.5 mt-1.5">
                  {tags.map((tag: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[8px]">{tag}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default LibraryBrowser;
