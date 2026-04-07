import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Brain, Loader2, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent } from "@/components/ui/drawer";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cmo-chat`;

const STARTERS = [
  "What content should I create this week?",
  "Analyze my brand positioning gaps",
  "What's working and what's not?",
  "Give me 3 attack vectors for growth",
];

const GlobalCMOChat = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keyboard shortcut: Cmd+K / Ctrl+K + custom event from AppShell
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    const toggleHandler = () => setOpen((prev) => !prev);
    window.addEventListener("keydown", handler);
    window.addEventListener("toggle-cso", toggleHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("toggle-cso", toggleHandler);
    };
  }, []);

  // Load persisted messages on first open
  useEffect(() => {
    if (!open || loaded || !user) return;
    const load = async () => {
      const { data } = await supabase
        .from("cmo_chat_messages" as any)
        .select("role, content")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: true })
        .limit(100);
      if (data && data.length > 0) {
        setMessages(data.map((m: any) => ({ role: m.role, content: m.content })));
      }
      setLoaded(true);
    };
    load();
  }, [open, loaded, user]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      const behavior = loaded ? "smooth" : "instant";
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior });
      });
    }
  }, [messages, loaded, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const persistMessage = useCallback(async (role: string, content: string) => {
    if (!user) return;
    await supabase.from("cmo_chat_messages" as any).insert({
      profile_id: user.id,
      role,
      content,
    } as any);
  }, [user]);

  const streamChat = useCallback(async (allMessages: Msg[]) => {
    setIsStreaming(true);
    let assistantSoFar = "";

    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length > 0) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Chat failed" }));
        toast.error(err.error || `Error ${resp.status}`);
        setIsStreaming(false);
        return;
      }

      if (!resp.body) {
        toast.error("No response stream");
        setIsStreaming(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, newlineIdx);
          buf = buf.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const json = line.slice(6).trim();
          if (json === "[DONE]") break;

          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsert(content);
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }

      if (buf.trim()) {
        for (let raw of buf.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (!raw.startsWith("data: ")) continue;
          const json = raw.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsert(content);
          } catch {}
        }
      }

      if (assistantSoFar) {
        await persistMessage("assistant", assistantSoFar);
      }
    } catch (e) {
      console.error("CSO Chat stream error:", e);
      toast.error("Connection lost. Try again.");
    } finally {
      setIsStreaming(false);
    }
  }, [persistMessage]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    await persistMessage("user", text.trim());
    await streamChat(updated);
  }, [messages, isStreaming, streamChat, persistMessage]);

  const clearChat = useCallback(async () => {
    setMessages([]);
    if (!user) return;
    await supabase.from("cmo_chat_messages" as any).delete().eq("profile_id", user.id);
  }, [user]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  if (!user) return null;

  const chatContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3 shrink-0 bg-background">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Chief Strategy Officer</h2>
            <p className="text-[10px] text-muted-foreground font-mono tracking-wide">
              Strategic War Room · History Access: Full
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={clearChat}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => setOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {messages.length === 0 ? (
          <div className="space-y-5 pt-2">
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  CSO Online
                </span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                I have your full brand intelligence loaded — strategy, memory, research, and decision history. Ask me anything strategic.
              </p>
            </div>
            <div className="space-y-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold px-1">
                Quick Actions
              </p>
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="w-full text-left text-xs text-foreground bg-secondary/50 hover:bg-secondary rounded-xl px-4 py-3 transition-colors border border-border/50 hover:border-border"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={msg.role === "user" ? "flex justify-end" : "flex justify-start gap-3"}>
              {msg.role === "user" ? (
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-3 text-sm">
                  {msg.content}
                </div>
              ) : (
                <>
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="space-y-1.5 max-w-[90%]">
                    <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">
                      CSO
                    </Badge>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                      <MarkdownLite content={msg.content} />
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="text-[10px] font-mono">Analyzing intelligence...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3 pb-[env(safe-area-inset-bottom,12px)] shrink-0 bg-background">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask for strategic advice..."
            rows={1}
            className="flex-1 resize-none bg-secondary/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[40px] max-h-[120px] px-4 py-2.5"
            disabled={isStreaming}
          />
          <Button
            size="sm"
            className="h-10 w-10 p-0 shrink-0 rounded-xl"
            onClick={() => send(input)}
            disabled={!input.trim() || isStreaming}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[9px] text-muted-foreground/60 mt-1.5 text-center font-mono">
          ⌘K to toggle · Full project history access
        </p>
      </div>
    </div>
  );

  // Mobile: floating trigger + full-height Drawer
  if (isMobile) {
    return (
      <>
        {/* Mobile CSO Trigger — fixed bottom-left */}
        <button
          onClick={() => setOpen(true)}
          className="fixed left-4 bottom-20 z-[80] w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
          title="Open Strategy Core"
        >
          <Sparkles className="w-5 h-5" />
          {!open && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary border-2 border-background" />
            </span>
          )}
        </button>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="h-[92vh] p-0">
            {chatContent}
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Desktop: left-edge dock trigger + slide-over panel
  return (
    <>
      {/* ── Left-Edge Dock Trigger (The "Jewel") ── */}
      <div className="fixed left-0 top-1/2 -translate-y-1/2 z-[80] flex flex-col items-center">
        <div className="relative group">
          {/* Tooltip */}
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-foreground text-background text-[10px] font-semibold rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none shadow-lg">
            Strategy Core
            <span className="text-muted-foreground font-normal ml-1.5">⌘K</span>
          </div>

          <button
            onClick={() => setOpen(true)}
            className={`
              relative w-10 h-10 rounded-r-xl rounded-l-none flex items-center justify-center
              transition-all duration-300 shadow-lg
              ${open
                ? "bg-primary shadow-[0_0_20px_hsl(var(--primary)/0.4)] scale-110"
                : "bg-primary/90 hover:bg-primary hover:scale-105 hover:shadow-xl"
              }
            `}
            title="Open Strategy Core (⌘K)"
          >
            <Sparkles className={`w-4.5 h-4.5 text-primary-foreground transition-transform duration-500 ${!open ? "group-hover:rotate-12" : ""}`} />

            {/* Notification pulse */}
            {!open && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary border-2 border-background" />
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Backdrop (Focus Mode) ── */}
      {open && (
        <div
          className="fixed inset-0 z-[90] bg-foreground/10 backdrop-blur-sm animate-fade-in"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Slide-Over Panel (The War Room) ── */}
      <div
        className={`
          fixed top-0 left-0 z-[100] h-full w-[480px]
          bg-background/95 backdrop-blur-xl border-r border-border shadow-2xl
          transition-transform duration-500
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        {chatContent}
      </div>
    </>
  );
};

/* ─── Markdown renderer ─── */

const MarkdownLite = ({ content }: { content: string }) => {
  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("### ")) return <h4 key={i} className="font-bold text-xs text-foreground mt-2">{parseBold(line.slice(4))}</h4>;
        if (line.startsWith("## ")) return <h3 key={i} className="font-bold text-sm text-foreground mt-3">{parseBold(line.slice(3))}</h3>;
        if (line.startsWith("# ")) return <h2 key={i} className="font-bold text-base text-foreground mt-3">{parseBold(line.slice(2))}</h2>;
        if (line.startsWith("- ") || line.startsWith("* "))
          return <p key={i} className="text-sm text-foreground pl-3 before:content-['•'] before:mr-2 before:text-primary">{parseBold(line.slice(2))}</p>;
        if (line.trim() === "") return <div key={i} className="h-1" />;
        return <p key={i} className="text-sm text-foreground">{parseBold(line)}</p>;
      })}
    </div>
  );
};

function parseBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-bold text-foreground">{part}</strong> : part
  );
}

export default GlobalCMOChat;
