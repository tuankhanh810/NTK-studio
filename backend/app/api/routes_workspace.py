from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from pathlib import Path
from app.context.context_manager import ContextManager
from app.core.security import validate_workspace_path
from app.tools.tool_registry import global_tool_registry

router = APIRouter(prefix="/api/workspace", tags=["Workspace"])

class FileContentPayload(BaseModel):
    workspace_root: str
    path: str
    content: str

class FileReadPayload(BaseModel):
    workspace_root: str
    path: str

class TerminalExecPayload(BaseModel):
    workspace_root: str
    command: str

class CheckpointCreatePayload(BaseModel):
    workspace_root: str
    description: str

class CheckpointRollbackPayload(BaseModel):
    workspace_root: str
    checkpoint_id: str

@router.get("/tree")
async def get_workspace_tree(root: str = Query(..., description="Đường dẫn thư mục workspace")):
    summary = ContextManager.get_workspace_summary(root)
    if "error" in summary:
        raise HTTPException(status_code=400, detail=summary["error"])
    return summary

@router.get("/symbols")
async def find_symbols(root: str = Query(...), q: str = Query(...)):
    return ContextManager.find_symbols(root, q)

@router.post("/file/read")
async def read_workspace_file(payload: FileReadPayload):
    try:
        p = validate_workspace_path(payload.path, payload.workspace_root)
        if not p.exists() or not p.is_file():
            raise HTTPException(status_code=404, detail="File không tồn tại")
        content = p.read_text(encoding="utf-8", errors="replace")
        return {"path": payload.path, "content": content}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/file/write")
async def write_workspace_file(payload: FileContentPayload):
    try:
        p = validate_workspace_path(payload.path, payload.workspace_root)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(payload.content, encoding="utf-8")
        return {"success": True, "message": f"Đã lưu file {p.name}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/terminal/exec")
async def exec_terminal_cmd(payload: TerminalExecPayload):
    res = await global_tool_registry.execute_tool(
        "run_terminal",
        {"command": payload.command},
        payload.workspace_root
    )
    return {
        "success": res.success,
        "output": res.output,
        "error": res.error,
        "requires_confirmation": res.requires_confirmation
    }

@router.get("/git/status")
async def get_git_status(root: str = Query(...)):
    res = await global_tool_registry.execute_tool("git_status", {}, root)
    return {"output": res.output, "success": res.success}

@router.get("/git/diff")
async def get_git_diff(root: str = Query(...), path: Optional[str] = None):
    res = await global_tool_registry.execute_tool("git_diff", {"path": path} if path else {}, root)
    return {"diff": res.output, "success": res.success}

@router.post("/checkpoint/create")
async def create_checkpoint(payload: CheckpointCreatePayload):
    res = await global_tool_registry.execute_tool(
        "create_checkpoint",
        {"description": payload.description},
        payload.workspace_root
    )
    return {"success": res.success, "output": res.output, "data": res.data}

@router.post("/checkpoint/rollback")
async def rollback_checkpoint(payload: CheckpointRollbackPayload):
    res = await global_tool_registry.execute_tool(
        "rollback_checkpoint",
        {"checkpoint_id": payload.checkpoint_id},
        payload.workspace_root
    )
    return {"success": res.success, "output": res.output, "data": res.data}
