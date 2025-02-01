const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT_DIR, "src");
const DIST_DIR = path.join(ROOT_DIR, "dist");

// Create directories if they don't exist
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR);
}
if (!fs.existsSync(path.join(DIST_DIR, "icons"))) {
  fs.mkdirSync(path.join(DIST_DIR, "icons"));
}

// Helper function to copy files with logging
function copyFile(src, dest) {
  try {
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied ${path.basename(src)}`);
  } catch (error) {
    if (error.code === "ENOENT") {
      console.warn(`⚠ Warning: Missing file ${src}`);
    } else {
      console.error(`✕ Error copying ${src}:`, error.message);
    }
  }
}

// Copy main files
const mainFiles = ["manifest.json", "popup.html", "popup.css"];
mainFiles.forEach((file) => {
  copyFile(path.join(SRC_DIR, file), path.join(DIST_DIR, file));
});

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

console.log("\nqueFork Interceptor build completed 🚀");
