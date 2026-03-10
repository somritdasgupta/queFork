#!/usr/bin/env node

import fs from "fs";
import path from "path";

const repoRoot = process.cwd();
const srcDir = path.join(repoRoot, "src");
const exts = new Set([".tsx", ".jsx"]);

// These files intentionally use inline style for dynamic rendering/CSS vars.
const allowList = new Set([
  "src/components/CodeEditor.tsx",
  "src/components/ui/chart.tsx",
  "src/components/ui/progress.tsx",
  "src/components/ui/sidebar.tsx",
]);

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (exts.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

function findStyleLines(content) {
  const lines = content.split(/\r?\n/);
  const hits = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (/\bstyle\s*=\s*\{/.test(lines[i])) {
      hits.push(i + 1);
    }
  }
  return hits;
}

const files = walk(srcDir);
const violations = [];

for (const absPath of files) {
  const rel = path.relative(repoRoot, absPath).replace(/\\/g, "/");
  const content = fs.readFileSync(absPath, "utf8");
  const lines = findStyleLines(content);

  if (lines.length === 0) continue;
  if (allowList.has(rel)) continue;

  violations.push({ file: rel, lines });
}

if (violations.length > 0) {
  console.error(
    "Inline style guard failed. Move styles to CSS/classes or add explicit allowlist entry if justified.",
  );
  for (const v of violations) {
    console.error(`- ${v.file}: ${v.lines.join(", ")}`);
  }
  process.exit(1);
}

console.log("Inline style guard passed.");
