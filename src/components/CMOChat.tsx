import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Brain, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cmo-chat`;

const STARTERS = [
  "What content should I create this week?",
  "Analyze my brand positioning gaps",
  "What's working and what's not?",
  "Give me 3 attack vectors for growth",
];

const CMOChat = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const streamChat = useCallback(async (allMessages: Msg[]) => {
    setIsStreaming(true);
    let assistantSoFar = "";

    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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

      // Flush remaining
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
    } catch (e) {
      console.error("CMO Chat stream error:", e);
      toast.error("Connection lost. Try again.");
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    await streamChat(updated);
  }, [messages, isStreaming, streamChat]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
            <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.15em]">
            CSO Intelligence — Live
          </span>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] text-muted-foreground"
            onClick={() => setMessages([])}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="space-y-4 pt-4">
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
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

            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold px-1">
                Quick Actions
              </p>
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="w-full text-left text-xs text-foreground bg-secondary/50 hover:bg-secondary rounded-lg px-3 py-2.5 transition-colors border border-border/50 hover:border-border"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={msg.role === "user" ? "flex justify-end" : ""}>
              {msg.role === "user" ? (
                <div className="max-w-[85%] rounded-xl bg-primary text-primary-foreground px-3.5 py-2.5 text-sm">
                  {msg.content}
                </div>
              ) : (
                <div className="space-y-1">
                  <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">
                    CSO
                  </Badge>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                    <MarkdownLite content={msg.content} />
                  </div>
                </div>
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
      <div className="border-t border-border px-3 py-2.5 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your CSO anything..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[36px] max-h-[120px] py-2"
            disabled={isStreaming}
          />
          <Button
            size="sm"
            className="h-8 w-8 p-0 shrink-0"
            onClick={() => send(input)}
            disabled={!input.trim() || isStreaming}
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

/** Lightweight markdown renderer — handles bold, headers, bullets, code */
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

export default CMOChat;
