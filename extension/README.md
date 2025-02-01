# queFork Extension Setup

This document provides instructions for setting up and using the queFork browser extension.

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- A compatible browser (Chrome or Edge)

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/somritdasgupta/queFork.git
    cd queFork/extension
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Build the extension:
    ```bash
    npm run build
    ```

## Loading the Extension

### Chrome/Edge
1. Open Chrome/Edge browser
2. Navigate to `chrome://extensions` or `edge://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist` folder from the build output

### Firefox
1. Open Firefox browser
2. Navigate to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select the `manifest.json` file from the `dist` folder

## Development

- Run development build with hot reload:
  ```bash
  npm run dev
  ```

- Create production build:
  ```bash
  npm run build
  ```

## Testing

```bash
npm run test
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
