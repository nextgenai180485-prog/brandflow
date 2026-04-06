import { useState, useCallback } from "react";
import {
  Brain, Loader2, ArrowRight, Target, Users, Swords,
  Lightbulb, Zap, ChevronRight, Rocket, Shield, TrendingUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface StrategyBoard {
  core_identity: {
    archetype: string;
    enemy: string;
    hero_journey: string;
    brand_voice: string;
    visual_direction: string;
  };
  persona_card: {
    name: string;
    age_range: string;
    pain_points: string[];
    desires: string[];
    psychographic: string;
    buying_triggers: string[];
  };
  funnel_stages: {
    tof: { goal: string; strategy_name: string; best_format: string; channel: string; psychological_hook: string };
    mof: { goal: string; strategy_name: string; best_format: string; channel: string; proof_mechanism: string };
    bof: { goal: string; strategy_name: string; offer_type: string; urgency_mechanism: string };
  };
  launch_roadmap: { phase: string; action: string; rationale: string }[];
  cmo_directive: string;
  suggested_colors: { primary: string; secondary: string; accent: string };
}

interface FounderInterviewProps {
  businessName: string;
  industry: string;
  onStrategyGenerated: (strategy: StrategyBoard) => void;
}

const INTERVIEW_QUESTIONS = [
  {
    id: "core_value",
    icon: Target,
    label: "The Core Value",
    cmoPrompt: "In one sentence, what problem do you solve, and for whom?",
    placeholder: "e.g. I help busy moms cook healthy meals faster.",
    hint: "Be specific. Not 'I make people's lives better' — that's generic. WHO and WHAT.",
  },
  {
    id: "enemy",
    icon: Swords,
    label: "The Enemy",
    cmoPrompt: "Every great brand fights an enemy. What is the 'Status Quo' your customers hate?",
    placeholder: "e.g. They hate the guilt of feeding their kids processed nuggets.",
    hint: "The best brands have a villain. Nike fights laziness. Apple fights conformity. What do you fight?",
  },
  {
    id: "secret_weapon",
    icon: Lightbulb,
    label: "The Secret Weapon",
    cmoPrompt: "What is your unfair advantage? A specific ingredient, a new method, or just better taste?",
    placeholder: "e.g. It's a 15-minute meal kit with pre-chopped veggies.",
    hint: "What can YOU do that competitors cannot easily copy? This becomes your positioning anchor.",
  },
];

const FounderInterview = ({ businessName, industry, onStrategyGenerated }: FounderInterviewProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({ core_value: "", enemy: "", secret_weapon: "" });
  const [generating, setGenerating] = useState(false);
  const [strategyBoard, setStrategyBoard] = useState<StrategyBoard | null>(null);

  const currentQ = INTERVIEW_QUESTIONS[currentStep];
  const isLastQuestion = currentStep === INTERVIEW_QUESTIONS.length - 1;
  const currentAnswer = answers[currentQ?.id as keyof typeof answers] || "";

  const handleNext = useCallback(() => {
    if (isLastQuestion) {
      generateStrategy();
    } else {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, answers, isLastQuestion]);

  const generateStrategy = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("cmo-agent", {
        body: {
          mode: "founder_interview",
          coreValue: answers.core_value,
          enemy: answers.enemy,
          secretWeapon: answers.secret_weapon,
          businessName,
          industry,
        },
      });

      if (error || !data?.strategyBoard) {
        console.error("[FounderInterview] Error:", error);
        toast.error("Strategy generation failed. Retrying…");
        setGenerating(false);
        return;
      }

      setStrategyBoard(data.strategyBoard);
      onStrategyGenerated(data.strategyBoard);
      toast.success("Your Brand Strategy Board is ready.");
    } catch (e) {
      console.error("[FounderInterview] Error:", e);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // ── Strategy Board View ──
  if (strategyBoard) {
    const { core_identity, persona_card, funnel_stages, launch_roadmap, cmo_directive, suggested_colors } = strategyBoard;
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* CMO Directive */}
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">CSO Directive</span>
          </div>
          <p className="text-sm font-semibold text-foreground leading-relaxed">{cmo_directive}</p>
        </div>

        {/* Core Identity */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Brand Identity</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">Archetype</p>
              <p className="text-sm font-bold text-foreground">{core_identity.archetype}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">Voice</p>
              <p className="text-sm font-medium text-foreground">{core_identity.brand_voice}</p>
            </div>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">Hero Journey</p>
            <p className="text-xs text-foreground">{core_identity.hero_journey}</p>
          </div>
          <div className="flex gap-2 items-center">
            {Object.entries(suggested_colors).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: val }} />
                <span className="text-[9px] text-muted-foreground capitalize">{key}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Persona Card */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Target Persona</span>
          </div>
          <p className="text-sm font-bold text-foreground">{persona_card.name}</p>
          <p className="text-[10px] text-muted-foreground">{persona_card.age_range} · {persona_card.psychographic}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-1">Pain Points</p>
              {persona_card.pain_points.map((p, i) => (
                <p key={i} className="text-[10px] text-foreground flex items-start gap-1.5">
                  <span className="text-destructive mt-0.5">✗</span> {p}
                </p>
              ))}
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-1">Desires</p>
              {persona_card.desires.map((d, i) => (
                <p key={i} className="text-[10px] text-foreground flex items-start gap-1.5">
                  <span className="text-emerald-500 mt-0.5">✓</span> {d}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Funnel Architecture */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Funnel Architecture</span>
          </div>
          {[
            { key: "tof", label: "Top of Funnel", sublabel: "Awareness", data: funnel_stages.tof, color: "bg-blue-500" },
            { key: "mof", label: "Mid Funnel", sublabel: "Trust", data: funnel_stages.mof, color: "bg-amber-500" },
            { key: "bof", label: "Bottom Funnel", sublabel: "Conversion", data: funnel_stages.bof, color: "bg-emerald-500" },
          ].map(({ key, label, sublabel, data, color }) => (
            <div key={key} className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full ${color} mt-1.5 shrink-0`} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-foreground">{label}</p>
                  <Badge variant="outline" className="text-[8px]">{sublabel}</Badge>
                </div>
                <p className="text-[10px] font-semibold text-primary mt-0.5">"{data.strategy_name}"</p>
                <p className="text-[10px] text-muted-foreground">
                  {data.best_format || data.offer_type} · {data.channel || ""}
                  {(data as any).psychological_hook && ` · ${(data as any).psychological_hook}`}
                  {(data as any).proof_mechanism && ` · ${(data as any).proof_mechanism}`}
                  {(data as any).urgency_mechanism && ` · ${(data as any).urgency_mechanism}`}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Launch Roadmap */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Launch Roadmap</span>
          </div>
          {launch_roadmap.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary">
                {i + 1}
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">{step.phase}</p>
                <p className="text-[10px] text-foreground mt-0.5">{step.action}</p>
                <p className="text-[10px] text-muted-foreground italic">{step.rationale}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Interview View ──
  return (
    <div className="space-y-8">
      <div>
        <Badge variant="outline" className="text-[10px] mb-4 border-primary/30 text-primary">
          Founding Strategy Sprint
        </Badge>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Let's build your brand strategy.
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          3 questions. No fluff. The same process a branding agency charges $20K for.
        </p>
      </div>

      {/* Progress */}
      <div className="flex gap-2">
        {INTERVIEW_QUESTIONS.map((q, i) => (
          <div key={q.id} className="flex-1 flex flex-col items-center gap-1">
            <div className={`h-1.5 w-full rounded-full transition-colors ${
              i <= currentStep ? "bg-primary" : "bg-border"
            }`} />
            <span className={`text-[9px] uppercase tracking-wider ${
              i <= currentStep ? "text-foreground" : "text-muted-foreground"
            }`}>
              {q.label}
            </span>
          </div>
        ))}
      </div>

      {/* Current Question */}
      {!generating && currentQ && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300" key={currentStep}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <currentQ.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Question {currentStep + 1} of 3</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{currentQ.label}</p>
            </div>
          </div>

          {/* CMO Prompt */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-foreground leading-relaxed">
              {currentQ.cmoPrompt}
            </p>
            <p className="text-[10px] text-muted-foreground mt-2 italic">{currentQ.hint}</p>
          </div>

          <Textarea
            value={currentAnswer}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [currentQ.id]: e.target.value }))}
            placeholder={currentQ.placeholder}
            rows={3}
            className="text-base resize-none"
            autoFocus
          />

          <div className="flex items-center justify-between">
            {currentStep > 0 ? (
              <Button variant="ghost" onClick={() => setCurrentStep((s) => s - 1)} className="text-sm">
                Back
              </Button>
            ) : <div />}
            <Button
              onClick={handleNext}
              disabled={currentAnswer.trim().length < 5}
              className="gap-2"
            >
              {isLastQuestion ? (
                <><Zap className="w-4 h-4" /> Generate Strategy Board</>
              ) : (
                <>Next <ChevronRight className="w-4 h-4" /></>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Generating */}
      {generating && (
        <div className="flex flex-col items-center justify-center gap-4 py-12 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Brain className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">CSO is synthesizing your strategy…</p>
            <p className="text-xs text-muted-foreground mt-1">Building Persona Card, Funnel Architecture, and Launch Roadmap</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FounderInterview;
