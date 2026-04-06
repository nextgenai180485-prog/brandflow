import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  tone: string;
  keywords: string[];
  sampleText: string;
  onToneChange: (tone: string) => void;
  onKeywordsChange: (keywords: string[]) => void;
  onSampleTextChange: (text: string) => void;
}

const toneOptions = [
  { value: "warm_professional", label: "Warm & Professional", emoji: "🤝", desc: "Approachable yet polished" },
  { value: "bold_edgy", label: "Bold & Disruptive", emoji: "⚡", desc: "Confident and provocative" },
  { value: "luxurious_refined", label: "Luxurious & Refined", emoji: "✨", desc: "Elegant and premium" },
  { value: "friendly_casual", label: "Friendly & Casual", emoji: "😊", desc: "Relatable and human" },
  { value: "clinical_trustworthy", label: "Authoritative & Expert", emoji: "🎯", desc: "Data-driven credibility" },
  { value: "playful_fun", label: "Playful & Energetic", emoji: "🎉", desc: "Vibrant and lighthearted" },
];

const BrandVoice = ({ tone, keywords, sampleText, onToneChange, onKeywordsChange, onSampleTextChange }: Props) => {
  const [keywordInput, setKeywordInput] = useState("");

  const addKeyword = () => {
    const word = keywordInput.trim();
    if (word && keywords.length < 10 && !keywords.includes(word)) {
      onKeywordsChange([...keywords, word]);
      setKeywordInput("");
    }
  };

  const removeKeyword = (idx: number) => {
    onKeywordsChange(keywords.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Voice Calibration
        </p>
        <h2 className="text-2xl font-bold text-foreground tracking-tight mb-1">
          How should your brand sound?
        </h2>
        <p className="text-sm text-muted-foreground">
          This controls the tone of every caption, script, and headline your CSO generates.
        </p>
      </div>

      {/* Tone Selector */}
      <div className="space-y-3">
        <Label>Tone</Label>
        <div className="grid grid-cols-2 gap-3">
          {toneOptions.map((t) => (
            <button
              key={t.value}
              onClick={() => onToneChange(t.value)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                tone === t.value
                  ? "border-foreground bg-secondary"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <div className="text-lg mb-1">{t.emoji}</div>
              <div className="font-medium text-sm text-foreground">{t.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Keywords */}
      <div className="space-y-3">
        <Label>Brand Keywords <span className="text-muted-foreground font-normal text-[10px]">— words your brand owns</span></Label>
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {keywords.map((kw, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary text-foreground text-sm"
              >
                {kw}
                <button onClick={() => removeKeyword(i)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
            placeholder="e.g. innovation, heritage, disruption, luxury"
            disabled={keywords.length >= 10}
          />
        </div>
      </div>

      {/* Sample text */}
      <div className="space-y-2">
        <Label htmlFor="sample_text">
          Example Caption or Bio <span className="text-muted-foreground font-normal text-[10px]">— optional, helps calibrate voice</span>
        </Label>
        <Textarea
          id="sample_text"
          value={sampleText}
          onChange={(e) => onSampleTextChange(e.target.value)}
          placeholder="Paste a caption, tagline, or bio that represents your brand voice…"
          rows={3}
        />
      </div>
    </div>
  );
};

export default BrandVoice;
