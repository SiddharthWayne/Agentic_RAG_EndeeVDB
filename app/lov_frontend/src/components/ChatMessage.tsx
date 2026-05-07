import { type ChatSource } from "@/lib/api";
import { SourceCards } from "./SourceCards";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  mode?: "rag" | "web" | "direct";
}

export function ChatMessage({ role, content, sources, mode }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 animate-slide-up",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 mt-0.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>
      )}

      <div
        className={cn(
          "rounded-xl px-4 py-3",
          isUser
            ? "max-w-[75%] bg-primary text-primary-foreground"
            : "w-full bg-surface border"
        )}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed
            prose-p:my-1.5
            prose-headings:font-semibold prose-headings:my-2
            prose-ul:my-1.5 prose-ul:pl-5
            prose-ol:my-1.5 prose-ol:pl-5
            prose-li:my-0.5
            prose-strong:font-semibold
            prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
            prose-pre:bg-muted prose-pre:rounded-lg prose-pre:p-3
            prose-blockquote:border-l-2 prose-blockquote:border-primary/40 prose-blockquote:pl-3 prose-blockquote:text-muted-foreground
          ">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        )}
        {!isUser && sources && mode && (
          <SourceCards sources={sources} mode={mode} />
        )}
      </div>

      {isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-foreground/10 mt-0.5">
          <span className="text-xs font-semibold text-foreground">U</span>
        </div>
      )}
    </div>
  );
}
