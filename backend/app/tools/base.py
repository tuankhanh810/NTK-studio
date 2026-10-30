from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pydantic import BaseModel

class ToolResult(BaseModel):
    success: bool
    output: str
    error: Optional[str] = None
    requires_confirmation: bool = False
    confirmation_message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

class BaseTool(ABC):
    name: str
    description: str
    parameters: Dict[str, Any]
    requires_approval: bool = False

    @abstractmethod
    async def execute(self, params: Dict[str, Any], workspace_root: str) -> ToolResult:
        pass

    def to_openai_schema(self) -> Dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters
            }
        }
