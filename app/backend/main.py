#!/usr/bin/env python
import os
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI
from sentence_transformers import SentenceTransformer, CrossEncoder
from starlette.responses import JSONResponse
from tavily import TavilyClient

from endee import Endee, Precision
from endee.schema import VectorItem as EndeeVectorItem
from endee.index import Index as EndeeIndex

# Monkey-patch Endee VectorItem to behave like a dict for `.get()` calls inside the SDK
if not hasattr(EndeeVectorItem, "get"):
    EndeeVectorItem.get = lambda self, key, default=None: getattr(self, key, default)

# Monkey-patch Endee Index.is_hybrid property — SDK has a bug where it checks != "None" (string)
# instead of is not None, causing all indexes to be treated as hybrid
@property
def _fixed_is_hybrid(self):
    """Check if index supports hybrid (dense + sparse) vectors."""
    return self.sparse_model is not None and self.sparse_model != "None"

EndeeIndex.is_hybrid = _fixed_is_hybrid

load_dotenv(override=False)  # env vars already set (e.g. by Docker) take priority

# ── Environment ────────────────────────────────────────────────────────────────
ENDEE_BASE_URL   = os.getenv("ENDEE_BASE_URL",   "http://localhost:8080/api/v1")
ENDEE_AUTH_TOKEN = os.getenv("ENDEE_AUTH_TOKEN", "")
ENDEE_INDEX_NAME = os.getenv("ENDEE_INDEX_NAME", "rag_app")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

CHUNK_SIZE    = int(os.getenv("CHUNK_SIZE",    "800"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "120"))
TOP_K         = int(os.getenv("TOP_K",         "8"))   # fetch more, rerank to top 5
RERANK_TOP    = int(os.getenv("RERANK_TOP",    "5"))   # how many to keep after rerank

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

# ── System prompt ──────────────────────────────────────────────────────────────
# Strong, explicit system identity that overrides Gemini's default refusal behavior
SYSTEM_PROMPT = """You are a document analysis assistant. Your ONLY job is to answer questions based on text that has been extracted from user-uploaded files and provided to you in the context below.

CRITICAL INSTRUCTIONS:
1. The text in the "RETRIEVED DOCUMENT CONTEXT" section below was extracted from files the user uploaded to this system. You MUST treat it as the actual file content.
2. NEVER say "I cannot see files", "I don't have access to documents", or "I cannot view uploads". The extraction has already happened — the text IS the document.
3. If someone asks "what does the document say" or "summarize this file", answer directly from the context. Do NOT refuse or claim you can't see it.
4. Answer ONLY from the provided context. If the context doesn't contain the answer, say: "The uploaded documents don't contain information about that. Try uploading a relevant file."
5. Be specific and cite which document/source the information comes from.

You are NOT a general assistant. You are a specialized document Q&A system. Act accordingly.
6. For follow-up questions, use the conversation history to maintain coherence but still ground answers in the context.
"""

ROUTER_SYSTEM_PROMPT = """You are a query router. Your only job is to output a single word.
Rules:
- Output RAG  → if the question is about uploaded documents, files, or internal knowledge
- Output WEB  → if the question needs current/live/external information from the internet
- Output DIRECT → for greetings, math, general knowledge, or anything that needs no retrieval
Output exactly one word. No punctuation, no explanation."""

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(title="RAG Agentic Backend", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Globals ────────────────────────────────────────────────────────────────────
embedder:     Optional[SentenceTransformer]      = None
reranker:     Optional[CrossEncoder]             = None
llm:          Optional[ChatGoogleGenerativeAI]   = None
endee_client: Optional[Endee]                    = None
endee_index                                      = None
tavily_client: Optional[TavilyClient]            = None


def get_endee_client() -> Endee:
    client = Endee(ENDEE_AUTH_TOKEN) if ENDEE_AUTH_TOKEN else Endee()
    client.set_base_url(ENDEE_BASE_URL)
    return client


def ensure_index(client: Endee, dim: int) -> None:
    """Create a dense-only index. If a hybrid index exists, delete and recreate it."""
    needs_create = False
    try:
        existing = client.get_index(name=ENDEE_INDEX_NAME)
        if getattr(existing, "is_hybrid", False):
            # Hybrid index can't accept dense-only upserts — delete it
            client.delete_index(name=ENDEE_INDEX_NAME)
            needs_create = True
        # else: index exists and is dense-only, nothing to do
    except Exception:
        needs_create = True

    if needs_create:
        # sparse_model=None → dense-only index, no hybrid
        client.create_index(
            name=ENDEE_INDEX_NAME,
            dimension=dim,
            space_type="cosine",
            precision=Precision.INT8,
            sparse_model=None,
        )


def bootstrap():
    global embedder, reranker, llm, endee_client, endee_index, tavily_client
    if GEMINI_API_KEY is None:
        raise RuntimeError("GEMINI_API_KEY is required — set it in app/.env")

    embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
    llm = ChatGoogleGenerativeAI(
        model=GEMINI_MODEL,
        api_key=GEMINI_API_KEY,
        temperature=0.2,
    )
    endee_client = get_endee_client()
    ensure_index(endee_client, embedder.get_embedding_dimension())
    endee_index = endee_client.get_index(name=ENDEE_INDEX_NAME)

    if TAVILY_API_KEY:
        tavily_client = TavilyClient(api_key=TAVILY_API_KEY)


bootstrap()

# ── File ingestion ─────────────────────────────────────────────────────────────

def read_file(file: UploadFile) -> str:
    suffix = (file.filename or "").split(".")[-1].lower()
    content = file.file.read()

    if suffix == "pdf":
        try:
            from pypdf import PdfReader
            import io
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"pypdf missing: {exc}")
        reader = PdfReader(io.BytesIO(content))
        text = "\n".join(p.extract_text() or "" for p in reader.pages)

    elif suffix in {"txt", "md"}:
        text = content.decode("utf-8", errors="ignore")

    elif suffix == "docx":
        try:
            import docx2txt, tempfile, pathlib
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"docx2txt missing: {exc}")
        with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        try:
            text = docx2txt.process(tmp_path) or ""
        finally:
            pathlib.Path(tmp_path).unlink(missing_ok=True)

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: .{suffix}")

    if not text.strip():
        raise HTTPException(status_code=422, detail="File appears to be empty or unreadable.")
    return text


