import re
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.models import ModelItem, ModelBenchmark, Connection, ModelCapabilityProfile
from app.router.rate_limiter import global_request_manager

class TaskAnalysisResult:
    def __init__(self, task_type: str, required_capabilities: List[str], reason: str, priority: int = 1):
        self.task_type = task_type
        self.required_capabilities = required_capabilities
        self.reason = reason
        self.priority = priority

from app.core.config_store import ConfigStore

class AdvancedModelRouter:
    @staticmethod
    def analyze_task_requirements(prompt: str, has_images: bool = False) -> TaskAnalysisResult:
        prompt_lower = prompt.lower()

        if has_images or any(w in prompt_lower for w in ["ảnh", "hình ảnh", "screenshot", "image", "ui design", "giao diện ảnh", "ocr"]):
            return TaskAnalysisResult(
                task_type="vision",
                required_capabilities=["vision"],
                reason="Yêu cầu xử lý hình ảnh thị giác (Vision Multimodal).",
                priority=2
            )

        if any(w in prompt_lower for w in ["debug", "sửa lỗi", "traceback", "exception", "lỗi", "fix bug", "sửa bug", "crash"]):
            return TaskAnalysisResult(
                task_type="debug",
                required_capabilities=["native_tool_calling", "coding", "reasoning"],
                reason="Nhiệm vụ phân tích traceback và sửa lỗi hệ thống (Auto-Debug Loop).",
                priority=1
            )

        if any(w in prompt_lower for w in ["review", "đánh giá", "kiểm tra code", "tối ưu", "refactor", "bảo mật", "audit"]):
            return TaskAnalysisResult(
                task_type="review",
                required_capabilities=["reasoning", "coding"],
                reason="Nhiệm vụ đánh giá chất lượng mã nguồn, phát hiện bug tiềm ẩn và lỗ hổng bảo mật.",
                priority=2
            )

        if any(w in prompt_lower for w in ["kiến trúc", "thiết kế hệ thống", "kế hoạch", "plan", "phân tích", "strategy"]):
            return TaskAnalysisResult(
                task_type="planning",
                required_capabilities=["reasoning"],
                reason="Nhiệm vụ phân tích cấu trúc tổng thể và lập kế hoạch kỹ thuật.",
                priority=2
            )

        if any(w in prompt_lower for w in ["json", "schema", "trích xuất", "bảng dữ liệu", "structured"]):
            return TaskAnalysisResult(
                task_type="structured_output",
                required_capabilities=["json_output"],
                reason="Yêu cầu xuất dữ liệu có cấu trúc JSON hợp lệ theo schema.",
                priority=2
            )

        return TaskAnalysisResult(
            task_type="coding",
            required_capabilities=["native_tool_calling", "coding"],
            reason="Nhiệm vụ lập trình mã nguồn và tương tác tập tin trong workspace.",
            priority=1
        )

    @staticmethod
    async def route_model(
        session: AsyncSession,
        prompt: str,
        manual_model_id: Optional[str] = None,
        manual_connection_id: Optional[str] = None,
        has_images: bool = False,
        role: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Intelligent Auto Router evaluating:
        - Task type & required capabilities
        - Role-based configuration in routing.json
        - Model Capability profile (VERIFIED, UNSUPPORTED, UNKNOWN)
        - Benchmark Scores (Coding, Reasoning, Tools, TTFT)
        - Quota availability (Sliding window RPM, TPM, 429 status)
        - Queue length and latency
        """
        # Role assignment check
        if (not manual_model_id or manual_model_id == "auto") and role:
            try:
                routing_cfg = ConfigStore.load_routing()
                assigned = routing_cfg.get("roles", {}).get(role, "auto")
                if assigned and assigned != "auto":
                    manual_model_id = assigned
            except Exception:
                pass

        # 1. Manual / Role Mode
        if manual_model_id and manual_model_id != "auto":
            query = select(ModelItem).join(Connection).where(
                ModelItem.id == manual_model_id,
                Connection.is_active == True
            )
            res = await session.execute(query)
            item = res.scalars().first()
            if item:
                conn = await session.get(Connection, item.connection_id)
                return {
                    "model_item": item,
                    "connection": conn,
                    "selection_mode": "manual",
                    "reason": f"Người dùng / Vai trò chỉ định: {item.display_name}",
                    "required_capabilities": []
                }

        # 2. Auto Mode: Comprehensive analysis
        analysis = AdvancedModelRouter.analyze_task_requirements(prompt, has_images)

        q = select(ModelItem, Connection, ModelBenchmark, ModelCapabilityProfile).join(
            Connection, ModelItem.connection_id == Connection.id
        ).outerjoin(
            ModelBenchmark, ModelItem.id == ModelBenchmark.model_id
        ).outerjoin(
            ModelCapabilityProfile, ModelItem.id == ModelCapabilityProfile.model_id
        ).where(
            Connection.is_active == True,
            ModelItem.status != "error"
        )

        result = await session.execute(q)
        candidates = result.all()

        if not candidates:
            raise ValueError("Không có model nào đang hoạt động. Vui lòng thêm nhà cung cấp trong Model Manager.")

        scored_candidates = []
        for model_item, conn, benchmark, capability in candidates:
            score = 50.0 # base score

            # Verification status bonus
            v_stat = getattr(model_item, "verification_status", "DISCOVERED")
            if v_stat == "VERIFIED":
                score += 25.0
            elif v_stat == "UNSUPPORTED":
                score -= 40.0

            # Favorite model bonus
            if getattr(model_item, "is_favorite", False):
                score += 15.0

            # 1. Check Model Capability Profile
            if "vision" in analysis.required_capabilities:
                if capability and capability.vision == "UNSUPPORTED":
                    continue
                if model_item.supports_vision or (capability and capability.vision == "VERIFIED"):
                    score += 100.0
                else:
                    continue

            if "native_tool_calling" in analysis.required_capabilities:
                if capability and capability.native_tool_calling == "VERIFIED":
                    score += 60.0
                elif model_item.supports_tools:
                    score += 40.0
                elif capability and capability.native_tool_calling == "UNSUPPORTED":
                    score -= 20.0 # Will use JSON fallback

            if "json_output" in analysis.required_capabilities:
                if capability and capability.json_output == "VERIFIED":
                    score += 50.0

            # 2. Benchmark Scores
            if benchmark:
                if "coding" in analysis.required_capabilities:
                    score += (benchmark.coding_score or 0.0) * 40.0
                if "reasoning" in analysis.required_capabilities:
                    score += (benchmark.reasoning_score or 0.0) * 40.0
                if "native_tool_calling" in analysis.required_capabilities:
                    score += (benchmark.tools_score or 0.0) * 30.0

                # Latency bonus
                if benchmark.ttft_ms and benchmark.ttft_ms > 0:
                    if benchmark.ttft_ms < 1000:
                        score += 15.0
                    elif benchmark.ttft_ms > 4000:
                        score -= 10.0

            # 3. Model family & Multi-provider heuristics
            m_id = model_item.model_id.lower()
            if "claude-3-7-sonnet" in m_id or "claude-3-5-sonnet" in m_id:
                score += 48.0 # Claude Sonnet excels in agentic tasks & code refactoring
            elif "deepseek" in m_id:
                if "r1" in m_id and analysis.task_type in ("debug", "review", "planning"):
                    score += 45.0 # R1 excels at reasoning & root-cause analysis
                elif "v3" in m_id or "flash" in m_id or "coder" in m_id:
                    score += 40.0
            elif "gpt-4o" in m_id or "o1" in m_id or "o3" in m_id:
                score += 42.0
            elif "qwen2.5-coder" in m_id:
                score += 40.0 # Qwen 2.5 Coder excels at code generation
            elif "gemini-2.0-flash" in m_id or "gemini-1.5-pro" in m_id:
                score += 38.0
            elif "llama-3" in m_id:
                score += 35.0

            # 4. Quota and Load Balancing
            stats = global_request_manager.get_stats(conn.id)
            rpm_left = model_item.rpm_limit - stats.current_rpm
            if rpm_left <= 5:
                score -= 50.0 # Heavily penalize connection nearing rate limit
            elif rpm_left >= 20:
                score += 10.0

            scored_candidates.append((score, model_item, conn))

        if not scored_candidates:
            # Fallback
            model_item, conn, _, _ = candidates[0]
            return {
                "model_item": model_item,
                "connection": conn,
                "selection_mode": "auto_fallback",
                "reason": f"Không có model thỏa mãn tuyệt đối '{analysis.task_type}'. Tự động fallback: {model_item.display_name}",
                "required_capabilities": analysis.required_capabilities
            }

        scored_candidates.sort(key=lambda x: x[0], reverse=True)
        best_score, best_model, best_conn = scored_candidates[0]

        return {
            "model_item": best_model,
            "connection": best_conn,
            "selection_mode": "auto",
            "reason": f"Auto Router 1.1.0 chọn {best_model.display_name} (Điểm: {round(best_score, 1)}) cho tác vụ '{analysis.task_type}' - {analysis.reason}",
            "required_capabilities": analysis.required_capabilities
        }

ModelRouter = AdvancedModelRouter
