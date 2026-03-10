<p align="center">
  <img src="public/icon-512.png" alt="queFork" width="72" height="72" />
</p>

<h1 align="center">queFork</h1>

<p align="center">Fast API testing client for REST, GraphQL, SOAP, WebSocket, SSE and Socket.IO</p>

<p align="center">
  <a href="https://github.com/somritdasgupta/queFork/actions/workflows/edge-deploy.yml"><img src="https://img.shields.io/github/actions/workflow/status/somritdasgupta/queFork/edge-deploy.yml?branch=main&label=build&style=flat-square" alt="Build" /></a>
  <a href="https://github.com/somritdasgupta/queFork/actions/workflows/docker-publish.yml"><img src="https://img.shields.io/github/actions/workflow/status/somritdasgupta/queFork/docker-publish.yml?branch=main&label=docker&style=flat-square" alt="Docker" /></a>
  <a href="https://github.com/somritdasgupta/queFork/blob/main/LICENSE"><img src="https://img.shields.io/github/license/somritdasgupta/queFork?style=flat-square" alt="License" /></a>
  <a href="https://github.com/somritdasgupta/queFork"><img src="https://img.shields.io/github/stars/somritdasgupta/queFork?style=flat-square" alt="Stars" /></a>
  <a href="https://github.com/somritdasgupta/queFork/issues"><img src="https://img.shields.io/github/issues/somritdasgupta/queFork?style=flat-square" alt="Issues" /></a>
  <a href="https://github.com/somritdasgupta/queFork/pulls"><img src="https://img.shields.io/github/issues-pr/somritdasgupta/queFork?style=flat-square" alt="PRs" /></a>
  <img src="https://img.shields.io/github/repo-size/somritdasgupta/queFork?style=flat-square" alt="Repo Size" />
  <img src="https://img.shields.io/github/last-commit/somritdasgupta/queFork?style=flat-square" alt="Last Commit" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Supported Protocols](#supported-protocols)
- [Features](#features)
- [Getting Started](#getting-started)
- [Docker](#docker)
- [Chrome Extension](#chrome-extension)
- [queFork Agent](#quefork-agent)
- [Custom CORS Proxy](#custom-cors-proxy)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Deployment](#deployment)
- [CI/CD](#cicd)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

queFork is a browser-based API testing client that works entirely offline after first load. It supports six protocols, runs as a PWA for localhost testing, and requires zero backend setup. All data is stored locally in the browser.

---

## Supported Protocols

| Protocol  | Capabilities                                                                |
| --------- | --------------------------------------------------------------------------- |
| REST      | GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD with headers, params, and body |
| GraphQL   | Query editor, variables panel, schema introspection                         |
| SOAP      | XML envelope editor, Content-Type auto-detection                            |
| WebSocket | Bidirectional messaging, sub-protocol support                               |
| Socket.IO | Event-based messaging, transport configuration, event listeners             |
| SSE       | Auto-reconnect, event buffering, real-time statistics                       |

---

## Features

| Category        | Details                                                 |
| --------------- | ------------------------------------------------------- |
| Scripting       | Pre/post request JavaScript with `qf.*` API             |
| Variables       | Environment variables using `{{variable}}` syntax       |
| Collections     | Organize requests into folders with workspace isolation |
| Code Export     | cURL import and export to 14 languages                  |
| CORS            | Built-in proxy cascade with custom proxy support        |
| History         | Searchable request history with date grouping           |
| Auth            | OAuth 2.0, Bearer, Basic, API Key                       |
| Themes          | Dark and light mode                                     |
| Offline         | Full PWA support for localhost testing without internet |
| Dynamic Favicon | Green/red status dot on favicon based on response codes |

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm (included with Node.js)

### Steps

1. Clone the repository

```bash
git clone https://github.com/somritdasgupta/queFork.git
```

2. Navigate to the project directory

```bash
cd queFork
```

3. Install dependencies

```bash
npm install
```

4. Start the development server

```bash
npm run dev
```

5. Open the app at `http://localhost:8080`

### Available Scripts

| Command                  | Description                                                 |
| ------------------------ | ----------------------------------------------------------- |
| `npm run dev`            | Start development server with hot reload                    |
| `npm run build`          | Create production build                                     |
| `npm run preview`        | Preview production build locally                            |
| `npm run lint`           | Run ESLint checks                                           |
| `npm test`               | Run test suite                                              |
| `npm run secrets:vercel` | Auto-set `VERCEL_*` GitHub secrets from local Vercel config |

---

## Docker

### Build and run locally

```bash
docker compose up -d
```

The app will be available at `http://localhost:3000`.

### Manual build

```bash
docker build -t quefork .
docker run -d -p 3000:80 quefork
```

### Pull from GitHub Container Registry

```bash
docker pull ghcr.io/somritdasgupta/quefork:latest
docker run -d -p 3000:80 ghcr.io/somritdasgupta/quefork:latest
```

### Docker configuration

| File                 | Purpose                                                               |
| -------------------- | --------------------------------------------------------------------- |
| `Dockerfile`         | Multi-stage build: Node 20 Alpine for build, Nginx Alpine for serving |
| `docker-compose.yml` | Single-command setup with health checks                               |
| `docker/nginx.conf`  | Gzip, SPA routing, caching, security headers                          |
| `.dockerignore`      | Excludes node_modules, .git, and non-essential files                  |

---

## Chrome Extension

A side-panel extension for CORS-free API testing directly inside Chrome.

### Installation

1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `chrome-extension/` folder from this repository
5. Click the queFork icon in the toolbar to open the side panel

All requests route through Chrome's background service worker, bypassing CORS restrictions entirely.

---

## queFork Agent

A lightweight local proxy for testing against localhost, private networks, and APIs that block browser requests.

### Installation

```bash
npm install -g quefork-agent
quefork-agent
```

### Options

| Flag          | Description            |
| ------------- | ---------------------- |
| `--port 9120` | Custom port            |
| `--verbose`   | Enable verbose logging |

Agent status appears in the app footer. When the agent is running, all requests are routed through it instead of the built-in CORS proxy.

---

## Custom CORS Proxy

Deploy your own proxy on Vercel for persistent CORS bypass:

```javascript
// api/proxy.js
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { url, method, headers, body } = req.body;
  const response = await fetch(url, {
    method: method || "GET",
    headers: headers || {},
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.text();
  res.status(200).json({ status: response.status, body: data });
}
```

```bash
vercel deploy
```

---

## Project Structure

```
quefork/
├── src/
│   ├── components/          UI components
│   │   ├── AuthEditor       OAuth 2.0, Bearer, Basic, API Key
│   │   ├── CodeEditor       CodeMirror-based editor
│   │   ├── KeyValueEditor   Drag-and-drop key-value pairs
│   │   ├── RealtimePanel    WebSocket and Socket.IO
│   │   ├── RequestTabs      Params, Headers, Body, Scripts
│   │   ├── ResponsePanel    Body, Preview, Headers, Tests
│   │   └── ui/              shadcn/ui primitives
│   ├── lib/
│   │   ├── api-client       Request execution and CORS cascade
│   │   ├── curl-parser      Import/export for 14 languages
│   │   ├── dynamic-favicon  Status dot overlay on favicon
│   │   └── secure-storage   Encrypted localStorage
│   ├── assets/
│   │   └── brand/           Master brand assets (single source of truth)
│   ├── pages/
│   │   └── Index            Main app layout and state management
│   └── types/
│       └── api              TypeScript interfaces
├── chrome-extension/        Chrome side panel extension
├── docker/                  Nginx configuration
├── .github/workflows/       CI/CD pipelines
├── Dockerfile               Multi-stage production build
└── docker-compose.yml       Container orchestration
```

---

## Tech Stack

| Technology       | Role                           |
| ---------------- | ------------------------------ |
| React 18         | UI framework                   |
| TypeScript       | Type safety                    |
| Vite             | Build tooling and dev server   |
| Tailwind CSS     | Utility-first styling          |
| shadcn/ui        | Component primitives           |
| CodeMirror 6     | Code editors                   |
| socket.io-client | Socket.IO protocol support     |
| vite-plugin-pwa  | PWA and offline support        |
| Nginx            | Production static file serving |

---

## Deployment

### Vercel

```bash
npm install -g vercel
vercel login
vercel link
npm run secrets:vercel
```

When Vercel asks for your code directory, use `.` (repository root).

Required repository secrets for deploy workflows:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

The `npm run secrets:vercel` command sets all three automatically after `vercel login` and `vercel link`.

### Netlify

```bash
npm run build
# Deploy the dist/ folder via Netlify dashboard or CLI
```

### Docker

See the [Docker](#docker) section above.

### Self-hosted

```bash
npm run build
# Serve the dist/ folder with any static file server
npx serve dist
```

---

## CI/CD

| Workflow                | Trigger                                              | Description                                         |
| ----------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| `ci.yml`                | Push to main/develop, pull requests                  | Lint, test, and build matrix checks                 |
| `build-deploy.yml`      | Push to main, manual dispatch                        | Build + deploy summary workflow                     |
| `edge-deploy.yml`       | Push to main/develop, pull requests, manual dispatch | Type check, build, deploy to Vercel                 |
| `docker-publish.yml`    | Push to main, tags, manual dispatch                  | Build and push Docker image to GHCR                 |
| `extension-release.yml` | Tag push `extension-v*`, manual dispatch             | Package Chrome extension and publish GitHub release |
| `dependency-update.yml` | Weekly schedule, manual dispatch                     | Update dependencies, verify build, create PR        |

### Extension Release Automation

Automatic release from tag:

```bash
git tag extension-v2.1.0
git push origin extension-v2.1.0
```

Manual release is still available from the Actions tab via `workflow_dispatch`.

### Badge Status Note

GitHub Actions badges show `no status` until that workflow has at least one run on the default branch.

---

## Contributing

1. Fork the repository
2. Clone your fork

```bash
git clone https://github.com/YOUR_USERNAME/queFork.git
cd queFork
npm install
```

3. Create a feature branch

```bash
git checkout -b feature/your-feature
```

4. Make changes and test

```bash
npm run dev
npm test
npm run lint
```

5. Commit and push

```bash
git add .
git commit -m "Add your feature"
git push origin feature/your-feature
```

6. Open a pull request on GitHub

---

## License

MIT -- [Somrit Dasgupta](https://github.com/somritdasgupta)
