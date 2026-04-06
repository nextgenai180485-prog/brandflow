import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Film, Users, Image, Megaphone } from "lucide-react";
import AdminLibraryTable from "@/components/admin/AdminLibraryTable";

const TABS = [
  { value: "video_templates", label: "Video Templates", icon: Film, table: "video_templates" as const },
  { value: "character_library", label: "Characters", icon: Users, table: "character_library" as const },
  { value: "ad_reference_library", label: "Ad References", icon: Megaphone, table: "ad_reference_library" as const },
  { value: "image_templates", label: "Image Templates", icon: Image, table: "image_templates" as const },
];

const AdminLibraries = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("video_templates");

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">Content Libraries</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage curated templates, characters, and references that power the creative engine.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs">
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
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
