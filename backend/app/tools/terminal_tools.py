import asyncio
import os
import re
from typing import Dict, Any, List
from app.tools.base import BaseTool, ToolResult

DANGEROUS_COMMAND_PATTERNS = [
    r"\brmdir\s+/s",
    r"\bdel\s+/f",
    r"\bformat\b",
    r"\bdiskpart\b",
    r"\breg\s+delete\b",
    r"\bRemove-Item\s+-Recurse\s+-Force\b",
    r"\bStop-Computer\b",
    r"\bRestart-Computer\b",
    r"\bdrop\s+database\b",
    r":\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:", # fork bomb
]

def is_dangerous_command(command: str) -> bool:
    for pattern in DANGEROUS_COMMAND_PATTERNS:
        if re.search(pattern, command, re.IGNORECASE):
            return True
    return False

class RunTerminalTool(BaseTool):
    name = "run_terminal"
    description = "Thực thi lệnh PowerShell hoặc CLI trong thư mục workspace với giới hạn an toàn và timeout."
    parameters = {
        "type": "object",
        "properties": {
            "command": {"type": "string", "description": "Lệnh dòng lệnh cần thực thi (PowerShell/CMD)"},
            "timeout_seconds": {"type": "integer", "description": "Thời gian tối đa tính bằng giây (mặc định 60s)"}
        },
        "required": ["command"]
    }

    async def execute(self, params: Dict[str, Any], workspace_root: str) -> ToolResult:
        cmd = params["command"].strip()
        timeout = min(int(params.get("timeout_seconds", 60)), 300)

        # Check hazardous commands
        if is_dangerous_command(cmd):
            return ToolResult(
                success=False,
                output="",
                error="Lệnh chứa cú pháp nguy hiểm tiềm ẩn có thể gây hỏng hệ thống và bị từ chối tự động.",
                requires_confirmation=True,
                confirmation_message=f"Lệnh nguy hiểm yêu cầu người dùng xác nhận trực tiếp: {cmd}"
            )

        try:
            # Execute command using powershell with utf-8 encoding
            powershell_cmd = f"chcp 65001 >$null; {cmd}"
            proc = await asyncio.create_subprocess_exec(
                "powershell.exe",
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                powershell_cmd,
                cwd=workspace_root,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            try:
                stdout_bytes, stderr_bytes = await asyncio.wait_for(proc.communicate(), timeout=timeout)
            except asyncio.TimeoutError:
                try:
                    proc.kill()
                except Exception:
                    pass
                return ToolResult(success=False, output="", error=f"Lệnh bị timeout sau {timeout} giây.")

            stdout = stdout_bytes.decode("utf-8", errors="replace")
            stderr = stderr_bytes.decode("utf-8", errors="replace")
            exit_code = proc.returncode

            combined_output = ""
            if stdout:
                combined_output += stdout
            if stderr:
                if combined_output:
                    combined_output += "\n--- STDERR ---\n"
                combined_output += stderr

            # Truncate if output too long
            if len(combined_output) > 32768:
                combined_output = combined_output[:32768] + "\n\n... [Đầu ra quá dài, đã rút gọn] ..."

            success = (exit_code == 0)
            return ToolResult(
                success=success,
                output=combined_output if combined_output else "(Không có đầu ra)",
                error=None if success else f"Lệnh kết thúc với mã lỗi {exit_code}",
                data={"exit_code": exit_code}
            )

        except Exception as e:
            return ToolResult(success=False, output="", error=f"Không thể khởi chạy tiến trình: {str(e)}")
