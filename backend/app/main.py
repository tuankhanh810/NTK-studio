from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import config
from app.core.database import init_db
from app.api.routes_connections import router as connections_router
from app.api.routes_models import router as models_router
from app.api.routes_benchmark import router as benchmark_router
from app.api.routes_agent import router as agent_router
from app.api.routes_workspace import router as workspace_router
from app.api.routes_metrics import router as metrics_router
from app.api.routes_mcp import router as mcp_router

from app.core.config_store import ConfigStore

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database tables & ConfigStore
    await init_db()
    ConfigStore.initialize()
    yield
    # Shutdown logic if any

app = FastAPI(
    title="NTK Studio Backend",
    version=config.version,
    description="Universal AI Coding Studio - NVIDIA Multi-Model Agentic Platform",
    lifespan=lifespan
)

# Configure CORS for Electron frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(connections_router)
app.include_router(models_router)
app.include_router(benchmark_router)
app.include_router(agent_router)
app.include_router(workspace_router)
app.include_router(metrics_router)
app.include_router(mcp_router)

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app": "NTK Studio",
        "version": config.version,
        "mode": "standalone"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=config.host, port=config.port, reload=False)
