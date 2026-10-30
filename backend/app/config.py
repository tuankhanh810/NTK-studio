import os
import sys
from pathlib import Path
from pydantic import BaseModel

# App directories
APP_DIR = Path(os.getenv("NTK_STUDIO_DATA_DIR", Path.home() / ".ntk_studio"))
APP_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = APP_DIR / "ntk_studio.db"
KEY_FILE = APP_DIR / "secret.key"
LOG_DIR = APP_DIR / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)
CHECKPOINTS_DIR = APP_DIR / "checkpoints"
CHECKPOINTS_DIR.mkdir(parents=True, exist_ok=True)
CONFIG_DIR = APP_DIR / "config"
CONFIG_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
DEFAULT_PORT = 8765
DEFAULT_HOST = "127.0.0.1"
API_VERSION = "1.1.0"

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
