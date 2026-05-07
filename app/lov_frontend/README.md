# AgenticRAG React UI (lov_frontend)

A Vite/React client for the Agentic RAG backend. It supports the same routing modes (Agent/RAG/Web/Direct), uploads docs, and displays sources.

## How it works
- Upload pdf/docx/txt/md → POST `/upload` on the FastAPI backend.
- Chat → POST `/chat` with `{message, mode, history}`.
- Renders answers and source citations; uses 5-turn history for coherence.

## Run locally
```powershell
cd app/lov_frontend
npm install --legacy-peer-deps
npm run dev -- --host --port 5175
```
Set the backend URL via `VITE_BACKEND_URL` in a `.env` if not `http://localhost:8000`.

## Tech
- React + Vite
- Tailwind + Radix UI components
- Talks to backend (FastAPI) and Endee vector DB behind it

## Notes
- node_modules is ignored; keep package-lock for deterministic installs.
- Port 5175 avoids clashing with Endee (8080) and API (8000).
