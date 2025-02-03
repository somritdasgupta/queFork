const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT_DIR, "src");
const DIST_DIR = path.join(ROOT_DIR, "dist");

// Create required directories
const dirs = [
  DIST_DIR,
  path.join(DIST_DIR, "icons"),
  path.join(DIST_DIR, "fonts"),
  path.join(DIST_DIR, "libs")
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✓ Created directory: ${path.relative(ROOT_DIR, dir)}`);
  }
});

// Copy main files - Replace popup.html with sidepanel.html
const mainFiles = ["manifest.json", "sidepanel.html", "popup.css"];
mainFiles.forEach((file) => {
  copyFile(path.join(SRC_DIR, file), path.join(DIST_DIR, file));
});

// Remove popup.html if it exists in dist
const popupPath = path.join(DIST_DIR, 'popup.html');
if (fs.existsSync(popupPath)) {
  fs.unlinkSync(popupPath);
  console.log('✓ Removed popup.html');
}

// Helper function to copy files with logging
function copyFile(src, dest) {
  try {
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied ${path.relative(ROOT_DIR, dest)}`);
  } catch (error) {
    if (error.code === "ENOENT") {
      console.warn(`⚠ Warning: Missing file ${src}`);
    } else {
      console.error(`✕ Error copying ${src}:`, error.message);
    }
  }
}

// Copy JS files
const jsFiles = ["background.js", "content.js", "popup.js"];
jsFiles.forEach((file) => {
  copyFile(path.join(SRC_DIR, file), path.join(DIST_DIR, file));
});

// Copy icons
const iconFiles = ["icon16.png", "icon48.png", "icon128.png"];
iconFiles.forEach((file) => {
  copyFile(
    path.join(SRC_DIR, "icons", file),
    path.join(DIST_DIR, "icons", file)
  );
});

// Copy fonts
const fontFiles = ["inter.css", "Inter-Regular.woff2", "Inter-Medium.woff2", "Inter-SemiBold.woff2"];
fontFiles.forEach((file) => {
  copyFile(
    path.join(SRC_DIR, "fonts", file),
    path.join(DIST_DIR, "fonts", file)
  );
});

// Copy libs
const libFiles = ["feather-icons.min.js"];
libFiles.forEach((file) => {
  copyFile(
    path.join(SRC_DIR, "libs", file),
    path.join(DIST_DIR, "libs", file)
  );
});

console.log("\nqueFork Interceptor build completed 🚀");
