import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send, Clock, Calendar as CalendarIcon, Globe, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  auto_publish: boolean;
  status: string;
}

interface PublishModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  campaignId?: string;
  contentText?: string | null;
  contentUrl?: string | null;
  assetType?: string;
  onPublished?: () => void;
}

const PLATFORM_ICONS: Record<string, string> = {
  instagram: "📸",
  facebook: "📘",
  tiktok: "🎵",
  linkedin: "💼",
  twitter: "🐦",
  youtube: "▶️",
  pinterest: "📌",
  x: "𝕏",
};

type ScheduleMode = "now" | "schedule";

export default function PublishModal({
  open,
  onOpenChange,
  assetId,
  campaignId,
  contentText,
  contentUrl,
  assetType,
  onPublished,
}: PublishModalProps) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("now");
  const [scheduledAt, setScheduledAt] = useState("");

  useEffect(() => {
    if (open) {
      setCaption(contentText?.replace(/^\[meta:[^\]]*\]\s*/, "") || "");
      setSelectedAccounts(new Set());
      setScheduleMode("now");
      setScheduledAt("");
      fetchAccounts();
    }
  }, [open, contentText]);

  const fetchAccounts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("status", "connected");
    setAccounts((data as SocialAccount[]) || []);
    setLoading(false);
  };

  const syncAccounts = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-publish", {
        body: { action: "sync-accounts" },
      });
      if (error) throw error;
      toast.success(`Synced ${data?.synced || 0} accounts from Blotato`);
      await fetchAccounts();
    } catch (err: any) {
      toast.error(err.message || "Failed to sync accounts");
    } finally {
      setSyncing(false);
    }
  };

  const toggleAccount = (id: string) => {
    setSelectedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePublish = async () => {
    if (selectedAccounts.size === 0) {
      toast.error("Select at least one platform");
      return;
    }
    setPublishing(true);
    try {
      const hashtagList = hashtags
        .split(/[\s,]+/)
        .map((h) => h.trim())
        .filter(Boolean);

      const action = scheduleMode === "schedule" ? "schedule" : "publish";
      const { data, error } = await supabase.functions.invoke("social-publish", {
        body: {
          action,
          asset_id: assetId,
          campaign_id: campaignId,
          social_account_ids: Array.from(selectedAccounts),
          caption,
          hashtags: hashtagList,
          scheduled_at: scheduleMode === "schedule" ? new Date(scheduledAt).toISOString() : undefined,
        },
      });
      if (error) throw error;

      toast.success(
        scheduleMode === "schedule"
          ? "Content scheduled successfully!"
          : "Content sent for publishing!"
      );
      onPublished?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Publishing failed");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-4 h-4" /> Publish Content
          </DialogTitle>
          <DialogDescription>
            Select platforms and customize your post before publishing.
          </DialogDescription>
        </DialogHeader>

        {/* Preview */}
        {contentUrl && (
          <div className="rounded-lg overflow-hidden bg-muted aspect-video max-h-40">
            {assetType === "video" ? (
              <video src={contentUrl} className="w-full h-full object-cover" muted controls />
            ) : (
              <img src={contentUrl} alt="" className="w-full h-full object-cover" />
            )}
          </div>
        )}

        {/* Platform Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Platforms</Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={syncAccounts}
              disabled={syncing}
            >
              {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
              Sync Accounts
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-center">
              <AlertCircle className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-2">
                No social accounts connected. Sync your Blotato accounts first.
              </p>
              <Button variant="outline" size="sm" onClick={syncAccounts} disabled={syncing} className="text-xs">
                {syncing ? "Syncing..." : "Sync from Blotato"}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {accounts.map((acc) => (
                <label
                  key={acc.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all",
                    selectedAccounts.has(acc.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-foreground/15"
                  )}
                >
                  <Checkbox
                    checked={selectedAccounts.has(acc.id)}
                    onCheckedChange={() => toggleAccount(acc.id)}
                  />
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm flex-shrink-0 overflow-hidden">
                    {acc.avatar_url ? (
                      <img src={acc.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      PLATFORM_ICONS[acc.platform] || "🌐"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{acc.display_name || acc.username}</p>
                    <p className="text-xs text-muted-foreground capitalize">{acc.platform}{acc.username ? ` · @${acc.username}` : ""}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Caption */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Caption</Label>
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write your caption..."
            className="min-h-[80px] text-sm"
          />
          <p className="text-[10px] text-muted-foreground text-right">{caption.length} characters</p>
        </div>

        {/* Hashtags */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Hashtags</Label>
          <Input
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder="#brandflow #marketing #content"
            className="text-sm"
          />
        </div>

        {/* Schedule */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">When to publish</Label>
          <div className="flex gap-2">
            <Button
              variant={scheduleMode === "now" ? "default" : "outline"}
              size="sm"
              className="flex-1 gap-1.5 text-xs"
              onClick={() => setScheduleMode("now")}
            >
              <Send className="w-3 h-3" /> Publish Now
            </Button>
            <Button
              variant={scheduleMode === "schedule" ? "default" : "outline"}
              size="sm"
              className="flex-1 gap-1.5 text-xs"
              onClick={() => setScheduleMode("schedule")}
            >
              <Clock className="w-3 h-3" /> Schedule
            </Button>
          </div>
          {scheduleMode === "schedule" && (
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="text-sm"
              min={new Date().toISOString().slice(0, 16)}
            />
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-sm">
            Cancel
          </Button>
          <Button
            onClick={handlePublish}
            disabled={publishing || selectedAccounts.size === 0 || (scheduleMode === "schedule" && !scheduledAt)}
            className="gap-1.5 text-sm"
          >
            {publishing ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Publishing...</>
            ) : scheduleMode === "schedule" ? (
              <><CalendarIcon className="w-3.5 h-3.5" /> Schedule Post</>
            ) : (
              <><Send className="w-3.5 h-3.5" /> Publish Now</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
