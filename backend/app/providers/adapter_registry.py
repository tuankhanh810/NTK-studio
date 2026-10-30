from typing import Dict, Any, Optional
from app.providers.base_adapter import BaseModelAdapter
from app.providers.nvidia_adapter import NvidiaAdapter
from app.providers.openai_adapter import OpenAIAdapter, OpenAICompatibleAdapter
from app.providers.anthropic_adapter import AnthropicAdapter
from app.providers.gemini_adapter import GeminiAdapter
from app.providers.custom_adapter import CustomAdapter

def create_adapter(
    provider_type: str,
    base_url: str,
    api_key: str,
    model_id: str,
    extra_headers: Optional[Dict[str, str]] = None
) -> BaseModelAdapter:
    """
    Factory khởi tạo Adapter tương ứng với nhà cung cấp AI:
    - nvidia: NVIDIA NIM Official / On-Premise
    - openai: OpenAI Official
    - anthropic: Anthropic Claude Messages API
    - gemini: Google Gemini (OpenAI protocol endpoint)
    - openai_compatible: OpenRouter, Groq, Ollama, vLLM, DeepSeek...
    - custom: Custom Provider endpoint
    """
    p_type = (provider_type or "nvidia").lower().strip()

    if p_type == "nvidia":
        return NvidiaAdapter(base_url, api_key, model_id, extra_headers)
    elif p_type == "openai":
        return OpenAIAdapter(base_url, api_key, model_id, extra_headers)
    elif p_type == "anthropic":
        return AnthropicAdapter(base_url, api_key, model_id, extra_headers)
    elif p_type == "gemini":
        return GeminiAdapter(base_url, api_key, model_id, extra_headers)
    elif p_type in ("openai_compatible", "openrouter", "ollama", "groq", "vllm", "deepseek"):
        return OpenAICompatibleAdapter(base_url, api_key, model_id, extra_headers)
    elif p_type == "custom":
        return CustomAdapter(base_url, api_key, model_id, extra_headers)
    else:
        # Fallback to OpenAI-compatible
        return OpenAICompatibleAdapter(base_url, api_key, model_id, extra_headers)
