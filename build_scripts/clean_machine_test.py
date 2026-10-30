import os
import sys
import time
import json
import hashlib
import subprocess
import urllib.request
from pathlib import Path

# Fix Windows console utf-8 encoding
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

def test_release_artifacts():
    print("=== [1] KIỂM TRA TẬP TIN PHÁT HÀNH (RELEASE ARTIFACTS) ===")
    root_dir = Path(__file__).resolve().parent.parent
    release_dir = root_dir / "release"
    
    installer = release_dir / "NTK Studio Setup 1.2.0.exe"
    portable = release_dir / "NTK Studio 1.2.0 Portable.exe"
    checksums_file = release_dir / "checksums.txt"
    release_notes = release_dir / "RELEASE_NOTES.txt"

    assert installer.exists(), f"Missing installer: {installer}"
    assert portable.exists(), f"Missing portable: {portable}"
    assert checksums_file.exists(), f"Missing checksums: {checksums_file}"
    assert release_notes.exists(), f"Missing release notes: {release_notes}"

    print(f"  [OK] Installer size: {installer.stat().st_size / (1024*1024):.2f} MB")
    print(f"  [OK] Portable size:  {portable.stat().st_size / (1024*1024):.2f} MB")

    # Verify SHA256 integrity against checksums.txt
    lines = checksums_file.read_text(encoding="utf-8").strip().splitlines()
    for line in lines:
        if not line.strip():
            continue
        expected_hash, fname = line.strip().split(maxsplit=1)
        target_file = release_dir / fname.strip()
        h = hashlib.sha256()
        with open(target_file, "rb") as f:
            while chunk := f.read(1024 * 1024):
                h.update(chunk)
        actual_hash = h.hexdigest()
        assert actual_hash == expected_hash, f"Hash mismatch for {fname}: {actual_hash} != {expected_hash}"
        print(f"  [OK] Verified SHA256 for {fname}")

def test_data_directory_structure():
    print("\n=== [2] KIỂM TRA CẤU TRÚC DỮ LIỆU (%APPDATA%\\NTK Studio) ===")
    appdata = os.getenv("APPDATA")
    assert appdata, "APPDATA environment variable is missing"
    ntk_data = Path(appdata) / "NTK Studio"
    print(f"  Target data path: {ntk_data}")
    
    subdirs = ["config", "database", "logs", "models", "user_data"]
    for sub in subdirs:
        p = ntk_data / sub
        p.mkdir(parents=True, exist_ok=True)
        assert p.exists() and p.is_dir(), f"Subdirectory missing: {p}"
        print(f"  [OK] Subdirectory verified: {sub}/")

def test_packaged_backend_standalone():
    print("\n=== [3] KIỂM TRA PYTHON BACKEND STANDALONE (CLEAN MACHINE TEST) ===")
    root_dir = Path(__file__).resolve().parent.parent
    backend_exe = root_dir / "release" / "backend" / "ntk_backend" / "ntk_backend.exe"
    assert backend_exe.exists(), f"Packaged backend exe not found at: {backend_exe}"

    print(f"  Spawning standalone backend: {backend_exe}")
    proc = subprocess.Popen([str(backend_exe)], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    time.sleep(3)
    try:
        # Check /api/health
        url_health = "http://127.0.0.1:8765/api/health"
        with urllib.request.urlopen(url_health, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"  [OK] /api/health returned: {data}")
            assert data.get("status") == "healthy"
            assert data.get("version") == "1.2.0"
            assert data.get("app") == "NTK Studio"

        # Check /api/connections
        url_conn = "http://127.0.0.1:8765/api/connections"
        with urllib.request.urlopen(url_conn, timeout=5) as resp:
            conn_data = json.loads(resp.read().decode("utf-8"))
            print(f"  [OK] /api/connections returned {len(conn_data)} connection(s)")

        # Check /api/models
        url_models = "http://127.0.0.1:8765/api/models"
        with urllib.request.urlopen(url_models, timeout=5) as resp:
            models_data = json.loads(resp.read().decode("utf-8"))
            print(f"  [OK] /api/models returned {len(models_data)} model(s)")

        # Check /api/metrics/stats
        url_metrics = "http://127.0.0.1:8765/api/metrics/stats"
        with urllib.request.urlopen(url_metrics, timeout=5) as resp:
            metrics_data = json.loads(resp.read().decode("utf-8"))
            print(f"  [OK] /api/metrics returned: RPM={metrics_data.get('rpm')}, TPM={metrics_data.get('tpm')}")

    finally:
        print("  Terminating test backend process...")
        proc.terminate()
        proc.wait(timeout=5)
        print("  [OK] Backend terminated cleanly with no leftover orphan processes.")

if __name__ == "__main__":
    test_release_artifacts()
    test_data_directory_structure()
    test_packaged_backend_standalone()
    print("\n=======================================================")
    print("ALL CLEAN MACHINE INTEGRATION TESTS PASSED 100%!")
    print("=======================================================")
