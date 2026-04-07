import { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, RefreshCw, Globe, Trash2, CheckCircle2, Wifi } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  auto_publish: boolean;
  status: string;
  blotato_account_id: string;
  created_at: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  facebook: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  tiktok: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  linkedin: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  twitter: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  x: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  youtube: "bg-red-500/10 text-red-600 border-red-500/20",
  pinterest: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

const PLATFORM_ICONS: Record<string, string> = {
  instagram: "📸", facebook: "📘", tiktok: "🎵", linkedin: "💼",
  twitter: "🐦", youtube: "▶️", pinterest: "📌", x: "𝕏",
};

export default function SocialSettings() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (user) fetchAccounts();
  }, [user]);

  const fetchAccounts = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("social_accounts")
      .select("*")
      .order("platform", { ascending: true });
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
      toast.success(`Synced ${data?.synced || 0} accounts`);
      await fetchAccounts();
    } catch (err: any) {
      toast.error(err.message || "Failed to sync accounts");
    } finally {
      setSyncing(false);
    }
  };

  const toggleAutoPublish = async (accountId: string, current: boolean) => {
    await supabase
      .from("social_accounts")
      .update({ auto_publish: !current })
      .eq("id", accountId);
    setAccounts((prev) =>
      prev.map((a) => (a.id === accountId ? { ...a, auto_publish: !current } : a))
    );
  };

  const removeAccount = async (accountId: string) => {
    await supabase.from("social_accounts").delete().eq("id", accountId);
    setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    toast.success("Account removed");
  };

  return (
    <AppShell>
      <div className="px-4 sm:px-6 pt-4 pb-8 max-w-3xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">Social Publishing</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Your social channels are ready to go. Just sync and start publishing.
          </p>
        </div>

        {/* Connection Status */}
        <div className="rounded-xl border border-border bg-card p-4 md:p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Wifi className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-foreground">Your Social Channels</h2>
                    <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Platform Connected
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Click sync to import all available social channels.
                  </p>
                </div>
                <Button
                  onClick={syncAccounts}
                  disabled={syncing}
                  variant="outline"
                  className="gap-2 text-sm w-full sm:w-auto"
                >
                  {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Sync Channels
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Accounts list */}
        <div className="rounded-xl border border-border bg-card p-4 md:p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Connected Channels ({accounts.length})</h2>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Globe className="w-10 h-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No channels yet</p>
              <p className="text-xs text-muted-foreground mt-1">Click "Sync Channels" above to import your social accounts.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="rounded-xl border border-border bg-background p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-base flex-shrink-0 overflow-hidden">
                      {acc.avatar_url ? (
                        <img src={acc.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        PLATFORM_ICONS[acc.platform] || "🌐"
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{acc.display_name || acc.username}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className={cn("text-[10px] capitalize", PLATFORM_COLORS[acc.platform] || "")}>
                          {acc.platform}
                        </Badge>
                        {acc.username && (
                          <span className="text-[11px] text-muted-foreground truncate">@{acc.username}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pl-12 sm:pl-0">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={acc.auto_publish}
                        onCheckedChange={() => toggleAutoPublish(acc.id, acc.auto_publish)}
                      />
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">Auto-publish</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeAccount(acc.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Help */}
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
          <h3 className="text-xs font-semibold text-foreground">How it works</h3>
          <ol className="text-[11px] text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>Click <strong>"Sync Channels"</strong> to import all available social accounts.</li>
            <li>Toggle <strong>Auto-publish</strong> on channels you want content sent to automatically.</li>
            <li>Go to the <strong>Content Command Center</strong> and publish any approved asset with one click.</li>
          </ol>
        </div>
      </div>
    </AppShell>
  );
}
