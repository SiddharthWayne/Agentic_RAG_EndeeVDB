import { useMemo, useState } from "react";
import Chat from "./components/Chat";
import Uploader from "./components/Uploader";
import { ChatMessage, Mode } from "../src/types";

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("auto");

  const history = useMemo(
    () => messages.slice(-5).map((m) => ({ user: m.user, answer: m.answer })),
    [messages]
  );

  return (
    <div className="container">
      <h1>Agentic RAG Console</h1>
      <p style={{ color: "#475569", marginTop: -8 }}>
        RAG + Web + Direct router on Endee + Gemini + Tavily
      </p>

      <div className="toolbar">
        <div>
          <span className="badge">Mode</span>
          {(["auto", "rag", "web", "direct"] as Mode[]).map((m) => (
            <button
              key={m}
              className="btn"
              style={{
                marginRight: 8,
                background: mode === m ? "#0ea5e9" : "#e2e8f0",
                color: mode === m ? "#fff" : "#0f172a",
              }}
              onClick={() => setMode(m)}
              disabled={loading}
            >
              {m === "auto" ? "Agent" : m.toUpperCase()}
            </button>
          ))}
        </div>
        <Uploader disabled={loading} />
      </div>

      <div style={{ marginTop: 16 }}>
        <Chat
          mode={mode}
          history={history}
          messages={messages}
          setMessages={setMessages}
          loading={loading}
          setLoading={setLoading}
        />
      </div>
    </div>
  );
}

export default App;
