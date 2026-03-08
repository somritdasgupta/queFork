// ── Secure Storage Layer ──────────────────────────────────────────────
// Encrypts sensitive data before storing in localStorage.
// Uses AES-GCM with a randomly generated key stored in IndexedDB.

const STORAGE_PREFIX = "qf_";
const SENSITIVE_KEYS = ["qf_workspaces", "qf_history", "qf_tabs"];
const IDB_DB_NAME = "qf_keystore";
const IDB_STORE_NAME = "keys";
const IDB_KEY_ID = "master_key";

// ── IndexedDB key storage ─────────────────────────────────────────────

function openKeyStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadKeyFromIDB(): Promise<CryptoKey | null> {
  try {
    const db = await openKeyStore();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, "readonly");
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.get(IDB_KEY_ID);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function saveKeyToIDB(key: CryptoKey): Promise<void> {
  try {
    const db = await openKeyStore();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, "readwrite");
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.put(key, IDB_KEY_ID);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // If IDB fails, key stays in memory for this session only
  }
}

// ── Key generation / retrieval ────────────────────────────────────────

async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false, // non-extractable
    ["encrypt", "decrypt"],
  );
}

let _cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (_cachedKey) return _cachedKey;

  // Try loading existing key from IndexedDB
  const stored = await loadKeyFromIDB();
  if (stored) {
    _cachedKey = stored;
    return stored;
  }

  // First run: generate a new random key and persist it
  const key = await generateKey();
  await saveKeyToIDB(key);
  _cachedKey = key;
  return key;
}

// ── Encrypt / Decrypt ─────────────────────────────────────────────────

async function encrypt(data: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(data),
  );
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(data: string, key: CryptoKey): Promise<string> {
  const combined = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(decrypted);
}

// Check if a value looks like it's encrypted (base64 with minimum length)
function isEncrypted(value: string): boolean {
  if (value.length < 20) return false;
  try {
    atob(value);
    return (
      !value.startsWith("{") && !value.startsWith("[") && !value.startsWith('"')
    );
  } catch {
    return false;
  }
}

// ── Public API ────────────────────────────────────────────────────────

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.includes(key);
}

export async function secureGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;

    if (isSensitiveKey(key) && isEncrypted(raw)) {
      const cryptoKey = await getKey();
      try {
        const decrypted = await decrypt(raw, cryptoKey);
        return JSON.parse(decrypted);
      } catch {
        // Decryption failed — data may have been encrypted with old
        // fingerprint-based key. Return fallback so it gets re-encrypted
        // on next write with the new random key.
        return fallback;
      }
    }

    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function secureSet(key: string, value: any): Promise<void> {
  const json = JSON.stringify(value);
  if (isSensitiveKey(key)) {
    const cryptoKey = await getKey();
    const encrypted = await encrypt(json, cryptoKey);
    localStorage.setItem(key, encrypted);
  } else {
    localStorage.setItem(key, json);
  }
}

// Synchronous versions for non-sensitive data (backward compat)
export function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    if (isSensitiveKey(key) && isEncrypted(raw)) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function lsSet(key: string, value: any): void {
  try {
    if (isSensitiveKey(key)) {
      // Always encrypt sensitive keys — no plaintext fallback
      secureSet(key, value).catch((err) => {
        console.error(
          "[secure-storage] Failed to encrypt sensitive data:",
          err,
        );
        // Do NOT fall back to plaintext — data stays in memory only
      });
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    console.error("[secure-storage] Failed to write to localStorage.");
  }
}

// ── Migration: encrypt any existing unencrypted sensitive data ────────
export async function migrateToSecureStorage(): Promise<void> {
  for (const key of SENSITIVE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) continue;
      if (isEncrypted(raw)) {
        // Try decrypting with new key — if it fails, data was encrypted
        // with old fingerprint key and needs re-encryption
        const cryptoKey = await getKey();
        try {
          await decrypt(raw, cryptoKey);
          continue; // Already encrypted with current key
        } catch {
          // Old key — can't recover, remove stale encrypted data
          localStorage.removeItem(key);
          continue;
        }
      }

      // Plaintext data — encrypt with new random key
      const data = JSON.parse(raw);
      await secureSet(key, data);
    } catch {
      // Skip if migration fails for this key
    }
  }
}

// ── Sanitize export: strip sensitive auth data ────────────────────────
export function sanitizeForExport(data: any): any {
  if (!data) return data;
  const clone = JSON.parse(JSON.stringify(data));

  function stripAuth(obj: any) {
    if (!obj) return;
    if (obj.auth) {
      if (obj.auth.bearer) obj.auth.bearer.token = "***REDACTED***";
      if (obj.auth.basic) {
        obj.auth.basic.username = "***REDACTED***";
        obj.auth.basic.password = "***REDACTED***";
      }
      if (obj.auth.apiKey) obj.auth.apiKey.value = "***REDACTED***";
      if (obj.auth.oauth2) {
        obj.auth.oauth2.clientSecret = "***REDACTED***";
        obj.auth.oauth2.accessToken = "***REDACTED***";
      }
    }
    if (Array.isArray(obj.requests)) obj.requests.forEach(stripAuth);
    if (Array.isArray(obj.collections))
      obj.collections.forEach((c: any) => stripAuth(c));
  }

  if (Array.isArray(clone)) clone.forEach(stripAuth);
  else stripAuth(clone);

  return clone;
}
