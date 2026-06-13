const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let serverProcess = null;
let mainWindow = null;
const PORT = 3001;

function startBackendServer() {
  return new Promise((resolve) => {
    const isDev = !app.isPackaged;
    const serverPath = isDev
      ? path.join(__dirname, '..', 'backend', 'server.js')
      : path.join(process.resourcesPath, 'app', 'backend', 'server.js');

    serverProcess = spawn(process.execPath, [serverPath], {
      env: { ...process.env, PORT: String(PORT), ELECTRON_RUN_AS_NODE: '1' },
      stdio: 'pipe',
    });

    serverProcess.stdout.on('data', (d) => {
      const s = d.toString();
      if (s.includes('listening') || s.includes('3001')) resolve();
      console.log('[server]', s);
    });
    serverProcess.stderr.on('data', (d) => console.error('[server]', d.toString()));

    setTimeout(resolve, 2500);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Parle Noire POS',
    backgroundColor: '#0f172a',
    icon: path.join(__dirname, '..', 'frontend', 'public', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  Menu.setApplicationMenu(null);
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  await startBackendServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) try { serverProcess.kill(); } catch (e) {}
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) try { serverProcess.kill(); } catch (e) {}
});

// Block all external navigation (offline enforcement)
app.on('web-contents-created', (e, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`http://localhost:${PORT}`)) event.preventDefault();
  });
});
