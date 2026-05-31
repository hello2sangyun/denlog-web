const { app, BrowserWindow, ipcMain, shell } = require('electron');
const serve = require('electron-serve').default || require('electron-serve');
const path = require('path');
const http = require('http');

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

  // mainWindow.webContents.openDevTools();
  
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

// Start a local HTTP server on port 3000 to catch Supabase OAuth redirects
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url.startsWith('/?')) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <body>
          <p>Login successful! Returning to app...</p>
          <script>
            // The browser doesn't send the URL hash (#) to the server.
            // We read it here on the client side and send it to our local server.
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
      // We append a dummy timestamp to the query string to FORCE Electron to perform a full page reload
      // rather than just a hash change. This ensures the React app and Supabase client re-initialize.
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
