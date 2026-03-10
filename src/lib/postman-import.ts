import type {
  Collection,
  RequestConfig,
  KeyValuePair,
  AuthConfig,
  HttpMethod,
  BodyType,
} from "@/types/api";

// ── Postman Collection v2.1 types ─────────────────────────────────────
interface PostmanCollection {
  info: {
    name: string;
    description?: string;
    schema: string;
  };
  item: PostmanItem[];
  auth?: PostmanAuth;
  variable?: { key: string; value: string }[];
}

interface PostmanItem {
  name: string;
  request?: PostmanRequest;
  item?: PostmanItem[];
  description?: string;
}

interface PostmanRequest {
  method: string;
  header?: {
    key: string;
    value: string;
    disabled?: boolean;
    description?: string;
  }[];
  url: PostmanUrl | string;
  body?: PostmanBody;
  auth?: PostmanAuth;
  description?: string;
}

interface PostmanUrl {
  raw: string;
  protocol?: string;
  host?: string[];
  path?: string[];
  query?: {
    key: string;
    value: string;
    disabled?: boolean;
    description?: string;
  }[];
}

interface PostmanBody {
  mode: string;
  raw?: string;
  formdata?: {
    key: string;
    value: string;
    type?: string;
    disabled?: boolean;
  }[];
  urlencoded?: { key: string; value: string; disabled?: boolean }[];
  options?: { raw?: { language?: string } };
}

interface PostmanAuth {
  type: string;
  bearer?: { key: string; value: string }[];
  basic?: { key: string; value: string }[];
  apikey?: { key: string; value: string }[];
}

// ── Parse Postman Collection v2.1 → queFork Collection ────────────────
export function parsePostmanCollection(json: string): Collection {
  const data: PostmanCollection = JSON.parse(json);

  if (!data.info?.schema?.includes("getpostman.com/json/collection")) {
    throw new Error("Invalid Postman collection format");
  }

  const requests: RequestConfig[] = [];
  flattenItems(data.item || [], requests, "");

  return {
    id: crypto.randomUUID(),
    name: data.info.name || "Imported Collection",
    description: data.info.description || "",
    requests,
  };
}

function flattenItems(
  items: PostmanItem[],
  out: RequestConfig[],
  prefix: string,
) {
  for (const item of items) {
    if (item.item && !item.request) {
      const folderPrefix = prefix ? `${prefix} / ${item.name}` : item.name;
      flattenItems(item.item, out, folderPrefix);
    } else if (item.request) {
      out.push(convertPostmanRequest(item, prefix));
    }
  }
}

const VALID_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
];

function convertPostmanRequest(
  item: PostmanItem,
  folderPrefix: string,
): RequestConfig {
  const req = item.request!;
  const name = folderPrefix ? `${folderPrefix} / ${item.name}` : item.name;

  let url = "";
  let params: KeyValuePair[] = [];
  if (typeof req.url === "string") {
    url = req.url;
  } else if (req.url) {
    url = req.url.raw || "";
    if (req.url.query) {
      params = req.url.query.map((q) => ({
        id: crypto.randomUUID(),
        key: q.key,
        value: q.value,
        enabled: !q.disabled,
        description: q.description,
      }));
    }
  }

  const headers: KeyValuePair[] = (req.header || []).map((h) => ({
    id: crypto.randomUUID(),
    key: h.key,
    value: h.value,
    enabled: !h.disabled,
    description: h.description,
  }));

  let bodyType: BodyType = "none";
  let bodyRaw = "";
  let formData: KeyValuePair[] = [];

  if (req.body) {
    switch (req.body.mode) {
      case "raw": {
        bodyRaw = req.body.raw || "";
        const lang = req.body.options?.raw?.language;
        bodyType = lang === "json" ? "json" : lang === "xml" ? "xml" : "raw";
        break;
      }
      case "formdata":
        bodyType = "form-data";
        formData = (req.body.formdata || []).map((f) => ({
          id: crypto.randomUUID(),
          key: f.key,
          value: f.value,
          enabled: !f.disabled,
        }));
        break;
      case "urlencoded":
        bodyType = "x-www-form-urlencoded";
        formData = (req.body.urlencoded || []).map((f) => ({
          id: crypto.randomUUID(),
          key: f.key,
          value: f.value,
          enabled: !f.disabled,
        }));
        break;
    }
  }

  const auth = convertPostmanAuth(req.auth);
  const method = (req.method?.toUpperCase() || "GET") as HttpMethod;

  return {
    id: crypto.randomUUID(),
    name,
    protocol: "rest",
    method: VALID_METHODS.includes(method) ? method : "GET",
    url,
    params,
    headers,
    body: {
      type: bodyType,
      raw: bodyRaw,
      formData,
      graphql: { query: "", variables: "{}" },
    },
    auth,
    preScript: "",
    postScript: "",
    tests: "",
  };
}

