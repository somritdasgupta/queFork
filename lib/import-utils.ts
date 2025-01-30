import { Collection, SavedRequest, ImportSource } from "@/types";
import { v4 as uuidv4 } from "uuid";

interface PostmanCollection {
  info: {
    name: string;
    description?: string;
    schema: string;
  };
  item: PostmanRequest[];
}

interface PostmanRequest {
  name: string;
  request: {
    method: string;
    url: string | { raw: string };
    header?: { key: string; value: string }[];
    body?: {
      mode: string;
      raw?: string;
      formdata?: { key: string; value: string }[];
    };
  };
}

interface HoppscotchRequest {
  v: number;
  name: string;
  method: string;
  endpoint: string;
  headers: { key: string; value: string; active: boolean }[];
  params: { key: string; value: string; active: boolean }[];
  body: {
    contentType: null | string;
    body: string;
  };
  auth: {
    type: string;
    token?: string;
    username?: string;
    password?: string;
  };
}

interface HoppscotchCollection {
  v: number;
  name: string;
  folders: {
    name: string;
    requests: HoppscotchRequest[];
  }[];
  requests: HoppscotchRequest[];
}

interface OpenAPIRequestDetails {
  summary?: string;
  operationId?: string;
  description?: string;
  requestBody?: {
    content: {
      'application/json'?: {
        schema: any;
      };
    };
  };
}

export async function importFromUrl(url: string): Promise<Collection[]> {
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.openapi || data.swagger) {
      return convertOpenAPIToCollections(data);
    } else if (data.info?.schema?.includes('postman')) {
      return convertPostmanToCollections(data);
    } else if (data._type === "hoppscotch") {
      return convertHoppscotchToCollections(data);
    }
    
    throw new Error('Unsupported format');
  } catch (error) {
    console.error('Import error:', error);
    throw new Error('Failed to import collection');
  }
}

export function parseImportData(source: ImportSource, data: string): Collection[] {
  try {
    const parsed = JSON.parse(data);
    
    // Handle different collection formats
    if (parsed._type === "hoppscotch") {
      return convertHoppscotchToCollections(parsed);
    } 
    
    if (parsed.info?.schema?.includes('postman')) {
      return convertPostmanToCollections(parsed);
    } 
    
    if (parsed.openapi || parsed.swagger) {
      return convertOpenAPIToCollections(parsed);
    } 
    
    if (Array.isArray(parsed)) {
      // Handle array of requests
      return [{
        id: uuidv4(),
        name: 'Imported Requests',
        requests: parsed.map(convertGenericRequest),
        lastModified: new Date().toISOString()
      }];
    }
    
    if (parsed.requests && Array.isArray(parsed.requests)) {
      // Handle generic collection format
      return [{
        id: uuidv4(),
        name: parsed.name || 'Imported Collection',
        description: parsed.description,
        apiVersion: parsed.version,
        requests: parsed.requests.map(convertGenericRequest),
        lastModified: new Date().toISOString()
      }];
    }
    
    throw new Error('Unsupported collection format');
  } catch (error) {
    console.error('Parse error:', error);
    throw new Error('Failed to parse import data');
  }
}

function convertPostmanToCollections(data: PostmanCollection): Collection[] {
  return [{
    id: uuidv4(),
    name: data.info.name,
    description: data.info.description,
    requests: data.item.map(item => convertPostmanRequest(item)),
    lastModified: new Date().toISOString()
  }];
}

function convertPostmanRequest(item: PostmanRequest): SavedRequest {
  const url = typeof item.request.url === 'string' ? 
    item.request.url : 
    item.request.url.raw;

  const bodyType = item.request.body?.mode === 'raw' ? 'raw' :
                  item.request.body?.mode === 'formdata' ? 'form-data' :
                  item.request.body?.mode === 'urlencoded' ? 'x-www-form-urlencoded' :
                  'none';

  return {
    id: uuidv4(),
    name: item.name,
    method: item.request.method,
    url: url,
    headers: (item.request.header || []).map(h => ({
      key: h.key,
      value: h.value,
      enabled: true,
      type: 'text',
      showSecrets: false
    })),
    params: [],
    body: {
      type: bodyType,
      content: item.request.body?.raw || ''
    },
    statusCode: 0,
    timestamp: Date.now()
  };
}

