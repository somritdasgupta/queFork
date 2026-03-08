# queFork Brand Assets — Single Source of Truth

All brand images live here. When you update a file, run the copy commands below to propagate everywhere.

## Master Files

| File | Purpose |
|------|---------|
| `logo-512.png` | Main qF icon (favicon, PWA, extension) |
| `og-image.png` | Social sharing image (1200×630) |

## Where assets are used

### logo-512.png → copied to:
- `public/favicon.png` — browser tab icon
- `public/icon-192.png` — PWA icon (192×192)
- `public/icon-512.png` — PWA icon (512×512)
- `src/assets/qf-icon-512.png` — in-app / agent icon
- `chrome-extension/icons/icon-16.png`
- `chrome-extension/icons/icon-32.png`
- `chrome-extension/icons/icon-48.png`
- `chrome-extension/icons/icon-128.png`

### og-image.png → copied to:
- `public/og-image.png` — OpenGraph social preview

## How to update

Replace the master file(s) in this folder, then copy:

```bash
# Update logo everywhere
cp src/assets/brand/logo-512.png public/favicon.png
cp src/assets/brand/logo-512.png public/icon-192.png
cp src/assets/brand/logo-512.png public/icon-512.png
cp src/assets/brand/logo-512.png src/assets/qf-icon-512.png
cp src/assets/brand/logo-512.png chrome-extension/icons/icon-16.png
cp src/assets/brand/logo-512.png chrome-extension/icons/icon-32.png
cp src/assets/brand/logo-512.png chrome-extension/icons/icon-48.png
cp src/assets/brand/logo-512.png chrome-extension/icons/icon-128.png

# Update OG image
cp src/assets/brand/og-image.png public/og-image.png
```

Or just tell the AI: "Update my brand assets from the brand folder"
