import asyncio
import time
from typing import Dict, Any, List, Optional, AsyncGenerator
from app.providers.base_adapter import BaseModelAdapter
from app.agents.base_agent import BaseAgent, AgentEvent
from app.context.context_manager import ContextManager
from app.context.project_memory import ProjectMemoryStore
from app.tools.tool_registry import global_tool_registry
from sqlalchemy.ext.asyncio import AsyncSession

COORDINATOR_SYSTEM_PROMPT = """Bạn là NTK Studio Agent 1.1.0 – Kỹ sư phần mềm AI Agentic cao cấp.
Bạn có quyền truy cập trực tiếp vào hệ thống file, symbol indexing và terminal của dự án.

QUY TRÌNH LÀM VIỆC (AGENTIC CODING WORKFLOW):
1. KHẢO SÁT: Đọc cấu trúc thư mục, tìm kiếm symbols bằng `find_symbols` hoặc `search_code` trước khi sửa.
2. AN TOÀN: Khi thực hiện thay đổi trên nhiều file, hãy chủ động gọi `create_checkpoint` để tạo điểm lưu trữ dự phòng.
3. CHỈNH SỬA: Ưu tiên dùng `edit_file` (thay thế chuỗi text chính xác) hoặc `write_file` nếu tạo mới.
4. AUTO-DEBUG: Sau khi chỉnh sửa, hãy gọi `run_terminal` để chạy test hoặc build. Nếu gặp lỗi, tự động phân tích traceback, sửa lại file và chạy lại test (tối đa 3 lần).
5. MINH BẠCH: Trình bày rõ ràng kế hoạch, lý do chọn công cụ và kết quả đạt được.
6. NGÔN NGỮ: Luôn giao tiếp bằng TIẾNG VIỆT rõ ràng, chuyên nghiệp. Tuyệt đối không dùng tiếng Trung.
"""

class AgentCoordinator:
    def __init__(
        self,
        adapter: BaseModelAdapter,
        connection_id: str,
        model_id: str,
        workspace_root: str,
        supports_tools: bool = True
    ):
        self.agent = BaseAgent(
            adapter=adapter,
            connection_id=connection_id,
            model_id=model_id,
            workspace_root=workspace_root,
            system_prompt=COORDINATOR_SYSTEM_PROMPT,
            supports_tools=supports_tools
        )
        self.workspace_root = workspace_root

    async def execute_task(
        self,
        task_instruction: str,
        session: Optional[AsyncSession] = None,
        enable_auto_debug: bool = True
    ) -> AsyncGenerator[AgentEvent, None]:
        # 1. Gather context
        yield AgentEvent(event_type="plan", content="[Context Manager 1.1.0] Đang lập bản đồ dự án và nạp bộ nhớ...", timestamp=time.time())
        summary = ContextManager.get_workspace_summary(self.workspace_root)

        memory_text = ""
        if session:
            memory_text = await ProjectMemoryStore.format_memory_for_prompt(session, self.workspace_root)

        context_prompt = (
            f"THÔNG TIN DỰ ÁN:\n"
            f"- Thư mục gốc: {summary.get('root_name')}\n"
            f"- Ngôn ngữ / Framework phát hiện: {', '.join(summary.get('detected_frameworks', []))}\n"
            f"- Tổng số files: {summary.get('total_files')}\n"
            f"- Cây thư mục tóm tắt:\n```\n{summary.get('tree_text', '')}\n```\n"
        )
        if memory_text:
            context_prompt += f"\n{memory_text}\n"

        full_instruction = f"{context_prompt}\n\nYÊU CẦU LẬP TRÌNH TỪ NGƯỜI DÙNG:\n{task_instruction}"

        # 2. Run agent execution loop
        debug_attempts = 0
        max_debug_turns = 3

        async for event in self.agent.run_step(full_instruction, max_turns=14):
            yield event

            # If tool execution failed in a terminal test run and auto-debug is enabled
            if enable_auto_debug and event.event_type == "tool_end" and event.data and not event.data.get("success"):
                tool_name = event.data.get("tool", "")
                if tool_name in ("run_terminal", "run_command", "run_powershell") and debug_attempts < max_debug_turns:
                    debug_attempts += 1
                    err_msg = event.data.get("output", "")
                    yield AgentEvent(
                        event_type="plan",
                        content=f"[Auto-Debug Loop #{debug_attempts}] Phát hiện lỗi terminal. Đang tự động phân tích traceback để sửa...",
                        timestamp=time.time()
                    )
                    fix_prompt = f"Lệnh vừa chạy thất bại với lỗi sau:\n```\n{err_msg}\n```\nHãy phân tích nguyên nhân gốc rễ, sửa các file liên quan và thử chạy lại."
                    async for fix_event in self.agent.run_step(fix_prompt, max_turns=6):
                        yield fix_event
