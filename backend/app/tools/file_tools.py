import os
import shutil
from pathlib import Path
from typing import Dict, Any
from app.tools.base import BaseTool, ToolResult
from app.core.security import validate_workspace_path

class ReadFileTool(BaseTool):
    name = "read_file"
    description = "Đọc nội dung một tập tin trong thư mục dự án (workspace)."
    parameters = {
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "Đường dẫn tương đối hoặc tuyệt đối tới file cần đọc"}
        },
        "required": ["path"]
    }

    async def execute(self, params: Dict[str, Any], workspace_root: str) -> ToolResult:
        try:
            target = validate_workspace_path(params["path"], workspace_root)
            if not target.exists():
                return ToolResult(success=False, output="", error=f"File không tồn tại: {target}")
            if not target.is_file():
                return ToolResult(success=False, output="", error=f"Đường dẫn là thư mục, không phải file: {target}")
            
            content = target.read_text(encoding="utf-8", errors="replace")
            # Limit output to 64KB for safety
            if len(content) > 65536:
                content = content[:65536] + "\n\n... [Nội dung quá dài, đã được rút gọn 64KB] ..."
            return ToolResult(success=True, output=content)
        except Exception as e:
            return ToolResult(success=False, output="", error=str(e))

class WriteFileTool(BaseTool):
    name = "write_file"
    description = "Tạo mới hoặc ghi đè toàn bộ nội dung của một file trong workspace."
    parameters = {
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "Đường dẫn file cần ghi"},
            "content": {"type": "string", "description": "Nội dung cần ghi vào file"}
        },
        "required": ["path", "content"]
    }

    async def execute(self, params: Dict[str, Any], workspace_root: str) -> ToolResult:
        try:
            target = validate_workspace_path(params["path"], workspace_root)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(params["content"], encoding="utf-8")
            return ToolResult(success=True, output=f"Đã ghi thành công file: {target.name} ({len(params['content'])} bytes)")
        except Exception as e:
            return ToolResult(success=False, output="", error=str(e))

class EditFileTool(BaseTool):
    name = "edit_file"
    description = "Chỉnh sửa một phần nội dung file bằng cách thay thế đoạn text cũ (old_str) bằng đoạn text mới (new_str)."
    parameters = {
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "Đường dẫn file cần sửa"},
            "old_str": {"type": "string", "description": "Đoạn text hiện tại cần thay thế (phải khớp chính xác)"},
            "new_str": {"type": "string", "description": "Đoạn text mới thay thế vào"}
        },
        "required": ["path", "old_str", "new_str"]
    }

    async def execute(self, params: Dict[str, Any], workspace_root: str) -> ToolResult:
        try:
            target = validate_workspace_path(params["path"], workspace_root)
            if not target.exists():
                return ToolResult(success=False, output="", error=f"File không tồn tại: {target}")
            
            content = target.read_text(encoding="utf-8")
            old_str = params["old_str"]
            new_str = params["new_str"]

            if old_str not in content:
                return ToolResult(success=False, output="", error=f"Không tìm thấy đoạn text 'old_str' trong file: {target.name}")

            occurrences = content.count(old_str)
            if occurrences > 1:
                return ToolResult(success=False, output="", error=f"Đoạn text 'old_str' xuất hiện {occurrences} lần trong file. Vui lòng cung cấp thêm ngữ cảnh xung quanh để xác định duy nhất.")

            new_content = content.replace(old_str, new_str, 1)
            target.write_text(new_content, encoding="utf-8")
            return ToolResult(success=True, output=f"Đã sửa thành công 1 vị trí trong {target.name}")
        except Exception as e:
            return ToolResult(success=False, output="", error=str(e))

