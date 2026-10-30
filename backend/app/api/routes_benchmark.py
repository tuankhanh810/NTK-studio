import uuid
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from app.core.database import get_db
from app.core.models import ModelItem, Connection, ModelBenchmark, ModelCapabilityProfile, utcnow_str
from app.core.security import decrypt_api_key
from app.providers.adapter_registry import create_adapter
from app.benchmark.runner import BenchmarkSuite

router = APIRouter(prefix="/api/benchmark", tags=["Benchmark"])

class BenchmarkRequest(BaseModel):
    level: str = "standard" # quick, standard, full

class CompareRequest(BaseModel):
    model_ids: List[str]

@router.post("/{model_id}/run")
async def run_model_benchmark(model_id: str, data: BenchmarkRequest, db: AsyncSession = Depends(get_db)):
    model_item = await db.get(ModelItem, model_id)
    if not model_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy model")

    conn = await db.get(Connection, model_item.connection_id)
    if not conn:
        raise HTTPException(status_code=404, detail="Không tìm thấy kết nối tương ứng")

    api_key = decrypt_api_key(conn.api_key_encrypted)
    adapter = create_adapter(
        provider_type=conn.provider_type,
        base_url=conn.base_url,
        api_key=api_key,
        model_id=model_item.model_id,
        extra_headers=json.loads(conn.headers_json or "{}")
    )

    suite = BenchmarkSuite(adapter, conn.id, model_item.model_id)
    results = await suite.run_suite(level=data.level)

    # 1. Save benchmark record
    bm_id = str(uuid.uuid4())
    bm = ModelBenchmark(
        id=bm_id,
        model_id=model_item.id,
        connection_id=conn.id,
        status=results.get("status", "failed"),
        coding_score=results.get("coding_score", 0.0),
        reasoning_score=results.get("reasoning_score", 0.0),
        tools_score=results.get("tools_score", 0.0),
        ttft_ms=results.get("ttft_ms", 0.0),
        tps=results.get("tps", 0.0),
        total_time_ms=results.get("avg_latency_ms", 0.0),
        raw_results_json=json.dumps(results.get("tests", [])),
        tested_at=utcnow_str()
    )
    db.add(bm)

    # 2. Update ModelCapabilityProfile
    cap_stmt = select(ModelCapabilityProfile).where(ModelCapabilityProfile.model_id == model_item.id)
    cap_res = await db.execute(cap_stmt)
    cap_profile = cap_res.scalars().first()

    caps = results.get("capabilities_profile", {})
    if not cap_profile:
        cap_profile = ModelCapabilityProfile(
            id=f"{model_item.id}_cap",
            model_id=model_item.id,
            chat=caps.get("chat", "UNKNOWN"),
            streaming=caps.get("streaming", "UNKNOWN"),
            native_tool_calling=caps.get("native_tool_calling", "UNKNOWN"),
            json_output=caps.get("json_output", "UNKNOWN"),
            structured_output=caps.get("json_output", "UNKNOWN"),
            updated_at=utcnow_str()
        )
        db.add(cap_profile)
    else:
        cap_profile.chat = caps.get("chat", cap_profile.chat)
        cap_profile.streaming = caps.get("streaming", cap_profile.streaming)
        cap_profile.native_tool_calling = caps.get("native_tool_calling", cap_profile.native_tool_calling)
        cap_profile.json_output = caps.get("json_output", cap_profile.json_output)
        cap_profile.structured_output = caps.get("json_output", cap_profile.structured_output)
        cap_profile.updated_at = utcnow_str()

    # 3. Update model status
    model_item.status = "ready" if results.get("status") in ("passed", "partial") else "error"
    model_item.last_tested = utcnow_str()
    if caps.get("native_tool_calling") == "VERIFIED":
        model_item.supports_tools = True

    await db.commit()

    return {
        "benchmark_id": bm_id,
        "model_id": model_item.id,
        "results": results,
        "capabilities_profile": caps
    }

@router.post("/compare")
async def compare_models(data: CompareRequest, db: AsyncSession = Depends(get_db)):
    if not data.model_ids:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp danh sách model_ids để so sánh")

    comparison_results = []
    for m_id in data.model_ids:
        model_item = await db.get(ModelItem, m_id)
        if not model_item:
            continue

        bm_stmt = select(ModelBenchmark).where(ModelBenchmark.model_id == m_id).order_by(ModelBenchmark.tested_at.desc())
        bm_res = await db.execute(bm_stmt)
        latest_bm = bm_res.scalars().first()

        cap_stmt = select(ModelCapabilityProfile).where(ModelCapabilityProfile.model_id == m_id)
        cap_res = await db.execute(cap_stmt)
        cap = cap_res.scalars().first()

        comparison_results.append({
            "model_id": model_item.id,
            "raw_model_id": model_item.model_id,
            "display_name": model_item.display_name,
            "rpm_limit": model_item.rpm_limit,
            "tpm_limit": model_item.tpm_limit,
            "coding_score": latest_bm.coding_score if latest_bm else 0.0,
            "reasoning_score": latest_bm.reasoning_score if latest_bm else 0.0,
            "tools_score": latest_bm.tools_score if latest_bm else 0.0,
            "ttft_ms": latest_bm.ttft_ms if latest_bm else 0.0,
            "tps": latest_bm.tps if latest_bm else 0.0,
            "status": latest_bm.status if latest_bm else "untested",
            "capabilities": {
                "native_tool_calling": cap.native_tool_calling if cap else ("VERIFIED" if model_item.supports_tools else "UNKNOWN"),
                "json_output": cap.json_output if cap else "VERIFIED",
                "vision": cap.vision if cap else ("VERIFIED" if model_item.supports_vision else "UNSUPPORTED"),
                "streaming": cap.streaming if cap else "VERIFIED",
            }
        })

    return comparison_results

@router.get("/history")
async def get_benchmark_history(db: AsyncSession = Depends(get_db)):
    stmt = select(ModelBenchmark, ModelItem).join(ModelItem, ModelBenchmark.model_id == ModelItem.id).order_by(ModelBenchmark.tested_at.desc()).limit(50)
    res = await db.execute(stmt)
    items = res.all()
    output = []
    for bm, m in items:
        output.append({
            "id": bm.id,
            "model_id": m.model_id,
            "display_name": m.display_name,
            "status": bm.status,
            "coding_score": bm.coding_score,
            "reasoning_score": bm.reasoning_score,
            "tools_score": bm.tools_score,
            "ttft_ms": bm.ttft_ms,
            "tps": bm.tps,
            "tested_at": bm.tested_at,
            "details": json.loads(bm.raw_results_json or "[]")
        })
    return output
