import { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, RefreshCw, Globe, Trash2, CheckCircle2, Key, ExternalLink, Eye, EyeOff, AlertCircle } from "lucide-react";
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

  // API key state
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [checkingKey, setCheckingKey] = useState(true);

  useEffect(() => {
    if (user) {
      checkApiKey();
      fetchAccounts();
    }
  }, [user]);

  const checkApiKey = async () => {
    setCheckingKey(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-publish", {
        body: { action: "check-api-key" },
      });
      if (!error && data) {
        setHasKey(data.has_key);
      }
    } catch {
      // ignore
    } finally {
      setCheckingKey(false);
    }
  };

  const saveApiKey = async () => {
    if (!apiKey.trim() || apiKey.trim().length < 10) {
      toast.error("Please enter a valid API key");
      return;
    }
    setSavingKey(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-publish", {
        body: { action: "save-api-key", api_key: apiKey.trim() },
      });
      if (error) throw error;
      toast.success("API key saved successfully!");
      setHasKey(true);
      setApiKey("");
      setShowKey(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save API key");
    } finally {
      setSavingKey(false);
    }
  };

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
      if (data?.code === "NO_API_KEY") {
        toast.error("Add your Blotato API key first");
        return;
      }
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
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">Social Publishing</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Connect your social platforms and publish directly from Brandflow.
          </p>
        </div>

        {/* Step 1: API Key */}
        <div className="rounded-xl border border-border bg-card p-4 md:p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Key className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-semibold text-foreground">Step 1: Connect Blotato</h2>
                {!checkingKey && hasKey && (
                  <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Connected
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Create a free <a href="https://www.blotato.com" target="_blank" rel="noopener" className="text-primary underline">Blotato</a> account, connect your social channels there, then paste your API key below.
              </p>
            </div>
          </div>

          <div className="space-y-2 pl-0 md:pl-11">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasKey ? "••••••••••••  (key saved — enter new key to replace)" : "Paste your Blotato API key"}
                  className="pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button
                onClick={saveApiKey}
                disabled={savingKey || !apiKey.trim()}
                className="gap-1.5 text-sm w-full sm:w-auto"
              >
                {savingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                {hasKey ? "Update Key" : "Save Key"}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Find your API key in{" "}
              <a href="https://app.blotato.com/settings" target="_blank" rel="noopener" className="text-primary underline">
                Blotato Settings → API
              </a>
              <ExternalLink className="w-2.5 h-2.5 inline ml-0.5" />
            </p>
          </div>
        </div>

        {/* Step 2: Sync & Manage Accounts */}
        <div className="rounded-xl border border-border bg-card p-4 md:p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Globe className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Step 2: Your Social Accounts</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sync to import the channels you connected in Blotato.
                  </p>
                </div>
                <Button
                  onClick={syncAccounts}
                  disabled={syncing || !hasKey}
                  variant="outline"
                  className="gap-2 text-sm w-full sm:w-auto"
                >
                  {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Sync Accounts
                </Button>
              </div>
            </div>
          </div>

          {!hasKey && !checkingKey && (
            <div className="rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2 ml-0 md:ml-11">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">Add your Blotato API key above before syncing accounts.</p>
            </div>
          )}

          {/* Accounts list */}
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : accounts.length === 0 && hasKey ? (
            <div className="flex flex-col items-center justify-center py-10 text-center ml-0 md:ml-11">
              <Globe className="w-10 h-10 text-muted-foreground/20 mb-3" />
              <p className="text-xs text-muted-foreground">No accounts synced yet. Click "Sync Accounts" to import your channels.</p>
            </div>
          ) : accounts.length > 0 ? (
            <div className="space-y-2 ml-0 md:ml-11">
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
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">Auto</span>
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
          ) : null}
        </div>

        {/* Help */}
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
          <h3 className="text-xs font-semibold text-foreground">How publishing works</h3>
          <ol className="text-[11px] text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>Create a <a href="https://www.blotato.com" target="_blank" rel="noopener" className="text-primary underline">Blotato</a> account and connect your Instagram, TikTok, Facebook, LinkedIn, etc.</li>
            <li>Copy your API key from Blotato Settings and paste it above.</li>
            <li>Click "Sync Accounts" to import your connected channels.</li>
            <li>Go to the <strong>Content Command Center</strong> and hit the publish button on any asset.</li>
          </ol>
        </div>
      </div>
    </AppShell>
  );
}
