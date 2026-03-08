import type { RequestConfig, HttpMethod, KeyValuePair } from "@/types/api";
import { createEmptyRequest } from "@/types/api";

function normalizeCurl(input: string): string {
  // Remove line continuations (backslash + newline) and collapse whitespace
  return input
    .replace(/\\\s*\n/g, " ")
    .replace(/\\\s*\r\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractQuotedArgs(cmd: string, flag: string): string[] {
  const results: string[] = [];
  // Match flag followed by quoted or unquoted value
  const regex = new RegExp(`${flag}\\s+(?:'([^']*)'|"([^"]*)"|([^\\s]+))`, "g");
  let m;
  while ((m = regex.exec(cmd)) !== null) {
    results.push(m[1] ?? m[2] ?? m[3]);
  }
  return results;
}

export function parseCurl(curlCommand: string): RequestConfig {
  const req = createEmptyRequest();
  let cmd = normalizeCurl(curlCommand);

  // Remove 'curl' prefix
  if (/^curl\s/i.test(cmd)) cmd = cmd.replace(/^curl\s+/i, "");

  // Extract URL - look for quoted or unquoted URL
  const urlPatterns = [
    /--url\s+(?:'([^']*)'|"([^"]*)"|(\S+))/,
    /(?:^|\s)(?:'(https?:\/\/[^']*)'|"(https?:\/\/[^"]*)")/,
    /(?:^|\s)(https?:\/\/\S+)/,
  ];
  for (const pattern of urlPatterns) {
    const match = cmd.match(pattern);
    if (match) {
      const urlStr = match[1] ?? match[2] ?? match[3];
      if (urlStr) {
        try {
          const u = new URL(urlStr);
          req.url = `${u.origin}${u.pathname}`;
          u.searchParams.forEach((v, k) => {
            req.params.push({
              id: crypto.randomUUID(),
              key: k,
              value: v,
              enabled: true,
            });
          });
        } catch {
          req.url = urlStr;
        }
        break;
      }
    }
  }

  // Method
  const methodMatch = cmd.match(/(?:-X|--request)\s+(\w+)/);
  if (methodMatch) req.method = methodMatch[1].toUpperCase() as HttpMethod;

  // Headers - handle both single and double quotes
  const headerArgs = extractQuotedArgs(cmd, "-H|--header");
  for (const headerStr of headerArgs) {
    const colonIdx = headerStr.indexOf(":");
    if (colonIdx === -1) continue;
    const k = headerStr.slice(0, colonIdx).trim();
    const v = headerStr.slice(colonIdx + 1).trim();

    if (k.toLowerCase() === "authorization") {
      if (v.startsWith("Bearer ")) {
        req.auth = { type: "bearer", bearer: { token: v.slice(7) } };
        continue;
      } else if (v.startsWith("Basic ")) {
        try {
          const decoded = atob(v.slice(6));
          const [username, password] = decoded.split(":");
          req.auth = {
            type: "basic",
            basic: { username, password: password || "" },
          };
          continue;
        } catch {
          // Ignore invalid Basic auth header encoding and keep it as a regular header.
        }
      }
      // Non-standard auth header - treat as regular header
      req.headers.push({
        id: crypto.randomUUID(),
        key: k,
        value: v,
        enabled: true,
      });
    } else if (k.toLowerCase() === "content-type") {
      // Still add content-type as header
      req.headers.push({
        id: crypto.randomUUID(),
        key: k,
        value: v,
        enabled: true,
      });
    } else {
      req.headers.push({
        id: crypto.randomUUID(),
        key: k,
        value: v,
        enabled: true,
      });
    }
  }

  // Data/body - handle -d, --data, --data-raw, --data-binary with various quote styles
  const dataPatterns = [
    /(?:-d|--data|--data-raw|--data-binary)\s+'((?:[^'\\]|\\.)*)'/s,
    /(?:-d|--data|--data-raw|--data-binary)\s+"((?:[^"\\]|\\.)*)"/s,
    /(?:-d|--data|--data-raw|--data-binary)\s+(\S+)/,
  ];

  for (const pattern of dataPatterns) {
    const match = cmd.match(pattern);
    if (match) {
      const data = match[1];
      if (!methodMatch) req.method = "POST";
      try {
        JSON.parse(data);
        req.body.type = "json";
        req.body.raw = data;
      } catch {
        req.body.type = "raw";
        req.body.raw = data;
      }
      break;
    }
  }

  // -u flag for basic auth
  const userMatch = cmd.match(/-u\s+(?:'([^']*)'|"([^"]*)"|(\S+))/);
  if (userMatch) {
    const userPass = userMatch[1] ?? userMatch[2] ?? userMatch[3];
    const [username, ...passParts] = userPass.split(":");
    req.auth = {
      type: "basic",
      basic: { username, password: passParts.join(":") },
    };
  }

  return req;
}

