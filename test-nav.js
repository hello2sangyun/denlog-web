const { app, BrowserWindow } = require('electron');
const serve = require('electron-serve').default || require('electron-serve');
const fs = require('fs');

fs.mkdirSync('test_out', { recursive: true });
fs.writeFileSync('test_out/index.html', `
  <html><body>
  <script>
    setTimeout(() => {
      try {
        console.log("Navigating...");
        window.location.assign('https://google.com');
      } catch (e) {
        console.error("DOM ERROR:", e);
      }
    }, 1000);
  </script>
  </body></html>
`);

const loadURL = serve({ directory: 'test_out' });

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 800, height: 600 });
  loadURL(win);
  
  win.webContents.on('will-navigate', (e, url) => {
    console.log("WILL NAVIGATE:", url);
  });
});
