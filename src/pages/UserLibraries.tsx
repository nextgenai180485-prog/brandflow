import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Film, Users, Image, Megaphone, Eye, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TABS = [
  { value: "video_templates", label: "Video Templates", icon: Film, table: "video_templates" as const, nameField: "template_name" },
  { value: "character_library", label: "Characters", icon: Users, table: "character_library" as const, nameField: "name" },
  { value: "ad_reference_library", label: "Ad References", icon: Megaphone, table: "ad_reference_library" as const, nameField: "title" },
  { value: "image_templates", label: "Image Templates", icon: Image, table: "image_templates" as const, nameField: "style_name" },
  { value: "hooks", label: "Hooks", icon: Zap, table: "hooks" as const, nameField: "hook_text" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

const UserLibraries = () => {
  const [activeTab, setActiveTab] = useState<TabValue>("video_templates");
  const [search, setSearch] = useState("");
  const [previewItem, setPreviewItem] = useState<any>(null);

  const currentTab = TABS.find((t) => t.value === activeTab)!;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-lg font-bold text-foreground">Content Library</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Browse curated templates, characters, and references to inspire your campaigns.
          </p>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, tag, or mood..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
          <TabsList className="mb-5 w-full grid grid-cols-4 h-auto p-1">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="gap-1.5 text-[10px] sm:text-xs px-2 py-2 flex flex-col sm:flex-row items-center"
              >
                <tab.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              <LibraryGallery
                table={tab.table}
                nameField={tab.nameField}
                icon={tab.icon}
                search={search}
                onPreview={setPreviewItem}
              />
            </TabsContent>
          ))}
        </Tabs>

        {/* Preview Dialog */}
        <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-sm">
                {previewItem?.[currentTab.nameField] || "Details"}
              </DialogTitle>
            </DialogHeader>
            {previewItem && <ItemDetail item={previewItem} tab={currentTab} />}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
};

interface LibraryGalleryProps {
  table: string;
  nameField: string;
  icon: any;
  search: string;
  onPreview: (item: any) => void;
}

const LibraryGallery = ({ table, nameField, icon: Icon, search, onPreview }: LibraryGalleryProps) => {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["user-library", table],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table as any)
        .select("*")
        .eq("is_active", true)
        .order("usage_count", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = items.filter((item: any) => {
    if (!search) return true;
    const name = (item[nameField] || "").toLowerCase();
    const tags = [...(item.tags || []), ...(item.mood_tags || []), ...(item.industry_tags || [])].join(" ").toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || tags.includes(q);
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16">
        <Icon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No items found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {filtered.map((item: any) => {
        const name = item[nameField] || "Untitled";
        const thumb = item.avatar_url || item.thumbnail_url || item.media_url;
        const tags = [
          ...(item.tags || []),
          ...(item.mood_tags || []),
          ...(item.industry_tags || []),
        ].slice(0, 3);

        return (
          <Card
            key={item.id}
            className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30 overflow-hidden"
            onClick={() => onPreview(item)}
          >
            {/* Thumbnail area */}
            <div className="relative aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
              {thumb ? (
                <img src={thumb} alt={name} className="w-full h-full object-cover" />
              ) : (
                <Icon className="h-8 w-8 text-muted-foreground/30" />
              )}
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors flex items-center justify-center">
                <Eye className="h-5 w-5 text-foreground/0 group-hover:text-foreground/60 transition-colors" />
              </div>
            </div>

            <CardContent className="p-2.5">
              <p className="text-xs font-medium text-foreground truncate">{name}</p>
              {item.mood && <p className="text-[10px] text-muted-foreground mt-0.5">{item.mood}</p>}
              {item.family && <Badge variant="outline" className="text-[8px] mt-1 mr-1">{item.family}</Badge>}
              {item.vertical && <Badge variant="outline" className="text-[8px] mt-1">{item.vertical}</Badge>}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-0.5 mt-1.5">
                  {tags.map((tag: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[7px] px-1 py-0">{tag}</Badge>
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

const ItemDetail = ({ item, tab }: { item: any; tab: (typeof TABS)[number] }) => {
  const thumb = item.avatar_url || item.thumbnail_url || item.media_url;
  const allTags = [
    ...(item.tags || []),
    ...(item.mood_tags || []),
    ...(item.industry_tags || []),
    ...(item.platform_tags || []),
    ...(item.ethnicity_tags || []),
  ];

  return (
    <div className="space-y-4">
      {thumb && (
        <div className="rounded-lg overflow-hidden bg-muted aspect-video">
          <img src={thumb} alt={item[tab.nameField]} className="w-full h-full object-cover" />
        </div>
      )}

      {item.description && (
        <p className="text-xs text-muted-foreground">{item.description}</p>
      )}

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {item.family && (
          <div>
            <span className="text-muted-foreground">Family:</span>{" "}
            <span className="font-medium text-foreground">{item.family}</span>
          </div>
        )}
        {item.mood && (
          <div>
            <span className="text-muted-foreground">Mood:</span>{" "}
            <span className="font-medium text-foreground">{item.mood}</span>
          </div>
        )}
        {item.vertical && (
          <div>
            <span className="text-muted-foreground">Vertical:</span>{" "}
            <span className="font-medium text-foreground">{item.vertical}</span>
          </div>
        )}
        {item.aspect_ratio && (
          <div>
            <span className="text-muted-foreground">Aspect:</span>{" "}
            <span className="font-medium text-foreground">{item.aspect_ratio}</span>
          </div>
        )}
        {item.duration_s && (
          <div>
            <span className="text-muted-foreground">Duration:</span>{" "}
            <span className="font-medium text-foreground">{item.duration_s}s</span>
          </div>
        )}
        {item.gender && (
          <div>
            <span className="text-muted-foreground">Gender:</span>{" "}
            <span className="font-medium text-foreground">{item.gender}</span>
          </div>
        )}
        {item.age_range && (
          <div>
            <span className="text-muted-foreground">Age:</span>{" "}
            <span className="font-medium text-foreground">{item.age_range}</span>
          </div>
        )}
        {item.quality_tier && (
          <div>
            <span className="text-muted-foreground">Quality:</span>{" "}
            <span className="font-medium text-foreground">{item.quality_tier}</span>
          </div>
        )}
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {allTags.map((tag: string, i: number) => (
            <Badge key={i} variant="secondary" className="text-[9px]">{tag}</Badge>
          ))}
        </div>
      )}

      <div className="text-[10px] text-muted-foreground pt-2 border-t border-border">
        Used {item.usage_count || 0} times
      </div>
    </div>
  );
};

export default UserLibraries;
