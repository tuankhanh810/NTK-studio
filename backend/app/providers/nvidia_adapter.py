import json
import time
import httpx
from typing import AsyncGenerator, Dict, Any, List, Optional
from app.providers.base_adapter import BaseModelAdapter, ChatMessage, GenerationConfig, StreamChunk, ChatResponse

class NvidiaAdapter(BaseModelAdapter):
    """
    Adapter for NVIDIA API (NVIDIA NIM endpoints).
    Default endpoint: https://integrate.api.nvidia.com/v1
    """

    def _get_headers(self, is_stream: bool = False) -> Dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "NTK-Studio/1.0"
        }
        if is_stream:
            headers["Accept"] = "text/event-stream"
        else:
            headers["Accept"] = "application/json"
        
        headers.update(self.extra_headers)
        return headers

    def _prepare_payload(self, messages: List[ChatMessage], config: GenerationConfig) -> Dict[str, Any]:
        msg_payloads = []
        for m in messages:
            item: Dict[str, Any] = {"role": m.role, "content": m.content}
            if m.name:
                item["name"] = m.name
            if m.tool_calls:
                item["tool_calls"] = m.tool_calls
            if m.tool_call_id:
                item["tool_call_id"] = m.tool_call_id
            msg_payloads.append(item)

        payload: Dict[str, Any] = {
            "model": self.model_id,
            "messages": msg_payloads,
            "temperature": config.temperature,
            "max_tokens": config.max_tokens,
            "top_p": config.top_p,
            "stream": config.stream
        }

        if config.tools:
            payload["tools"] = config.tools
            if config.tool_choice:
                payload["tool_choice"] = config.tool_choice

        if config.response_format:
            payload["response_format"] = config.response_format

        return payload

    async def fetch_catalog(self) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/models"
        headers = self._get_headers(is_stream=False)
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                raise RuntimeError(f"NVIDIA API Error {resp.status_code}: {resp.text}")
            data = resp.json()
            models_list = data.get("data", [])
            return models_list

    async def test_connection(self) -> Dict[str, Any]:
        start_time = time.time()
        url = f"{self.base_url}/models"
        headers = self._get_headers(is_stream=False)
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, headers=headers)
                latency = (time.time() - start_time) * 1000
                if resp.status_code == 200:
                    models = resp.json().get("data", [])
                    return {
                        "success": True,
                        "latency_ms": round(latency, 2),
                        "model_count": len(models),
                        "message": f"Kết nối thành công. Tìm thấy {len(models)} models."
                    }
                elif resp.status_code == 401:
                    return {
                        "success": False,
                        "latency_ms": round(latency, 2),
                        "message": "API Key không hợp lệ hoặc đã hết hạn (401 Unauthorized)."
                    }
                else:
                    return {
                        "success": False,
                        "latency_ms": round(latency, 2),
                        "message": f"Lỗi endpoint HTTP {resp.status_code}: {resp.text[:200]}"
                    }
        except httpx.RequestError as e:
            return {
                "success": False,
                "latency_ms": round((time.time() - start_time) * 1000, 2),
                "message": f"Không thể kết nối đến endpoint: {str(e)}"
            }

    async def chat(self, messages: List[ChatMessage], config: GenerationConfig) -> ChatResponse:
        url = f"{self.base_url}/chat/completions"
        config_no_stream = config.model_copy(update={"stream": False})
        payload = self._prepare_payload(messages, config_no_stream)
        headers = self._get_headers(is_stream=False)

        start_time = time.time()
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            latency = (time.time() - start_time) * 1000

            if resp.status_code == 429:
                retry_after = resp.headers.get("Retry-After", "10")
                raise RuntimeError(f"429: Rate limit exceeded. Retry after {retry_after}s")
            if resp.status_code != 200:
                # If error is due to tools not supported, raise specific message for fallback
                err_text = resp.text
                if "tools" in err_text.lower() or "unsupported" in err_text.lower():
                    raise ValueError(f"TOOLS_UNSUPPORTED: {err_text}")
                raise RuntimeError(f"HTTP {resp.status_code}: {err_text}")

            data = resp.json()
            choice = data["choices"][0]
            message = choice["message"]
            content = message.get("content") or ""
            tool_calls = message.get("tool_calls")
            finish_reason = choice.get("finish_reason")
            usage = data.get("usage", {})

            return ChatResponse(
                content=content,
                tool_calls=tool_calls,
                finish_reason=finish_reason,
                usage=usage,
                model_id=self.model_id,
                latency_ms=round(latency, 2)
            )

    async def stream(self, messages: List[ChatMessage], config: GenerationConfig) -> AsyncGenerator[StreamChunk, None]:
        url = f"{self.base_url}/chat/completions"
        config_stream = config.model_copy(update={"stream": True})
        payload = self._prepare_payload(messages, config_stream)
        headers = self._get_headers(is_stream=True)

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as response:
                if response.status_code == 429:
                    retry_after = response.headers.get("Retry-After", "10")
                    raise RuntimeError(f"429: Rate limit exceeded. Retry after {retry_after}s")
                if response.status_code != 200:
                    err_body = await response.aread()
                    err_text = err_body.decode("utf-8", errors="ignore")
                    if "tools" in err_text.lower() or "unsupported" in err_text.lower():
                        raise ValueError(f"TOOLS_UNSUPPORTED: {err_text}")
                    raise RuntimeError(f"HTTP {response.status_code}: {err_text}")

                async for line in response.aiter_lines():
                    line = line.strip()
                    if not line or not line.startswith("data:"):
                        continue
                    data_str = line[5:].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk_json = json.loads(data_str)
                        choices = chunk_json.get("choices", [])
                        if not choices:
                            # Maybe usage event
                            usage = chunk_json.get("usage")
                            if usage:
                                yield StreamChunk(usage=usage)
                            continue
                        choice = choices[0]
                        delta = choice.get("delta", {})
                        content = delta.get("content") or ""
                        delta_tool_calls = delta.get("tool_calls")
                        finish_reason = choice.get("finish_reason")
                        usage = chunk_json.get("usage")

                        yield StreamChunk(
                            content=content,
                            delta_tool_calls=delta_tool_calls,
                            finish_reason=finish_reason,
                            usage=usage
                        )
                    except json.JSONDecodeError:
                        continue