class ListDirectoryTool(BaseTool):
    name = "list_directory"
    description = "Liệt kê danh sách các file và thư mục con trong một thư mục."
    parameters = {
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "Đường dẫn thư mục (mặc định là gốc workspace)"}
        }
    }

    async def execute(self, params: Dict[str, Any], workspace_root: str) -> ToolResult:
        try:
            req_path = params.get("path") or "."
            target = validate_workspace_path(req_path, workspace_root)
            if not target.exists() or not target.is_dir():
                return ToolResult(success=False, output="", error=f"Thư mục không tồn tại: {target}")

            items = []
            for item in sorted(target.iterdir()):
                # Ignore common noisy directories
                if item.name in [".git", "node_modules", "__pycache__", ".pytest_cache", "dist", "build", "venv", ".venv"]:
                    continue
                type_str = "[DIR] " if item.is_dir() else "[FILE]"
                size_str = f" ({item.stat().st_size} bytes)" if item.is_file() else ""
                items.append(f"{type_str} {item.name}{size_str}")

            return ToolResult(success=True, output="\n".join(items) if items else "(Thư mục trống)")
        except Exception as e:
            return ToolResult(success=False, output="", error=str(e))

class SearchCodeTool(BaseTool):
    name = "search_code"
    description = "Tìm kiếm chuỗi văn bản hoặc regex trong toàn bộ mã nguồn của workspace."
    parameters = {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "Chuỗi từ khóa cần tìm kiếm"},
            "file_pattern": {"type": "string", "description": "Mẫu đuôi file lọc, ví dụ '*.py', '*.ts' (tùy chọn)"}
        },
        "required": ["query"]
    }

    async def execute(self, params: Dict[str, Any], workspace_root: str) -> ToolResult:
        try:
            ws = Path(workspace_root).resolve()
            query = params["query"]
            pattern = params.get("file_pattern") or "*"
            
            matches = []
            ignored = {".git", "node_modules", "__pycache__", "dist", "build", "venv", ".venv"}

            for root, dirs, files in os.walk(ws):
                dirs[:] = [d for d in dirs if d not in ignored]
                for file in files:
                    if file.startswith("."):
                        continue
                    p = Path(root) / file
                    if not p.match(pattern):
                        continue
                    try:
                        lines = p.read_text(encoding="utf-8", errors="ignore").splitlines()
                        for idx, line in enumerate(lines):
                            if query.lower() in line.lower():
                                rel = p.relative_to(ws)
                                matches.append(f"{rel}:{idx+1}: {line.strip()}")
                                if len(matches) >= 50:
                                    break
                    except Exception:
                        pass
                if len(matches) >= 50:
                    break

            if not matches:
                return ToolResult(success=True, output=f"Không tìm thấy kết quả nào cho từ khóa: '{query}'")
            return ToolResult(success=True, output="\n".join(matches))
        except Exception as e:
            return ToolResult(success=False, output="", error=str(e))

class FindSymbolsTool(BaseTool):
    name = "find_symbols"
    description = "Tìm kiếm định nghĩa Symbol (hàm, class, interface, method) nhanh trong workspace."
    parameters = {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "Tên hàm, class hoặc symbol cần tìm"}
        },
        "required": ["query"]
    }

    async def execute(self, params: Dict[str, Any], workspace_root: str) -> ToolResult:
        try:
            from app.context.context_manager import ContextManager
            results = ContextManager.find_symbols(workspace_root, params["query"])
            if not results:
                return ToolResult(success=True, output=f"Không tìm thấy symbol nào khớp với '{params['query']}'")
            lines = [f"[{r['kind']}] {r['name']} -> {r['file']}:{r['line']} ({r['preview']})" for r in results]
            return ToolResult(success=True, output="\n".join(lines))
        except Exception as e:
            return ToolResult(success=False, output="", error=str(e))

class DeleteFileTool(BaseTool):
    name = "delete_file"
    description = "Xóa một file hoặc thư mục trong workspace (Thao tác nguy hiểm, yêu cầu xác nhận)."
    requires_approval = True
    parameters = {
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "Đường dẫn file hoặc thư mục cần xóa"}
        },
        "required": ["path"]
    }

    async def execute(self, params: Dict[str, Any], workspace_root: str) -> ToolResult:
        try:
            target = validate_workspace_path(params["path"], workspace_root)
            if not target.exists():
                return ToolResult(success=False, output="", error=f"File không tồn tại: {target}")
            
            if target.is_file():
                target.unlink()
                return ToolResult(success=True, output=f"Đã xóa file: {target.name}")
            elif target.is_dir():
                shutil.rmtree(target)
                return ToolResult(success=True, output=f"Đã xóa thư mục: {target.name}")
            return ToolResult(success=False, output="", error="Không thể xác định loại file")
        except Exception as e:
            return ToolResult(success=False, output="", error=str(e))
