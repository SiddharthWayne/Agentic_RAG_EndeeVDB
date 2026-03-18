import axios from "axios";
import { Mode, Source } from "./types";

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export interface ChatPayload {
  message: string;
  mode: Mode;
  history: { user: string; answer: string }[];
}

export interface ChatResponse {
  answer: string;
  sources: Source[];
  mode: string;
}

export async function sendChat(payload: ChatPayload): Promise<ChatResponse> {
  const { data } = await axios.post(`${BASE_URL}/chat`, payload, { timeout: 60000 });
  return data as ChatResponse;
}

export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await axios.post(`${BASE_URL}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000,
  });
  return data.message as string;
}
