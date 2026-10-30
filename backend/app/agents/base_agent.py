import json
import uuid
import time
from typing import Dict, Any, List, Optional, AsyncGenerator
from pydantic import BaseModel
from app.providers.base_adapter import BaseModelAdapter, ChatMessage, GenerationConfig
from app.tools.tool_registry import global_tool_registry
from app.router.rate_limiter import global_request_manager

class AgentEvent(BaseModel):
    event_type: str # "thought", "plan", "tool_start", "tool_end", "error", "message", "done"
    content: str
    data: Optional[Dict[str, Any]] = None
    timestamp: float = 0.0

class BaseAgent:
    def __init__(
        self,
        adapter: BaseModelAdapter,
        connection_id: str,
        model_id: str,
        workspace_root: str,
        system_prompt: str,
        supports_tools: bool = True
    ):
        self.adapter = adapter
        self.connection_id = connection_id
        self.model_id = model_id
        self.workspace_root = workspace_root
        self.system_prompt = system_prompt
        self.supports_tools = supports_tools
        self.history: List[ChatMessage] = []

    async def run_step(self, user_instruction: str, max_turns: int = 10) -> AsyncGenerator[AgentEvent, None]:
        # Initialize conversation
        if not self.history:
            sys_content = self.system_prompt
            if not self.supports_tools:
                # Append JSON fallback instructions
                sys_content += "\n\n" + global_tool_registry.get_tools_prompt_description()
            self.history.append(ChatMessage(role="system", content=sys_content))

        self.history.append(ChatMessage(role="user", content=user_instruction))
        
        turn = 0
        while turn < max_turns:
            turn += 1
            tools_def = global_tool_registry.get_openai_tool_definitions() if self.supports_tools else None
            config = GenerationConfig(
                temperature=0.2,
                max_tokens=4096,
                stream=False,
                tools=tools_def
            )

            # Execute via RequestManager with RPM/TPM limiter & retry
            async def _call():
                try:
                    return await self.adapter.chat(self.history, config)
                except ValueError as e:
                    if "TOOLS_UNSUPPORTED" in str(e):
                        # Switch to JSON fallback on the fly
                        self.supports_tools = False
                        fallback_sys = self.system_prompt + "\n\n" + global_tool_registry.get_tools_prompt_description()
                        self.history[0] = ChatMessage(role="system", content=fallback_sys)
                        config_fallback = GenerationConfig(temperature=0.2, max_tokens=4096, stream=False)
                        return await self.adapter.chat(self.history, config_fallback)
                    raise

            try:
                resp = await global_request_manager.execute_request(
                    self.connection_id,
                    self.model_id,
                    _call
                )
            except Exception as e:
                yield AgentEvent(event_type="error", content=f"Lỗi API từ NVIDIA: {str(e)}", timestamp=time.time())
                return

            # Record token usage
            if resp.usage:
                tokens_count = resp.usage.get("total_tokens", 0)
                global_request_manager.record_usage(self.connection_id, self.model_id, tokens_count)

            content = resp.content or ""
            tool_calls = resp.tool_calls

            # Check JSON fallback if no native tool calls
            if not tool_calls and not self.supports_tools:
                tool_calls = global_tool_registry.parse_json_fallback_calls(content)

            # If there's text content, stream it
            if content:
                yield AgentEvent(event_type="message", content=content, timestamp=time.time())

            if not tool_calls:
                # Model finished its turn without calling tools
                self.history.append(ChatMessage(role="assistant", content=content))
                yield AgentEvent(event_type="done", content="Hoàn thành tác vụ.", timestamp=time.time())
                break

            # Execute tool calls
            self.history.append(ChatMessage(role="assistant", content=content, tool_calls=tool_calls))

            for tc in tool_calls:
                func_data = tc.get("function", {})
                func_name = func_data.get("name") or tc.get("name")
                raw_args = func_data.get("arguments") or tc.get("arguments") or "{}"
                call_id = tc.get("id") or f"call_{uuid.uuid4().hex[:8]}"

                try:
                    args = json.loads(raw_args) if isinstance(raw_args, str) else raw_args
                except Exception:
                    args = {}

                yield AgentEvent(
                    event_type="tool_start",
                    content=f"Thực thi công cụ `{func_name}`...",
                    data={"tool": func_name, "parameters": args, "call_id": call_id},
                    timestamp=time.time()
                )

                # Execute
                tool_res = await global_tool_registry.execute_tool(func_name, args, self.workspace_root)

                result_output = tool_res.output if tool_res.success else f"LỖI: {tool_res.error}"

                yield AgentEvent(
                    event_type="tool_end",
                    content=f"Kết quả công cụ `{func_name}`: {'Thành công' if tool_res.success else 'Thất bại'}",
                    data={"tool": func_name, "success": tool_res.success, "output": result_output, "call_id": call_id},
                    timestamp=time.time()
                )

                # Append tool result to history
                self.history.append(ChatMessage(
                    role="tool",
                    name=func_name,
                    content=result_output,
                    tool_call_id=call_id
                ))
