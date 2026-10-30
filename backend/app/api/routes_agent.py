import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.core.database import get_db
from app.core.security import decrypt_api_key
from app.providers.adapter_registry import create_adapter
from app.router.model_router import ModelRouter
from app.agents.coordinator import AgentCoordinator

router = APIRouter(prefix="/api/agent", tags=["Agent"])

class AgentTaskRequest(BaseModel):
    instruction: str
    workspace_root: str
    model_id: Optional[str] = "auto"
    connection_id: Optional[str] = None
    has_images: bool = False

@router.post("/execute")
async def execute_agent_task(data: AgentTaskRequest, db: AsyncSession = Depends(get_db)):
    if not data.instruction.strip():
        raise HTTPException(status_code=400, detail="Nội dung chỉ dẫn không được để trống")
    if not data.workspace_root.strip():
        raise HTTPException(status_code=400, detail="Chưa chọn thư mục dự án (workspace)")

    # 1. Route model (Manual or Auto)
    routing = await ModelRouter.route_model(
        session=db,
        prompt=data.instruction,
        manual_model_id=data.model_id if data.model_id != "auto" else None,
        manual_connection_id=data.connection_id,
        has_images=data.has_images
    )

    model_item = routing["model_item"]
    conn = routing["connection"]
    api_key = decrypt_api_key(conn.api_key_encrypted)

    adapter = create_adapter(
        provider_type=conn.provider_type,
        base_url=conn.base_url,
        api_key=api_key,
        model_id=model_item.model_id,
        extra_headers=json.loads(conn.headers_json or "{}")
    )

    coordinator = AgentCoordinator(
        adapter=adapter,
        connection_id=conn.id,
        model_id=model_item.model_id,
        workspace_root=data.workspace_root,
        supports_tools=model_item.supports_tools
    )

    async def sse_event_stream():
        # First event: tell UI which model was routed and why
        yield f"data: {json.dumps({'event_type': 'model_selected', 'model_name': model_item.display_name, 'reason': routing['reason']}, ensure_ascii=False)}\n\n"

        async for event in coordinator.execute_task(data.instruction, session=db):
            payload = {
                "event_type": event.event_type,
                "content": event.content,
                "data": event.data,
                "timestamp": event.timestamp
            }
            yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

    return StreamingResponse(sse_event_stream(), media_type="text/event-stream")
