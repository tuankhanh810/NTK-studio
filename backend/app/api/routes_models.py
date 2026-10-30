import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.core.models import ModelItem, Connection, ModelBenchmark, ModelCapabilityProfile, utcnow_str
from app.core.config_store import ConfigStore
from app.core.security import decrypt_api_key
from app.providers.adapter_registry import create_adapter

router = APIRouter(prefix="/api/models", tags=["Models"])

class ModelUpdate(BaseModel):
    display_name: Optional[str] = None
    rpm_limit: Optional[int] = None
    tpm_limit: Optional[int] = None
    supports_tools: Optional[bool] = None
    supports_vision: Optional[bool] = None
    status: Optional[str] = None
    verification_status: Optional[str] = None
    is_favorite: Optional[bool] = None

class RolesUpdate(BaseModel):
    roles: Dict[str, str]

@router.get("")
async def get_all_models(db: AsyncSession = Depends(get_db)):
    stmt = select(ModelItem, Connection).join(Connection, ModelItem.connection_id == Connection.id)
    res = await db.execute(stmt)
    items = res.all()
    output = []
    for m, c in items:
        # Check latest benchmark
        bm_stmt = select(ModelBenchmark).where(ModelBenchmark.model_id == m.id).order_by(ModelBenchmark.tested_at.desc())
        bm_res = await db.execute(bm_stmt)
        latest_bm = bm_res.scalars().first()

        # Check capability profile
        cap_stmt = select(ModelCapabilityProfile).where(ModelCapabilityProfile.model_id == m.id)
        cap_res = await db.execute(cap_stmt)
        cap = cap_res.scalars().first()

        output.append({
            "id": m.id,
            "connection_id": m.connection_id,
            "connection_name": c.name,
            "provider_type": c.provider_type,
            "model_id": m.model_id,
            "display_name": m.display_name,
            "context_window": m.context_window,
            "max_tokens": m.max_tokens,
            "rpm_limit": m.rpm_limit,
            "tpm_limit": m.tpm_limit,
            "supports_streaming": m.supports_streaming,
            "supports_tools": m.supports_tools,
            "supports_vision": m.supports_vision,
            "supports_json": m.supports_json,
            "is_favorite": getattr(m, "is_favorite", False) or False,
            "verification_status": getattr(m, "verification_status", "DISCOVERED") or "DISCOVERED",
            "status": m.status,
            "last_tested": m.last_tested,
            "capabilities": {
                "chat": cap.chat if cap else "UNKNOWN",
                "streaming": cap.streaming if cap else "UNKNOWN",
                "native_tool_calling": cap.native_tool_calling if cap else "UNKNOWN",
                "json_output": cap.json_output if cap else "UNKNOWN",
                "vision": cap.vision if cap else "UNKNOWN",
                "long_context": cap.long_context if cap else "UNKNOWN",
                "structured_output": cap.structured_output if cap else "UNKNOWN"
            } if cap else None,
            "benchmark": {
                "coding_score": latest_bm.coding_score if latest_bm else None,
                "reasoning_score": latest_bm.reasoning_score if latest_bm else None,
                "tools_score": latest_bm.tools_score if latest_bm else None,
                "avg_latency_ms": latest_bm.ttft_ms if latest_bm else None,
                "tps": latest_bm.tps if latest_bm else None,
                "status": latest_bm.status if latest_bm else "untested"
            } if latest_bm else None
        })
    return output

@router.get("/roles")
async def get_model_roles():
    """Lấy cấu hình phân vai trò model (Chat, Coding, Planning, Debugging, Vision, Benchmark)"""
    routing_cfg = ConfigStore.load_routing()
    return routing_cfg.get("roles", {})

@router.put("/roles")
async def update_model_roles(data: RolesUpdate):
    """Cập nhật phân vai trò model trong routing.json"""
    routing_cfg = ConfigStore.load_routing()
    routing_cfg["roles"] = data.roles
    ConfigStore.save_routing(routing_cfg)
    return {"success": True, "roles": data.roles}

@router.get("/adapters")
async def get_available_adapters():
    """Lấy danh sách các adapter và giao thức được hỗ trợ"""
    return ConfigStore.load_adapters()

@router.put("/{model_id}")
async def update_model(model_id: str, data: ModelUpdate, db: AsyncSession = Depends(get_db)):
    item = await db.get(ModelItem, model_id)
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy model")
    if data.display_name is not None:
        item.display_name = data.display_name
    if data.rpm_limit is not None:
        item.rpm_limit = data.rpm_limit
    if data.tpm_limit is not None:
        item.tpm_limit = data.tpm_limit
    if data.supports_tools is not None:
        item.supports_tools = data.supports_tools
    if data.supports_vision is not None:
        item.supports_vision = data.supports_vision
    if data.status is not None:
        item.status = data.status
    if data.verification_status is not None:
        item.verification_status = data.verification_status
    if data.is_favorite is not None:
        item.is_favorite = data.is_favorite
    await db.commit()
    return {"success": True, "id": item.id}

@router.delete("/{model_id}")
async def delete_model(model_id: str, db: AsyncSession = Depends(get_db)):
    item = await db.get(ModelItem, model_id)
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy model")
    await db.delete(item)
    await db.commit()
    return {"success": True}

@router.post("/{model_id}/favorite")
async def toggle_favorite(model_id: str, db: AsyncSession = Depends(get_db)):
    item = await db.get(ModelItem, model_id)
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy model")
    item.is_favorite = not getattr(item, "is_favorite", False)
    await db.commit()
    return {"success": True, "is_favorite": item.is_favorite}

@router.post("/{model_id}/verify")
async def verify_model_probe(model_id: str, db: AsyncSession = Depends(get_db)):
    """Gửi yêu cầu probe thực tế tới model để xác minh quyền truy cập (VERIFIED vs UNSUPPORTED)"""
    item = await db.get(ModelItem, model_id)
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy model")
    conn = await db.get(Connection, item.connection_id)
    if not conn:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhà cung cấp của model")

    api_key = decrypt_api_key(conn.api_key_encrypted)
    adapter = create_adapter(
        provider_type=conn.provider_type,
        base_url=conn.base_url,
        api_key=api_key,
        model_id=item.model_id,
        extra_headers=json.loads(conn.headers_json or "{}")
    )

    probe_res = await adapter.probe_model(item.model_id)
    if probe_res.get("success"):
        item.verification_status = "VERIFIED"
        item.status = "ready"
        item.last_tested = utcnow_str()

        # Update capability profile
        cap = await db.get(ModelCapabilityProfile, f"{item.id}_cap")
        if cap:
            cap.chat = "VERIFIED"
            cap.updated_at = utcnow_str()
    else:
        item.verification_status = "UNSUPPORTED"
        item.status = "error"
        item.last_tested = utcnow_str()

    await db.commit()
    return {
        "success": probe_res.get("success", False),
        "verification_status": item.verification_status,
        "latency_ms": probe_res.get("latency_ms", 0),
        "message": probe_res.get("message")
    }
