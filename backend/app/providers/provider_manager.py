import uuid
import json
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.core.models import Connection, ModelItem, RateLimitConfig, ModelCapabilityProfile, utcnow_str
from app.core.security import encrypt_api_key, decrypt_api_key, mask_api_key, log_security_audit
from app.core.config_store import ConfigStore
from app.providers.adapter_registry import create_adapter
from app.config import config

logger = logging.getLogger(__name__)

class ProviderManager:
    """
    Quản lý các nhà cung cấp AI (Provider Manager) & Dynamic Model Discovery:
    Hỗ trợ NVIDIA NIM, OpenAI, Anthropic, Google Gemini, OpenAI-compatible và Custom Providers.
    Tự động đồng bộ hóa với SQLite database và các tệp providers.json, models.json.
    """

    @staticmethod
    async def get_connections(session: AsyncSession) -> List[Dict[str, Any]]:
        result = await session.execute(select(Connection))
        connections = result.scalars().all()
        output = []
        for c in connections:
            decrypted = decrypt_api_key(c.api_key_encrypted)
            # Count models for this connection
            m_count_res = await session.execute(select(ModelItem).where(ModelItem.connection_id == c.id))
            m_count = len(m_count_res.scalars().all())

            output.append({
                "id": c.id,
                "name": c.name,
                "provider_type": c.provider_type,
                "base_url": c.base_url,
                "api_key_masked": mask_api_key(decrypted),
                "is_active": c.is_active,
                "status": getattr(c, "status", "untested") or "untested",
                "last_checked": getattr(c, "last_checked", None),
                "models_count": m_count,
                "headers": json.loads(c.headers_json or "{}"),
                "created_at": c.created_at,
                "updated_at": c.updated_at
            })
        # Sync to providers.json
        try:
            ConfigStore.save_providers(output)
        except Exception as e:
            logger.warning(f"Không thể đồng bộ providers.json: {e}")

        return output

    @staticmethod
    async def add_connection(
        session: AsyncSession,
        name: str,
        base_url: str,
        api_key: str,
        provider_type: str = "nvidia",
        headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        conn_id = str(uuid.uuid4())
        encrypted_key = encrypt_api_key(api_key.strip())
        headers_str = json.dumps(headers or {})

        conn = Connection(
            id=conn_id,
            name=name.strip(),
            provider_type=provider_type.lower().strip(),
            base_url=base_url.strip(),
            api_key_encrypted=encrypted_key,
            is_active=True,
            status="untested",
            headers_json=headers_str
        )
        session.add(conn)

        # Default rate limit config
        rl = RateLimitConfig(
            id=str(uuid.uuid4()),
            connection_id=conn_id,
            max_rpm=config.default_rpm_limit,
            max_tpm=config.default_tpm_limit,
            safety_margin_rpm=config.rpm_safety_margin,
            safety_margin_tpm=config.tpm_safety_margin
        )
        session.add(rl)

        await session.commit()
        log_security_audit("ADD_PROVIDER", f"Thêm nhà cung cấp mới: {name} ({provider_type} - {base_url})")

        # Sync config store
        await ProviderManager.get_connections(session)

        return {
            "id": conn.id,
            "name": conn.name,
            "provider_type": conn.provider_type,
            "base_url": conn.base_url,
            "api_key_masked": mask_api_key(api_key),
            "status": "untested",
            "is_active": True
        }

    @staticmethod
    async def update_connection(
        session: AsyncSession,
        conn_id: str,
        name: Optional[str] = None,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        provider_type: Optional[str] = None,
        is_active: Optional[bool] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> Optional[Dict[str, Any]]:
        conn = await session.get(Connection, conn_id)
        if not conn:
            return None
        if name is not None:
            conn.name = name.strip()
        if base_url is not None:
            conn.base_url = base_url.strip()
        if provider_type is not None:
            conn.provider_type = provider_type.lower().strip()
        if api_key is not None and api_key.strip():
            conn.api_key_encrypted = encrypt_api_key(api_key.strip())
            log_security_audit("UPDATE_API_KEY", f"Cập nhật API Key cho nhà cung cấp: {conn.name}")
        if is_active is not None:
            conn.is_active = is_active
        if headers is not None:
            conn.headers_json = json.dumps(headers)

        await session.commit()
        await ProviderManager.get_connections(session)

        decrypted = decrypt_api_key(conn.api_key_encrypted)
        return {
            "id": conn.id,
            "name": conn.name,
            "provider_type": conn.provider_type,
            "base_url": conn.base_url,
            "api_key_masked": mask_api_key(decrypted),
            "is_active": conn.is_active,
            "status": conn.status
        }

    @staticmethod
    async def delete_connection(session: AsyncSession, conn_id: str) -> bool:
        conn = await session.get(Connection, conn_id)
        if not conn:
            return False
        log_security_audit("DELETE_PROVIDER", f"Xóa nhà cung cấp: {conn.name} ({conn.id})")
        await session.delete(conn)
        await session.commit()
        await ProviderManager.get_connections(session)
        return True

    @staticmethod
    async def connect_and_discover(session: AsyncSession, conn_id: str) -> Dict[str, Any]:
        """
        Quy trình 7 bước kiểm tra kết nối & Dynamic Discovery (Connection Test):
        Bước 1: Kiểm tra cú pháp Base URL.
        Bước 2: Kiểm tra API Key và phương thức xác thực.
        Bước 3: Kiểm tra endpoint phù hợp.
        Bước 4: Gọi endpoint discovery lấy catalog model.
        Bước 5: Lấy danh sách model và lưu vào Model Registry (models.json & DB).
        Bước 6: Thực hiện kiểm tra model thực tế (probe) để xác minh quyền truy cập.
        Bước 7: Cập nhật trạng thái và hiển thị kết quả.
        """
        conn = await session.get(Connection, conn_id)
        if not conn:
            return {"success": False, "message": "Không tìm thấy nhà cung cấp."}

        steps_log = []

        # Bước 1: Base URL
        base_url = (conn.base_url or "").strip().rstrip("/")
        if not base_url.startswith(("http://", "https://")):
            conn.status = "error"
            await session.commit()
            return {
                "success": False,
                "step_failed": 1,
                "message": "Base URL không hợp lệ (phải bắt đầu bằng http:// hoặc https://)."
            }
        steps_log.append("Bước 1: Base URL hợp lệ.")

        # Bước 2: API Key
        api_key = decrypt_api_key(conn.api_key_encrypted)
        if not api_key and conn.provider_type != "openai_compatible":
            conn.status = "error"
            await session.commit()
            return {
                "success": False,
                "step_failed": 2,
                "message": "API Key không được để trống."
            }
        steps_log.append("Bước 2: Xác thực API Key đã được giải mã an toàn.")

        # Bước 3 & 4: Adapter & Discovery
        adapter = create_adapter(
            provider_type=conn.provider_type,
            base_url=base_url,
            api_key=api_key,
            model_id="",
            extra_headers=json.loads(conn.headers_json or "{}")
        )

        test_res = await adapter.test_connection()
        if not test_res.get("success", False):
            conn.status = "error"
            conn.last_checked = utcnow_str()
            await session.commit()
            return {
                "success": False,
                "step_failed": 3,
                "latency_ms": test_res.get("latency_ms", 0),
                "message": test_res.get("message", "Kết nối thất bại tại endpoint kiểm tra.")
            }
        steps_log.append(f"Bước 3: Kết nối endpoint thành công ({test_res.get('latency_ms', 0)}ms).")

        # Bước 4 & 5: Lấy model catalog & lưu Model Registry
        discovered_raw = []
        try:
            discovered_raw = await adapter.fetch_catalog()
            steps_log.append(f"Bước 4: Phát hiện {len(discovered_raw)} model từ API Discovery.")
        except Exception as e:
            steps_log.append(f"Bước 4: Discovery không phản hồi: {str(e)} (cho phép thêm thủ công).")

        added_models = []
        if discovered_raw:
            batch_data = []
            for item in discovered_raw:
                m_id = item.get("id") or item.get("name")
                if not m_id:
                    continue
                display_name = item.get("display_name") or (m_id.split("/")[-1] if "/" in m_id else m_id)
                m_lower = m_id.lower()
                supports_tools = any(kw in m_lower for kw in ["instruct", "chat", "tool", "coder", "function", "sonnet", "haiku", "gpt-4", "o3", "gemini"])
                supports_vision = any(kw in m_lower for kw in ["vision", "vl", "multimodal", "neva", "4o", "gemini", "sonnet", "haiku", "opus"])

                batch_data.append({
                    "model_id": m_id,
                    "display_name": display_name,
                    "supports_tools": supports_tools,
                    "supports_vision": supports_vision,
                    "supports_streaming": True
                })
            added_models = await ProviderManager.add_models_batch(session, conn_id, batch_data)
            steps_log.append(f"Bước 5: Đã đăng ký {len(added_models)} model vào Model Registry.")
        else:
            steps_log.append("Bước 5: Chưa có model tự động (sử dụng model đã có hoặc thêm thủ công).")

        # Bước 6: Thử nghiệm kiểm tra model thực tế (probe)
        probe_res = {"success": True, "message": "Bỏ qua probe vì danh sách rỗng."}
        if added_models:
            first_model = added_models[0]["model_id"]
            probe_res = await adapter.probe_model(first_model)
            item_id = f"{conn_id}_{first_model.replace('/', '__')}"
            m_item = await session.get(ModelItem, item_id)
            if m_item:
                if probe_res.get("success"):
                    m_item.verification_status = "VERIFIED"
                    m_item.status = "ready"
                    steps_log.append(f"Bước 6: Xác minh quyền truy cập model '{first_model}' thành công (VERIFIED).")
                else:
                    m_item.verification_status = "UNSUPPORTED"
                    steps_log.append(f"Bước 6: Model probe thất bại: {probe_res.get('message')}")
                await session.commit()

        # Bước 7: Cập nhật trạng thái Provider
        conn.status = "connected"
        conn.last_checked = utcnow_str()
        await session.commit()
        steps_log.append("Bước 7: Hoàn tất cấu hình và kích hoạt nhà cung cấp.")

        # Cập nhật ConfigStore models
        await ProviderManager.sync_models_to_config_store(session)

        return {
            "success": True,
            "status": "connected",
            "latency_ms": test_res.get("latency_ms", 0),
            "models_count": len(added_models),
            "discovered_count": len(added_models),
            "probe_result": probe_res,
            "steps": steps_log,
            "message": f"Kết nối thành công! Đã phát hiện và đăng ký {len(added_models)} model."
        }

    @staticmethod
    async def refresh_catalog(session: AsyncSession, conn_id: str) -> List[Dict[str, Any]]:
        """
        Tự động làm mới danh mục model:
        - Giữ nguyên các model tùy chỉnh thủ công và cấu hình người dùng.
        - Phát hiện model mới.
        - Đánh dấu model không còn khả dụng thành UNSUPPORTED.
        """
        conn = await session.get(Connection, conn_id)
        if not conn:
            raise ValueError("Không tìm thấy nhà cung cấp.")

        api_key = decrypt_api_key(conn.api_key_encrypted)
        adapter = create_adapter(
            provider_type=conn.provider_type,
            base_url=conn.base_url,
            api_key=api_key,
            model_id="",
            extra_headers=json.loads(conn.headers_json or "{}")
        )

        raw_catalog = await adapter.fetch_catalog()
        active_ids = set()
        discovered_models = []

        for item in raw_catalog:
            m_id = item.get("id") or item.get("name")
            if not m_id:
                continue
            active_ids.add(m_id)
            display_name = item.get("display_name") or (m_id.split("/")[-1] if "/" in m_id else m_id)
            m_lower = m_id.lower()
            supports_tools = any(kw in m_lower for kw in ["instruct", "chat", "tool", "coder", "function", "sonnet", "haiku", "gpt-4", "gemini"])
            supports_vision = any(kw in m_lower for kw in ["vision", "vl", "multimodal", "neva", "4o", "gemini", "sonnet"])

            discovered_models.append({
                "connection_id": conn_id,
                "model_id": m_id,
                "display_name": display_name,
                "supports_streaming": True,
                "supports_tools": supports_tools,
                "supports_vision": supports_vision,
                "supports_json": True,
                "status": "ready"
            })

        # Update existing models or add new ones
        if discovered_models:
            await ProviderManager.add_models_batch(session, conn_id, discovered_models)

        # Mark missing models as UNSUPPORTED (without deleting them)
        existing_res = await session.execute(select(ModelItem).where(ModelItem.connection_id == conn_id))
        for existing in existing_res.scalars().all():
            if existing.model_id not in active_ids and existing.verification_status != "VERIFIED":
                existing.verification_status = "UNSUPPORTED"

        conn.last_checked = utcnow_str()
        await session.commit()
        await ProviderManager.sync_models_to_config_store(session)

        return discovered_models

    @staticmethod
    async def add_manual_model(
        session: AsyncSession,
        connection_id: str,
        model_id: str,
        display_name: Optional[str] = None,
        probe: bool = True
    ) -> Dict[str, Any]:
        """
        Thêm model thủ công (Batch Add Models hoặc nhập Model ID thủ công).
        Thực hiện kiểm tra model thực tế nếu probe=True.
        """
        conn = await session.get(Connection, connection_id)
        if not conn:
            raise ValueError("Nhà cung cấp không tồn tại.")

        model_id = model_id.strip()
        display = (display_name or "").strip() or (model_id.split("/")[-1] if "/" in model_id else model_id)
        item_id = f"{connection_id}_{model_id.replace('/', '__')}"

        existing = await session.get(ModelItem, item_id)
        if not existing:
            existing = ModelItem(
                id=item_id,
                connection_id=connection_id,
                model_id=model_id,
                display_name=display,
                context_window=128000,
                max_tokens=4096,
                rpm_limit=40,
                tpm_limit=100000,
                supports_streaming=True,
                supports_tools=True,
                supports_vision=False,
                supports_json=True,
                verification_status="UNKNOWN",
                status="ready"
            )
            session.add(existing)

            cap = ModelCapabilityProfile(
                id=f"{item_id}_cap",
                model_id=item_id,
                chat="UNKNOWN",
                streaming="VERIFIED",
                native_tool_calling="UNKNOWN",
                json_output="UNKNOWN",
                vision="UNKNOWN",
                updated_at=utcnow_str()
            )
            session.add(cap)

        probe_result = None
        if probe:
            api_key = decrypt_api_key(conn.api_key_encrypted)
            adapter = create_adapter(
                provider_type=conn.provider_type,
                base_url=conn.base_url,
                api_key=api_key,
                model_id=model_id,
                extra_headers=json.loads(conn.headers_json or "{}")
            )
            probe_result = await adapter.probe_model(model_id)
            if probe_result.get("success"):
                existing.verification_status = "VERIFIED"
                existing.status = "ready"
            else:
                existing.verification_status = "UNSUPPORTED"
                existing.status = "error"

        await session.commit()
        await ProviderManager.sync_models_to_config_store(session)

        return {
            "id": existing.id,
            "model_id": existing.model_id,
            "display_name": existing.display_name,
            "verification_status": existing.verification_status,
            "status": existing.status,
            "probe_result": probe_result
        }

    @staticmethod
    async def add_models_batch(
        session: AsyncSession,
        connection_id: str,
        models_data: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        conn = await session.get(Connection, connection_id)
        if not conn:
            raise ValueError("Kết nối không tồn tại.")

        added = []
        for m in models_data:
            model_id = m["model_id"].strip()
            item_id = f"{connection_id}_{model_id.replace('/', '__')}"

            existing = await session.get(ModelItem, item_id)
            if existing:
                existing.display_name = m.get("display_name", existing.display_name)
                existing.supports_tools = m.get("supports_tools", existing.supports_tools)
                existing.supports_vision = m.get("supports_vision", existing.supports_vision)
                existing.status = "ready"
                added.append({"id": existing.id, "model_id": existing.model_id, "status": "updated"})
            else:
                new_item = ModelItem(
                    id=item_id,
                    connection_id=connection_id,
                    model_id=model_id,
                    display_name=m.get("display_name", model_id.split("/")[-1]),
                    context_window=m.get("context_window", 128000),
                    max_tokens=m.get("max_tokens", 4096),
                    rpm_limit=m.get("rpm_limit", 40),
                    tpm_limit=m.get("tpm_limit", 100000),
                    supports_streaming=m.get("supports_streaming", True),
                    supports_tools=m.get("supports_tools", False),
                    supports_vision=m.get("supports_vision", False),
                    supports_json=m.get("supports_json", True),
                    verification_status="DISCOVERED",
                    status="ready"
                )
                session.add(new_item)

                cap = ModelCapabilityProfile(
                    id=f"{item_id}_cap",
                    model_id=item_id,
                    chat="UNKNOWN",
                    streaming="VERIFIED" if m.get("supports_streaming", True) else "UNKNOWN",
                    native_tool_calling="UNKNOWN",
                    json_output="UNKNOWN",
                    vision="VERIFIED" if m.get("supports_vision", False) else "UNKNOWN",
                    updated_at=utcnow_str()
                )
                session.add(cap)

                added.append({"id": item_id, "model_id": model_id, "status": "created"})

        await session.commit()
        await ProviderManager.sync_models_to_config_store(session)
        return added

    @staticmethod
    async def sync_models_to_config_store(session: AsyncSession):
        """Đồng bộ toàn bộ Model Registry ra models.json"""
        try:
            stmt = select(ModelItem, Connection).join(Connection, ModelItem.connection_id == Connection.id)
            res = await session.execute(stmt)
            models_data = []
            for m, c in res.all():
                models_data.append({
                    "id": m.id,
                    "connection_id": m.connection_id,
                    "provider_name": c.name,
                    "provider_type": c.provider_type,
                    "model_id": m.model_id,
                    "display_name": m.display_name,
                    "context_window": m.context_window,
                    "max_tokens": m.max_tokens,
                    "rpm_limit": m.rpm_limit,
                    "tpm_limit": m.tpm_limit,
                    "supports_streaming": m.supports_streaming,
                    "supports_tools": m.supports_tools,
                    "supports_vision": m.supports_vision,
                    "supports_json": m.supports_json,
                    "is_favorite": getattr(m, "is_favorite", False),
                    "verification_status": getattr(m, "verification_status", "DISCOVERED"),
                    "status": m.status,
                    "last_tested": m.last_tested
                })
            ConfigStore.save_models(models_data)
        except Exception as e:
            logger.warning(f"Lỗi đồng bộ models.json: {e}")