function convertPostmanAuth(auth?: PostmanAuth): AuthConfig {
  if (!auth) return { type: "none" };

  switch (auth.type) {
    case "bearer": {
      const token = auth.bearer?.find((b) => b.key === "token")?.value || "";
      return { type: "bearer", bearer: { token } };
    }
    case "basic": {
      const username =
        auth.basic?.find((b) => b.key === "username")?.value || "";
      const password =
        auth.basic?.find((b) => b.key === "password")?.value || "";
      return { type: "basic", basic: { username, password } };
    }
    case "apikey": {
      const key = auth.apikey?.find((b) => b.key === "key")?.value || "";
      const value = auth.apikey?.find((b) => b.key === "value")?.value || "";
      return { type: "api-key", apiKey: { key, value, addTo: "header" } };
    }
    default:
      return { type: "none" };
  }
}

// ── Export queFork Collection → Postman v2.1 ──────────────────────────
export function exportToPostman(collection: Collection): string {
  const postmanCollection: PostmanCollection = {
    info: {
      name: collection.name,
      description: collection.description,
      schema:
        "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: collection.requests.map((req) => ({
      name: req.name || req.url || "Untitled",
      request: {
        method: req.method,
        header: req.headers
          .filter((h) => h.enabled)
          .map((h) => ({ key: h.key, value: h.value })),
        url: {
          raw: req.url,
          query: req.params
            .filter((p) => p.enabled)
            .map((p) => ({ key: p.key, value: p.value })),
        },
        body: convertBodyToPostman(req),
        auth: convertAuthToPostman(req.auth),
      },
    })),
  };

  return JSON.stringify(postmanCollection, null, 2);
}

function convertBodyToPostman(req: RequestConfig): PostmanBody | undefined {
  switch (req.body.type) {
    case "none":
      return undefined;
    case "json":
      return {
        mode: "raw",
        raw: req.body.raw,
        options: { raw: { language: "json" } },
      };
    case "xml":
      return {
        mode: "raw",
        raw: req.body.raw,
        options: { raw: { language: "xml" } },
      };
    case "raw":
      return { mode: "raw", raw: req.body.raw };
    case "form-data":
      return {
        mode: "formdata",
        formdata: req.body.formData
          .filter((f) => f.enabled)
          .map((f) => ({ key: f.key, value: f.value })),
      };
    case "x-www-form-urlencoded":
      return {
        mode: "urlencoded",
        urlencoded: req.body.formData
          .filter((f) => f.enabled)
          .map((f) => ({ key: f.key, value: f.value })),
      };
    default:
      return undefined;
  }
}

function convertAuthToPostman(auth: AuthConfig): PostmanAuth | undefined {
  switch (auth.type) {
    case "none":
      return undefined;
    case "bearer":
      return {
        type: "bearer",
        bearer: [{ key: "token", value: auth.bearer?.token || "" }],
      };
    case "basic":
      return {
        type: "basic",
        basic: [
          { key: "username", value: auth.basic?.username || "" },
          { key: "password", value: auth.basic?.password || "" },
        ],
      };
    case "api-key":
      return {
        type: "apikey",
        apikey: [
          { key: "key", value: auth.apiKey?.key || "" },
          { key: "value", value: auth.apiKey?.value || "" },
        ],
      };
    default:
      return undefined;
  }
}

// ── Export as queFork JSON ─────────────────────────────────────────────
export function exportCollectionAsJson(collection: Collection): string {
  return JSON.stringify(
    {
      format: "quefork",
      version: "1.0",
      exported: new Date().toISOString(),
      collection,
    },
    null,
    2,
  );
}

// ── Import queFork JSON ───────────────────────────────────────────────
export function importQueForkCollection(json: string): Collection {
  const data = JSON.parse(json);
  if (data.format === "quefork" && data.collection) {
    return { ...data.collection, id: crypto.randomUUID() };
  }
  throw new Error("Invalid queFork collection format");
}
