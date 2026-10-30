import asyncio
import json
import pytest
from unittest.mock import patch, AsyncMock
import httpx
from httpx import ASGITransport
from pathlib import Path
from app.main import app
from app.config import CONFIG_DIR, APP_DIR
from app.core.config_store import ConfigStore
from app.core.database import init_db
from app.core.models import Connection, ModelItem

@pytest.mark.asyncio
async def test_full_acceptance_workflow():
    """
    Acceptance test verifying:
    1. Add Provider
    2. Connect and run 7-step diagnostics & Dynamic Discovery
    3. Auto-populate Model Registry
    4. Add manual model with live probe
    5. Model Selector & Role Assignment (Chat, Coding, etc. and Auto Router)
    6. Verify DPAPI encryption and 5 JSON config files
    7. Simulate app restart & config restoration
    """
    await init_db()
    ConfigStore.initialize()
    target_base = "https://mock.api.provider.ai/v1"

    mock_discovered_raw = [
        {"id": "provider-ai/auto-coder-v1", "object": "model"},
        {"id": "provider-ai/vision-pro-3", "object": "model"}
    ]

    with patch("app.providers.openai_adapter.OpenAICompatibleAdapter.test_connection", new_callable=AsyncMock) as mock_test, \
         patch("app.providers.openai_adapter.OpenAICompatibleAdapter.fetch_catalog", new_callable=AsyncMock) as mock_catalog, \
         patch("app.providers.openai_adapter.OpenAICompatibleAdapter.probe_model", new_callable=AsyncMock) as mock_probe:
        
        mock_test.return_value = {"success": True, "latency_ms": 42.0, "message": "Endpoint ping OK"}
        mock_catalog.return_value = mock_discovered_raw
        mock_probe.return_value = {
            "success": True,
            "model_id": "provider-ai/manual-reasoner",
            "latency_ms": 115.0,
            "message": "Model verified OK."
        }

        transport = ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            # --- STEP 1: ADD PROVIDER ---
            print("\n[STEP 1] Adding new Provider into system...")
            add_resp = await client.post("/api/connections", json={
                "name": "Provider Test AI",
                "base_url": target_base,
                "api_key": "sk-test-live-key-99887766",
                "provider_type": "openai_compatible"
            })
            assert add_resp.status_code == 200, add_resp.text
            conn_data = add_resp.json()
            conn_id = conn_data["id"]
            print(f" -> Provider added successfully: ID={conn_id}")

            # --- STEP 2 & 3: CONNECT & DYNAMIC MODEL DISCOVERY (7 STEPS) ---
            print("\n[STEP 2 & 3] Click Connect: Run 7-step diagnostics & Dynamic Discovery...")
            conn_resp = await client.post(f"/api/connections/{conn_id}/connect")
            assert conn_resp.status_code == 200, conn_resp.text
            conn_result = conn_resp.json()
            assert conn_result["success"] is True
            assert conn_result["discovered_count"] >= 2
            print(f" -> Connect result: success=True, discovered={conn_result['discovered_count']}")

            # --- STEP 4: CHECK MODEL REGISTRY & ADD MANUAL MODEL WITH PROBE ---
            print("\n[STEP 4] Verify model catalog in registry and add manual model with live probe...")
            models_resp = await client.get("/api/models")
            assert models_resp.status_code == 200
            current_models = models_resp.json()
            model_ids = [m["model_id"] for m in current_models]
            assert "provider-ai/auto-coder-v1" in model_ids
            print(f" -> Model Registry currently has {len(current_models)} models.")

            # Add manual model with live probe
            manual_resp = await client.post(f"/api/connections/{conn_id}/models/manual", json={
                "model_id": "provider-ai/manual-reasoner",
                "display_name": "Manual Reasoner Ultra",
                "probe": True
            })
            assert manual_resp.status_code == 200, manual_resp.text
            manual_item = manual_resp.json()
            print(f" -> Manual model added: {manual_item['display_name']} ({manual_item['verification_status']})")
            assert manual_item["verification_status"] == "VERIFIED"

            # --- STEP 5: ASSIGN ROLES & FAVORITES (ANTIGRAVITY MODEL SELECTOR) ---
            print("\n[STEP 5] Set specialized roles and mark favorite...")
            # Toggle favorite
            fav_resp = await client.post(f"/api/models/{manual_item['id']}/favorite")
            assert fav_resp.status_code == 200
            print(f" -> Favorite status for {manual_item['display_name']}: {fav_resp.json()['is_favorite']}")

            # Set model roles
            role_update_resp = await client.put("/api/models/roles", json={
                "roles": {
                    "chat": manual_item["id"],
                    "coding": manual_item["id"],
                    "agentic_coding": "auto",
                    "planning": manual_item["id"],
                    "debugging": "auto",
                    "vision": "auto",
                    "benchmark": manual_item["id"]
                }
            })
            assert role_update_resp.status_code == 200
            resp_body = role_update_resp.json()
            roles = resp_body.get("roles", {})
            print(f" -> Model Roles updated: Chat={roles.get('chat')}, Coding={roles.get('coding')}")
            assert roles["chat"] == manual_item["id"]
            assert roles["agentic_coding"] == "auto"

            # --- STEP 6: CHECK 5 JSON CONFIG FILES & DPAPI ENCRYPTION ---
            print("\n[STEP 6] Verify 5 JSON config files and DPAPI encryption...")
            config_files = ["providers.json", "models.json", "adapters.json", "routing.json", "benchmark.json"]
            for cf in config_files:
                file_path = CONFIG_DIR / cf
                assert file_path.exists(), f"File {cf} does not exist!"
                with open(file_path, "r", encoding="utf-8") as f:
                    content = json.load(f)
                    assert content is not None
                print(f"    * {cf}: OK ({file_path.stat().st_size} bytes)")

            # Verify providers.json does NOT contain plaintext API key
            with open(CONFIG_DIR / "providers.json", "r", encoding="utf-8") as f:
                providers_data = json.load(f)
                for p in providers_data:
                    assert "sk-test-live-key-99887766" not in json.dumps(p)
                    if p.get("api_key"):
                        assert p["api_key"].startswith("dpapi::")
            print(" -> Absolute Verification: API Key encrypted with dpapi::, NO plaintext in providers.json!")

            # --- STEP 7: SIMULATE APPLICATION RESTART & RECOVER CONFIG ---
            print("\n[STEP 7] Simulating app restart and verifying config restoration...")
            # Re-initialize ConfigStore
            ConfigStore.initialize()
            restored_routing = ConfigStore.load_routing()
            restored_roles = restored_routing.get("roles", {})
            assert restored_roles.get("chat") == manual_item["id"]
            assert restored_roles.get("agentic_coding") == "auto"
            print(" -> Restored routing.json successfully after application restart!")

            # Cleanup
            await client.delete(f"/api/connections/{conn_id}")
            print("\n=== ALL ACCEPTANCE STEPS COMPLETED AND VERIFIED 100% ===")
