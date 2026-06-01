const { app, BrowserWindow } = require('electron');

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 800, height: 600 });
  win.loadURL('app://-');
  
  win.webContents.on('did-fail-load', (e, code, desc) => {
    console.log("FAIL LOAD:", code, desc);
  });
});
