# Chrome Extension Release Guide

## Overview

This guide covers packaging and releasing the queFork Chrome Extension.

## Quick Start

### 1. Package the Extension

```bash
npm run extension:package
```

This creates a ZIP file in the `releases/` directory.

### 2. Create a GitHub Release

```bash
npm run release:create
```

This creates a GitHub release with the extension ZIP attached.

## Manual Release Process

### Step 1: Package the Extension

```bash
npm run extension:package
```

### Step 2: Create a Git Tag

```bash
git tag -a extension-v2.1.0 -m "Chrome Extension v2.1.0"
git push origin extension-v2.1.0
```

### Step 3: Create Release on GitHub

1. Go to: https://github.com/somritdasgupta/queFork/releases
2. Click "Draft a new release"
3. Select the tag you just pushed
4. Fill in the title: `Chrome Extension v2.1.0`
5. Add release notes (see template below)
6. Upload the ZIP file from `releases/`
7. Click "Publish release"

## Release Notes Template

```markdown
## Chrome Extension v2.1.0

### Features

- Localhost request interceptor
- CORS proxy agent for queFork API testing
- Side panel integration with Chrome

### Installation

1. Download the ZIP file
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the extracted folder

### What's New

- [List your changes here]

### Bug Fixes

- [List fixes here]

### File Size

- Compressed: [X KB]
- Uncompressed: [Y KB]
```

## Publishing to Chrome Web Store

1. Go to: https://chrome.google.com/webstore/devconsole/
2. Sign in with your Google account
3. Click "New item"
4. Upload the ZIP file
5. Fill in store listing details:
   - Title: queFork Agent
   - Summary: Localhost request interceptor & CORS proxy agent
   - Description: (copy from manifest.json)
   - Category: Developer Tools
   - Language: English
   - Detailed description: [Full description]
   - Screenshots (recommended): [Add promotional images]
   - Icon: [512x512 PNG]
   - Privacy policy: [Link or text]
6. Set pricing (Free)
7. Submit for review

## Version Updates

To release a new version:

1. Update version in `chrome-extension/manifest.json`:

   ```json
   "version": "2.2.0"
   ```

2. Package the extension:

   ```bash
   npm run extension:package
   ```

3. Create release:
   ```bash
   npm run release:create
   ```

## Troubleshooting

### ZIP file not created

- Ensure Node.js is installed and up to date
- Run `npm install` to install `archiver` package
- Check that `chrome-extension/` directory exists

### GitHub release fails

- Install GitHub CLI: `gh auth login`
- Or use manual process instead

### Extension won't load in Chrome

- Check manifest.json is valid JSON
- Ensure all referenced files exist
- Clear Chrome cache or restart browser

## Additional Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Chrome Web Store Publishing Guide](https://developer.chrome.com/docs/webstore/publish/)
- [Manifest.json Format](https://developer.chrome.com/docs/extensions/mv3/manifest/)
