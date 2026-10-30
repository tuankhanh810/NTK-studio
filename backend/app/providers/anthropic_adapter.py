import json
import time
import httpx
from typing import AsyncGenerator, Dict, Any, List, Optional
from app.providers.base_adapter import BaseModelAdapter, ChatMessage, GenerationConfig, StreamChunk, ChatResponse

class AnthropicAdapter(BaseModelAdapter):
    """
    Adapter cho Anthropic Claude API (https://api.anthropic.com/v1)
    Hỗ trợ Claude 3.7 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus...
    """

    def _get_headers(self, is_stream: bool = False) -> Dict[str, str]:
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
            "User-Agent": "NTK-Studio/1.1"
        }
        if is_stream:
            headers["Accept"] = "text/event-stream"
        else:
            headers["Accept"] = "application/json"
        headers.update(self.extra_headers)
        return headers

    def _prepare_payload(self, messages: List[ChatMessage], config: GenerationConfig) -> Dict[str, Any]:
        system_prompt = ""
        user_assistant_msgs = []

        for m in messages:
            if m.role == "system":
                system_prompt += (m.content + "\n")
            elif m.role in ("user", "assistant"):
                user_assistant_msgs.append({
                    "role": m.role,
                    "content": m.content
                })
            elif m.role == "tool":
                # Convert tool output to user message with tool result
                user_assistant_msgs.append({
                    "role": "user",
                    "content": f"[Kết quả công cụ {m.name or m.tool_call_id}]: {m.content}"
                })

        # Anthropic requires at least 1 message and max_tokens
        if not user_assistant_msgs:
            user_assistant_msgs.append({"role": "user", "content": "Hello"})

        payload: Dict[str, Any] = {
            "model": self.model_id or "claude-3-7-sonnet-20250219",
            "messages": user_assistant_msgs,
            "max_tokens": config.max_tokens or 4096,
            "temperature": config.temperature,
            "top_p": config.top_p,
            "stream": config.stream
        }
        if system_prompt.strip():
            payload["system"] = system_prompt.strip()

        # Tools support for Anthropic if configured
        if config.tools:
            anthropic_tools = []
            for t in config.tools:
                fn = t.get("function", {})
                anthropic_tools.append({
                    "name": fn.get("name"),
                    "description": fn.get("description", ""),
                    "input_schema": fn.get("parameters", {"type": "object", "properties": {}})
                })
            payload["tools"] = anthropic_tools

        return payload

    async def fetch_catalog(self) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/models"
        headers = self._get_headers(is_stream=False)
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    models_data = data.get("data", [])
                    if models_data:
                        return models_data
        except Exception:
            pass

        # Fallback to standard active Anthropic models if /models endpoint is restricted
        return [
            {"id": "claude-3-7-sonnet-20250219", "display_name": "Claude 3.7 Sonnet (Hybrid Reasoning)"},
            {"id": "claude-3-5-sonnet-20241022", "display_name": "Claude 3.5 Sonnet (v2)"},
            {"id": "claude-3-5-haiku-20241022", "display_name": "Claude 3.5 Haiku"},
            {"id": "claude-3-opus-20240229", "display_name": "Claude 3 Opus"}
        ]

    async def test_connection(self) -> Dict[str, Any]:
        start_time = time.time()
        url = f"{self.base_url}/models"
        headers = self._get_headers(is_stream=False)
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, headers=headers)
                latency = round((time.time() - start_time) * 1000, 2)
                if resp.status_code == 200:
                    models = resp.json().get("data", [])
                    return {
                        "success": True,
                        "latency_ms": latency,
                        "model_count": len(models),
                        "message": f"Kết nối Anthropic thành công. Tìm thấy {len(models)} models."
                    }
                elif resp.status_code == 401:
                    return {
                        "success": False,
                        "latency_ms": latency,
                        "message": "x-api-key Anthropic không hợp lệ hoặc đã hết hạn (401 Unauthorized)."
                    }
                else:
                    # Try minimal message probe to verify key
                    probe_url = f"{self.base_url}/messages"
                    probe_payload = {
                        "model": "claude-3-5-haiku-20241022",
                        "max_tokens": 1,
                        "messages": [{"role": "user", "content": "hi"}]
                    }
                    probe_resp = await client.post(probe_url, headers=headers, json=probe_payload)
                    if probe_resp.status_code in (200, 400): # 200 or bad request on model means auth is valid
                        return {
                            "success": True,
                            "latency_ms": latency,
                            "model_count": 4,
                            "message": "Xác thực API Key Anthropic thành công."
                        }
                    return {
                        "success": False,
                        "latency_ms": latency,
                        "message": f"Lỗi phản hồi HTTP {resp.status_code}: {resp.text[:200]}"
                    }
        except httpx.RequestError as e:
            return {
                "success": False,
                "latency_ms": round((time.time() - start_time) * 1000, 2),
                "message": f"Không thể kết nối đến máy chủ Anthropic: {str(e)}"
            }

    async def chat(self, messages: List[ChatMessage], config: GenerationConfig) -> ChatResponse:
        start_time = time.time()
        url = f"{self.base_url}/messages"
        config.stream = False
        payload = self._prepare_payload(messages, config)
        headers = self._get_headers(is_stream=False)

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            latency = (time.time() - start_time) * 1000
            if resp.status_code != 200:
                raise RuntimeError(f"Anthropic API Error {resp.status_code}: {resp.text}")

            data = resp.json()
            content_blocks = data.get("content", [])
            full_text = "".join(b.get("text", "") for b in content_blocks if b.get("type") == "text")
            
            # Tool calls extraction
            tool_calls = []
            for b in content_blocks:
                if b.get("type") == "tool_use":
                    tool_calls.append({
                        "id": b.get("id"),
                        "type": "function",
                        "function": {
                            "name": b.get("name"),
                            "arguments": json.dumps(b.get("input", {}))
                        }
                    })

            usage = data.get("usage", {})
            return ChatResponse(
                content=full_text,
                tool_calls=tool_calls if tool_calls else None,
                finish_reason=data.get("stop_reason"),
                usage={
                    "prompt_tokens": usage.get("input_tokens", 0),
                    "completion_tokens": usage.get("output_tokens", 0),
                    "total_tokens": usage.get("input_tokens", 0) + usage.get("output_tokens", 0)
                },
                model_id=data.get("model", self.model_id),
                latency_ms=round(latency, 2)
            )

    async def stream(self, messages: List[ChatMessage], config: GenerationConfig) -> AsyncGenerator[StreamChunk, None]:
        url = f"{self.base_url}/messages"
        config.stream = True
        payload = self._prepare_payload(messages, config)
        headers = self._get_headers(is_stream=True)

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as resp:
                if resp.status_code != 200:
                    err_body = await resp.aread()
                    raise RuntimeError(f"Anthropic Streaming Error {resp.status_code}: {err_body.decode('utf-8')}")

                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    if line.startswith("data: "):
                        data_str = line[6:].strip()
                        if not data_str:
                            continue
                        try:
                            chunk_json = json.loads(data_str)
                            c_type = chunk_json.get("type")
                            if c_type == "content_block_delta":
                                delta = chunk_json.get("delta", {})
                                if delta.get("type") == "text_delta":
                                    yield StreamChunk(content=delta.get("text", ""))
                            elif c_type == "message_delta":
                                stop_reason = chunk_json.get("delta", {}).get("stop_reason")
                                yield StreamChunk(finish_reason=stop_reason)
                        except json.JSONDecodeError:
                            continue
