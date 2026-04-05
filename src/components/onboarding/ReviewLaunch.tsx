import { Check, Pencil } from "lucide-react";
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
  bold_edgy: "Bold & Edgy",
  luxurious_refined: "Luxurious & Refined",
  friendly_casual: "Friendly & Casual",
  clinical_trustworthy: "Clinical & Trustworthy",
  playful_fun: "Playful & Fun",
};

const industryLabels: Record<string, string> = {
  medspa: "Medical Spa",
  dental: "Dental",
  wellness: "Wellness",
  fitness: "Fitness",
  beauty: "Beauty",
  other: "Other",
};

const ReviewLaunch = ({ data, onEdit }: Props) => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-1">Review your brand profile</h2>
        <p className="text-muted-foreground text-sm">Everything looks good? Let's launch.</p>
      </div>

      {/* Business */}
      <Section title="Business" onEdit={() => onEdit(0)}>
        <Field label="Name" value={data.business_name || "—"} />
        <Field label="Website" value={data.website_url || "Not provided"} />
        <Field label="Industry" value={industryLabels[data.industry] || data.industry} />
        <Field label="Audience" value={data.target_audience || "Not provided"} />
      </Section>

      {/* Brand Identity */}
      <Section title="Brand Identity" onEdit={() => onEdit(1)}>
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
      <Section title="Brand Voice" onEdit={() => onEdit(2)}>
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
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{title}</h3>
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
