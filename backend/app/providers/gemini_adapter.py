import json
import httpx
from typing import Dict, Any, List
from app.providers.openai_adapter import OpenAIAdapter

class GeminiAdapter(OpenAIAdapter):
    """
    Adapter cho Google Gemini qua endpoint tương thích OpenAI:
    https://generativelanguage.googleapis.com/v1beta/openai
    Hỗ trợ Gemini 2.5 Pro, Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash...
    """

    async def fetch_catalog(self) -> List[Dict[str, Any]]:
        # Try OpenAI models endpoint
        url = f"{self.base_url}/models"
        headers = self._get_headers(is_stream=False)
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    models_list = data.get("data", [])
                    if models_list:
                        return models_list
        except Exception:
            pass

        # Fallback standard Gemini models
        return [
            {"id": "gemini-2.0-flash", "display_name": "Gemini 2.0 Flash (Next-Gen Multimodal)"},
            {"id": "gemini-1.5-pro", "display_name": "Gemini 1.5 Pro (2M Context Window)"},
            {"id": "gemini-1.5-flash", "display_name": "Gemini 1.5 Flash (Fast & Lightweight)"},
            {"id": "gemini-2.0-flash-thinking-exp-01-21", "display_name": "Gemini 2.0 Flash Thinking (Reasoning)"}
        ]