export function exportToCurl(config: RequestConfig): string {
  const parts: string[] = ["curl"];

  if (config.method !== "GET") parts.push(`-X ${config.method}`);

  let url = config.url;
  const enabledParams = config.params.filter((p) => p.enabled && p.key);
  if (enabledParams.length) {
    const qs = enabledParams
      .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join("&");
    url += (url.includes("?") ? "&" : "?") + qs;
  }
  parts.push(`'${url}'`);

  config.headers
    .filter((h) => h.enabled && h.key)
    .forEach((h) => {
      parts.push(`-H '${h.key}: ${h.value}'`);
    });

  if (config.auth.type === "bearer" && config.auth.bearer?.token) {
    parts.push(`-H 'Authorization: Bearer ${config.auth.bearer.token}'`);
  } else if (config.auth.type === "basic" && config.auth.basic) {
    parts.push(
      `-u '${config.auth.basic.username}:${config.auth.basic.password}'`,
    );
  } else if (
    config.auth.type === "api-key" &&
    config.auth.apiKey?.addTo === "header"
  ) {
    parts.push(`-H '${config.auth.apiKey.key}: ${config.auth.apiKey.value}'`);
  }

  if (
    config.body.type === "json" ||
    config.body.type === "raw" ||
    config.body.type === "xml"
  ) {
    if (config.body.raw) {
      if (config.body.type === "json")
        parts.push(`-H 'Content-Type: application/json'`);
      else if (config.body.type === "xml")
        parts.push(`-H 'Content-Type: application/xml'`);
      parts.push(`-d '${config.body.raw.replace(/'/g, "\\'")}'`);
    }
  } else if (config.body.type === "graphql") {
    parts.push(`-H 'Content-Type: application/json'`);
    const gqlBody = JSON.stringify({
      query: config.body.graphql.query,
      variables: config.body.graphql.variables,
    });
    parts.push(`-d '${gqlBody}'`);
  }

  return parts.join(" \\\n  ");
}

