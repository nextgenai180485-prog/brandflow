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
  { value: "medspa", label: "Medical Spa" },
  { value: "dental", label: "Dental" },
  { value: "wellness", label: "Wellness" },
  { value: "fitness", label: "Fitness" },
  { value: "beauty", label: "Beauty" },
  { value: "other", label: "Other" },
];

const BusinessBasics = ({ data, onChange }: Props) => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-1">Tell us about your business</h2>
        <p className="text-muted-foreground text-sm">We'll use this to personalize your content.</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="business_name">Business Name</Label>
          <Input
            id="business_name"
            value={data.business_name}
            onChange={(e) => onChange({ business_name: e.target.value })}
            placeholder="e.g. Glow Med Spa"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website_url">
            Website URL <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="website_url"
            type="url"
            value={data.website_url}
            onChange={(e) => onChange({ website_url: e.target.value })}
            placeholder="https://www.yourbusiness.com"
          />
        </div>

        <div className="space-y-2">
          <Label>Industry</Label>
          <Select value={data.industry} onValueChange={(v) => onChange({ industry: v })}>
            <SelectTrigger>
              <SelectValue />
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
            Target Audience <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            id="target_audience"
            value={data.target_audience}
            onChange={(e) => onChange({ target_audience: e.target.value })}
            placeholder="e.g. Women 25-45 interested in skincare and anti-aging treatments"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
};

export default BusinessBasics;
