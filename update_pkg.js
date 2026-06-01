const fs = require('fs');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

pkg.main = 'main.js';
pkg.scripts['build:app'] = 'next build && electron-builder --mac';
pkg.build = {
  appId: 'com.denlog.app',
  productName: 'Denlog',
  mac: {
    target: ['dmg', 'zip'],
    icon: 'build/icon.png',
    hardenedRuntime: true
  },
  directories: {
    output: 'dist'
  }
};

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('package.json updated');
