import pytest
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.context.context_manager import ContextManager

def test_symbol_indexing(tmp_path: Path):
    ws = str(tmp_path)
    sample_code = """
class Calculator:
    def add(self, a, b):
        return a + b

def standalone_helper():
    pass
"""
    (tmp_path / "math_utils.py").write_text(sample_code, encoding="utf-8")

    results = ContextManager.find_symbols(ws, "Calc")
    assert len(results) >= 1
    assert results[0]["name"] == "Calculator"
    assert results[0]["kind"] == "class"

    helper_res = ContextManager.find_symbols(ws, "helper")
    assert len(helper_res) >= 1
    assert helper_res[0]["name"] == "standalone_helper"