export function exportToJavaScript(config: RequestConfig): string {
  const headers: Record<string, string> = {};
  config.headers
    .filter((h) => h.enabled && h.key)
    .forEach((h) => {
      headers[h.key] = h.value;
    });

  if (config.auth.type === "bearer" && config.auth.bearer?.token) {
    headers["Authorization"] = `Bearer ${config.auth.bearer.token}`;
  } else if (config.auth.type === "basic" && config.auth.basic) {
    headers["Authorization"] =
      `Basic ${btoa(`${config.auth.basic.username}:${config.auth.basic.password}`)}`;
  }

  let body = "";
  if (config.body.type === "json" && config.body.raw) {
    headers["Content-Type"] = "application/json";
    body = `  body: JSON.stringify(${config.body.raw}),\n`;
  } else if (config.body.type === "raw" && config.body.raw) {
    body = `  body: ${JSON.stringify(config.body.raw)},\n`;
  }

  let url = config.url;
  const ep = config.params.filter((p) => p.enabled && p.key);
  if (ep.length) {
    url +=
      (url.includes("?") ? "&" : "?") +
      ep
        .map(
          (p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`,
        )
        .join("&");
  }

  const headersStr = Object.keys(headers).length
    ? `  headers: ${JSON.stringify(headers, null, 4)},\n`
    : "";

  return `const response = await fetch('${url}', {
  method: '${config.method}',
${headersStr}${body}});

const data = await response.json();
console.log(data);`;
}

export function exportToPython(config: RequestConfig): string {
  const headers: Record<string, string> = {};
  config.headers
    .filter((h) => h.enabled && h.key)
    .forEach((h) => {
      headers[h.key] = h.value;
    });

  if (config.auth.type === "bearer" && config.auth.bearer?.token) {
    headers["Authorization"] = `Bearer ${config.auth.bearer.token}`;
  }

  const url = config.url;
  const ep = config.params.filter((p) => p.enabled && p.key);
  const paramsDict = ep.length
    ? `\nparams = ${JSON.stringify(Object.fromEntries(ep.map((p) => [p.key, p.value])))}`
    : "";

  let body = "";
  if (config.body.type === "json" && config.body.raw) {
    headers["Content-Type"] = "application/json";
    body = `\njson_data = ${config.body.raw}`;
  }

  const headersStr = Object.keys(headers).length
    ? `\nheaders = ${JSON.stringify(headers, null, 4)}`
    : "";
  const paramsArg = ep.length ? ", params=params" : "";
  const headersArg = Object.keys(headers).length ? ", headers=headers" : "";
  const bodyArg = body ? ", json=json_data" : "";

  return `import requests
${headersStr}${paramsDict}${body}

response = requests.${config.method.toLowerCase()}('${url}'${headersArg}${paramsArg}${bodyArg})
print(response.status_code)
print(response.json())`;
}

// --- Helper to build full URL with params ---
function buildFullUrl(config: RequestConfig): string {
  let url = config.url;
  const ep = config.params.filter((p) => p.enabled && p.key);
  if (ep.length) {
    url +=
      (url.includes("?") ? "&" : "?") +
      ep
        .map(
          (p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`,
        )
        .join("&");
  }
  return url;
}

function buildAllHeaders(config: RequestConfig): Record<string, string> {
  const headers: Record<string, string> = {};
  config.headers
    .filter((h) => h.enabled && h.key)
    .forEach((h) => {
      headers[h.key] = h.value;
    });
  if (config.auth.type === "bearer" && config.auth.bearer?.token) {
    headers["Authorization"] = `Bearer ${config.auth.bearer.token}`;
  } else if (config.auth.type === "basic" && config.auth.basic) {
    headers["Authorization"] =
      `Basic ${btoa(`${config.auth.basic.username}:${config.auth.basic.password}`)}`;
  } else if (
    config.auth.type === "api-key" &&
    config.auth.apiKey?.addTo === "header" &&
    config.auth.apiKey.key
  ) {
    headers[config.auth.apiKey.key] = config.auth.apiKey.value;
  }
  if (config.body.type === "json" && config.body.raw)
    headers["Content-Type"] = "application/json";
  else if (config.body.type === "xml" && config.body.raw)
    headers["Content-Type"] = "application/xml";
  return headers;
}

function getBodyString(config: RequestConfig): string | null {
  if (config.body.type === "json" && config.body.raw) return config.body.raw;
  if (config.body.type === "raw" && config.body.raw) return config.body.raw;
  if (config.body.type === "xml" && config.body.raw) return config.body.raw;
  if (config.body.type === "graphql")
    return JSON.stringify({
      query: config.body.graphql.query,
      variables: config.body.graphql.variables,
    });
  return null;
}

export function exportToTypeScript(config: RequestConfig): string {
  const url = buildFullUrl(config);
  const headers = buildAllHeaders(config);
  const body = getBodyString(config);
  const headersStr = Object.keys(headers).length
    ? `\n    headers: ${JSON.stringify(headers, null, 4)},`
    : "";
  const bodyStr = body ? `\n    body: JSON.stringify(${body}),` : "";

  return `interface ApiResponse {
  [key: string]: unknown;
}

async function makeRequest(): Promise<ApiResponse> {
  const response = await fetch('${url}', {
    method: '${config.method}',${headersStr}${bodyStr}
  });

  if (!response.ok) {
    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
  }

  const data: ApiResponse = await response.json();
  return data;
}

const result = await makeRequest();
console.log(result);`;
}

export function exportToGo(config: RequestConfig): string {
  const url = buildFullUrl(config);
  const headers = buildAllHeaders(config);
  const body = getBodyString(config);

  let bodySetup = "";
  let bodyArg = "nil";
  if (body) {
    bodySetup = `\n\tpayload := strings.NewReader(\`${body}\`)`;
    bodyArg = "payload";
  }

  const headerLines = Object.entries(headers)
    .map(([k, v]) => `\treq.Header.Set("${k}", "${v}")`)
    .join("\n");

  return `package main

import (
\t"fmt"
\t"io"
\t"net/http"${body ? '\n\t"strings"' : ""}
)

func main() {${bodySetup}

\treq, err := http.NewRequest("${config.method}", "${url}", ${bodyArg})
\tif err != nil {
\t\tpanic(err)
\t}

${headerLines}

\tclient := &http.Client{}
\tresp, err := client.Do(req)
\tif err != nil {
\t\tpanic(err)
\t}
\tdefer resp.Body.Close()

\tbody, err := io.ReadAll(resp.Body)
\tif err != nil {
\t\tpanic(err)
\t}

\tfmt.Println(resp.StatusCode)
\tfmt.Println(string(body))
}`;
}

export function exportToJava(config: RequestConfig): string {
  const url = buildFullUrl(config);
  const headers = buildAllHeaders(config);
  const body = getBodyString(config);

  const headerLines = Object.entries(headers)
    .map(([k, v]) => `        .header("${k}", "${v}")`)
    .join("\n");
  const bodyLine = body
    ? `        .${config.method === "GET" ? "GET" : `method("${config.method}", HttpRequest.BodyPublishers.ofString(${JSON.stringify(body)}))`}`
    : `        .method("${config.method}", HttpRequest.BodyPublishers.noBody())`;

  return `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class ApiRequest {
    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newHttpClient();

        HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create("${url}"))
${headerLines}
${bodyLine}
        .build();

        HttpResponse<String> response = client.send(
            request, HttpResponse.BodyHandlers.ofString()
        );

        System.out.println("Status: " + response.statusCode());
        System.out.println(response.body());
    }
}`;
}

export function exportToDart(config: RequestConfig): string {
  const url = buildFullUrl(config);
  const headers = buildAllHeaders(config);
  const body = getBodyString(config);

  const headersStr = Object.keys(headers).length
    ? `\n  headers: ${JSON.stringify(headers, null, 4)},`
    : "";
  const bodyStr = body ? `\n  body: '${body.replace(/'/g, "\\'")}',` : "";

  return `import 'package:http/http.dart' as http;
import 'dart:convert';

Future<void> makeRequest() async {
  final url = Uri.parse('${url}');

  final response = await http.${config.method.toLowerCase()}(
  url,${headersStr}${bodyStr}
  );

  print('Status: \${response.statusCode}');
  print(jsonDecode(response.body));
}

void main() async {
  await makeRequest();
}`;
}

export function exportToRuby(config: RequestConfig): string {
  const url = buildFullUrl(config);
  const headers = buildAllHeaders(config);
  const body = getBodyString(config);

  const headerLines = Object.entries(headers)
    .map(([k, v]) => `request["${k}"] = "${v}"`)
    .join("\n");
  const bodyLine = body ? `request.body = '${body.replace(/'/g, "\\'")}'` : "";

  return `require 'net/http'
require 'uri'
require 'json'

uri = URI.parse('${url}')
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = uri.scheme == 'https'

request = Net::HTTP::${config.method.charAt(0) + config.method.slice(1).toLowerCase()}.new(uri.request_uri)
${headerLines}
${bodyLine}

response = http.request(request)

puts "Status: #{response.code}"
puts JSON.parse(response.body)`;
}

export function exportToPhp(config: RequestConfig): string {
  const url = buildFullUrl(config);
  const headers = buildAllHeaders(config);
  const body = getBodyString(config);

  const headerLines = Object.entries(headers)
    .map(([k, v]) => `    '${k}: ${v}',`)
    .join("\n");
  const bodyLine = body
    ? `\nCURLOPT_POSTFIELDS => '${body.replace(/'/g, "\\'")}',`
    : "";

  return `<?php

$curl = curl_init();

curl_setopt_array($curl, [
  CURLOPT_URL => '${url}',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_CUSTOMREQUEST => '${config.method}',
  CURLOPT_HTTPHEADER => [
${headerLines}
  ],${bodyLine}
]);

$response = curl_exec($curl);
$httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);

curl_close($curl);

echo "Status: $httpCode\\n";
echo $response;`;
}

export function exportToRust(config: RequestConfig): string {
  const url = buildFullUrl(config);
  const headers = buildAllHeaders(config);
  const body = getBodyString(config);

  const headerLines = Object.entries(headers)
    .map(([k, v]) => `        .header("${k}", "${v}")`)
    .join("\n");
  const bodyLine = body
    ? `        .body(r#"${body}"#.to_string())`
    : "        .send()";

  return `// Add to Cargo.toml: reqwest = { version = "0.11", features = ["json"] }
// tokio = { version = "1", features = ["full"] }

use reqwest;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();

    let response = client
        .${config.method.toLowerCase()}("${url}")
${headerLines}
${body ? bodyLine + "\n        .send()" : "        .send()"}
        .await?;

    println!("Status: {}", response.status());
    println!("{}", response.text().await?);

    Ok(())
}`;
}

export function exportToBash(config: RequestConfig): string {
  const url = buildFullUrl(config);
  const headers = buildAllHeaders(config);
  const body = getBodyString(config);

  const headerFlags = Object.entries(headers)
    .map(([k, v]) => `  -H '${k}: ${v}'`)
    .join(" \\\n");
  const bodyFlag = body ? ` \\\n  -d '${body.replace(/'/g, "'\\''")}'` : "";

  return `#!/bin/bash
# queFork — API Request Script

URL='${url}'

echo "→ ${config.method} \${URL}"
echo ""

RESPONSE=$(curl -s -w "\\n%{http_code}\\n%{time_total}" \\
  -X ${config.method} \\
${headerFlags}${bodyFlag} \\
  "\${URL}")

HTTP_BODY=$(echo "\${RESPONSE}" | sed '$d' | sed '$d')
HTTP_CODE=$(echo "\${RESPONSE}" | tail -2 | head -1)
HTTP_TIME=$(echo "\${RESPONSE}" | tail -1)

echo "Status: \${HTTP_CODE}"
echo "Time: \${HTTP_TIME}s"
echo ""
echo "\${HTTP_BODY}" | python3 -m json.tool 2>/dev/null || echo "\${HTTP_BODY}"`;
}

export function exportToPowerShell(config: RequestConfig): string {
  const url = buildFullUrl(config);
  const headers = buildAllHeaders(config);
  const body = getBodyString(config);

  const headerLines = Object.entries(headers)
    .map(([k, v]) => `    '${k}' = '${v}'`)
    .join("\n");
  const bodyStr = body ? `\n$Body = @'\n${body}\n'@\n` : "";
  const bodyParam = body ? " -Body $Body" : "";

  return `# queFork — API Request Script (PowerShell)

$Uri = '${url}'

$Headers = @{
${headerLines}
}
${bodyStr}
try {
    $Response = Invoke-RestMethod \\
        -Uri $Uri \\
        -Method ${config.method}${bodyParam} \\
        -Headers $Headers \\
        -ContentType 'application/json'

    Write-Host "✅ Success" -ForegroundColor Green
    $Response | ConvertTo-Json -Depth 10
}
catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $StatusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status: $StatusCode"
    }
}`;
}

export function exportToCSharp(config: RequestConfig): string {
  const url = buildFullUrl(config);
  const headers = buildAllHeaders(config);
  const body = getBodyString(config);

  const headerLines = Object.entries(headers)
    .filter(([k]) => k.toLowerCase() !== "content-type")
    .map(([k, v]) => `    request.Headers.Add("${k}", "${v}");`)
    .join("\n");
  const bodyLine = body
    ? `    request.Content = new StringContent(@"${body.replace(/"/g, '""')}", Encoding.UTF8, "${headers["Content-Type"] || "application/json"}");`
    : "";

  return `using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

class Program
{
    static async Task Main()
    {
        using var client = new HttpClient();
        var request = new HttpRequestMessage(HttpMethod.${config.method.charAt(0) + config.method.slice(1).toLowerCase()}, "${url}");

${headerLines}
${bodyLine}

        var response = await client.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();

        Console.WriteLine($"Status: {response.StatusCode}");
        Console.WriteLine(body);
    }
}`;
}

export function exportToSwift(config: RequestConfig): string {
  const url = buildFullUrl(config);
  const headers = buildAllHeaders(config);
  const body = getBodyString(config);

  const headerLines = Object.entries(headers)
    .map(([k, v]) => `request.setValue("${v}", forHTTPHeaderField: "${k}")`)
    .join("\n");
  const bodyLine = body
    ? `request.httpBody = #"${body}"#.data(using: .utf8)`
    : "";

  return `import Foundation

let url = URL(string: "${url}")!
var request = URLRequest(url: url)
request.httpMethod = "${config.method}"
${headerLines}
${bodyLine}

let task = URLSession.shared.dataTask(with: request) { data, response, error in
    if let error = error {
        print("Error: \\(error.localizedDescription)")
        return
    }

    if let httpResponse = response as? HTTPURLResponse {
        print("Status: \\(httpResponse.statusCode)")
    }

    if let data = data, let body = String(data: data, encoding: .utf8) {
        print(body)
    }
}

task.resume()
RunLoop.main.run()`;
}
