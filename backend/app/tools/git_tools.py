import asyncio
import os
import shutil
import time
from pathlib import Path
from typing import Dict, Any, List
from app.tools.base import BaseTool, ToolResult
from app.config import CHECKPOINTS_DIR

class GitStatusTool(BaseTool):
    name = "git_status"
    description = "Kiểm tra trạng thái thay đổi các file trong kho mã nguồn Git của workspace."
    parameters = {
        "type": "object",
        "properties": {}
    }

    async def execute(self, params: Dict[str, Any], workspace_root: str) -> ToolResult:
        try:
            proc = await asyncio.create_subprocess_exec(
                "git", "status", "--porcelain",
                cwd=workspace_root,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()
            if proc.returncode != 0:
                return ToolResult(success=False, output="", error=f"Lỗi Git: {stderr.decode('utf-8', errors='ignore')}")
            
            output = stdout.decode("utf-8", errors="replace").strip()
            return ToolResult(success=True, output=output if output else "(Không có thay đổi nào chưa commit)")
        except Exception as e:
            return ToolResult(success=False, output="", error=str(e))

class GitDiffTool(BaseTool):
    name = "git_diff"
    description = "Xem sự khác biệt (diff) giữa các thay đổi hiện tại so với commit gần nhất."
    parameters = {
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "File cụ thể cần xem diff (để trống nếu xem toàn bộ)"}
        }
    }

    async def execute(self, params: Dict[str, Any], workspace_root: str) -> ToolResult:
        try:
            args = ["git", "diff"]
            if params.get("path"):
                args.append(params["path"])
            proc = await asyncio.create_subprocess_exec(
                *args,
                cwd=workspace_root,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()
            if proc.returncode != 0:
                return ToolResult(success=False, output="", error=stderr.decode("utf-8", errors="ignore"))
            diff_text = stdout.decode("utf-8", errors="replace")
            return ToolResult(success=True, output=diff_text if diff_text else "(Không có sự khác biệt)")
        except Exception as e:
            return ToolResult(success=False, output="", error=str(e))

class CreateCheckpointTool(BaseTool):
    name = "create_checkpoint"
    description = "Tạo một điểm lưu an toàn (checkpoint) của các file trong workspace trước khi thực hiện thay đổi lớn."
    parameters = {
        "type": "object",
        "properties": {
            "description": {"type": "string", "description": "Mô tả lý do tạo checkpoint"}
        },
        "required": ["description"]
    }

    async def execute(self, params: Dict[str, Any], workspace_root: str) -> ToolResult:
        try:
            ts = int(time.time())
            desc = params["description"].strip()
            chk_id = f"chk_{ts}"
            snapshot_dir = CHECKPOINTS_DIR / chk_id
            snapshot_dir.mkdir(parents=True, exist_ok=True)

            # Copy relevant workspace files (excluding ignored)
            ws = Path(workspace_root).resolve()
            copied_files = []
            ignored = {".git", "node_modules", "__pycache__", "dist", "build", "venv", ".venv"}

            for root, dirs, files in os.walk(ws):
                dirs[:] = [d for d in dirs if d not in ignored]
                for f in files:
                    src_p = Path(root) / f
                    rel_p = src_p.relative_to(ws)
                    dest_p = snapshot_dir / rel_p
                    dest_p.parent.mkdir(parents=True, exist_ok=True)
                    try:
                        shutil.copy2(src_p, dest_p)
                        copied_files.append(str(rel_p))
                    except Exception:
                        pass

            return ToolResult(
                success=True,
                output=f"Đã tạo checkpoint thành công: {chk_id} ({len(copied_files)} files được sao lưu).",
                data={"checkpoint_id": chk_id, "snapshot_dir": str(snapshot_dir), "files_count": len(copied_files)}
            )
        except Exception as e:
            return ToolResult(success=False, output="", error=str(e))

class RollbackCheckpointTool(BaseTool):
    name = "rollback_checkpoint"
    description = "Khôi phục toàn bộ các file trong workspace về trạng thái của một checkpoint đã lưu trước đó."
    requires_approval = True
    parameters = {
        "type": "object",
        "properties": {
            "checkpoint_id": {"type": "string", "description": "Mã ID checkpoint cần khôi phục (vd: chk_1730000000)"}
        },
        "required": ["checkpoint_id"]
    }

    async def execute(self, params: Dict[str, Any], workspace_root: str) -> ToolResult:
        chk_id = params["checkpoint_id"].strip()
        snapshot_dir = CHECKPOINTS_DIR / chk_id
        if not snapshot_dir.exists() or not snapshot_dir.is_dir():
            return ToolResult(success=False, output="", error=f"Không tìm thấy checkpoint {chk_id}")

        try:
            ws = Path(workspace_root).resolve()
            restored = []
            for root, _, files in os.walk(snapshot_dir):
                for f in files:
                    snap_file = Path(root) / f
                    rel_p = snap_file.relative_to(snapshot_dir)
                    target_file = ws / rel_p
                    target_file.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(snap_file, target_file)
                    restored.append(str(rel_p))

            return ToolResult(
                success=True,
                output=f"Đã khôi phục thành công {len(restored)} files về checkpoint {chk_id}.",
                data={"restored_files_count": len(restored)}
            )
        except Exception as e:
            return ToolResult(success=False, output="", error=f"Lỗi khi khôi phục checkpoint: {str(e)}")

