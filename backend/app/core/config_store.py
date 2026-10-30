import os
import json
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path
from app.config import CONFIG_DIR
from app.core.security import encrypt_api_key, decrypt_api_key, mask_api_key

logger = logging.getLogger(__name__)

PROVIDERS_FILE = CONFIG_DIR / "providers.json"
MODELS_FILE = CONFIG_DIR / "models.json"
ADAPTERS_FILE = CONFIG_DIR / "adapters.json"
ROUTING_FILE = CONFIG_DIR / "routing.json"
BENCHMARK_FILE = CONFIG_DIR / "benchmark.json"

DEFAULT_ADAPTERS = {
    "nvidia": {
        "id": "nvidia",
        "name": "NVIDIA NIM",
        "description": "NVIDIA API Catalog & NIM Microservices",
        "default_base_url": "https://integrate.api.nvidia.com/v1",
        "protocol": "openai",
        "auth_method": "bearer",
        "auth_header": "Authorization",
        "auth_prefix": "Bearer ",
        "discovery_endpoint": "/models",
        "discovery_method": "GET",
        "supports_discovery": True,
        "supports_streaming": True,
        "supports_tools": True,
        "supports_vision": True
    },
    "openai": {
        "id": "openai",
        "name": "OpenAI Official",
        "description": "OpenAI Models (GPT-4o, o1, o3-mini, etc.)",
        "default_base_url": "https://api.openai.com/v1",
        "protocol": "openai",
        "auth_method": "bearer",
        "auth_header": "Authorization",
        "auth_prefix": "Bearer ",
        "discovery_endpoint": "/models",
        "discovery_method": "GET",
        "supports_discovery": True,
        "supports_streaming": True,
        "supports_tools": True,
        "supports_vision": True
    },
    "anthropic": {
        "id": "anthropic",
        "name": "Anthropic Claude",
        "description": "Anthropic Claude Models (Claude 3.7 Sonnet, Claude 3.5 Haiku, etc.)",
        "default_base_url": "https://api.anthropic.com/v1",
        "protocol": "anthropic",
        "auth_method": "x-api-key",
        "auth_header": "x-api-key",
        "auth_prefix": "",
        "discovery_endpoint": "/models",
        "discovery_method": "GET",
        "supports_discovery": True,
        "supports_streaming": True,
        "supports_tools": True,
        "supports_vision": True,
        "extra_headers": {
            "anthropic-version": "2023-06-01"
        }
    },
    "gemini": {
        "id": "gemini",
        "name": "Google Gemini",
        "description": "Google Gemini via OpenAI-compatible endpoint or v1beta",
        "default_base_url": "https://generativelanguage.googleapis.com/v1beta/openai",
        "protocol": "openai",
        "auth_method": "bearer",
        "auth_header": "Authorization",
        "auth_prefix": "Bearer ",
        "discovery_endpoint": "/models",
        "discovery_method": "GET",
        "supports_discovery": True,
        "supports_streaming": True,
        "supports_tools": True,
        "supports_vision": True
    },
    "openai_compatible": {
        "id": "openai_compatible",
        "name": "OpenAI-Compatible (OpenRouter, Groq, Ollama, vLLM, DeepSeek)",
        "description": "Bất kỳ endpoint nào tuân thủ chuẩn OpenAI v1 API",
        "default_base_url": "https://openrouter.ai/api/v1",
        "protocol": "openai",
        "auth_method": "bearer",
        "auth_header": "Authorization",
        "auth_prefix": "Bearer ",
        "discovery_endpoint": "/models",
        "discovery_method": "GET",
        "supports_discovery": True,
        "supports_streaming": True,
        "supports_tools": True,
        "supports_vision": True
    },
    "custom": {
        "id": "custom",
        "name": "Custom Provider",
        "description": "Cấu hình tùy chỉnh URL, header và phương thức xác thực",
        "default_base_url": "http://localhost:8000/v1",
        "protocol": "openai",
        "auth_method": "bearer",
        "auth_header": "Authorization",
        "auth_prefix": "Bearer ",
        "discovery_endpoint": "/models",
        "discovery_method": "GET",
        "supports_discovery": True,
        "supports_streaming": True,
        "supports_tools": True,
        "supports_vision": True
    }
}

DEFAULT_ROUTING = {
    "default_model": "auto",
    "roles": {
        "chat": "auto",
        "agentic_coding": "auto",
        "planning": "auto",
        "coding": "auto",
        "debugging": "auto",
        "vision": "auto",
        "benchmark": "auto"
    },
    "auto_router_policy": {
        "prefer_reasoning": True,
        "prefer_low_latency": False,
        "respect_rpm_limits": True,
        "fallback_enabled": True
    }
}