function convertHoppscotchToCollections(data: HoppscotchCollection): Collection[] {
  const collections: Collection[] = [];

  // Create main collection
  const mainCollection: Collection = {
    id: uuidv4(),
    name: data.name || 'Imported Collection',
    requests: [],
    lastModified: new Date().toISOString()
  };

  // Convert root-level requests
  if (data.requests) {
    mainCollection.requests = data.requests.map(req => convertHoppscotchRequest(req));
  }

  collections.push(mainCollection);

  // Convert folders to separate collections
  if (data.folders) {
    data.folders.forEach(folder => {
      collections.push({
        id: uuidv4(),
        name: folder.name,
        requests: folder.requests.map(req => convertHoppscotchRequest(req)),
        lastModified: new Date().toISOString()
      });
    });
  }

  return collections;
}

function convertHoppscotchRequest(req: HoppscotchRequest): SavedRequest {
  return {
    id: uuidv4(),
    name: req.name,
    method: req.method,
    url: req.endpoint,
    headers: (req.headers || []).map(h => ({
      key: h.key,
      value: h.value,
      enabled: h.active !== false,
      type: 'text',
      showSecrets: false
    })),
    params: (req.params || []).map(p => ({
      key: p.key,
      value: p.value,
      enabled: p.active !== false,
      type: 'text',
      showSecrets: false
    })),
    body: {
      type: req.body?.contentType === 'application/json' ? 'json' :
            req.body?.contentType === 'multipart/form-data' ? 'form-data' :
            req.body?.contentType === 'application/x-www-form-urlencoded' ? 'x-www-form-urlencoded' :
            req.body?.contentType ? 'raw' : 'none',
      content: req.body?.body || ''
    },
    statusCode: 0,
    timestamp: Date.now(),
    auth: convertHoppscotchAuth(req.auth)
  };
}

function convertHoppscotchAuth(auth: any): SavedRequest['auth'] {
  if (!auth || auth.type === 'none') {
    return { type: 'none' };
  }
  
  switch (auth.type) {
    case 'bearer':
      return { type: 'bearer', token: auth.token || '' };
    case 'basic':
      return { type: 'basic', username: auth.username || '', password: auth.password || '' };
    default:
      return { type: 'none' };
  }
}

interface GenericHeader {
  key?: string;
  value?: string;
  name?: string;  // For compatibility with other formats
  content?: string;  // For compatibility with other formats
}

function convertGenericRequest(req: any): SavedRequest {
  return {
    id: uuidv4(),
    name: req.name || req.url || 'Unnamed Request',
    method: req.method || 'GET',
    url: req.url || req.endpoint || '',
    headers: Array.isArray(req.headers) ? req.headers.map((h: GenericHeader) => ({
      key: h.key || h.name || '',
      value: h.value || h.content || '',
      enabled: true,
      type: 'text',
      showSecrets: false
    })) : [],
    params: [],
    body: {
      type: 'none',
      content: ''
    },
    statusCode: 0,
    timestamp: Date.now()
  };
}

function convertOpenAPIToCollections(data: any): Collection[] {
  const collection: Collection = {
    id: uuidv4(),
    name: data.info.title,
    description: data.info.description,
    apiVersion: data.info.version,
    requests: [],
    lastModified: new Date().toISOString()
  };

  // Convert paths to requests
  for (const [path, methods] of Object.entries(data.paths)) {
    for (const [method, rawDetails] of Object.entries(methods as any)) {
      const details = rawDetails as OpenAPIRequestDetails;
      collection.requests.push({
        id: uuidv4(),
        name: details.summary || details.operationId || `${method} ${path}`,
        method: method.toUpperCase(),
        url: path,
        description: details.description,
        headers: [],
        params: [],
        body: {
          type: details.requestBody ? 'json' : 'none',
          content: details.requestBody ? 
            JSON.stringify(details.requestBody.content['application/json']?.schema, null, 2) : 
            ''
        },
        statusCode: 0,
        timestamp: Date.now()
      });
    }
  }

  return [collection];
}
