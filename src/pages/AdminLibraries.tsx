import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Film, Users, Image, Megaphone, Zap } from "lucide-react";
import AdminLibraryTable from "@/components/admin/AdminLibraryTable";

const TABS = [
  { value: "video_templates", label: "Video", fullLabel: "Video Templates", icon: Film, table: "video_templates" as const },
  { value: "character_library", label: "Characters", fullLabel: "Characters", icon: Users, table: "character_library" as const },
  { value: "ad_reference_library", label: "Ads", fullLabel: "Ad References", icon: Megaphone, table: "ad_reference_library" as const },
  { value: "image_templates", label: "Images", fullLabel: "Image Templates", icon: Image, table: "image_templates" as const },
  { value: "hooks", label: "Hooks", fullLabel: "Hooks", icon: Zap, table: "hooks" as const },
];

const AdminLibraries = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("video_templates");

  return (
    <AppShell>
      <div className="px-4 sm:px-6 pt-4 pb-8">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-lg sm:text-xl font-bold text-foreground">Content Libraries</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage curated templates, characters, and references that power the creative engine.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 w-full grid grid-cols-5 h-auto p-1">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="gap-1 text-[10px] sm:text-xs px-1.5 sm:px-3 py-2 flex flex-col sm:flex-row items-center"
              >
                <tab.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{tab.fullLabel}</span>
                <span className="sm:hidden">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              <AdminLibraryTable tableName={tab.table} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppShell>
  );
};

export default AdminLibraries;