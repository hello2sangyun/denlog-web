const { app, BrowserWindow } = require('electron');
const serve = require('electron-serve').default || require('electron-serve');
const fs = require('fs');

fs.mkdirSync('test_out2', { recursive: true });
fs.writeFileSync('test_out2/index.html', `
  <html><body>
  <script>
    if (window.crypto && window.crypto.subtle) {
      console.log("CRYPTO SUBTLE IS AVAILABLE");
    } else {
      console.log("CRYPTO SUBTLE IS NOT AVAILABLE! THIS IS THE BUG!");
    }
  </script>
  </body></html>
`);

const loadURL = serve({ directory: 'test_out2' });

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 800, height: 600 });
  loadURL(win);
  
  win.webContents.on('console-message', (e, level, msg) => {
    console.log("LOG:", msg);
  });
});
