import { type ChatMode } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Bot, Database, Globe, Zap } from "lucide-react";

const modes: { value: ChatMode; label: string; icon: React.ReactNode }[] = [
  { value: "auto", label: "Agent", icon: <Bot className="h-3.5 w-3.5" /> },
  { value: "rag", label: "RAG", icon: <Database className="h-3.5 w-3.5" /> },
  { value: "web", label: "Web", icon: <Globe className="h-3.5 w-3.5" /> },
  { value: "direct", label: "Direct", icon: <Zap className="h-3.5 w-3.5" /> },
];

interface ModeSelectorProps {
  value: ChatMode;
  onChange: (mode: ChatMode) => void;
}

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <div className="inline-flex items-center rounded-lg bg-muted p-0.5 gap-0.5">
      {modes.map((mode) => (
        <button
          key={mode.value}
          onClick={() => onChange(mode.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150",
            value === mode.value
              ? "bg-surface text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {mode.icon}
          {mode.label}
        </button>
      ))}
    </div>
  );
}
