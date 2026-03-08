#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const manifestPath = path.join("chrome-extension", "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const version = manifest.version;
const zipName = `quefork-chrome-extension-v${version}.zip`;
const zipPath = path.join("releases", zipName);

if (!fs.existsSync(zipPath)) {
  console.error(
    `❌ Error: ${zipPath} not found. Run 'npm run extension:package' first.`,
  );
  process.exit(1);
}

console.log(`\n🚀 Creating GitHub Release v${version}...\n`);

const releaseNotes = `## Chrome Extension v${version}

### Features
- Localhost request interceptor
- CORS proxy agent for queFork API testing
- Side panel integration with Chrome

### Installation
1. Download \`${zipName}\`
2. Go to \`chrome://extensions/\`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the extracted folder

### File Size
- Compressed: ${(fs.statSync(zipPath).size / 1024).toFixed(2)} KB
- Installation: Extract the ZIP and load from Chrome Extensions page

### Release Date
${new Date().toISOString().split("T")[0]}
`;

try {
  // Try using GitHub CLI
  try {
    console.log("📋 Checking for GitHub CLI...");
    execSync("gh --version", { stdio: "ignore" });

    // Create release using gh CLI
    console.log(`Creating release using GitHub CLI...`);
    const tagName = `extension-v${version}`;

    // Create tag
    try {
      execSync(`git tag ${tagName}`, { stdio: "pipe" });
    } catch (e) {
      // Tag might already exist
    }

    // Push tag
    execSync(`git push origin ${tagName}`, { stdio: "pipe" });

    // Create release
    execSync(
      `gh release create ${tagName} "${zipPath}" --title "Chrome Extension v${version}" --notes "${releaseNotes.replace(/"/g, '\\"')}"`,
      {
        stdio: "inherit",
      },
    );

    console.log(
      `\n✅ Release created: https://github.com/$GITHUB_REPO/releases/tag/${tagName}`,
    );
  } catch (e) {
    // If gh CLI is not available, provide manual instructions
    console.log("⚠️  GitHub CLI not found. Using manual release process...\n");
    console.log("📝 Manual Steps:");
    console.log(
      `\n1. Create a git tag:\n   git tag -a extension-v${version} -m "Chrome Extension v${version}"\n`,
    );
    console.log(`2. Push the tag:\n   git push origin extension-v${version}\n`);
    console.log("3. Go to: https://github.com/somritdasgupta/queFork/releases");
    console.log('4. Click "Draft a new release"');
    console.log(`5. Select tag: extension-v${version}`);
    console.log(`6. Title: "Chrome Extension v${version}"`);
    console.log("7. Paste release notes:");
    console.log(releaseNotes);
    console.log(`8. Upload file: ${zipPath}`);
    console.log('9. Click "Publish release"\n');
  }
} catch (error) {
  console.error("Error:", error.message);
  process.exit(1);
}
