const { app, BrowserWindow, ipcMain, shell } = require('electron');
const serve = require('electron-serve').default || require('electron-serve');
const path = require('path');
const http = require('http');
const { autoUpdater } = require('electron-updater');

// Configure autoUpdater logging
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

ipcMain.on('open-external', (event, url) => {
  shell.openExternal(url);
});

const loadURL = serve({ directory: 'out' });

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Bypass Google's disallowed_useragent for Electron
  mainWindow.webContents.userAgent = mainWindow.webContents.userAgent.replace(/Electron\/[\d.]+ /, '').replace(/Denlog Desktop\/[\d.]+ /, '').replace(/denlog-web\/[\d.]+ /, '');

  mainWindow.webContents.on('console-message', (...args) => {
    console.log(`BROWSER CONSOLE ARGS:`, args);
  });
  
  mainWindow.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      mainWindow.webContents.executeJavaScript(`
        const btn = document.querySelector('button');
        if (btn) btn.click();
      `);
    }, 2000);
  });

  loadURL(mainWindow);
}

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url.startsWith('/?')) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <body>
          <p>Login successful! Returning to app...</p>
          <script>
            const url = 'http://localhost:3000/callback' + window.location.search + (window.location.search ? '&' : '?') + 'hash=' + encodeURIComponent(window.location.hash);
            fetch(url).then(() => {
              window.close();
            }).catch(() => {
              window.close();
            });
          </script>
        </body>
      </html>
    `);
  } else if (req.url.startsWith('/callback')) {
    res.writeHead(200, { 'Access-Control-Allow-Origin': '*' });
    res.end('OK');
    
    const urlObj = new URL('http://localhost:3000' + req.url);
    const hashParam = urlObj.searchParams.get('hash') || '';
    urlObj.searchParams.delete('hash');
    
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      const separator = urlObj.search ? '&' : '?';
      const dummyQuery = separator + '_ts=' + Date.now();
      const newUrl = 'app://-/' + urlObj.search + dummyQuery + hashParam;
      
      mainWindow.loadURL(newUrl);
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.on('error', (e) => {
  console.log("Local server error (port might be in use, that's fine if it's us):", e);
});

server.listen(3000, '127.0.0.1', () => {
  console.log("Listening on 127.0.0.1:3000 for OAuth redirects");
});

app.whenReady().then(() => {
  createWindow();

  // Check for updates
  autoUpdater.checkForUpdatesAndNotify();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

const { dialog } = require('electron'); // make sure to import dialog at top or just use require('electron').dialog

autoUpdater.on('update-available', (info) => {
  console.log('Update available.', info);
});
autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded.', info);
  const dialogOpts = {
    type: 'info',
    buttons: ['Restart', 'Later'],
    title: 'Application Update',
    message: info.version ? `Version ${info.version} is available` : 'A new version is available',
    detail: 'A new version has been downloaded. Restart the application to apply the updates.'
  };

  require('electron').dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});
autoUpdater.on('error', (err) => {
  console.log('Error in auto-updater.', err);
});
