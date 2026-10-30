import { app, BrowserWindow, shell } from 'electron';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import * as http from 'http';

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const BACKEND_PORT = 8765;

function checkBackendHealth(retries = 30, interval = 500): Promise<boolean> {
  return new Promise((resolve) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const req = http.get(`http://127.0.0.1:${BACKEND_PORT}/api/health`, (res) => {
        if (res.statusCode === 200) {
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
    };
    check();
  });
}

function startBackend() {
  const rootDir = isDev
    ? path.join(__dirname, '../../')
    : path.join(process.resourcesPath);

  if (isDev) {
    const pythonScript = path.join(rootDir, 'backend', 'run_backend.py');
    console.log(`[Dev] Spawning Python backend: python ${pythonScript}`);
    backendProcess = spawn('python', [pythonScript], {
      cwd: path.join(rootDir, 'backend'),
      stdio: 'pipe',
    });
  } else {
    // Production packaged binary
    const binaryPath = path.join(rootDir, 'backend_dist', 'ntk_backend', 'ntk_backend.exe');
    console.log(`[Prod] Spawning packaged backend: ${binaryPath}`);
    backendProcess = spawn(binaryPath, [], {
      cwd: path.dirname(binaryPath),
      stdio: 'pipe',
    });
  }

  backendProcess?.stdout?.on('data', (data) => {
    console.log(`[Backend stdout]: ${data}`);
  });

  backendProcess?.stderr?.on('data', (data) => {
    console.error(`[Backend stderr]: ${data}`);
  });
}

async function createWindow() {
  startBackend();

  // Wait for backend to be ready
  const isHealthy = await checkBackendHealth();
  console.log(`Backend health check status: ${isHealthy}`);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: 'NTK Studio - Universal AI Coding IDE',
    backgroundColor: '#0f141c',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // Kill backend process cleanly
  if (backendProcess) {
    console.log('Terminating backend process...');
    backendProcess.kill();
    backendProcess = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
