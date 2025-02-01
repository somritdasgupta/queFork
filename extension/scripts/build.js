const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create dist directory if it doesn't exist
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Copy static files
const filesToCopy = ['manifest.json', 'popup.html', 'popup.css', 'icon16.png', 'icon48.png', 'icon128.png'];
filesToCopy.forEach(file => {
  fs.copyFileSync(
    path.join(__dirname, 'src', file),
    path.join(distDir, file)
  );
});

// Copy and minify JS files
const jsFiles = ['background.js', 'content.js', 'popup.js'];
jsFiles.forEach(file => {
  const content = fs.readFileSync(path.join(__dirname, 'src', file), 'utf8');
  fs.writeFileSync(path.join(distDir, file), content);
});

console.log('queFork Interceptor built successfully 🚀');
