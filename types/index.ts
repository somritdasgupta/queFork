export interface KeyValuePair {
  key: string;
  value: string;
  description?: string;
  enabled?: boolean;
}

export interface RequestBody {
  type: "json" | "form-data" | "x-www-form-urlencoded" | "raw" | "none";
  content: string | KeyValuePair[];
}

export interface CollectionVersion {
  version: string;
  timestamp: string;
  changes?: string;
}

export interface Environment {
  id: string;
  name: string;
  variables: KeyValuePair[];
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  apiVersion?: string;
  requests: SavedRequest[];
  lastModified: string;
}


export interface SavedRequest {
  statusCode: any;
  timestamp: number;
  id: string;
  name: string;
  description?: string;
  method: string;
  url: string;
  headers: KeyValuePair[];
  params: KeyValuePair[];
  body: RequestBody;
  auth?: {
    type: "none" | "bearer" | "basic" | "apiKey";
    token?: string;
    username?: string;
    password?: string;
    key?: string;
  };
  response?: {

    status: number;

    body?: any;

  };
}


export interface RequestResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  size: string;
  time: string;
  timestamp: string;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  request: {
    headers: KeyValuePair[];
    params: KeyValuePair[];
    body: RequestBody;
    auth?: {
      type: "none" | "bearer" | "basic" | "apiKey";
      token?: string;
      username?: string;
      password?: string;
      key?: string;
    };
  };
  response?: RequestResponse;
}
