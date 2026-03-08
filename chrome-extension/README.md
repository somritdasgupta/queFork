# queFork Chrome Extension

A lightweight Chrome extension for API testing — directly in your browser sidebar.

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select this `chrome-extension` folder
5. Click the queFork icon in your toolbar to open the side panel

## Features

- **CORS-Free Requests** — The extension background script makes requests without any CORS restrictions
- **REST, GraphQL, WebSocket, SSE** — Protocol support
- **Auth Support** — Bearer, Basic, API Key authentication
- **Request History** — Persisted across sessions
- **Dark/Light Theme** — Matches the main queFork app design
- **Key-Value Editors** — For params, headers, and form data

## How It Works

Unlike the web app which needs CORS proxies, the Chrome extension's background
service worker (`background.js`) can make fetch requests to ANY URL without CORS
restrictions. This means:

- ✅ No proxy needed
- ✅ No agent needed  
- ✅ Works with any API
- ✅ Full response headers visible
- ✅ No request modification by intermediaries

## Folder Structure

```
chrome-extension/
├── manifest.json       # Extension manifest (MV3)
├── background.js       # Service worker — CORS-free proxy
├── sidepanel.html      # Side panel UI
├── sidepanel.js        # UI logic
├── styles.css          # Styles matching main app
├── icons/              # Extension icons (add your own)
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   └── icon-128.png
└── README.md           # This file
```

## Icons

You'll need to add icon files in the `icons/` folder. Required sizes:
- 16x16 px
- 32x32 px
- 48x48 px
- 128x128 px
