from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.core.database import get_db
from app.providers.provider_manager import ProviderManager

router = APIRouter(prefix="/api/connections", tags=["Connections / Providers"])

class ConnectionCreate(BaseModel):
    name: str
    base_url: str = "https://integrate.api.nvidia.com/v1"
    api_key: str
    provider_type: str = "nvidia"
    headers: Optional[Dict[str, str]] = None

class ConnectionUpdate(BaseModel):
    name: Optional[str] = None
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    provider_type: Optional[str] = None
    is_active: Optional[bool] = None
    headers: Optional[Dict[str, str]] = None

class BatchModelsAdd(BaseModel):
    models: List[Dict[str, Any]]

class ManualModelAdd(BaseModel):
    model_id: str
    display_name: Optional[str] = None
    probe: bool = True

@router.get("")
async def get_all_connections(db: AsyncSession = Depends(get_db)):
    return await ProviderManager.get_connections(db)

@router.post("")
async def create_connection(data: ConnectionCreate, db: AsyncSession = Depends(get_db)):
    if not data.api_key.strip() and data.provider_type != "openai_compatible":
        raise HTTPException(status_code=400, detail="API Key không được để trống")
    return await ProviderManager.add_connection(
        db,
        name=data.name,
        base_url=data.base_url,
        api_key=data.api_key,
        provider_type=data.provider_type,
        headers=data.headers
    )

@router.put("/{conn_id}")
async def update_connection(conn_id: str, data: ConnectionUpdate, db: AsyncSession = Depends(get_db)):
    updated = await ProviderManager.update_connection(
        db,
        conn_id,
        name=data.name,
        base_url=data.base_url,
        api_key=data.api_key,
        provider_type=data.provider_type,
        is_active=data.is_active,
        headers=data.headers
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhà cung cấp")
    return updated

@router.delete("/{conn_id}")
async def delete_connection(conn_id: str, db: AsyncSession = Depends(get_db)):
    deleted = await ProviderManager.delete_connection(db, conn_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhà cung cấp")
    return {"success": True}

@router.post("/{conn_id}/test")
@router.post("/{conn_id}/connect")
async def connect_and_test(conn_id: str, db: AsyncSession = Depends(get_db)):
    """Quy trình 7 bước kiểm tra kết nối & Dynamic Discovery"""
    return await ProviderManager.connect_and_discover(db, conn_id)

@router.post("/{conn_id}/refresh-catalog")
async def refresh_catalog(conn_id: str, db: AsyncSession = Depends(get_db)):
    try:
        return await ProviderManager.refresh_catalog(db, conn_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Không thể làm mới danh mục model: {str(e)}")

@router.post("/{conn_id}/models/batch")
async def add_models_batch(conn_id: str, data: BatchModelsAdd, db: AsyncSession = Depends(get_db)):
    try:
        return await ProviderManager.add_models_batch(db, conn_id, data.models)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi thêm model: {str(e)}")

@router.post("/{conn_id}/models/manual")
async def add_manual_model(conn_id: str, data: ManualModelAdd, db: AsyncSession = Depends(get_db)):
    try:
        return await ProviderManager.add_manual_model(
            db,
            conn_id,
            model_id=data.model_id,
            display_name=data.display_name,
            probe=data.probe
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi thêm model thủ công: {str(e)}")
