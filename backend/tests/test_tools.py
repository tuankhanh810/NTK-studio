import pytest
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.tools.tool_registry import global_tool_registry
from app.core.security import validate_workspace_path

@pytest.mark.asyncio
async def test_file_tools_in_workspace(tmp_path: Path):
    ws = str(tmp_path)
    
    # 1. Write file
    res = await global_tool_registry.execute_tool(
        "write_file",
        {"path": "hello.py", "content": "print('Hello NTK Studio')\n"},
        ws
    )
    assert res.success is True
    assert (tmp_path / "hello.py").exists()

    # 2. Read file
    res = await global_tool_registry.execute_tool(
        "read_file",
        {"path": "hello.py"},
        ws
    )
    assert res.success is True
    assert "Hello NTK Studio" in res.output

    # 3. Edit file
    res = await global_tool_registry.execute_tool(
        "edit_file",
        {"path": "hello.py", "old_str": "Hello NTK Studio", "new_str": "Universal IDE"},
        ws
    )
    assert res.success is True
    assert "Universal IDE" in (tmp_path / "hello.py").read_text()

    # 4. List directory
    res = await global_tool_registry.execute_tool(
        "list_directory",
        {"path": "."},
        ws
    )
    assert res.success is True
    assert "hello.py" in res.output

    # 5. Search code
    res = await global_tool_registry.execute_tool(
        "search_code",
        {"query": "Universal"},
        ws
    )
    assert res.success is True
    assert "hello.py:1:" in res.output

def test_workspace_security_sandbox(tmp_path: Path):
    ws = str(tmp_path)
    
    # Path traversal attempt should raise ValueError
    with pytest.raises(ValueError):
        validate_workspace_path("../outside.txt", ws)

    with pytest.raises(ValueError):
        validate_workspace_path("C:/Windows/System32/cmd.exe", ws)
