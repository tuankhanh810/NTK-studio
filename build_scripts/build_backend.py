import os
import sys
import subprocess
from pathlib import Path

def build():
    root_dir = Path(__file__).resolve().parent.parent
    backend_dir = root_dir / "backend"
    entry_point = backend_dir / "run_backend.py"
    dist_dir = root_dir / "release" / "backend"
    build_dir = root_dir / "release" / "build_temp"

    dist_dir.mkdir(parents=True, exist_ok=True)
    build_dir.mkdir(parents=True, exist_ok=True)

    cmd = [
        sys.executable,
        "-m", "PyInstaller",
        "--noconfirm",
        "--clean",
        "--onedir",
        "--name", "ntk_backend",
        f"--distpath={dist_dir}",
        f"--workpath={build_dir}",
        "--paths", str(backend_dir),
        "--hidden-import", "uvicorn",
        "--hidden-import", "uvicorn.logging",
        "--hidden-import", "uvicorn.loops",
        "--hidden-import", "uvicorn.loops.auto",
        "--hidden-import", "uvicorn.protocols",
        "--hidden-import", "uvicorn.protocols.http",
        "--hidden-import", "uvicorn.protocols.http.auto",
        "--hidden-import", "uvicorn.protocols.websockets",
        "--hidden-import", "uvicorn.protocols.websockets.auto",
        "--hidden-import", "uvicorn.lifespans",
        "--hidden-import", "uvicorn.lifespans.on",
        "--hidden-import", "aiosqlite",
        "--hidden-import", "sqlalchemy.ext.asyncio",
        "--hidden-import", "greenlet",
        "--hidden-import", "cryptography",
        "--hidden-import", "httpx",
        str(entry_point)
    ]

    print(f"Executing PyInstaller build: {' '.join(cmd)}")
    subprocess.check_call(cmd, cwd=str(backend_dir))
    print("Backend build finished successfully!")

if __name__ == "__main__":
    build()