def chunk_text(text: str) -> List[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    return [c for c in splitter.split_text(text) if c.strip()]


def upsert_chunks(chunks: List[str], source: str) -> int:
    embeddings = embedder.encode(chunks, batch_size=32, show_progress_bar=False, convert_to_numpy=True)
    payload = [
        {
            "id": f"{source}::chunk-{idx}",
            "vector": vec.tolist(),
            "meta": {"source": source, "text": chunk},
        }
        for idx, (chunk, vec) in enumerate(zip(chunks, embeddings))
    ]
    endee_index.upsert(payload)
    return len(payload)

# ── Retrieval ──────────────────────────────────────────────────────────────────

def _normalize_result(item) -> dict:
    if hasattr(item, "dict"):
        base = item.dict()
        similarity = getattr(item, "similarity", None)
        distance   = getattr(item, "distance",   None)
    else:
        base = dict(item)
        similarity = base.get("similarity")
        distance   = base.get("distance")
    return {
        "id":         base.get("id"),
        "meta":       base.get("meta") or {},
        "similarity": similarity,
        "distance":   distance,
    }


def retrieve(query: str) -> List[dict]:
    query_vec = embedder.encode([query])[0].tolist()
    results = endee_index.query(vector=query_vec, top_k=TOP_K, include_vectors=False)
    if not results:
        return []

    docs = [_normalize_result(r) for r in results]

    # Cross-encoder reranking
    rerank_inputs = [(query, doc["meta"].get("text", "")) for doc in docs]
    scores = reranker.predict(rerank_inputs)
    reranked = sorted(
        [{**doc, "rerank_score": float(score)} for doc, score in zip(docs, scores)],
        key=lambda x: x["rerank_score"],
        reverse=True,
    )
    return reranked[:RERANK_TOP]


def web_search(query: str) -> List[dict]:
    if not tavily_client:
        raise HTTPException(status_code=500, detail="TAVILY_API_KEY not configured")

    def _parse(res) -> List[dict]:
        return [
            {
                "id": item.get("url"),
                "meta": {
                    "source": item.get("url"),
                    "text":   item.get("content", ""),
                    "title":  item.get("title", ""),
                },
                "score": item.get("score"),
            }
            for item in res.get("results", [])
        ]

    # Try news search first (last 7 days) for fresh results
    try:
        res = tavily_client.search(
            query=query,
            max_results=5,
            include_images=False,
            search_depth="advanced",
            topic="news",
            days=7,
        )
        results = _parse(res)
        if results:
            return results
    except Exception:
        pass

    # Fallback to general web search if news returns nothing
    res = tavily_client.search(
        query=query,
        max_results=5,
        include_images=False,
        search_depth="advanced",
    )
    return _parse(res)

# ── Prompt builders ────────────────────────────────────────────────────────────

def build_context(docs: List[dict]) -> str:
    parts = []
    for i, doc in enumerate(docs, 1):
        meta = doc.get("meta", {})
        src  = meta.get("title") or meta.get("source") or "Unknown"
        text = meta.get("text", "").strip()
        parts.append(f"--- Source {i}: {src} ---\n{text}")
    return "\n\n".join(parts)


def build_history_text(history: List[dict]) -> str:
    lines = []
    for turn in history[-5:]:
        u = (turn.get("user")   or "").strip()
        a = (turn.get("answer") or "").strip()
        if u and a:
            lines.append(f"User: {u}\nAssistant: {a}")
    return "\n\n".join(lines)

# ── Routing ────────────────────────────────────────────────────────────────────

def route_query(question: str, force_mode: str = "auto") -> str:
    if force_mode in {"rag", "web", "direct"}:
        return force_mode

    # Heuristic fast-path: vague document questions → always RAG
    doc_keywords = [
        "document", "file", "upload", "uploaded", "pdf", "docx",
        "text", "content", "summary", "summarize", "what does it say",
        "what is this", "tell me about", "explain this", "according to",
    ]
    q_lower = question.lower()
    if any(kw in q_lower for kw in doc_keywords):
        return "rag"

    # LLM-based routing with a dedicated system prompt
    prompt = f"{ROUTER_SYSTEM_PROMPT}\n\nQuestion: {question}\nAnswer:"
    try:
        resp = llm.invoke(prompt)
        text = resp.content.strip().upper()
        if "WEB" in text:
            return "web"
        if "RAG" in text:
            return "rag"
        return "direct"
    except Exception:
        return "direct"

# ── Answer generation ──────────────────────────────────────────────────────────

def answer(question: str, context_docs: List[dict], history: List[dict], mode: str) -> dict:
    history_text = build_history_text(history)

    if context_docs and mode == "web":
        # ── Web mode: context is live search results, not uploaded documents ──
        context_text = build_context(context_docs)
        prompt = (
            "You are a helpful assistant answering questions using live web search results.\n\n"
            "=== WEB SEARCH RESULTS ===\n"
            "The following content was retrieved from the internet right now via a web search. "
            "Use it to answer the question. Cite sources by their title or URL where relevant.\n\n"
            f"{context_text}\n\n"
            "=== END OF WEB RESULTS ===\n\n"
        )
        if history_text:
            prompt += f"=== CONVERSATION HISTORY ===\n{history_text}\n\n=== END HISTORY ===\n\n"
        prompt += f"User question: {question}\n\nAnswer based on the web results above."

    elif context_docs and mode == "rag":
        # ── RAG mode: context is from uploaded documents ──
        context_text = build_context(context_docs)
        prompt = (
            f"{SYSTEM_PROMPT}\n\n"
            "=== RETRIEVED DOCUMENT CONTEXT ===\n"
            "The text below was extracted from files the user uploaded. "
            "This IS the actual document content. You HAVE access to it. "
            "Answer the question using ONLY this text.\n\n"
            f"{context_text}\n\n"
            "=== END OF CONTEXT ===\n\n"
        )
        if history_text:
            prompt += f"=== CONVERSATION HISTORY ===\n{history_text}\n\n=== END HISTORY ===\n\n"
        prompt += (
            f"User question: {question}\n\n"
            "IMPORTANT: Do NOT say you cannot see files or documents. "
            "The text above IS the document content. Answer directly from it. "
            "If the text covers the question, provide a detailed answer. "
            "If it doesn't, say: 'The uploaded documents don't contain information about that.'"
        )

    else:
        # ── Direct mode: no retrieval, answer from general knowledge ──
        prompt = (
            "You are a helpful, knowledgeable assistant. "
            "Answer the following question clearly and accurately from your own knowledge.\n\n"
        )
        if history_text:
            prompt += f"=== CONVERSATION HISTORY ===\n{history_text}\n\n=== END HISTORY ===\n\n"
        prompt += f"User question: {question}"

    resp = llm.invoke(prompt)

    sources = [
        {
            "id":      doc.get("id"),
            "source":  doc.get("meta", {}).get("source"),
            "title":   doc.get("meta", {}).get("title") or doc.get("meta", {}).get("source"),
            "score":   doc.get("rerank_score", doc.get("similarity", doc.get("score"))),
            "preview": doc.get("meta", {}).get("text", "")[:300],
        }
        for doc in context_docs
    ]

    return {"answer": resp.content, "sources": sources, "mode": mode}

# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model": GEMINI_MODEL, "index": ENDEE_INDEX_NAME}


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    try:
        text   = read_file(file)
        chunks = chunk_text(text)
        count  = upsert_chunks(chunks, source=file.filename)
        return {"message": f"Indexed {count} chunks from '{file.filename}'"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/chat")
async def chat(payload: dict):
    question   = (payload.get("message") or "").strip()
    force_mode = (payload.get("mode")    or "auto").lower()
    history    = payload.get("history")  or []

    if not question:
        raise HTTPException(status_code=400, detail="message is required")

    route = route_query(question, force_mode=force_mode)

    if route == "rag":
        docs = retrieve(question)
        # If RAG returns nothing, fall back to direct rather than hallucinating
        if not docs:
            route = "direct"
            docs  = []
    elif route == "web":
        docs = web_search(question)
    else:
        docs = []

    result = answer(question, docs, history, mode=route)
    return JSONResponse(result)


# ── Serve React frontend (production Docker build only) ────────────────────────
# The built frontend lives at /app/frontend/dist inside the container.
# This must come AFTER all API routes so /upload and /chat are not shadowed.
_FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(_FRONTEND_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(_FRONTEND_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        """Catch-all: serve index.html for any non-API route (React Router support)."""
        return FileResponse(os.path.join(_FRONTEND_DIR, "index.html"))
