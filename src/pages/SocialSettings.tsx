import { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, RefreshCw, Globe, Trash2, CheckCircle2 } from "lucide-react";
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

  useEffect(() => { fetchAccounts(); }, [user]);

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
      toast.error(err.message || "Failed to sync");
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
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-foreground">Social Accounts</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Manage your connected social platforms via Blotato.
            </p>
          </div>
          <Button onClick={syncAccounts} disabled={syncing} className="gap-2 text-sm w-full sm:w-auto">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync from Blotato
          </Button>
        </div>

        {/* Info banner */}
        <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
          <Globe className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground text-sm">How it works</p>
            <p>Connect your social accounts in <a href="https://app.blotato.com" target="_blank" rel="noopener" className="text-primary underline">Blotato's dashboard</a>, then click "Sync from Blotato" above to import them here.</p>
          </div>
        </div>

        {/* Accounts list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Globe className="w-7 h-7 text-muted-foreground/40" />
            </div>
            <h3 className="text-sm font-medium mb-1">No accounts connected</h3>
            <p className="text-xs text-muted-foreground max-w-xs mb-4">
              Connect your social accounts in Blotato, then sync them here to start publishing.
            </p>
            <Button onClick={syncAccounts} disabled={syncing} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" /> Sync Accounts
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
              >
                {/* Avatar + Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
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

                {/* Controls */}
                <div className="flex items-center justify-between sm:justify-end gap-4 pl-13 sm:pl-0">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={acc.auto_publish}
                      onCheckedChange={() => toggleAutoPublish(acc.id, acc.auto_publish)}
                    />
                    <span className="text-[11px] text-muted-foreground">Auto-publish</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Connected
                    </Badge>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
