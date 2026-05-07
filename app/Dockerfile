# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Build the React frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

# Copy package files first for better layer caching
COPY lov_frontend/package.json lov_frontend/package-lock.json ./

RUN npm install --legacy-peer-deps

# Copy the rest of the frontend source
COPY lov_frontend/ ./

# Build the production static files (output goes to /frontend/dist)
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Python backend + serve frontend via FastAPI static files
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS backend

# System deps needed by sentence-transformers / torch
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend static files from stage 1
COPY --from=frontend-builder /frontend/dist ./frontend/dist

# Copy .env so load_dotenv() can find it inside the container
# docker-compose env_file also injects these as real env vars (double coverage)
COPY .env .env
COPY .env.example .env.example

# Expose the FastAPI port
EXPOSE 8000

# Start the FastAPI server
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
