import pytest
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.security import encrypt_api_key, decrypt_api_key, mask_api_key, redact_secrets, validate_workspace_path

def test_dpapi_encryption_cycle():
    raw = "nvapi-test_secret_key_1234567890abcdef"
    encrypted = encrypt_api_key(raw)
    assert encrypted != raw
    assert len(encrypted) > 20
    
    decrypted = decrypt_api_key(encrypted)
    assert decrypted == raw

def test_secret_redaction():
    text = "Error connecting with nvapi-abcdef12345678901234567890 to endpoint"
    redacted = redact_secrets(text)
    assert "nvapi-abcdef" not in redacted
    assert "nvapi-***REDACTED***" in redacted

    bearer_text = "Authorization: Bearer my_super_secret_access_token_12345"
    redacted_bearer = redact_secrets(bearer_text)
    assert "my_super_secret" not in redacted_bearer
    assert "***REDACTED***" in redacted_bearer

def test_path_traversal_denial(tmp_path: Path):
    ws = str(tmp_path)
    with pytest.raises(ValueError):
        validate_workspace_path("../../../windows/system32/cmd.exe", ws)

    with pytest.raises(ValueError):
        validate_workspace_path("/etc/passwd", ws)
