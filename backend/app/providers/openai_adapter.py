import json
import time
import httpx
from typing import AsyncGenerator, Dict, Any, List, Optional
from app.providers.base_adapter import BaseModelAdapter, ChatMessage, GenerationConfig, StreamChunk, ChatResponse
from app.providers.nvidia_adapter import NvidiaAdapter

class OpenAIAdapter(NvidiaAdapter):
    """
    Adapter cho OpenAI Official (GPT-4o, GPT-4o-mini, o1, o3-mini, etc.)
    và các endpoint tương thích OpenAI v1.
    """
    def _get_headers(self, is_stream: bool = False) -> Dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "NTK-Studio/1.1"
        }
        if is_stream:
            headers["Accept"] = "text/event-stream"
        else:
            headers["Accept"] = "application/json"
        headers.update(self.extra_headers)
        return headers

    async def fetch_catalog(self) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/models"
        headers = self._get_headers(is_stream=False)
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                raise RuntimeError(f"OpenAI API Error {resp.status_code}: {resp.text}")
            data = resp.json()
            models_list = data.get("data", [])
            # Lọc bớt các model embedding / tts / dall-e không phải chat nếu cần
            chat_models = []
            for m in models_list:
                m_id = m.get("id", "")
                # Thêm tất cả hoặc ưu tiên chat
                chat_models.append(m)
            return chat_models


class OpenAICompatibleAdapter(OpenAIAdapter):
    """
    Adapter cho các dịch vụ OpenAI-compatible (OpenRouter, Groq, Ollama, vLLM, DeepSeek, Together AI...)
    """
    pass
