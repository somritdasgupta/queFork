/**
 * Programmatic brand icon generator.
 * Generates the qF favicon/icon using Canvas API for pixel-perfect consistency
 * with the app's text logo (Inter Black, white "q", blue "F", #141414 bg).
 * All icons have rounded corners — no white border.
 */

const BRAND = {
  bg: "#141414",
  white: "#FFFFFF",
  blue: "#1A8CFF", // hsl(211, 100%, 55%)
  font: '900 {{SIZE}}px "Inter", system-ui, -apple-system, sans-serif',
  cornerRadius: 0.18, // 18% of size
};

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Generate a brand icon as a canvas element.
 */
export function generateBrandIcon(size: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Transparent background first
  ctx.clearRect(0, 0, size, size);

  // Rounded rectangle background — edge-to-edge, no padding
  const radius = Math.round(size * BRAND.cornerRadius);
  drawRoundedRect(ctx, 0, 0, size, size, radius);
  ctx.fillStyle = BRAND.bg;
  ctx.fill();

  // Clip to the rounded rect so text doesn't bleed outside
  ctx.save();
  drawRoundedRect(ctx, 0, 0, size, size, radius);
  ctx.clip();

  // Font size — large to fill the square
  const fontSize = Math.round(size * 0.7);
  ctx.font = BRAND.font.replace("{{SIZE}}", String(fontSize));
  ctx.textBaseline = "middle";

  // Measure both parts
  const qText = "q";
  const fText = "F";
  const qWidth = ctx.measureText(qText).width;
  const fWidth = ctx.measureText(fText).width;
  const totalWidth = qWidth + fWidth;
  const startX = (size - totalWidth) / 2;

  const centerY = size / 2 + fontSize * 0.05;

  // Draw "q" in white
  ctx.fillStyle = BRAND.white;
  ctx.textAlign = "left";
  ctx.fillText(qText, startX, centerY);

  // Draw "F" in blue
  ctx.fillStyle = BRAND.blue;
  ctx.fillText(fText, startX + qWidth, centerY);

  ctx.restore();

  return canvas;
}

/**
 * Generate a brand icon as a data URL.
 */
export function generateBrandIconDataURL(size: number): string {
  return generateBrandIcon(size).toDataURL("image/png");
}

/**
 * Set the favicon to the programmatically generated brand icon.
 */
export function setBrandFavicon(size = 64): void {
  const dataUrl = generateBrandIconDataURL(size);
  let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = "image/png";
  link.href = dataUrl;
}

/**
 * Update PWA manifest icons dynamically using canvas-generated icons.
 * This overrides the static PNGs referenced in the manifest.
 */
export function setPWAIcons(): void {
  // Update apple-touch-icon if present
  const appleIcon = document.querySelector(
    'link[rel="apple-touch-icon"]',
  ) as HTMLLinkElement;
  if (appleIcon) {
    appleIcon.href = generateBrandIconDataURL(512);
  }
}

/**
 * Developer utility: download generated icons as PNG files.
 * Run in browser console: downloadBrandIcons()
 */
(window as any).downloadBrandIcons = () => {
  const sizes = [16, 32, 48, 64, 128, 192, 512];
  sizes.forEach((size) => {
    const canvas = generateBrandIcon(size);
    const link = document.createElement("a");
    link.download = `qf-icon-${size}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
  console.log(
    "Downloaded all brand icons. Replace the static files in public/ and chrome-extension/icons/.",
  );
};
