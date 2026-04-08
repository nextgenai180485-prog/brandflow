import { useState } from "react";
import { Sparkles, Loader2, ChevronDown, ChevronUp, RefreshCw, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// ── Types ──

export interface CreativeBrief {
  objective: string;
  messageAngle: string;
  tone: string[];
  ctaGoal: string;
  targetEmotion: string[];
  freeformNotes: string;
}

export interface CampaignCopy {
  headline: string;
  subheadline: string;
  ctaText: string;
  bodyCopy: string;
}

const OBJECTIVES = [
  { value: "awareness", label: "Awareness — Get seen" },
  { value: "consideration", label: "Consideration — Build interest" },
  { value: "conversion", label: "Conversion — Drive action" },
  { value: "engagement", label: "Engagement — Spark interaction" },
];

const CTA_GOALS = [
  { value: "shop_now", label: "Shop Now" },
  { value: "learn_more", label: "Learn More" },
  { value: "sign_up", label: "Sign Up" },
  { value: "book_demo", label: "Book a Demo" },
  { value: "download", label: "Download" },
  { value: "custom", label: "Custom" },
];

const TONES = ["Professional", "Playful", "Urgent", "Luxurious", "Edgy", "Warm", "Bold", "Minimal", "Educational"];
const EMOTIONS = ["Trust", "Excitement", "FOMO", "Curiosity", "Aspiration", "Relief", "Joy", "Authority"];

interface CreativeBriefBuilderProps {
  brief: CreativeBrief;
  onBriefChange: (brief: CreativeBrief) => void;
  copy: CampaignCopy;
  onCopyChange: (copy: CampaignCopy) => void;
  brandContext?: { businessName?: string; industry?: string; voiceTone?: string; targetAudience?: string };
}

const CreativeBriefBuilder = ({ brief, onBriefChange, copy, onCopyChange, brandContext }: CreativeBriefBuilderProps) => {
  const [freeformOpen, setFreeformOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copyGenerated, setCopyGenerated] = useState(false);

  const updateBrief = (patch: Partial<CreativeBrief>) => {
    onBriefChange({ ...brief, ...patch });
  };

  const toggleChip = (field: "tone" | "targetEmotion", value: string) => {
    const current = brief[field];
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    updateBrief({ [field]: next });
  };

  const generateCopy = async () => {
    if (!brief.objective && !brief.messageAngle) {
      toast.error("Add at least an objective or message angle first");
      return;
    }

    setGenerating(true);
    try {
      const prompt = buildCopyPrompt(brief, brandContext);
      const { data, error } = await supabase.functions.invoke("cmo-chat", {
        body: {
          messages: [
            { role: "user", content: prompt },
          ],
          stream: false,
        },
      });

      if (error) {
        // Extract the error message from the edge function response body
        let errMsg = "Failed to generate copy. Try again.";
        try {
          const ctx = (error as any)?.context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            errMsg = body?.error || errMsg;
          } else if (error.message) {
            errMsg = error.message;
          }
        } catch {}
        toast.error(errMsg);
        return;
      }

      const response = data?.reply || "";
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const parsed = parseCopyResponse(response);
      onCopyChange(parsed);
      setCopyGenerated(true);
      toast.success("Copy generated — edit as needed");
    } catch (e: any) {
      console.error("Copy generation failed:", e);
      toast.error(e?.message || "Failed to generate copy. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Objective */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-foreground">Objective</Label>
        <Select value={brief.objective} onValueChange={(v) => updateBrief({ objective: v })}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="What's the goal?" />
          </SelectTrigger>
          <SelectContent>
            {OBJECTIVES.map(o => (
              <SelectItem key={o.value} value={o.value} className="text-sm">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Message Angle */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-foreground">Core Message</Label>
        <Input
          placeholder="e.g. Our serum reduces wrinkles in 14 days"
          value={brief.messageAngle}
          onChange={(e) => updateBrief({ messageAngle: e.target.value })}
          className="h-9 text-sm"
        />
      </div>

      {/* Tone chips */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-foreground">Tone</Label>
        <div className="flex flex-wrap gap-1.5">
          {TONES.map(tone => (
            <button
              key={tone}
              onClick={() => toggleChip("tone", tone)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all",
                brief.tone.includes(tone)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-foreground/20"
              )}
            >
              {tone}
            </button>
          ))}
        </div>
      </div>

      {/* CTA Goal */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-foreground">CTA Goal</Label>
        <Select value={brief.ctaGoal} onValueChange={(v) => updateBrief({ ctaGoal: v })}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="What should viewers do?" />
          </SelectTrigger>
          <SelectContent>
            {CTA_GOALS.map(c => (
              <SelectItem key={c.value} value={c.value} className="text-sm">{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Target Emotion chips */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-foreground">Target Emotion</Label>
        <div className="flex flex-wrap gap-1.5">
          {EMOTIONS.map(emotion => (
            <button
              key={emotion}
              onClick={() => toggleChip("targetEmotion", emotion)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all",
                brief.targetEmotion.includes(emotion)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-foreground/20"
              )}
            >
              {emotion}
            </button>
          ))}
        </div>
      </div>

      {/* Freeform override */}
      <Collapsible open={freeformOpen} onOpenChange={setFreeformOpen}>
        <CollapsibleTrigger className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
          {freeformOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Additional instructions
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <Textarea
            placeholder="Any specific requirements, references, or creative direction the AI should follow…"
            value={brief.freeformNotes}
            onChange={(e) => updateBrief({ freeformNotes: e.target.value })}
            rows={3}
            className="resize-none text-sm"
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* AI Copy Generator */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil className="w-3.5 h-3.5 text-primary" />
            <Label className="text-xs font-semibold text-foreground">Campaign Copy</Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={generateCopy}
            disabled={generating}
            className="h-7 text-[11px] gap-1.5"
          >
            {generating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : copyGenerated ? (
              <RefreshCw className="w-3 h-3" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            {generating ? "Generating…" : copyGenerated ? "Regenerate" : "AI Generate"}
          </Button>
        </div>

        {!copyGenerated && !generating && (
          <p className="text-[10px] text-muted-foreground">
            Fill the brief above, then click "AI Generate" to create headline, subheadline, CTA, and body copy.
          </p>
        )}

        {(copyGenerated || copy.headline) && (
          <div className="space-y-3 rounded-xl border border-border bg-card p-3">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Headline</Label>
              <Input
                value={copy.headline}
                onChange={(e) => onCopyChange({ ...copy, headline: e.target.value })}
                className="h-9 text-sm font-semibold"
                placeholder="Main headline…"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Subheadline</Label>
              <Input
                value={copy.subheadline}
                onChange={(e) => onCopyChange({ ...copy, subheadline: e.target.value })}
                className="h-9 text-sm"
                placeholder="Supporting line…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">CTA Button</Label>
                <Input
                  value={copy.ctaText}
                  onChange={(e) => onCopyChange({ ...copy, ctaText: e.target.value })}
                  className="h-9 text-sm"
                  placeholder="Shop Now"
                />
              </div>
              <div className="space-y-1 col-span-1">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Body / Caption</Label>
                <Textarea
                  value={copy.bodyCopy}
                  onChange={(e) => onCopyChange({ ...copy, bodyCopy: e.target.value })}
                  className="resize-none text-sm min-h-[60px]"
                  placeholder="Optional body copy or caption…"
                  rows={2}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Helpers ──

function buildCopyPrompt(brief: CreativeBrief, brand?: CreativeBriefBuilderProps["brandContext"]): string {
  const parts: string[] = [
    "IMPORTANT: You are generating campaign copy based ONLY on the creative brief below.",
    "Do NOT default to generic brand messaging. The user has provided specific campaign inputs — use THOSE as the primary creative direction.",
    "If the user specified a core message, build the copy around THAT message, not the brand's general value proposition.",
    "",
    "Return EXACTLY this format (no markdown, no extra text):",
    "HEADLINE: [compelling headline based on the brief below]",
    "SUBHEADLINE: [supporting line]",
    "CTA: [call-to-action button text]",
    "BODY: [1-2 sentence body copy or social caption]",
    "",
    "=== CAMPAIGN CREATIVE BRIEF (USE THIS) ===",
  ];

  if (brief.objective) parts.push(`- Objective: ${brief.objective}`);
  if (brief.messageAngle) parts.push(`- Core message: ${brief.messageAngle}`);
  if (brief.tone.length) parts.push(`- Tone: ${brief.tone.join(", ")}`);
  if (brief.ctaGoal) parts.push(`- CTA goal: ${brief.ctaGoal}`);
  if (brief.targetEmotion.length) parts.push(`- Target emotion: ${brief.targetEmotion.join(", ")}`);
  if (brief.freeformNotes) parts.push(`- Additional notes: ${brief.freeformNotes}`);

  if (brand) {
    parts.push("", "=== BRAND CONTEXT (secondary, for voice consistency only) ===");
    if (brand.businessName) parts.push(`- Brand: ${brand.businessName}`);
    if (brand.industry) parts.push(`- Industry: ${brand.industry}`);
    if (brand.voiceTone) parts.push(`- Voice: ${brand.voiceTone}`);
    if (brand.targetAudience) parts.push(`- Audience: ${brand.targetAudience}`);
  }

  parts.push("", "Be concise, punchy, and campaign-specific. No explanations, just the copy lines.");
  return parts.join("\n");
}

function parseCopyResponse(text: string): CampaignCopy {
  const result: CampaignCopy = { headline: "", subheadline: "", ctaText: "", bodyCopy: "" };

  const headlineMatch = text.match(/HEADLINE:\s*(.+)/i);
  const subMatch = text.match(/SUBHEADLINE:\s*(.+)/i);
  const ctaMatch = text.match(/CTA:\s*(.+)/i);
  const bodyMatch = text.match(/BODY:\s*(.+)/i);

  if (headlineMatch) result.headline = headlineMatch[1].trim();
  if (subMatch) result.subheadline = subMatch[1].trim();
  if (ctaMatch) result.ctaText = ctaMatch[1].trim();
  if (bodyMatch) result.bodyCopy = bodyMatch[1].trim();

  // Fallback: if parsing failed, use first line as headline
  if (!result.headline && text.trim()) {
    const lines = text.trim().split("\n").filter(l => l.trim());
    result.headline = lines[0]?.replace(/^[-*#]+\s*/, "").trim() || "";
    if (lines[1]) result.subheadline = lines[1].replace(/^[-*#]+\s*/, "").trim();
  }

  return result;
}

export default CreativeBriefBuilder;
