// ── Local-First Git-Synced Storage ────────────────────────────────────
// Uses File System Access API to read/write workspace data as individual
// JSON files in a user-chosen directory — ideal for git version control.
// Falls back to Chrome extension storage when the extension is present.
//
// Directory layout (FSA mode):
//   <root>/
//     workspace.json                          ← workspace metadata
//     collections/<collection-id>.json        ← one file per collection
//     environments/<environment-id>.json      ← one file per environment
//     flows/<flow-id>.json                    ← one file per flow

import type { Workspace, Collection, Environment, Flow } from "@/types/api";

// ── Feature detection ─────────────────────────────────────────────────

export function isFileSyncSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export function isExtensionSyncAvailable(): boolean {
  return (
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-quefork-agent") === "active"
  );
}

// ── IndexedDB handle persistence ─────────────────────────────────────
// FileSystemDirectoryHandle is a structured-clone-compatible object,
// so it can be round-tripped through IndexedDB across page reloads.

const IDB_NAME = "qf_file_sync";
const IDB_STORE = "handles";
const IDB_KEY = "sync_dir";

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function persistHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(handle, IDB_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function restoreHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => {
        db.close();
        resolve(req.result ?? null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

export async function clearPersistedHandle(): Promise<void> {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(IDB_KEY);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  } catch {
    // best-effort
  }
}

// ── Directory handle management ───────────────────────────────────────

let _dirHandle: FileSystemDirectoryHandle | null = null;

export function getSyncHandle(): FileSystemDirectoryHandle | null {
  return _dirHandle;
}

export function clearSyncHandle(): void {
  _dirHandle = null;
  clearPersistedHandle();
}

export async function pickSyncDirectory(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const handle = await (window as any).showDirectoryPicker({
      mode: "readwrite",
    });
    _dirHandle = handle;
    await persistHandle(handle);
    return handle;
  } catch {
    return null;
  }
}

/** Try to restore a previously-picked directory handle from IndexedDB. */
export async function tryAutoReconnect(): Promise<FileSystemDirectoryHandle | null> {
  const handle = await restoreHandle();
  if (!handle) return null;

  const ok = await verifySyncPermission(handle);
  if (!ok) return null;

  _dirHandle = handle;
  return handle;
}

// ── Helpers ───────────────────────────────────────────────────────────

async function ensureSubDir(
  parent: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemDirectoryHandle> {
  return parent.getDirectoryHandle(name, { create: true });
}

async function writeJsonFile(
  dir: FileSystemDirectoryHandle,
  filename: string,
  data: unknown,
): Promise<void> {
  const file = await dir.getFileHandle(filename, { create: true });
  const writable = await file.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

async function readJsonFile<T>(
  dir: FileSystemDirectoryHandle,
  filename: string,
): Promise<T | null> {
  try {
    const file = await dir.getFileHandle(filename);
    const blob = await file.getFile();
    const text = await blob.text();
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function listJsonFiles(
  dir: FileSystemDirectoryHandle,
): Promise<string[]> {
  const names: string[] = [];
  for await (const [name, handle] of dir as any) {
    if (handle.kind === "file" && name.endsWith(".json")) {
      names.push(name);
    }
  }
  return names;
}

async function removeFile(
  dir: FileSystemDirectoryHandle,
  filename: string,
): Promise<void> {
  try {
    await dir.removeEntry(filename);
  } catch {
    // File may not exist
  }
}

// ── Export workspace to directory ─────────────────────────────────────

export async function exportWorkspaceToDir(
  handle: FileSystemDirectoryHandle,
  workspace: Workspace,
  flows: Flow[] = [],
): Promise<void> {
  // Write workspace metadata (without nested data)
  await writeJsonFile(handle, "workspace.json", {
    id: workspace.id,
    name: workspace.name,
    description: workspace.description,
  });

  // Write collections
  const colDir = await ensureSubDir(handle, "collections");
  const existingCols = await listJsonFiles(colDir);
  const currentColFiles = new Set(
    workspace.collections.map((c) => `${c.id}.json`),
  );

  for (const col of workspace.collections) {
    await writeJsonFile(colDir, `${col.id}.json`, col);
  }
  // Remove files for deleted collections
  for (const f of existingCols) {
    if (!currentColFiles.has(f)) {
      await removeFile(colDir, f);
    }
  }

  // Write environments
  const envDir = await ensureSubDir(handle, "environments");
  const existingEnvs = await listJsonFiles(envDir);
  const currentEnvFiles = new Set(
    workspace.environments.map((e) => `${e.id}.json`),
  );

  for (const env of workspace.environments) {
    await writeJsonFile(envDir, `${env.id}.json`, env);
  }
  // Remove files for deleted environments
  for (const f of existingEnvs) {
    if (!currentEnvFiles.has(f)) {
      await removeFile(envDir, f);
    }
  }

  // Write flows
  const flowDir = await ensureSubDir(handle, "flows");
  const existingFlows = await listJsonFiles(flowDir);
  const currentFlowFiles = new Set(flows.map((f) => `${f.id}.json`));

  for (const flow of flows) {
    await writeJsonFile(flowDir, `${flow.id}.json`, flow);
  }
  // Remove files for deleted flows
  for (const f of existingFlows) {
    if (!currentFlowFiles.has(f)) {
      await removeFile(flowDir, f);
    }
  }
}

// ── Import workspace from directory ──────────────────────────────────

export async function importWorkspaceFromDir(
  handle: FileSystemDirectoryHandle,
): Promise<{ workspace: Workspace; flows: Flow[] } | null> {
  const meta = await readJsonFile<{
    id: string;
    name: string;
    description: string;
  }>(handle, "workspace.json");
  if (!meta) return null;

  // Read collections
  const collections: Collection[] = [];
  try {
    const colDir = await handle.getDirectoryHandle("collections");
    const colFiles = await listJsonFiles(colDir);
    for (const f of colFiles) {
      const col = await readJsonFile<Collection>(colDir, f);
      if (col) collections.push(col);
    }
  } catch {
    // No collections directory
  }

  // Read environments
  const environments: Environment[] = [];
  try {
    const envDir = await handle.getDirectoryHandle("environments");
    const envFiles = await listJsonFiles(envDir);
    for (const f of envFiles) {
      const env = await readJsonFile<Environment>(envDir, f);
      if (env) environments.push(env);
    }
  } catch {
    // No environments directory
  }

  // Read flows
  const flows: Flow[] = [];
  try {
    const flowDir = await handle.getDirectoryHandle("flows");
    const flowFiles = await listJsonFiles(flowDir);
    for (const f of flowFiles) {
      const flow = await readJsonFile<Flow>(flowDir, f);
      if (flow) flows.push(flow);
    }
  } catch {
    // No flows directory
  }

  return {
    workspace: {
      id: meta.id,
      name: meta.name,
      description: meta.description,
      collections,
      environments,
    },
    flows,
  };
}

// ── Verify permission on existing handle ──────────────────────────────

export async function verifySyncPermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  try {
    const perm = await (handle as any).queryPermission({ mode: "readwrite" });
    if (perm === "granted") return true;
    const req = await (handle as any).requestPermission({ mode: "readwrite" });
    return req === "granted";
  } catch {
    return false;
  }
}

// ── Extension-based sync (chrome.storage.local via bridge) ────────────
// When the queFork chrome extension is installed, we can store workspace
// snapshots through its bridge — works on ALL sites, cross-tab sync, and
// doesn't require File System Access API.

const EXT_MSG_TIMEOUT = 3000;

function sendExtensionMessage(
  type: string,
  payload: unknown,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const responseType = `QUEFORK_STORAGE_RESPONSE`;

    const timer = setTimeout(() => {
      window.removeEventListener("message", handler);
      reject(new Error("Extension bridge timeout"));
    }, EXT_MSG_TIMEOUT);

    function handler(event: MessageEvent) {
      const d = event.data;
      if (d?.type === responseType && d?.id === id) {
        clearTimeout(timer);
        window.removeEventListener("message", handler);
        resolve(d.payload);
      }
    }

    window.addEventListener("message", handler);
    window.postMessage({ type, id, payload }, "*");
  });
}

export async function syncToExtension(workspace: Workspace): Promise<boolean> {
  if (!isExtensionSyncAvailable()) return false;
  try {
    await sendExtensionMessage("QUEFORK_STORAGE_SET", {
      key: `qf_workspace_${workspace.id}`,
      value: workspace,
    });
    return true;
  } catch {
    return false;
  }
}

export async function loadFromExtension(
  workspaceId: string,
): Promise<Workspace | null> {
  if (!isExtensionSyncAvailable()) return null;
  try {
    const result = await sendExtensionMessage("QUEFORK_STORAGE_GET", {
      key: `qf_workspace_${workspaceId}`,
    });
    return (result as { value: Workspace | null })?.value ?? null;
  } catch {
    return null;
  }
}
