import { useState, useRef, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ModeSelector } from "@/components/ModeSelector";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { sendChat, type ChatMode, type ChatSource, type HistoryEntry } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  mode?: "rag" | "web" | "direct";
}

export default function Index() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<ChatMode>("auto");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  const buildHistory = useCallback((): HistoryEntry[] => {
    const history: HistoryEntry[] = [];
    for (let i = 0; i < messages.length - 1; i += 2) {
      if (messages[i].role === "user" && messages[i + 1]?.role === "assistant") {
        history.push({
          user: messages[i].content,
          answer: messages[i + 1].content,
        });
      }
    }
    return history.slice(-5);
  }, [messages]);

  const handleSend = useCallback(
    async (text: string) => {
      const userMsg: Message = { role: "user", content: text };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const history = buildHistory();
        const res = await sendChat(text, mode, history);
        const assistantMsg: Message = {
          role: "assistant",
          content: res.answer,
          sources: res.sources,
          mode: res.mode,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err: any) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${err.message}` },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [mode, buildHistory]
  );

  const handleNewChat = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onNewChat={handleNewChat} />

      <main className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-center border-b px-4 py-2.5">
          <ModeSelector value={mode} onChange={setMode} />
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto scrollbar-thin"
        >
          <div className="mx-auto max-w-[1600px] px-6 py-6 space-y-5">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 gap-3 animate-slide-up">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <h1 className="text-lg font-semibold tracking-tight">
                  What can I help you with?
                </h1>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  Upload documents for RAG, search the web, or chat directly.
                  Select a mode above to get started.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <ChatMessage
                key={i}
                role={msg.role}
                content={msg.content}
                sources={msg.sources}
                mode={msg.mode}
              />
            ))}

            {loading && (
              <div className="flex gap-3 animate-slide-up">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                </div>
                <div className="rounded-xl border bg-surface px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="border-t px-4 py-3">
          <div className="mx-auto max-w-[1600px]">
            <ChatInput onSend={handleSend} disabled={loading} />
          </div>
        </div>
      </main>
    </div>
  );
}
