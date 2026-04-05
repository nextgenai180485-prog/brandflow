import { useState } from "react";
import { CalendarIcon, Send } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onScheduled: () => void;
}

const platforms = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "facebook", label: "Facebook" },
];

const ScheduleModal = ({ open, onOpenChange, campaignId, onScheduled }: ScheduleModalProps) => {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("09:00");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram"]);
  const [saving, setSaving] = useState(false);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSchedule = async () => {
    if (!date) {
      toast.error("Please select a publish date.");
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform.");
      return;
    }

    setSaving(true);
    const [hours, minutes] = time.split(":").map(Number);
    const scheduledAt = new Date(date);
    scheduledAt.setHours(hours, minutes, 0, 0);

    const { error } = await supabase
      .from("campaigns")
      .update({
        status: "scheduled",
        scheduled_at: scheduledAt.toISOString(),
        publish_platforms: selectedPlatforms,
      })
      .eq("id", campaignId);

    setSaving(false);
    if (error) {
      toast.error("Failed to schedule campaign.");
    } else {
      toast.success(`Campaign scheduled for ${format(scheduledAt, "MMM d 'at' h:mm a")}`);
      onOpenChange(false);
      onScheduled();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Publication</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date picker */}
          <div className="space-y-2">
            <Label>Publish Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate} disabled={(d) => d < new Date()} initialFocus className="pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time picker */}
          <div className="space-y-2">
            <Label>Publish Time</Label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Platform toggles */}
          <div className="space-y-3">
            <Label>Platforms</Label>
            {platforms.map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{p.label}</span>
                <Switch checked={selectedPlatforms.includes(p.id)} onCheckedChange={() => togglePlatform(p.id)} />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSchedule} disabled={saving} className="gap-2">
            <Send className="w-4 h-4" />
            {saving ? "Scheduling…" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleModal;
