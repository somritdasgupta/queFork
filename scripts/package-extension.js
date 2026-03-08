#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import archiver from "archiver";

const manifestPath = path.join("chrome-extension", "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const version = manifest.version;
const outputDir = "releases";
const zipName = `quefork-chrome-extension-v${version}.zip`;
const zipPath = path.join(outputDir, zipName);

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Remove old zip if exists
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

console.log(`\n📦 Packaging queFork Chrome Extension v${version}...\n`);

// Create zip file
const output = fs.createWriteStream(zipPath);
const archive = archiver("zip", { zlib: { level: 9 } });

output.on("close", () => {
  console.log(
    `\n✅ Extension packaged: ${zipPath} (${(archive.pointer() / 1024).toFixed(2)} KB)\n`,
  );
  console.log("📝 Next steps:\n");
  console.log("1. Upload to Chrome Web Store:");
  console.log("   https://chrome.google.com/webstore/devconsole/\n");
  console.log("2. Or create a GitHub release:");
  console.log(`   git tag -a v${version} -m "Chrome Extension v${version}"`);
  console.log(`   git push origin v${version}\n`);
});

archive.on("error", (err) => {
  console.error("Error creating archive:", err);
  process.exit(1);
});

archive.pipe(output);

// Add files to zip
archive.directory("chrome-extension/", false);

archive.finalize();
