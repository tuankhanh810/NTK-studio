from fastapi import APIRouter
from app.router.rate_limiter import global_request_manager

router = APIRouter(prefix="/api/metrics", tags=["Metrics"])

@router.get("/stats")
async def get_metrics():
    return global_request_manager.get_stats()
