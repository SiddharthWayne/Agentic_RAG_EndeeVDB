import { useState } from "react";
import { type ChatSource } from "@/lib/api";
import { FileText, Globe, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

interface SourceCardsProps {
  sources: ChatSource[];
  mode: "rag" | "web" | "direct";
}

function SourceCard({ s, mode }: { s: ChatSource; mode: "rag" | "web" | "direct" }) {
  const [expanded, setExpanded] = useState(false);
  const isWeb = mode === "web";
  const previewText = s.preview?.trim() ?? "";
  const isLong = previewText.length > 180;

  return (
    <div className="rounded-lg border bg-background/60 p-3 transition-colors hover:border-primary/30">
      {/* Header row */}
      <div className="flex items-start gap-2.5">
        <div className="rounded bg-muted p-1.5 shrink-0 mt-0.5">
          {isWeb ? (
            <Globe className="h-3.5 w-3.5 text-primary" />
          ) : (
            <FileText className="h-3.5 w-3.5 text-primary" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Title */}
          {isWeb ? (
            <a
              href={s.source}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <span className="truncate">{s.title || s.source}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          ) : (
            <p className="text-xs font-semibold text-foreground truncate">
              {s.title || s.source}
            </p>
          )}

          {/* Score badge */}
          {s.score != null && (
            <span className="inline-block mt-0.5 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              relevance {(s.score * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>

      {/* Preview text */}
      {previewText && (
        <div className="mt-2 pl-8">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {expanded || !isLong ? previewText : `${previewText.slice(0, 180)}…`}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 flex items-center gap-0.5 text-[10px] text-primary hover:underline"
            >
              {expanded ? (
                <><ChevronUp className="h-3 w-3" /> Show less</>
              ) : (
                <><ChevronDown className="h-3 w-3" /> Show more</>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function SourceCards({ sources, mode }: SourceCardsProps) {
  if (!sources.length) return null;

  return (
    <div className="mt-4 pt-3 border-t border-border/50">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
        {mode === "web" ? "Web Sources" : "Document Sources"}
      </p>
      <div className="flex flex-col gap-2">
        {sources.map((s, i) => (
          <SourceCard key={`${s.id}-${i}`} s={s} mode={mode} />
        ))}
      </div>
    </div>
  );
}
