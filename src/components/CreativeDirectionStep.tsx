import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AssetLibraryPicker, { type LibraryAsset } from "@/components/AssetLibraryPicker";
import LibraryBrowser, { type LibrarySelection } from "@/components/LibraryBrowser";
import {
  Video, Film, Mic, Camera, Lightbulb, Eye, Sparkles, Loader2,
  Clapperboard, MapPin, Zap, Target, Clock, Palette, Send,
  ChevronDown, ChevronUp, RotateCcw,
} from "lucide-react";

interface SEALCaMScene {
  subject: string;
  environment: string;
  action: string;
  lighting: string;
  camera: string;
  metatokens: string;
}

export interface DirectorOutput {
  family: "F1_UGC" | "F2_SPOKESPERSON" | "F5_CINEMATIC";
  family_label: string;
  rationale: string;
  scenes: SEALCaMScene[];
  caption_suggestion: string;
  aspect_ratio: string;
  estimated_duration_s: number;
  mood: string;
  hook_strategy: string;
}

interface CreativeDirectionStepProps {
  brief: string;
  onBriefChange: (brief: string) => void;
  referenceAssets: LibraryAsset[];
  onReferenceAssetsChange: (assets: LibraryAsset[]) => void;
  direction: DirectorOutput | null;
  onDirectionChange: (direction: DirectorOutput | null) => void;
  platform: string;
  format: string;
  librarySelections?: LibrarySelection[];
  onLibrarySelectionsChange?: (selections: LibrarySelection[]) => void;
  /** Template selected in Step 2 — used to auto-populate the brief */
  selectedTemplate?: { title: string; sealcam_analysis?: Record<string, any>; mood_tags?: string[] | null; performance_notes?: string | null; description?: string | null } | null;
}

