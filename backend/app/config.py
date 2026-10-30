import os
import sys
import shutil
from pathlib import Path
from pydantic import BaseModel

API_VERSION = "1.2.0"
DEFAULT_NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
DEFAULT_PORT = 8765
DEFAULT_HOST = "127.0.0.1"

def resolve_app_dir() -> Path:
    # 1. Explicit override via environment
    if os.getenv("NTK_STUDIO_DATA_DIR"):
        return Path(os.environ["NTK_STUDIO_DATA_DIR"]).resolve()

    # 2. Portable mode detection (if running next to portable exe with data folder)
    portable_dir = os.getenv("PORTABLE_EXECUTABLE_DIR")
    if portable_dir:
        candidate_portable_data = Path(portable_dir) / "data"
        # If user created data folder or wants standalone portable persistence next to exe
        if candidate_portable_data.exists() or os.getenv("NTK_STUDIO_PORTABLE_MODE") == "1":
            candidate_portable_data.mkdir(parents=True, exist_ok=True)
            return candidate_portable_data.resolve()

    # 3. Standard Windows %APPDATA%\NTK Studio
    appdata = os.getenv("APPDATA")
    if appdata and sys.platform == "win32":
        return (Path(appdata) / "NTK Studio").resolve()

    # 4. Fallback for other systems
    return (Path.home() / ".ntk_studio").resolve()

APP_DIR = resolve_app_dir()
APP_DIR.mkdir(parents=True, exist_ok=True)

# 5 Core Subdirectories per specification
CONFIG_DIR = APP_DIR / "config"
CONFIG_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_DIR = APP_DIR / "database"
DATABASE_DIR.mkdir(parents=True, exist_ok=True)

LOG_DIR = APP_DIR / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

MODELS_DIR = APP_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

USER_DATA_DIR = APP_DIR / "user_data"
USER_DATA_DIR.mkdir(parents=True, exist_ok=True)

CHECKPOINTS_DIR = APP_DIR / "checkpoints"
CHECKPOINTS_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATABASE_DIR / "ntk_studio.db"
KEY_FILE = CONFIG_DIR / "secret.key"

# Migration: Preserve user data from previous versions (~/.ntk_studio or root of APP_DIR)
def _migrate_legacy_data():
    legacy_candidates = [
        APP_DIR / "ntk_studio.db",
        Path.home() / ".ntk_studio" / "ntk_studio.db"
    ]
    for cand in legacy_candidates:
        if cand.exists() and not DB_PATH.exists():
            try:
                shutil.copy2(cand, DB_PATH)
                print(f"[Migration] Preserved user database from {cand} to {DB_PATH}")
                break
            except Exception as e:
                print(f"[Migration Warning] Failed to copy db {cand}: {e}")

    # Migrate legacy vault / key file
    legacy_keys = [
        APP_DIR / "local_vault.bin",
        Path.home() / ".ntk_studio" / "local_vault.bin"
    ]
    dest_key = CONFIG_DIR / "local_vault.bin"
    for cand in legacy_keys:
        if cand.exists() and not dest_key.exists():
            try:
                shutil.copy2(cand, dest_key)
                print(f"[Migration] Preserved security vault from {cand} to {dest_key}")
                break
            except Exception as e:
                print(f"[Migration Warning] Failed to copy key {cand}: {e}")

_migrate_legacy_data()

class AppConfig(BaseModel):
    app_name: str = "NTK Studio"
    version: str = API_VERSION
    host: str = DEFAULT_HOST
    port: int = DEFAULT_PORT
    default_nvidia_url: str = DEFAULT_NVIDIA_BASE_URL
    default_rpm_limit: int = 40
    rpm_safety_margin: int = 5
    default_tpm_limit: int = 100000
    tpm_safety_margin: int = 5000
    db_url: str = f"sqlite+aiosqlite:///{DB_PATH.as_posix()}"
    key_file_path: str = str(KEY_FILE)

config = AppConfig()

