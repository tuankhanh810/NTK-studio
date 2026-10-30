import json
import re
from typing import Dict, Any, List, Optional
from app.tools.base import BaseTool, ToolResult
from app.tools.file_tools import ReadFileTool, WriteFileTool, EditFileTool, ListDirectoryTool, SearchCodeTool, DeleteFileTool, FindSymbolsTool
from app.tools.terminal_tools import RunTerminalTool
from app.tools.git_tools import GitStatusTool, GitDiffTool, CreateCheckpointTool, RollbackCheckpointTool

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}
        self._register_default_tools()

    def _register_default_tools(self):
        tools = [
            ReadFileTool(),
            WriteFileTool(),
            EditFileTool(),
            ListDirectoryTool(),
            SearchCodeTool(),
            FindSymbolsTool(),
            DeleteFileTool(),
            RunTerminalTool(),
            GitStatusTool(),
            GitDiffTool(),
            CreateCheckpointTool(),
            RollbackCheckpointTool(),
        ]
        for t in tools:
            self._tools[t.name] = t

    def register_tool(self, tool: BaseTool):
        self._tools[tool.name] = tool

    def get_tool(self, name: str) -> Optional[BaseTool]:
        return self._tools.get(name)

    def get_all_tools(self) -> List[BaseTool]:
        return list(self._tools.values())

    def get_openai_tool_definitions(self) -> List[Dict[str, Any]]:
        return [t.to_openai_schema() for t in self._tools.values()]

    def get_tools_prompt_description(self) -> str:
        """
        Generates prompt describing available tools for models using JSON Fallback.
        """
        lines = ["BẠN CÓ CÁC CÔNG CỤ SAU ĐÂY ĐỂ THỰC THI TRÊN HỆ THỐNG:"]
        for t in self._tools.values():
            params_str = json.dumps(t.parameters.get("properties", {}), ensure_ascii=False)
            lines.append(f"- `{t.name}`: {t.description}\n  Tham số: {params_str}")
        lines.append(
            "\nKHI CẦN GỌI CÔNG CỤ, HÃY TRẢ VỀ DUY NHẤT MỘT KHỐI JSON CÓ ĐỊNH DẠNG:\n"
            "```json\n"
            "{\n"
            '  "tool": "tên_công_cụ",\n'
            '  "parameters": { ... }\n'
            "}\n"
            "```"
        )
        return "\n".join(lines)

    async def execute_tool(self, name: str, params: Dict[str, Any], workspace_root: str) -> ToolResult:
        tool = self.get_tool(name)
        if not tool:
            return ToolResult(success=False, output="", error=f"Công cụ không tồn tại: {name}")
        return await tool.execute(params, workspace_root)

    def parse_json_fallback_calls(self, text: str) -> List[Dict[str, Any]]:
        """
        Extracts tool calls from JSON blocks if the model does not support native function calling.
        """
        calls = []
        # Find json code blocks
        blocks = re.findall(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        for b in blocks:
            try:
                data = json.loads(b)
                if "tool" in data and ("parameters" in data or "args" in data):
                    calls.append({
                        "id": f"call_{len(calls)+1}",
                        "type": "function",
                        "function": {
                            "name": data["tool"],
                            "arguments": json.dumps(data.get("parameters") or data.get("args") or {})
                        }
                    })
            except Exception:
                continue
        return calls

global_tool_registry = ToolRegistry()
