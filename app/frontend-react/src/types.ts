export type Mode = "auto" | "rag" | "web" | "direct";

export interface Source {
  id?: string | null;
  source?: string | null;
  title?: string | null;
  preview?: string | null;
  score?: number | null;
}

export interface ChatMessage {
  user: string;
  answer: string;
  sources?: Source[];
  mode?: string;
}
