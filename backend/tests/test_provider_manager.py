import pytest
import os
import sys
import json
from contextlib import asynccontextmanager
from unittest.mock import patch, AsyncMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.models import Base, Connection, ModelItem, ModelCapabilityProfile
from app.providers.provider_manager import ProviderManager
from app.core.config_store import ConfigStore
from app.router.model_router import AdvancedModelRouter

@asynccontextmanager
async def get_test_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session
    await engine.dispose()

@pytest.mark.asyncio
async def test_add_and_get_providers():
    async with get_test_session() as session:
        # 1. Add NVIDIA provider
        p1 = await ProviderManager.add_connection(
            session,
            name="NVIDIA Official",
            base_url="https://integrate.api.nvidia.com/v1",
            api_key="nvapi-test-key-12345",
            provider_type="nvidia"
        )
        assert p1["name"] == "NVIDIA Official"
        assert p1["provider_type"] == "nvidia"
        assert "..." in p1["api_key_masked"]

        # 2. Add Anthropic provider
        p2 = await ProviderManager.add_connection(
            session,
            name="Anthropic Production",
            base_url="https://api.anthropic.com/v1",
            api_key="sk-ant-test-key-9999",
            provider_type="anthropic"
        )
        assert p2["provider_type"] == "anthropic"

        # 3. Add OpenAI provider
        p3 = await ProviderManager.add_connection(
            session,
            name="OpenAI Prod",
            base_url="https://api.openai.com/v1",
            api_key="sk-proj-test-key-4444",
            provider_type="openai"
        )
        assert p3["provider_type"] == "openai"

        # Verify list
        all_conns = await ProviderManager.get_connections(session)
        assert len(all_conns) == 3
        types = [c["provider_type"] for c in all_conns]
        assert "nvidia" in types
        assert "anthropic" in types
        assert "openai" in types

        # Check persistence in ConfigStore
        stored_providers = ConfigStore.load_providers()
        assert len(stored_providers) >= 3

@pytest.mark.asyncio
async def test_connection_test_invalid_url():
    async with get_test_session() as session:
        p = await ProviderManager.add_connection(
            session,
            name="Invalid URL Provider",
            base_url="invalid_url_without_http",
            api_key="test-key",
            provider_type="custom"
        )
        res = await ProviderManager.connect_and_discover(session, p["id"])
        assert res["success"] is False
        assert res["step_failed"] == 1
        assert "Base URL không hợp lệ" in res["message"]

@pytest.mark.asyncio
async def test_manual_model_add_and_probe_verified():
    async with get_test_session() as session:
        conn = await ProviderManager.add_connection(
            session,
            name="NIM Custom",
            base_url="https://integrate.api.nvidia.com/v1",
            api_key="nvapi-valid-probe-key",
            provider_type="nvidia"
        )

        with patch("app.providers.nvidia_adapter.NvidiaAdapter.probe_model", new_callable=AsyncMock) as mock_probe:
            mock_probe.return_value = {
                "success": True,
                "model_id": "deepseek-ai/deepseek-r1",
                "latency_ms": 120.5,
                "message": "Model phản hồi thành công (Đã xác minh quyền truy cập)."
            }

            result = await ProviderManager.add_manual_model(
                session,
                connection_id=conn["id"],
                model_id="deepseek-ai/deepseek-r1",
                display_name="DeepSeek R1 Official",
                probe=True
            )

            assert result["verification_status"] == "VERIFIED"
            assert result["status"] == "ready"
            assert result["probe_result"]["success"] is True

@pytest.mark.asyncio
async def test_manual_model_add_and_probe_unsupported():
    async with get_test_session() as session:
        conn = await ProviderManager.add_connection(
            session,
            name="NIM Custom 2",
            base_url="https://integrate.api.nvidia.com/v1",
            api_key="nvapi-restricted-key",
            provider_type="nvidia"
        )

        with patch("app.providers.nvidia_adapter.NvidiaAdapter.probe_model", new_callable=AsyncMock) as mock_probe:
            mock_probe.return_value = {
                "success": False,
                "model_id": "meta/llama-3.1-405b-instruct",
                "message": "Lỗi truy cập model: 403 Forbidden"
            }

            result = await ProviderManager.add_manual_model(
                session,
                connection_id=conn["id"],
                model_id="meta/llama-3.1-405b-instruct",
                display_name="Llama 3.1 405B",
                probe=True
            )

            assert result["verification_status"] == "UNSUPPORTED"
            assert result["status"] == "error"

@pytest.mark.asyncio
async def test_role_based_routing():
    async with get_test_session() as session:
        conn = await ProviderManager.add_connection(
            session,
            name="Multi Provider",
            base_url="https://integrate.api.nvidia.com/v1",
            api_key="test-key",
            provider_type="nvidia"
        )
        models = [
            {"model_id": "deepseek-ai/deepseek-r1", "display_name": "DeepSeek R1", "supports_tools": True},
            {"model_id": "qwen/qwen2.5-coder-32b-instruct", "display_name": "Qwen 2.5 Coder", "supports_tools": True}
        ]
        await ProviderManager.add_models_batch(session, conn["id"], models)

        item_id_coder = f"{conn['id']}_qwen__qwen2.5-coder-32b-instruct"
        routing = ConfigStore.load_routing()
        routing["roles"]["coding"] = item_id_coder
        ConfigStore.save_routing(routing)

        selected = await AdvancedModelRouter.route_model(
            session,
            prompt="Viết code Python kiểm thử",
            role="coding"
        )
        assert selected["model_item"].id == item_id_coder
        assert "Vai trò chỉ định" in selected["reason"]
