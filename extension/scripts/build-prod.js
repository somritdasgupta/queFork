const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const { minify } = require("terser");

const ROOT_DIR = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT_DIR, "src");
const DIST_DIR = path.join(ROOT_DIR, "dist");

// Create required directories
const dirs = [
  DIST_DIR,
  path.join(DIST_DIR, "icons"),
  path.join(DIST_DIR, "fonts"),
  path.join(DIST_DIR, "libs"),
];

dirs.forEach((dir) => {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true });
  }
  fs.mkdirSync(dir, { recursive: true });
  console.log(`✓ Created directory: ${path.relative(ROOT_DIR, dir)}`);
});

// Helper function to copy files with logging
async function copyAndMinifyFile(src, dest, shouldMinify = false) {
  try {
    if (shouldMinify && src.endsWith(".js")) {
      const content = fs.readFileSync(src, "utf8");
      const minified = await minify(content, {
        compress: true,
        mangle: true,
      });
      fs.writeFileSync(dest, minified.code);
    } else {
      fs.copyFileSync(src, dest);
    }
    console.log(`✓ Copied ${path.relative(ROOT_DIR, dest)}`);
  } catch (error) {
    if (error.code === "ENOENT") {
      console.warn(`⚠ Warning: Missing file ${src}`);
    } else {
      console.error(`✕ Error copying ${src}:`, error.message);
    }
  }
}

// Copy main files
const mainFiles = ["manifest.json", "sidepanel.html", "popup.css"];
mainFiles.forEach((file) => {
  copyAndMinifyFile(path.join(SRC_DIR, file), path.join(DIST_DIR, file));
});

// Copy and minify JS files
const jsFiles = ["background.js", "content.js", "popup.js"];
jsFiles.forEach((file) => {
  copyAndMinifyFile(path.join(SRC_DIR, file), path.join(DIST_DIR, file), true);
});

// Copy icons
const iconFiles = ["icon16.png", "icon48.png", "icon128.png"];
iconFiles.forEach((file) => {
  copyAndMinifyFile(
    path.join(SRC_DIR, "icons", file),
    path.join(DIST_DIR, "icons", file)
  );
});

// Copy fonts
const fontFiles = [
  "inter.css",
  "Inter-Regular.woff2",
  "Inter-Medium.woff2",
  "Inter-SemiBold.woff2",
];
fontFiles.forEach((file) => {
  copyAndMinifyFile(
    path.join(SRC_DIR, "fonts", file),
    path.join(DIST_DIR, "fonts", file)
  );
});

// Copy libs
const libFiles = ["feather-icons.min.js"];
libFiles.forEach((file) => {
  copyAndMinifyFile(
    path.join(SRC_DIR, "libs", file),
    path.join(DIST_DIR, "libs", file)
  );
});

// Create ZIP file
const output = fs.createWriteStream(path.join(ROOT_DIR, "extension.zip"));
const archive = archiver("zip", { zlib: { level: 9 } });

archive.pipe(output);
archive.directory(DIST_DIR, false);
archive.finalize();

console.log(
  "\nqueFork Interceptor production build completed, extension.zip created 🚀"
);
