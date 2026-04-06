import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Video,
  Film,
  Mic,
  Camera,
  Lightbulb,
  Eye,
  Sparkles,
  Loader2,
  ArrowLeft,
  Clapperboard,
  MapPin,
  Zap,
  Target,
  Hash,
  Clock,
  Palette,
  Send,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface SEALCaMScene {
  subject: string;
  environment: string;
  action: string;
  lighting: string;
  camera: string;
  metatokens: string;
}

interface DirectorOutput {
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

const FAMILY_CONFIG: Record<string, { icon: typeof Video; color: string; bg: string; description: string }> = {
  F1_UGC: {
    icon: Video,
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
    description: "Raw, authentic social content",
  },
  F2_SPOKESPERSON: {
    icon: Mic,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    description: "AI avatar talking-head",
  },
  F5_CINEMATIC: {
    icon: Film,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    description: "High-production commercial",
  },
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
  "Show a before-and-after transformation of our skincare product on a real person. Authentic feel, shot in natural light at home.",
  "Create a cinematic product hero video for our premium watch. Dramatic lighting, slow motion, luxury feel.",
  "I need a professional explainer video about our new AI feature. Clear, educational, with on-screen text overlays.",
];

const VisualDirector = () => {
  const navigate = useNavigate();
  const [brief, setBrief] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [format, setFormat] = useState("reel");
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState<DirectorOutput | null>(null);
  const [expandedScene, setExpandedScene] = useState<number | null>(0);

  const handleSubmit = async () => {
    if (brief.trim().length < 10) {
      toast.error("Please write at least 10 characters describing your vision.");
      return;
    }
    setLoading(true);
    setDirection(null);

    try {
      const { data, error } = await supabase.functions.invoke("visual-director", {
        body: { brief: brief.trim(), platform, format },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.direction) throw new Error("No direction returned");

      setDirection(data.direction);
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
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Clapperboard className="h-5 w-5 text-primary" />
              Visual Director
            </h1>
            <p className="text-xs text-muted-foreground">
              Describe your vision — the engine structures it into cinematic scenes
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Brief Input */}
          <div className="space-y-4">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Creative Brief</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Describe what you want to create... e.g., 'A cinematic product reveal for our new wireless headphones with dramatic lighting and slow-motion shots'"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  className="min-h-[140px] resize-none text-sm"
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Platform</label>
                    <Select value={platform} onValueChange={setPlatform}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Format</label>
                    <Select value={format} onValueChange={setFormat}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reel">Reel / Short</SelectItem>
                        <SelectItem value="post">Post</SelectItem>
                        <SelectItem value="story">Story</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={loading || brief.trim().length < 10}
                  className="w-full gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Structuring your vision...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Structure into Scenes
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Example Briefs */}
            {!direction && (
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Try an example</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {EXAMPLE_BRIEFS.map((example, i) => (
                    <button
                      key={i}
                      onClick={() => setBrief(example)}
                      className="w-full text-left p-2.5 rounded-md border border-border text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      "{example}"
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Structured Output */}
          <div className="space-y-4">
            {loading && (
              <Card className="border-border">
                <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="relative">
                    <Clapperboard className="h-10 w-10 text-muted-foreground/30" />
                    <Loader2 className="h-5 w-5 text-primary animate-spin absolute -top-1 -right-1" />
                  </div>
                  <p className="text-xs text-muted-foreground">Visual Director analyzing your brief...</p>
                  <p className="text-[10px] text-muted-foreground/60">Selecting family • Structuring SEALCaM scenes • Building hook</p>
                </CardContent>
              </Card>
            )}

            {!loading && !direction && (
              <Card className="border-border">
                <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <Clapperboard className="h-10 w-10 text-muted-foreground/20" />
                  <p className="text-sm font-medium text-muted-foreground">Your direction will appear here</p>
                  <p className="text-xs text-muted-foreground/60 max-w-xs">
                    Write a creative brief and the Visual Director will structure it into production-ready SEALCaM scenes
                  </p>
                </CardContent>
              </Card>
            )}

            {direction && familyConfig && (
              <>
                {/* Family Selection */}
                <Card className={`border ${familyConfig.bg}`}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <div className={`rounded-lg p-2 ${familyConfig.bg}`}>
                        <FamilyIcon className={`h-5 w-5 ${familyConfig.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-foreground">{direction.family_label}</span>
                          <Badge variant="outline" className="text-[10px]">{direction.family}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{direction.rationale}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <Clock className="h-3 w-3" />
                        {direction.estimated_duration_s}s
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <Target className="h-3 w-3" />
                        {direction.aspect_ratio}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <Palette className="h-3 w-3" />
                        {direction.mood}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Hook Strategy */}
                <Card className="border-border">
                  <CardContent className="py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-xs font-semibold text-foreground">Hook Strategy</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{direction.hook_strategy}</p>
                  </CardContent>
                </Card>

                {/* SEALCaM Scenes */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    SEALCaM Scenes ({direction.scenes.length})
                  </h3>

                  {direction.scenes.map((scene, idx) => (
                    <Card key={idx} className="border-border overflow-hidden">
                      <button
                        onClick={() => setExpandedScene(expandedScene === idx ? null : idx)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-5 h-5 rounded bg-primary text-primary-foreground text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-medium text-foreground truncate max-w-[250px]">
                            {scene.subject.slice(0, 60)}...
                          </span>
                        </div>
                        {expandedScene === idx ? (
                          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>

                      {expandedScene === idx && (
                        <CardContent className="pt-0 pb-4 space-y-2.5 border-t border-border">
                          {SEALCAM_FIELDS.map(({ key, label, icon: Icon, letter }) => (
                            <div key={key} className="flex gap-2.5">
                              <div className="flex items-start gap-1.5 w-24 shrink-0 pt-0.5">
                                <span className="flex items-center justify-center w-4 h-4 rounded bg-muted text-muted-foreground text-[9px] font-bold">
                                  {letter}
                                </span>
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

                {/* Caption */}
                <Card className="border-border">
                  <CardContent className="py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Hash className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-foreground">Suggested Caption</span>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{direction.caption_suggestion}</p>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button className="flex-1 gap-2" onClick={() => toast.info("Generation pipeline coming soon — this direction is ready for execution")}>
                    <Sparkles className="h-4 w-4" />
                    Accept & Generate
                  </Button>
                  <Button variant="outline" onClick={() => { setDirection(null); setBrief(""); }}>
                    New Brief
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default VisualDirector;
