import pytest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.router.model_router import ModelRouter

def test_task_requirement_analysis():
    # Vision
    r1 = ModelRouter.analyze_task_requirements("Hãy xem ảnh screenshot giao diện này và phân tích lỗi", has_images=True)
    assert r1.task_type == "vision"
    assert "vision" in r1.required_capabilities

    # Debug
    r2 = ModelRouter.analyze_task_requirements("Sửa traceback TypeError trong file app/main.py")
    assert r2.task_type == "debug"
    assert "coding" in r2.required_capabilities
    assert "reasoning" in r2.required_capabilities

    # Planning
    r3 = ModelRouter.analyze_task_requirements("Phân tích kiến trúc hệ thống và lập kế hoạch nâng cấp")
    assert r3.task_type == "planning"
    assert "reasoning" in r3.required_capabilities

    # JSON
    r4 = ModelRouter.analyze_task_requirements("Trích xuất thông tin người dùng thành schema JSON")
    assert r4.task_type == "structured_output"
    assert "json_output" in r4.required_capabilities or "json" in r4.required_capabilities
