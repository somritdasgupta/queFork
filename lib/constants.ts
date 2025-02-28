export const PANEL_SIZING = {
  DEFAULT: 50, // Default 50% height
  EXPANDED: 100, // Full height
  COLLAPSED: 40, // Collapsed state
  SIDEBAR: 25, // Left sidebar width
  MAIN: 75, // Main content width
} as const;

export const PANEL_STATES = {
  COLLAPSED: "collapsed",
  EXPANDED: "expanded",
  FULLSCREEN: "fullscreen",
} as const;

export const CONTENT_TYPES = {
  JSON: "json",
  HTML: "html",
  XML: "xml",
  TEXT: "text",
} as const;

export const TAB_IDS = {
  RESPONSE: "response",
  HEADERS: "headers",
  CODE: "code",
  MESSAGES: "messages",
} as const;

export type PanelState = typeof PANEL_SIZING;