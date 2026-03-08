/**
 * Dynamic favicon with status dot overlay.
 * Uses the programmatically generated brand icon as the base,
 * ensuring perfect consistency with the app's text logo.
 */

import { generateBrandIcon } from './brand-icon';

const FAVICON_SELECTOR = 'link[rel="icon"]';
const DOT_DISPLAY_MS = 5000;
let clearTimer: ReturnType<typeof setTimeout> | null = null;
let baseIconCanvas: HTMLCanvasElement | null = null;

function getFaviconLink(): HTMLLinkElement | null {
  return document.querySelector(FAVICON_SELECTOR);
}

function getBaseIcon(): HTMLCanvasElement {
  if (!baseIconCanvas) {
    baseIconCanvas = generateBrandIcon(64);
  }
  return baseIconCanvas;
}

function drawFaviconWithDot(color: string) {
  const link = getFaviconLink();
  if (!link) return;

  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Draw base brand icon
  ctx.drawImage(getBaseIcon(), 0, 0, size, size);

  // Draw status dot (bottom-right corner)
  const dotRadius = 9;
  const dotX = size - dotRadius - 2;
  const dotY = size - dotRadius - 2;

  // Dark border ring
  ctx.beginPath();
  ctx.arc(dotX, dotY, dotRadius + 2, 0, Math.PI * 2);
  ctx.fillStyle = '#141414';
  ctx.fill();

  // Colored dot
  ctx.beginPath();
  ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  link.href = canvas.toDataURL('image/png');
}

function restoreFavicon() {
  const link = getFaviconLink();
  if (link) {
    link.href = getBaseIcon().toDataURL('image/png');
  }
}

/**
 * Update the favicon with a status dot based on HTTP status code.
 */
export function updateFaviconStatus(statusCode: number) {
  if (clearTimer) clearTimeout(clearTimer);

  if (statusCode >= 200 && statusCode < 300) {
    drawFaviconWithDot('#22c55e'); // green
  } else if (statusCode >= 400) {
    drawFaviconWithDot('#ef4444'); // red
  } else if (statusCode >= 300 && statusCode < 400) {
    drawFaviconWithDot('#eab308'); // yellow
  }

  clearTimer = setTimeout(() => {
    restoreFavicon();
    clearTimer = null;
  }, DOT_DISPLAY_MS);
}

/**
 * Manually clear the status dot.
 */
export function clearFaviconStatus() {
  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }
  restoreFavicon();
}