const FAMILY_CONFIG: Record<string, { icon: typeof Video; color: string; bg: string }> = {
  F1_UGC: { icon: Video, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  F2_SPOKESPERSON: { icon: Mic, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  F5_CINEMATIC: { icon: Film, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
};

const SEALCAM_FIELDS: { key: keyof SEALCaMScene; label: string; icon: typeof Camera; letter: string }[] = [
  { key: "subject", label: "Subject", icon: Eye, letter: "S" },
  { key: "environment", label: "Environment", icon: MapPin, letter: "E" },
  { key: "action", label: "Action", icon: Zap, letter: "A" },
  { key: "lighting", label: "Lighting", icon: Lightbulb, letter: "L" },
  { key: "camera", label: "Camera", icon: Camera, letter: "Ca" },
  { key: "metatokens", label: "Metatokens", icon: Sparkles, letter: "M" },
];

const EXAMPLE_BRIEFS = [
  "Show a before-and-after transformation of our skincare product. Authentic feel, shot in natural light at home.",
  "Create a cinematic product hero video. Dramatic lighting, slow motion, luxury feel.",
  "Professional explainer video about our new AI feature. Clear, educational, with on-screen text overlays.",
];

const CreativeDirectionStep = ({
  brief, onBriefChange,
  referenceAssets, onReferenceAssetsChange,
  direction, onDirectionChange,
  platform, format,
  librarySelections = [], onLibrarySelectionsChange,
  selectedTemplate,
}: CreativeDirectionStepProps) => {
  const [loading, setLoading] = useState(false);
  const [expandedScene, setExpandedScene] = useState<number | null>(0);
  const [autoPopulated, setAutoPopulated] = useState(false);

  // Auto-populate brief from selected template's SEALCaM/metadata
  useEffect(() => {
    if (autoPopulated || brief.trim() || !selectedTemplate) return;
    const parts: string[] = [];

    if (selectedTemplate.description) {
      parts.push(selectedTemplate.description);
    }

    if (selectedTemplate.sealcam_analysis && Object.keys(selectedTemplate.sealcam_analysis).length > 0) {
      const sealcam = selectedTemplate.sealcam_analysis;
      const sealParts = Object.entries(sealcam)
        .filter(([_, v]) => v && typeof v === "string")
        .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`);
      if (sealParts.length) parts.push(sealParts.join(". "));
    }

    if (selectedTemplate.mood_tags?.length) {
      parts.push(`Mood: ${selectedTemplate.mood_tags.join(", ")}`);
    }

    if (selectedTemplate.performance_notes) {
      parts.push(selectedTemplate.performance_notes);
    }

    if (parts.length > 0) {
      onBriefChange(parts.join("\n\n"));
      setAutoPopulated(true);
    }
  }, [selectedTemplate, brief, autoPopulated, onBriefChange]);

  const handleStructure = async () => {
    if (brief.trim().length < 10) {
      toast.error("Please write at least 10 characters describing your vision.");
      return;
    }
    setLoading(true);
    onDirectionChange(null);

    try {
      const assetRefs = referenceAssets.map(a => ({
        id: a.id, file_name: a.file_name, file_url: a.file_url, asset_type: a.asset_type,
      }));

      const { data, error } = await supabase.functions.invoke("visual-director", {
        body: { brief: brief.trim(), platform, format, referenceAssets: assetRefs },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.direction) throw new Error("No direction returned");

      onDirectionChange(data.direction);
      toast.success("Creative direction structured!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to process brief");
    } finally {
      setLoading(false);
    }
  };

  const familyConfig = direction ? FAMILY_CONFIG[direction.family] : null;
  const FamilyIcon = familyConfig?.icon || Video;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Clapperboard className="h-4 w-4 text-primary" />
          Creative Direction
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Describe your video vision — the engine will structure it into production-ready scenes.
        </p>
      </div>

      {/* Brief input */}
      {!direction && (
        <div className="space-y-4">
          <Textarea
            placeholder="Describe what you want to create... e.g., 'A cinematic product reveal for our new wireless headphones with dramatic lighting and slow-motion shots'"
            value={brief}
            onChange={(e) => onBriefChange(e.target.value)}
            className="min-h-[120px] resize-none text-sm"
          />

          {/* Example briefs */}
          {!brief && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Try an example</p>
              {EXAMPLE_BRIEFS.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => onBriefChange(ex)}
                  className="w-full text-left p-2.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  "{ex}"
                </button>
              ))}
            </div>
          )}

          {/* Reference assets */}
          <AssetLibraryPicker selectedAssets={referenceAssets} onChange={onReferenceAssetsChange} />

          {/* Library templates/characters/references */}
          {onLibrarySelectionsChange && (
            <LibraryBrowser
              selections={librarySelections}
              onSelectionsChange={onLibrarySelectionsChange}
              allowedTypes={["video_template", "character", "ad_reference"]}
            />
          )}
          <Button
            onClick={handleStructure}
            disabled={loading || brief.trim().length < 10}
            className="w-full gap-2"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Structuring your vision...</>
            ) : (
              <><Send className="h-4 w-4" /> Structure into Scenes</>
            )}
          </Button>
        </div>
      )}

      {/* Loading state */}
      {loading && !direction && (
        <Card className="border-border">
          <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="relative">
              <Clapperboard className="h-8 w-8 text-muted-foreground/30" />
              <Loader2 className="h-4 w-4 text-primary animate-spin absolute -top-1 -right-1" />
            </div>
            <p className="text-xs text-muted-foreground">Analyzing brief • Selecting family • Building scenes</p>
          </CardContent>
        </Card>
      )}

      {/* Structured output */}
      {direction && familyConfig && (
        <div className="space-y-3">
          {/* Family badge */}
          <Card className={`border ${familyConfig.bg}`}>
            <CardContent className="py-3">
              <div className="flex items-start gap-3">
                <div className={`rounded-lg p-2 ${familyConfig.bg}`}>
                  <FamilyIcon className={`h-4 w-4 ${familyConfig.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-foreground">{direction.family_label}</span>
                    <Badge variant="outline" className="text-[10px]">{direction.family}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{direction.rationale}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge variant="secondary" className="text-[10px] gap-1"><Clock className="h-3 w-3" />{direction.estimated_duration_s}s</Badge>
                <Badge variant="secondary" className="text-[10px] gap-1"><Target className="h-3 w-3" />{direction.aspect_ratio}</Badge>
                <Badge variant="secondary" className="text-[10px] gap-1"><Palette className="h-3 w-3" />{direction.mood}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Hook strategy */}
          <Card className="border-border">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-foreground">Hook Strategy</span>
              </div>
              <p className="text-xs text-muted-foreground">{direction.hook_strategy}</p>
            </CardContent>
          </Card>

          {/* SEALCaM scenes */}
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              SEALCaM Scenes ({direction.scenes.length})
            </p>
            {direction.scenes.map((scene, idx) => (
              <Card key={idx} className="border-border overflow-hidden">
                <button
                  onClick={() => setExpandedScene(expandedScene === idx ? null : idx)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded bg-primary text-primary-foreground text-[10px] font-bold">{idx + 1}</span>
                    <span className="text-xs font-medium text-foreground truncate max-w-[220px]">{scene.subject.slice(0, 50)}...</span>
                  </div>
                  {expandedScene === idx ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
                {expandedScene === idx && (
                  <CardContent className="pt-0 pb-3 space-y-2 border-t border-border">
                    {SEALCAM_FIELDS.map(({ key, label, icon: Icon, letter }) => (
                      <div key={key} className="flex gap-2">
                        <div className="flex items-start gap-1 w-20 shrink-0 pt-0.5">
                          <span className="flex items-center justify-center w-4 h-4 rounded bg-muted text-muted-foreground text-[9px] font-bold">{letter}</span>
                          <Icon className="h-3 w-3 text-muted-foreground mt-0.5" />
                          <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
                        </div>
                        <p className="text-xs text-foreground flex-1 leading-relaxed">{scene[key]}</p>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {/* Re-do button */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={() => { onDirectionChange(null); }}
          >
            <RotateCcw className="h-3 w-3" /> Revise Brief
          </Button>
        </div>
      )}
    </div>
  );
};

export default CreativeDirectionStep;
