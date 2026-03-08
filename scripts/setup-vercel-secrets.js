#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    fail(`${command} ${args.join(" ")} failed${stderr ? `: ${stderr}` : ""}`);
  }
  return result.stdout?.trim() ?? "";
}

function readJsonIfExists(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

const projectFile = join(process.cwd(), ".vercel", "project.json");
const authFile = join(homedir(), ".vercel", "auth.json");

const projectJson = readJsonIfExists(projectFile);
const authJson = readJsonIfExists(authFile);

const orgId = process.env.VERCEL_ORG_ID || projectJson?.orgId || "";
const projectId = process.env.VERCEL_PROJECT_ID || projectJson?.projectId || "";
const token = process.env.VERCEL_TOKEN || authJson?.token || "";

if (!orgId || !projectId) {
  fail(
    "Missing orgId/projectId. Run `vercel link` in this repo first, or set VERCEL_ORG_ID and VERCEL_PROJECT_ID env vars."
  );
}

if (!token) {
  fail(
    "Missing Vercel token. Run `vercel login` first, set VERCEL_TOKEN env var, or create a token in Vercel dashboard."
  );
}

run("gh", ["auth", "status"]);

run("gh", ["secret", "set", "VERCEL_TOKEN", "-b", token]);
run("gh", ["secret", "set", "VERCEL_ORG_ID", "-b", orgId]);
run("gh", ["secret", "set", "VERCEL_PROJECT_ID", "-b", projectId]);

console.log("Set GitHub secrets: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID");
console.log("Source: .vercel/project.json and ~/.vercel/auth.json (or env vars)");
