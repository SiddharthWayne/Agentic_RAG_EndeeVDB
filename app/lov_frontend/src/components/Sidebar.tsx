import { FileUploader } from "./FileUploader";
import { ThemeToggle } from "./ThemeToggle";
import { MessageSquare, Plus } from "lucide-react";

interface SidebarProps {
  onNewChat: () => void;
}

export function Sidebar({ onNewChat }: SidebarProps) {
  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r bg-surface">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <MessageSquare className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">NexusAI</span>
        </div>
        <button
          onClick={onNewChat}
          className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted transition-colors duration-150"
          title="New chat"
        >
          <Plus className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        <FileUploader />
      </div>

      <div className="border-t px-4 py-3 flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">
          Powered by Gemini · Endee · Tavily
        </p>
        <ThemeToggle />
      </div>
    </aside>
  );
}
