import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, Building2 } from "lucide-react";

interface BusinessBasicsData {
  business_name: string;
  website_url: string;
  industry: string;
  target_audience: string;
}

interface Props {
  data: BusinessBasicsData;
  onChange: (data: Partial<BusinessBasicsData>) => void;
}

const industries = [
  { value: "ecommerce", label: "E-Commerce / DTC" },
  { value: "saas", label: "SaaS / Tech" },
  { value: "fashion", label: "Fashion / Luxury" },
  { value: "beauty", label: "Beauty / Skincare" },
  { value: "medspa", label: "Medical Spa / Aesthetics" },
  { value: "health", label: "Health / Wellness" },
  { value: "fitness", label: "Fitness / Sports" },
  { value: "food", label: "Food / Beverage" },
  { value: "real_estate", label: "Real Estate" },
  { value: "finance", label: "Finance / Fintech" },
  { value: "education", label: "Education / Coaching" },
  { value: "agency", label: "Agency / Consulting" },
  { value: "creator", label: "Creator / Personal Brand" },
  { value: "nonprofit", label: "Non-Profit" },
  { value: "other", label: "Other" },
];

const BusinessBasics = ({ data, onChange }: Props) => {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Brand Intake
        </p>
        <h2 className="text-2xl font-bold text-foreground tracking-tight mb-1">
          Who are we building a strategy for?
        </h2>
        <p className="text-sm text-muted-foreground">
          Your CSO uses this to architect a positioning strategy unique to your market.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="business_name" className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5" /> Brand Name
          </Label>
          <Input
            id="business_name"
            value={data.business_name}
            onChange={(e) => onChange({ business_name: e.target.value })}
            placeholder="e.g. Noriluxe, Stripe, Glossier"
            className="text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website_url" className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" /> Website
            <span className="text-muted-foreground font-normal text-[10px]">
              — we'll auto-extract your brand DNA
            </span>
          </Label>
          <Input
            id="website_url"
            type="url"
            value={data.website_url}
            onChange={(e) => onChange({ website_url: e.target.value })}
            placeholder="https://yourbrand.com"
            className="text-base"
          />
          <p className="text-[10px] text-muted-foreground">
            No website? No problem. Your CSO will architect one from scratch.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Industry</Label>
          <Select value={data.industry} onValueChange={(v) => onChange({ industry: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent>
              {industries.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="target_audience">
            Target Audience <span className="text-muted-foreground font-normal text-[10px]">— optional, your CSO will refine this</span>
          </Label>
          <Textarea
            id="target_audience"
            value={data.target_audience}
            onChange={(e) => onChange({ target_audience: e.target.value })}
            placeholder="e.g. Affluent millennials who value quality over quantity"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
};

export default BusinessBasics;
