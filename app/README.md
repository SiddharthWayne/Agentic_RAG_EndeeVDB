# Agentic RAG Stack (FastAPI · React/Vite · Endee · Gemini · Tavily)

**Summary:** A production-style, multi-route RAG service with an agentic router that chooses between dense RAG (Endee), web RAG (Tavily), or direct LLM answers (Gemini). Docs are chunked, embedded (MiniLM), indexed in Endee, reranked (cross-encoder) for precision, and cited in responses. React/Vite is the primary UI (Lovable export optional); FastAPI backend exposes upload and chat endpoints; runs locally with Endee on 8080 and API on 8000.

## Feature Highlights
- Upload & index pdf/docx/txt/md; chunk (800/120) + MiniLM embeddings.
- Rerank with `cross-encoder/ms-marco-MiniLM-L-6-v2` (top 4) for high-precision context.
- Per-query routing: Agent (auto) or forced RAG/Web/Direct modes.
- Sources returned for RAG/Web with previews/links; 5-turn chat memory for coherence.
- Backend CORS open; single backend can serve multiple UIs simultaneously.

## Architecture
```
User (React UI)
    |
    v
Mode selector (Agent/RAG/Web/Direct)
    |
    +-- Agent -> Router prompt (Gemini) -> choose path
    |        +-- RAG: embed (MiniLM) -> Endee search -> rerank -> Gemini -> sources
    |        +-- Web: Tavily search -> Gemini -> web sources
    |        +-- Direct: Gemini only
    |
Uploads -> extract -> chunk -> embed -> Endee upsert (metadata)
```

## Tech Stack
- Backend: FastAPI (`app/backend/main.py`)
- Frontend: React/Vite (`app/frontend-react`), Lovable export (`app/lov_frontend`)
- Vector DB: Endee @ `http://localhost:8080` (cosine, INT8)
- Embeddings: `sentence-transformers/all-MiniLM-L6-v2`
- Reranker: `cross-encoder/ms-marco-MiniLM-L-6-v2`
- LLM: Gemini (configurable via `.env`)
- Web search: Tavily API

## Clone & Vector DB (WSL)
```powershell
git clone https://github.com/Siddharth-cvhs/endee.git
cd endee/app
wsl --install -d Ubuntu-22.04
# in WSL, from repo root
sed -i 's/\r$//' install.sh run.sh
./install.sh --release --avx2
./run.sh    # Endee on http://localhost:8080
```
To restart Endee later (WSL): same three lines above.

## Backend (FastAPI)
```powershell
cd C:\VH811\projects\endee\app
python -m venv .venv
. .venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env   # fill GEMINI_API_KEY, TAVILY_API_KEY, etc.
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

## Frontend (React/Vite)
```powershell
cd app/frontend-react
npm install
npm run dev -- --host --port 5173
# set VITE_BACKEND_URL if backend not on localhost:8000
```
Lovable export (if used):
```powershell
cd app/lov_frontend
npm install --legacy-peer-deps
npm run dev -- --host --port 5175
```

## API Contracts
- `POST /upload` (multipart): field `file` → `{ "message": "Indexed N chunks..." }`
- `POST /chat` (JSON):
  ```json
  {
    "message": "...",
    "mode": "auto|rag|web|direct",
    "history": [{"user": "...", "answer": "..."}]
  }
  ```
  Response:
  ```json
  {
    "answer": "...",
    "sources": [{"id": "...", "source": "...", "title": "...", "preview": "...", "score": 0.87}],
    "mode": "rag|web|direct"
  }
  ```

## Tuning Notes
- Latency: lower `TOP_K` in `.env` or swap reranker to `cross-encoder/ms-marco-MiniLM-L-2-v2`.
- First-call warmup: run one query after restart to load HF models.
- Routing: leave on **Agent** for mixed queries; force **RAG** for internal docs, **Web** for current events, **Direct** for chit-chat.

## Troubleshooting
- LLM 403/429: replace `GEMINI_API_KEY` or use a model with quota.
- Web mode 400: set `TAVILY_API_KEY`.
- Import errors: ensure you’re inside `.venv` and `pip install -r requirements.txt` completed.

## Quick Run Summary
```powershell
# Endee (WSL): install.sh && run.sh (see above)
# Backend
cd app; . .venv\Scripts\activate; pip install -r requirements.txt; uvicorn backend.main:app --host 0.0.0.0 --port 8000
# Frontend (React)
cd app/frontend-react; npm install; npm run dev -- --host --port 5173
```
