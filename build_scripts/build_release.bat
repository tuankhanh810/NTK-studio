@echo off
setlocal enabledelayedexpansion

echo =======================================================
echo          NTK STUDIO - WINDOWS RELEASE BUILDER
echo =======================================================

echo [1/5] Chay kiem thu Backend voi PyTest...
pytest backend/tests
if %errorlevel% neq 0 (
    echo [LOI] Kiem thu Backend that bai. Dung quy trinh build.
    exit /b %errorlevel%
)

echo [2/5] Dong goi Python Backend voi PyInstaller...
python build_scripts/build_backend.py
if %errorlevel% neq 0 (
    echo [LOI] Dong goi Backend that bai.
    exit /b %errorlevel%
)

echo [3/5] Build Frontend Vite va Electron...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo [LOI] Build Frontend that bai.
    cd ..
    exit /b %errorlevel%
)

echo [4/5] Dong goi Windows Desktop Executable (Electron Builder)...
call npm run dist
if %errorlevel% neq 0 (
    echo [LOI] Dong goi Electron Builder that bai.
    cd ..
    exit /b %errorlevel%
)
cd ..

echo [5/5] Tao ma Checksum SHA256...
powershell -Command "Get-FileHash -Algorithm SHA256 (Get-ChildItem -Path release -Filter *.exe -Recurse) | Format-Table -AutoSize | Out-File -FilePath release/checksums.txt -Encoding utf8"

echo =======================================================
echo     BUILD HOAN TAT THANH CONG! CAC TEP TRONG THU MUC:
echo     release/
echo =======================================================
