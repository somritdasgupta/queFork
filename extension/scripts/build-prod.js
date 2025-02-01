const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { execSync } = require('child_process');

// Clean and create dist directory
const distDir = path.join(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir);
fs.mkdirSync(path.join(distDir, 'icons'));

// Copy static files
const staticFiles = ['manifest.json', 'popup.html', 'popup.css'];
staticFiles.forEach(file => {
  fs.copyFileSync(
    path.join(__dirname, '../src', file),
    path.join(distDir, file)
  );
});

// Copy icons
const iconFiles = ['icon16.png', 'icon48.png', 'icon128.png'];
iconFiles.forEach(file => {
  fs.copyFileSync(
    path.join(__dirname, '../src/icons', file),
    path.join(distDir, 'icons', file)
  );
});

// Copy and minify JS files
const jsFiles = ['background.js', 'content.js', 'popup.js'];
jsFiles.forEach(file => {
  try {
    const content = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
    const minified = require('terser').minify(content, {
      compress: true,
      mangle: true
    });
    fs.writeFileSync(path.join(distDir, file), minified.code);
  } catch (error) {
    console.error(`Error processing ${file}:`, error);
    process.exit(1);
  }
});

// Create ZIP file
const output = fs.createWriteStream(path.join(__dirname, '../extension.zip'));
const archive = archiver('zip', { zlib: { level: 9 } });

archive.pipe(output);
archive.directory(distDir, false);
archive.finalize();

console.log('queFork Interceptor production build completed, extension.zip created 🚀');
