import { app, BrowserWindow, shell, ipcMain } from 'electron';
import * as path from 'path';
import { spawn, ChildProcess, exec } from 'child_process';
import * as http from 'http';
import * as fs from 'fs';

// --- Single Instance Lock ---
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  console.log('[Electron] Secondary instance detected. Exiting.');
  app.quit();
  process.exit(0);
}

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;
let isBackendReady = false;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const BACKEND_PORT = 8765;
const APP_TITLE = 'NTK Studio - Universal AI Coding IDE';

function checkBackendHealth(retries = 30, interval = 500): Promise<boolean> {
  return new Promise((resolve) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const req = http.get(`http://127.0.0.1:${BACKEND_PORT}/api/health`, (res) => {
        if (res.statusCode === 200) {
          isBackendReady = true;
          resolve(true);
        } else if (attempts < retries) {
          setTimeout(check, interval);
        } else {
          resolve(false);
        }
      });
      req.on('error', () => {
        if (attempts < retries) {
          setTimeout(check, interval);
        } else {
          resolve(false);
        }
      });
      req.setTimeout(interval, () => {
        req.destroy();
      });
    };
    check();
  });
}

function stopBackendProcess() {
  if (backendProcess && backendProcess.pid) {
    console.log(`[Electron] Terminating backend process PID ${backendProcess.pid}...`);
    try {
      if (process.platform === 'win32') {
        exec(`taskkill /pid ${backendProcess.pid} /T /F`, (err) => {
          if (err) console.error('[Electron] Error killing backend process tree:', err);
        });
      } else {
        backendProcess.kill('SIGTERM');
      }
    } catch (e) {
      console.error('[Electron] Failed to terminate backend process:', e);
    }
    backendProcess = null;
  }
}

async function startBackendAsync() {
  // First check if port 8765 is ALREADY healthy (e.g., dev server or standing process)
  const alreadyRunning = await checkBackendHealth(2, 300);
  if (alreadyRunning) {
    console.log('[Backend] Backend is already running and healthy on port 8765.');
    isBackendReady = true;
    notifyBackendStatus(true);
    return;
  }

  const rootDir = isDev
    ? path.join(__dirname, '../../')
    : path.join(process.resourcesPath);

  const backendEnv = {
    ...process.env,
    PORTABLE_EXECUTABLE_DIR: process.env.PORTABLE_EXECUTABLE_DIR || '',
    NTK_STUDIO_DATA_DIR: app.getPath('userData'),
  };

  if (isDev) {
    const pythonScript = path.join(rootDir, 'backend', 'run_backend.py');
    console.log(`[Dev] Spawning Python backend: python ${pythonScript}`);
    backendProcess = spawn('python', [pythonScript], {
      cwd: path.join(rootDir, 'backend'),
      env: backendEnv,
      stdio: 'pipe',
    });
  } else {
    // Production packaged binary
    const binaryPath = path.join(rootDir, 'backend_dist', 'ntk_backend', 'ntk_backend.exe');
    if (fs.existsSync(binaryPath)) {
      console.log(`[Prod] Spawning packaged backend: ${binaryPath}`);
      backendProcess = spawn(binaryPath, [], {
        cwd: path.dirname(binaryPath),
        env: backendEnv,
        stdio: 'pipe',
      });
    } else {
      console.error(`[Prod] Backend binary not found at ${binaryPath}`);
    }
  }

  backendProcess?.stdout?.on('data', (data) => {
    console.log(`[Backend stdout]: ${data}`);
  });

  backendProcess?.stderr?.on('data', (data) => {
    console.error(`[Backend stderr]: ${data}`);
  });

  backendProcess?.on('exit', (code, signal) => {
    console.log(`[Backend exit]: code=${code}, signal=${signal}`);
    isBackendReady = false;
    notifyBackendStatus(false);
  });

  // Verify health in background
  const healthy = await checkBackendHealth(25, 600);
  console.log(`[Backend] Health check completed. Status: ${healthy}`);
  notifyBackendStatus(healthy);
}

function notifyBackendStatus(ready: boolean) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('backend-status', { ready, port: BACKEND_PORT });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 720,
    title: APP_TITLE,
    backgroundColor: '#0b111e',
    show: false, // show when ready-to-show to prevent visual flicker
    icon: path.join(__dirname, '../public/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  // Prevent Chromium from overriding our official application title
  mainWindow.on('page-title-updated', (e) => {
    e.preventDefault();
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Determine URL/File to load
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  const isExplicitDev = process.env.ELECTRON_DEV === 'true';

  if (devServerUrl) {
    console.log(`[Electron] Loading Vite Dev Server: ${devServerUrl}`);
    mainWindow.loadURL(devServerUrl);
  } else if (isExplicitDev) {
    console.log('[Electron] Loading local dev server on http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173');
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log(`[Electron] Loading production bundle: ${indexPath}`);
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath).catch((err) => {
        console.error('[Electron] Failed to load index.html:', err);
      });
    } else {
      console.warn('[Electron] dist/index.html not found, attempting fallback to http://localhost:5173');
      mainWindow.loadURL('http://localhost:5173').catch(() => {
        showErrorPage(mainWindow, 'Không tìm thấy tệp giao diện', `Tệp giao diện không tồn tại tại: ${indexPath}`);
      });
    }
  }

  // Handle navigation failures
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Electron] did-fail-load: ${validatedURL} (Error ${errorCode}: ${errorDescription})`);
    if (errorCode !== -3) { // ignore ABORTED
      showErrorPage(mainWindow, 'Không thể tải giao diện NTK Studio', `Địa chỉ: ${validatedURL}<br>Mã lỗi: ${errorCode} (${errorDescription})`);
    }
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error(`[Electron] Renderer process gone: reason=${details.reason}, exitCode=${details.exitCode}`);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Launch backend in background without freezing UI
  startBackendAsync();
}

function showErrorPage(targetWindow: BrowserWindow | null, title: string, detail: string) {
  if (!targetWindow || targetWindow.isDestroyed()) return;
  const errorHtml = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8">
      <title>Lỗi khởi chạy - NTK Studio</title>
      <style>
        body {
          background-color: #0b111e;
          color: #f1f5f9;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          padding: 24px;
          box-sizing: border-box;
        }
        .card {
          background: #131c31;
          border: 1px solid #233354;
          border-radius: 12px;
          padding: 32px;
          max-width: 540px;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }
        h2 { color: #f87171; margin-top: 0; font-size: 20px; }
        p { color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 16px 0; }
        .detail {
          background: #080c16;
          border: 1px solid #1a253d;
          padding: 12px;
          border-radius: 6px;
          font-family: monospace;
          font-size: 11px;
          color: #cbd5e1;
          text-align: left;
          word-break: break-all;
          margin: 16px 0;
        }
        button {
          background: #2563eb;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          font-size: 13px;
        }
        button:hover { background: #1d4ed8; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>${title}</h2>
        <p>NTK Studio đã gặp sự cố khi tải giao diện ứng dụng. Vui lòng kiểm tra lại quá trình biên dịch hoặc kết nối.</p>
        <div class="detail">${detail}</div>
        <button onclick="location.reload()">Thử tải lại</button>
      </div>
    </body>
    </html>
  `;
  targetWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
}

// App lifecycle
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  // IPC Handlers
  ipcMain.handle('get-backend-status', () => {
    return { ready: isBackendReady, port: BACKEND_PORT };
  });

  createWindow();
});

app.on('window-all-closed', () => {
  stopBackendProcess();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopBackendProcess();
});
