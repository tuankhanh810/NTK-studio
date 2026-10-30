from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List, Dict
from app.core.database import get_db
from app.mcp.mcp_manager import global_mcp_manager

router = APIRouter(prefix="/api/mcp", tags=["MCP"])

class MCPServerCreate(BaseModel):
    name: str
    transport: str = "stdio"
    command: Optional[str] = None
    args: Optional[List[str]] = None
    env: Optional[Dict[str, str]] = None
    url: Optional[str] = None

@router.get("/servers")
async def list_servers(db: AsyncSession = Depends(get_db)):
    return await global_mcp_manager.get_servers(db)

@router.post("/servers")
async def add_server(data: MCPServerCreate, db: AsyncSession = Depends(get_db)):
    return await global_mcp_manager.add_server(
        session=db,
        name=data.name,
        transport=data.transport,
        command=data.command,
        args=data.args,
        env=data.env,
        url=data.url
    )

@router.delete("/servers/{server_id}")
async def remove_server(server_id: str, db: AsyncSession = Depends(get_db)):
    deleted = await global_mcp_manager.remove_server(db, server_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Không tìm thấy MCP Server")
    return {"success": True}
