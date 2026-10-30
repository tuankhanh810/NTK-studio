from abc import ABC, abstractmethod
from typing import AsyncGenerator, Dict, Any, List, Optional
from pydantic import BaseModel

class ChatMessage(BaseModel):
    role: str
    content: str
    name: Optional[str] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_call_id: Optional[str] = None

class GenerationConfig(BaseModel):
    temperature: float = 0.2
    max_tokens: int = 4096
    top_p: float = 0.95
    stream: bool = True
    tools: Optional[List[Dict[str, Any]]] = None
    tool_choice: Optional[str] = None
    response_format: Optional[Dict[str, Any]] = None # e.g. {"type": "json_object"}

class StreamChunk(BaseModel):
    content: str = ""
    delta_tool_calls: Optional[List[Dict[str, Any]]] = None
    finish_reason: Optional[str] = None
    usage: Optional[Dict[str, int]] = None

class ChatResponse(BaseModel):
    content: str
    tool_calls: Optional[List[Dict[str, Any]]] = None
    finish_reason: Optional[str] = None
    usage: Dict[str, int] = {}
    model_id: str
    latency_ms: float = 0.0

class BaseModelAdapter(ABC):
    def __init__(self, base_url: str, api_key: str, model_id: str, extra_headers: Optional[Dict[str, str]] = None):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model_id = model_id
        self.extra_headers = extra_headers or {}

    @abstractmethod
    async def chat(self, messages: List[ChatMessage], config: GenerationConfig) -> ChatResponse:
        """Send chat messages and return complete response"""
        pass

    @abstractmethod
    async def stream(self, messages: List[ChatMessage], config: GenerationConfig) -> AsyncGenerator[StreamChunk, None]:
        """Stream response chunks"""
        pass

    @abstractmethod
    async def test_connection(self) -> Dict[str, Any]:
        """Test API connection with a lightweight probe"""
        pass

    @abstractmethod
    async def fetch_catalog(self) -> List[Dict[str, Any]]:
        """Fetch list of available models from endpoint"""
        pass

    async def probe_model(self, model_id: str) -> Dict[str, Any]:
        """Send a minimal inference probe to verify model access permissions"""
        try:
            old_model = self.model_id
            self.model_id = model_id
            messages = [ChatMessage(role="user", content="Hi")]
            cfg = GenerationConfig(max_tokens=2, stream=False, temperature=0.1)
            resp = await self.chat(messages, cfg)
            self.model_id = old_model
            return {
                "success": True,
                "model_id": model_id,
                "latency_ms": resp.latency_ms,
                "message": "Model phản hồi thành công (Đã xác minh quyền truy cập)."
            }
        except Exception as e:
            return {
                "success": False,
                "model_id": model_id,
                "message": f"Lỗi truy cập model: {str(e)}"
            }

    def count_tokens(self, messages: List[ChatMessage]) -> int:
        """Estimate token count (approx. 4 chars per token)"""
        total_chars = sum(len(m.content or "") for m in messages)
        return max(1, total_chars // 4)
