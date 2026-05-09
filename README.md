# Agentic RAG — Endee Vector DB

> Open-source contribution to [endee-io/endee](https://github.com/endee-io/endee) — a production-ready Agentic RAG application built on top of the Endee Vector Database engine.

All application code lives in the `app/` folder. The rest of the repository is the original Endee Vector DB engine (C++ core, unchanged).

---

## What This Adds

This contribution layers a full Agentic RAG stack on top of Endee:

- **Agentic router** — automatically picks between RAG (uploaded docs), Web search (Tavily), or Direct LLM (Gemini) based on the query
- **FastAPI backend** — handles file ingestion, chunking, embedding, retrieval, reranking, and LLM response generation
- **React/Vite frontend** — clean chat UI with file upload, mode selector, and source cards
- **Docker Compose setup** — one command spins up Endee Vector DB + Backend + Frontend together

---

## Project Structure

```
endee/
├── app/                        ← All contribution code lives here
│   ├── backend/
│   │   └── main.py             ← FastAPI app (upload, chat, routing, RAG pipeline)
│   ├── lov_frontend/           ← React/Vite frontend (chat UI)
│   ├── Dockerfile              ← Multi-stage build (React → FastAPI static serve)
│   ├── .env.example            ← Environment variable template
│   └── requirements.txt        ← Python dependencies
├── infra/
│   └── Dockerfile              ← Builds Endee Vector DB from C++ source
├── docker-compose.yml          ← Orchestrates Endee + App together
└── ...                         ← Original Endee engine source (C++, unchanged)
```

---

## Quick Start (Docker — Recommended)

**Prerequisites:**
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

```bash
# 1. Clone this repo
git clone https://github.com/SiddharthWayne/Agentic_RAG_EndeeVDB.git
cd Agentic_RAG_EndeeVDB

# 2. Set up your API keys
cp app/.env.example app/.env
```

Open `app/.env` and fill in:
```env
GEMINI_API_KEY=your_key_here     # https://aistudio.google.com/app/apikey
TAVILY_API_KEY=your_key_here     # https://app.tavily.com
```

```bash
# 3. Build and start everything
docker compose up --build
```

First build takes **5–10 minutes** (compiles Endee from C++ source). Subsequent starts are fast.

| Service | URL |
|---|---|
| App (Chat UI + API) | http://localhost:8000 |
| Endee Vector DB | http://localhost:8080 |

---

## How It Works

```
User (React UI)
    │
    ▼
Mode Selector (Agent / RAG / Web / Direct)
    │
    ├── Agent ──► Router (Gemini) ──► picks best path
    │
    ├── RAG ────► embed query (MiniLM) ──► Endee search ──► rerank (CrossEncoder) ──► Gemini ──► answer + sources
    │
    ├── Web ────► Tavily search ──► Gemini ──► answer + web sources
    │
    └── Direct ─► Gemini only ──► answer

File Upload ──► extract text ──► chunk (800/120) ──► embed ──► Endee upsert
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Vector DB | Endee (built from source) |
| Backend | FastAPI + Python 3.11 |
| Frontend | React 18 + Vite + Tailwind CSS |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` |
| Reranker | `cross-encoder/ms-marco-MiniLM-L-6-v2` |
| LLM | Gemini 2.5 Flash |
| Web Search | Tavily API |
| Container | Docker + Docker Compose |

---

## Supported File Types

Upload any of these and ask questions about them:
- PDF (`.pdf`)
- Word documents (`.docx`)
- Plain text (`.txt`)
- Markdown (`.md`)

---

## API Reference

**`POST /upload`** — Index a file
```bash
curl -X POST http://localhost:8000/upload \
  -F "file=@your_document.pdf"
# → { "message": "Indexed 42 chunks from 'your_document.pdf'" }
```

**`POST /chat`** — Ask a question
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Summarize the document", "mode": "auto", "history": []}'
# → { "answer": "...", "sources": [...], "mode": "rag" }
```
Mode options: `auto` (agentic router), `rag`, `web`, `direct`

**`GET /health`** — Health check
```bash
curl http://localhost:8000/health
# → { "status": "ok", "model": "gemini-2.5-flash", "index": "rag_app" }
```

---

## Docker Commands

```bash
docker compose up --build      # first run or after code changes
docker compose up              # subsequent starts (no rebuild)
docker compose restart app     # restart only the app (after backend edits)
docker compose down            # stop everything
docker compose down -v         # stop + wipe Endee vector data
docker logs rag-app -f         # tail app logs
```

---

## Local Development (without Docker)

```bash
# Terminal 1 — Endee Vector DB (requires WSL on Windows)
./install.sh --release --avx2
./run.sh
# Endee running at http://localhost:8080

# Terminal 2 — Backend
cd app
python -m venv .venv
source .venv/Scripts/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000

# Terminal 3 — Frontend
cd app/lov_frontend
npm install --legacy-peer-deps
npm run dev -- --host --port 5173
```

---

## Troubleshooting

**Windows: `env: 'bash\r': No such file or directory`**

Git converted line endings to CRLF. Fix it:
```bash
git config core.autocrlf input
git rm --cached -r .
git reset --hard
docker compose up --build
```

**Container name conflict**
```bash
docker compose down
docker compose up --build
```

**CPU doesn't support AVX2**

Edit `docker-compose.yml` and change:
```yaml
BUILD_ARCH: avx2
```
to:
```yaml
BUILD_ARCH: release
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | ✅ | — | Google Gemini API key |
| `TAVILY_API_KEY` | ✅ (for web mode) | — | Tavily search API key |
| `ENDEE_BASE_URL` | — | `http://localhost:8080/api/v1` | Endee endpoint (auto-set by Docker) |
| `GEMINI_MODEL` | — | `gemini-2.5-flash` | Gemini model name |
| `CHUNK_SIZE` | — | `800` | Text chunk size (tokens) |
| `CHUNK_OVERLAP` | — | `120` | Chunk overlap |
| `TOP_K` | — | `8` | Candidates fetched from Endee |
| `RERANK_TOP` | — | `5` | Top results kept after reranking |

---

## Contributing

This repo is a fork of [endee-io/endee](https://github.com/endee-io/endee). Contributions to the RAG application layer (`app/`) are welcome — open a PR against this fork or the upstream repo.

---

## License

See [LICENSE](./LICENSE) — original Endee engine license applies.
