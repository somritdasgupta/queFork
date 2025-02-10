export const PANEL_SIZING = {
  DEFAULT: 50, // Default 50% height
  EXPANDED: 100, // Full height
  COLLAPSED: 0, // Collapsed state
  SIDEBAR: 25, // Left sidebar width
  MAIN: 75, // Main content width
} as const;

export type PanelState = typeof PANEL_SIZING;
