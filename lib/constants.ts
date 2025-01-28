export const PANEL_SIZING = {
  // Panel default sizes
  DEFAULT: 70, 
  EXPANDED: 100, // When expanded
  COLLAPSED: 0, // When collapsed

  // Fixed panel widths
  SIDEBAR: 25, // Left sidebar width
  MAIN: 75, // Main content width
} as const;

export type PanelState = typeof PANEL_SIZING;
