import { useState } from "react";
import { sendChat } from "../api";
import { ChatMessage, Mode } from "../types";

interface Props {
  mode: Mode;
  history: { user: string; answer: string }[];
  messages: ChatMessage[];
  setMessages: (m: ChatMessage[]) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
}

const Chat = ({ mode, history, messages, setMessages, loading, setLoading }: Props) => {
  const [input, setInput] = useState("");

  const send = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const resp = await sendChat({ message: input, mode, history });
      setMessages([
        ...messages,
        {
          user: input,
          answer: resp.answer,
          sources: resp.sources,
          mode: resp.mode,
        },
      ]);
      setInput("");
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || "Request failed";
      setMessages([
        ...messages,
        { user: input, answer: `Error: ${msg}`, mode: "error" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <div style={{ display: "flex", gap: 8 }}>
        <input
          style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #cbd5e1" }}
          placeholder="Ask anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={loading}
        />
        <button className="btn" onClick={send} disabled={loading}>
          {loading ? "Thinking..." : "Send"}
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        {messages.slice().reverse().map((m, idx) => (
          <div key={idx} className={`message ${m.mode === "error" ? "bot" : "bot"}`}>
            <div className="message user"><strong>You:</strong> {m.user}</div>
            <div className="message bot"><strong>{(m.mode || "reply").toUpperCase()}:</strong> {m.answer}</div>
            {m.sources && m.sources.length > 0 && (
              <div className="sources">
                Sources:
                <ul>
                  {m.sources.map((s, i) => (
                    <li key={i}>
                      {s.title || s.source || s.id} {s.score ? `(score ${s.score})` : ""}
                      {s.preview ? ` — ${s.preview}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Chat;
