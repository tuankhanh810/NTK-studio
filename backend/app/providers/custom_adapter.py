import json
from typing import Dict, Any, List, Optional
from app.providers.openai_adapter import OpenAIAdapter

class CustomAdapter(OpenAIAdapter):
    """
    Adapter cho nhà cung cấp AI tùy chỉnh (Custom Provider / Private NIM / Local Ollama / vLLM).
    Cho phép tùy biến URL, header và phương thức xác thực.
    """
    def __init__(self, base_url: str, api_key: str, model_id: str, extra_headers: Optional[Dict[str, str]] = None):
        super().__init__(base_url, api_key, model_id, extra_headers)
        # Custom providers might have custom auth headers
        if "Authorization" not in self.extra_headers and self.api_key:
            self.extra_headers["Authorization"] = f"Bearer {self.api_key}"
