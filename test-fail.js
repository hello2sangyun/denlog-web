const { app, BrowserWindow } = require('electron');
const serve = require('electron-serve').default || require('electron-serve');

const loadURL = serve({ directory: 'non_existent_folder' });

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 800, height: 600 });
  loadURL(win);
  
    win.webContents.on('did-finish-load', async () => {
      try {
        const result = await win.webContents.executeJavaScript(`
          (async () => {
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient('https://ibqowntzmfniiyglsabz.supabase.co', 'sb_publishable_LECLRgdGcJ6sadVNsz5S_A_FTqnYazL');
            const res = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: { redirectTo: window.location.origin }
            });
            return res;
          })()
        `);
        console.log("RESULT:", result);
      } catch (err) {
        console.error("ERROR:", err);
      }
      app.quit();
    });
});
