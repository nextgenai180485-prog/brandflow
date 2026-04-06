import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReviewData {
  business_name: string;
  website_url: string;
  industry: string;
  target_audience: string;
  colors: { primary: string; secondary: string; accent: string };
  tone: string;
  keywords: string[];
  uploadedAssets: { url: string; name: string }[];
}

interface Props {
  data: ReviewData;
  onEdit: (step: number) => void;
}

const toneLabels: Record<string, string> = {
  warm_professional: "Warm & Professional",
  bold_edgy: "Bold & Disruptive",
  luxurious_refined: "Luxurious & Refined",
  friendly_casual: "Friendly & Casual",
  clinical_trustworthy: "Authoritative & Expert",
  playful_fun: "Playful & Energetic",
};

const industryLabels: Record<string, string> = {
  ecommerce: "E-Commerce / DTC",
  saas: "SaaS / Tech",
  fashion: "Fashion / Luxury",
  beauty: "Beauty / Skincare",
  medspa: "Medical Spa / Aesthetics",
  health: "Health / Wellness",
  fitness: "Fitness / Sports",
  food: "Food / Beverage",
  real_estate: "Real Estate",
  finance: "Finance / Fintech",
  education: "Education / Coaching",
  agency: "Agency / Consulting",
  creator: "Creator / Personal Brand",
  nonprofit: "Non-Profit",
  dental: "Dental",
  wellness: "Wellness",
  other: "Other",
};

const ReviewLaunch = ({ data, onEdit }: Props) => {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Final Review
        </p>
        <h2 className="text-2xl font-bold text-foreground tracking-tight mb-1">
          Your brand profile is ready
        </h2>
        <p className="text-sm text-muted-foreground">
          Your CSO will use this to generate research-backed strategies and on-brand content.
        </p>
      </div>

      {/* Business */}
      <Section title="Brand Intake" onEdit={() => onEdit(0)}>
        <Field label="Brand" value={data.business_name || "—"} />
        <Field label="Website" value={data.website_url || "None — Genesis Mode"} />
        <Field label="Industry" value={industryLabels[data.industry] || data.industry} />
        <Field label="Audience" value={data.target_audience || "CSO will define"} />
      </Section>

      {/* Brand Identity */}
      <Section title="Visual System" onEdit={() => onEdit(1)}>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Colors:</span>
          {(["primary", "secondary", "accent"] as const).map((k) => (
            <div key={k} className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: data.colors[k] }} />
              <span className="text-xs font-mono text-muted-foreground">{data.colors[k]}</span>
            </div>
          ))}
        </div>
        {data.uploadedAssets.length > 0 && (
          <div className="flex gap-2 mt-3">
            {data.uploadedAssets.map((a, i) => (
              <img key={i} src={a.url} alt={a.name} className="w-16 h-16 rounded-lg object-cover border border-border" />
            ))}
          </div>
        )}
      </Section>

      {/* Brand Voice */}
      <Section title="Voice Calibration" onEdit={() => onEdit(2)}>
        <Field label="Tone" value={toneLabels[data.tone] || data.tone || "Not selected"} />
        {data.keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {data.keywords.map((kw, i) => (
              <span key={i} className="px-2.5 py-0.5 rounded-full bg-secondary text-foreground text-xs">{kw}</span>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
};

const Section = ({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-card p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{title}</h3>
      <Button variant="ghost" size="sm" onClick={onEdit} className="gap-1.5 text-xs">
        <Pencil className="w-3 h-3" /> Edit
      </Button>
    </div>
    <div className="space-y-2">{children}</div>
  </div>
);

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="flex gap-3">
    <span className="text-sm text-muted-foreground w-20 shrink-0">{label}</span>
    <span className="text-sm text-foreground">{value}</span>
  </div>
);

export default ReviewLaunch;
