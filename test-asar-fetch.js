const { app, net } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

app.whenReady().then(async () => {
  try {
    const asarPath = path.join(__dirname, 'dist/mac/Denlog.app/Contents/Resources/app.asar/out/index.html');
    const fileUrl = pathToFileURL(asarPath).toString();
    console.log("Fetching:", fileUrl);
    
    const response = await net.fetch(fileUrl);
    console.log("Status:", response.status);
    console.log("StatusText:", response.statusText);
    const text = await response.text();
    console.log("Text length:", text.length);
    console.log("Text snippet:", text.substring(0, 50));
  } catch (err) {
    console.error("Fetch Error:", err);
  }
  app.quit();
});
