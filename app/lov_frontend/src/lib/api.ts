const BASE_URL = "http://localhost:8000";

export interface ChatSource {
  id: string;
  source: string;
  title: string;
  preview: string;
  score: number;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
  mode: "rag" | "web" | "direct";
}

export interface HistoryEntry {
  user: string;
  answer: string;
}

export type ChatMode = "auto" | "rag" | "web" | "direct";

export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "Upload failed");
  }

  const data = await res.json();
  return data.message;
}

export async function sendChat(
  message: string,
  mode: ChatMode,
  history: HistoryEntry[]
): Promise<ChatResponse> {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, mode, history: history.slice(-5) }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Chat request failed" }));
    throw new Error(err.detail || "Chat request failed");
  }

  return res.json();
}