DEFAULT_BENCHMARK = {
    "levels": {
        "quick": {
            "name": "Nhanh (Quick)",
            "tests": ["connection", "basic_chat", "streaming"]
        },
        "standard": {
            "name": "Tiêu chuẩn (Standard)",
            "tests": ["connection", "basic_chat", "streaming", "ttft", "coding", "reasoning", "json"]
        },
        "full": {
            "name": "Toàn diện (Full)",
            "tests": ["connection", "basic_chat", "streaming", "ttft", "tps", "coding", "reasoning", "json", "tools", "stability"]
        }
    },
    "scoring_weights": {
        "coding": 0.35,
        "reasoning": 0.30,
        "tools": 0.20,
        "latency": 0.15
    }
}


class ConfigStore:
    """
    Quản lý các tệp cấu hình JSON độc lập trong thư mục ổn định của ứng dụng:
    - providers.json (API Key mã hóa DPAPI)
    - models.json
    - adapters.json
    - routing.json
    - benchmark.json
    """

    @classmethod
    def initialize(cls):
        """Khởi tạo các file cấu hình mặc định nếu chưa tồn tại"""
        try:
            if not ADAPTERS_FILE.exists():
                cls.save_adapters(DEFAULT_ADAPTERS)
            if not ROUTING_FILE.exists():
                cls.save_routing(DEFAULT_ROUTING)
            if not BENCHMARK_FILE.exists():
                cls.save_benchmark(DEFAULT_BENCHMARK)
            if not PROVIDERS_FILE.exists():
                cls.save_providers([])
            if not MODELS_FILE.exists():
                cls.save_models([])
            logger.info(f"ConfigStore khởi tạo hoàn tất tại {CONFIG_DIR}")
        except Exception as e:
            logger.error(f"Lỗi khởi tạo ConfigStore: {e}")

    # ================= Providers =================
    @classmethod
    def load_providers(cls) -> List[Dict[str, Any]]:
        try:
            if PROVIDERS_FILE.exists():
                with open(PROVIDERS_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Lỗi đọc {PROVIDERS_FILE}: {e}")
        return []

    @classmethod
    def save_providers(cls, providers: List[Dict[str, Any]]):
        """Lưu danh sách providers, bảo đảm API key được mã hóa DPAPI an toàn"""
        safe_providers = []
        for p in providers:
            p_copy = dict(p)
            raw_key = p_copy.get("api_key") or ""
            # Encrypt key if not already encrypted
            if raw_key and not raw_key.startswith("dpapi::"):
                p_copy["api_key_encrypted"] = encrypt_api_key(raw_key)
            else:
                p_copy["api_key_encrypted"] = raw_key
            # Never store plaintext api_key in JSON!
            p_copy.pop("api_key", None)
            safe_providers.append(p_copy)

        try:
            with open(PROVIDERS_FILE, "w", encoding="utf-8") as f:
                json.dump(safe_providers, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Lỗi ghi {PROVIDERS_FILE}: {e}")

    # ================= Models =================
    @classmethod
    def load_models(cls) -> List[Dict[str, Any]]:
        try:
            if MODELS_FILE.exists():
                with open(MODELS_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Lỗi đọc {MODELS_FILE}: {e}")
        return []

    @classmethod
    def save_models(cls, models: List[Dict[str, Any]]):
        try:
            with open(MODELS_FILE, "w", encoding="utf-8") as f:
                json.dump(models, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Lỗi ghi {MODELS_FILE}: {e}")

    # ================= Adapters =================
    @classmethod
    def load_adapters(cls) -> Dict[str, Any]:
        try:
            if ADAPTERS_FILE.exists():
                with open(ADAPTERS_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Lỗi đọc {ADAPTERS_FILE}: {e}")
        return DEFAULT_ADAPTERS

    @classmethod
    def save_adapters(cls, adapters: Dict[str, Any]):
        try:
            with open(ADAPTERS_FILE, "w", encoding="utf-8") as f:
                json.dump(adapters, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Lỗi ghi {ADAPTERS_FILE}: {e}")

    # ================= Routing =================
    @classmethod
    def load_routing(cls) -> Dict[str, Any]:
        try:
            if ROUTING_FILE.exists():
                with open(ROUTING_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Lỗi đọc {ROUTING_FILE}: {e}")
        return DEFAULT_ROUTING

    @classmethod
    def save_routing(cls, routing: Dict[str, Any]):
        try:
            with open(ROUTING_FILE, "w", encoding="utf-8") as f:
                json.dump(routing, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Lỗi ghi {ROUTING_FILE}: {e}")

    # ================= Benchmark =================
    @classmethod
    def load_benchmark(cls) -> Dict[str, Any]:
        try:
            if BENCHMARK_FILE.exists():
                with open(BENCHMARK_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Lỗi đọc {BENCHMARK_FILE}: {e}")
        return DEFAULT_BENCHMARK

    @classmethod
    def save_benchmark(cls, benchmark_cfg: Dict[str, Any]):
        try:
            with open(BENCHMARK_FILE, "w", encoding="utf-8") as f:
                json.dump(benchmark_cfg, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Lỗi ghi {BENCHMARK_FILE}: {e}")
