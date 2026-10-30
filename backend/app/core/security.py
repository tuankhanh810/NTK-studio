import os
import sys
import base64
import re
import datetime
from pathlib import Path
from typing import Optional
from app.config import APP_DIR, LOG_DIR

# 1. Windows DPAPI & Encryption
HAS_WIN32CRYPT = False
try:
    import win32crypt
    HAS_WIN32CRYPT = True
except ImportError:
    pass

DPAPI_PREFIX = "dpapi::"
AUDIT_LOG_FILE = LOG_DIR / "security_audit.log"

def encrypt_api_key(raw_key: str) -> str:
    """
    Encrypts API key using Windows DPAPI (CryptProtectData).
    Requires NO master key file on disk, fully protected by Windows credentials.
    """
    if not raw_key:
        return ""
    
    raw_bytes = raw_key.encode("utf-8")
    
    if HAS_WIN32CRYPT and sys.platform == "win32":
        try:
            # Encrypt via Windows DPAPI
            encrypted_bytes = win32crypt.CryptProtectData(
                raw_bytes,
                "NTK_STUDIO_API_KEY",
                None,
                None,
                None,
                0
            )
            return DPAPI_PREFIX + base64.b64encode(encrypted_bytes).decode("ascii")
        except Exception:
            pass

    # Fallback encryption if DPAPI unavailable
    from cryptography.fernet import Fernet
    key_file = APP_DIR / "local_vault.bin"
    if not key_file.exists():
        k = Fernet.generate_key()
        key_file.write_bytes(k)
        try:
            os.chmod(key_file, 0o600)
        except Exception:
            pass
    cipher = Fernet(key_file.read_bytes().strip())
    return "fernet::" + cipher.encrypt(raw_bytes).decode("ascii")

def decrypt_api_key(encrypted_str: str) -> str:
    """
    Decrypts API key using Windows DPAPI or fallback vault.
    """
    if not encrypted_str:
        return ""

    if encrypted_str.startswith(DPAPI_PREFIX) and HAS_WIN32CRYPT and sys.platform == "win32":
        try:
            payload = base64.b64decode(encrypted_str[len(DPAPI_PREFIX):])
            _, decrypted_bytes = win32crypt.CryptUnprotectData(
                payload,
                None,
                None,
                None,
                0
            )
            return decrypted_bytes.decode("utf-8")
        except Exception:
            pass

    if encrypted_str.startswith("fernet::"):
        from cryptography.fernet import Fernet
        key_file = APP_DIR / "local_vault.bin"
        if key_file.exists():
            try:
                cipher = Fernet(key_file.read_bytes().strip())
                return cipher.decrypt(encrypted_str[8:].encode("ascii")).decode("utf-8")
            except Exception:
                pass

    return encrypted_str

def mask_api_key(key: str) -> str:
    if not key:
        return ""
    if len(key) <= 8:
        return "********"
    return f"{key[:5]}...{key[-4:]}"

def redact_secrets(text: str) -> str:
    """
    Redacts any API keys matching nvapi-*, sk-*, or bearer tokens from logs or error outputs.
    """
    if not text:
        return ""
    # nvapi pattern
    text = re.sub(r'nvapi-[A-Za-z0-9_\-]{20,}', 'nvapi-***REDACTED***', text)
    # sk- pattern
    text = re.sub(r'sk-[A-Za-z0-9_\-]{20,}', 'sk-***REDACTED***', text)
    # bearer token
    text = re.sub(r'(Bearer\s+)[A-Za-z0-9_\.\-]{15,}', r'\1***REDACTED***', text, flags=re.IGNORECASE)
    return text

def validate_workspace_path(target_path: str, workspace_root: str) -> Path:
    """
    Prevents path traversal, validates symlinks, and ensures target resolves strictly inside workspace.
    """
    if not workspace_root:
        raise ValueError("Chưa thiết lập thư mục làm việc (Workspace root is not set)")

    ws_real = Path(workspace_root).resolve(strict=False)
    raw_target = (ws_real / target_path) if not Path(target_path).is_absolute() else Path(target_path)
    target_real = raw_target.resolve(strict=False)

    # Check symlinks pointing outside workspace
    if target_real.is_symlink():
        real_target = Path(os.path.realpath(target_real))
        try:
            real_target.relative_to(ws_real)
        except ValueError:
            log_security_audit("SYMLINK_VIOLATION", f"Symlink trỏ ra ngoài workspace bị chặn: {target_real} -> {real_target}")
            raise ValueError(f"Liên kết biểu tượng (Symlink) trỏ ra ngoài phạm vi dự án bị chặn: {target_real}")

    try:
        target_real.relative_to(ws_real)
    except ValueError:
        log_security_audit("PATH_TRAVERSAL_ATTEMPT", f"Đường dẫn ngoài workspace bị chặn: {target_real}")
        raise ValueError(f"Truy cập ngoài phạm vi thư mục dự án bị từ chối: {target_real}")

    return target_real

def log_security_audit(action: str, details: str):
    """
    Appends an entry to the security audit log.
    """
    try:
        now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
        AUDIT_LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(AUDIT_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"[{now_str}] [{action}] {redact_secrets(details)}\n")
    except Exception:
        pass
