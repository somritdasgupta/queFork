#!/bin/bash
# Chrome Extension Packaging Script
# This script packages the Chrome extension into a ZIP file for release

set -e

EXTENSION_DIR="chrome-extension"
OUTPUT_DIR="releases"
VERSION=$(grep '"version"' "$EXTENSION_DIR/manifest.json" | sed -E 's/.*"version": "([^"]+)".*/\1/')
ZIP_NAME="quefork-chrome-extension-v${VERSION}.zip"

echo "📦 Packaging queFork Chrome Extension v${VERSION}..."

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Remove old zip if exists
rm -f "$OUTPUT_DIR/$ZIP_NAME"

# Create zip file
cd "$EXTENSION_DIR"
zip -r -q "../$OUTPUT_DIR/$ZIP_NAME" \
  manifest.json \
  background.js \
  content.js \
  sidepanel.html \
  sidepanel.js \
  styles.css \
  icons/

cd ..

echo "✅ Extension packaged: $OUTPUT_DIR/$ZIP_NAME"
echo ""
echo "📝 Next steps:"
echo "1. Upload this ZIP to Chrome Web Store"
echo "2. Or create a GitHub release:"
echo "   git tag -a v${VERSION} -m 'Chrome Extension v${VERSION}'"
echo "   git push origin v${VERSION}"
echo ""
echo "ℹ️  For automated GitHub release, run:"
echo "   npm run release:create -- --tag v${VERSION}"
