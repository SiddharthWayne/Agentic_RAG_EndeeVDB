import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowRight, Brain, Globe, FileText, Zap } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Brain,
      title: "Agentic Routing",
      desc: "Gemini-powered agent automatically picks the best strategy — RAG, Web Search, or Direct — for every query.",
    },
    {
      icon: FileText,
      title: "Document RAG",
      desc: "Upload PDFs, DOCX, TXT or Markdown. Chunks are embedded with MiniLM-L6-v2 and stored in Endee vector DB.",
    },
    {
      icon: Globe,
      title: "Live Web Search",
      desc: "Tavily-powered web retrieval brings real-time information into your answers when documents aren't enough.",
    },
    {
      icon: Zap,
      title: "Cross-Encoder Reranking",
      desc: "ms-marco MiniLM reranker ensures only the most relevant chunks reach the LLM — sharper, more accurate answers.",
    },
  ];

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
            <svg className="h-4 w-4 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-base font-bold tracking-tight">EndeeAgenticRAG</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Hero */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="animate-slide-up space-y-6 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border bg-surface px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Powered by Gemini · Endee · Tavily
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]">
            Intelligent answers from{" "}
            <span className="text-primary">your documents</span> and the{" "}
            <span className="text-primary">web</span>
          </h1>

          <p className="mx-auto max-w-lg text-base text-muted-foreground leading-relaxed">
            An agentic RAG system that autonomously decides whether to search your
            uploaded documents, query the live web, or answer directly — all
            orchestrated by a Gemini-powered routing agent.
          </p>

          <button
            onClick={() => navigate("/chat")}
            className="group inline-flex items-center gap-2.5 rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0"
          >
            Get Started
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Feature cards */}
        <div className="mt-20 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-slide-up [animation-delay:100ms]">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border bg-surface/60 backdrop-blur-sm p-5 text-left transition-colors hover:bg-surface"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <f.icon className="h-4.5 w-4.5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold mb-1">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-[11px] text-muted-foreground">
        Built with FastAPI · Sentence Transformers · Endee Vector DB · Gemini 2.5 Flash
      </footer>
    </div>
  );
}
