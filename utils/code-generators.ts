import {
  SiCurl,
  SiClojure,
  SiSharp,
  SiGo,
  SiJavascript,
  SiPython,
  SiPhp,
  SiRuby,
  SiSwift,
  SiRust,
  SiKotlin,
  SiPowers,
  SiPerl,
  SiAxios,
} from "react-icons/si";
import { VscJson } from "react-icons/vsc";
import type { IconType } from "react-icons";

export interface CodeGenOptions {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface LanguageConfig {
  name: string;
  icon: IconType;
  generator: (options: CodeGenOptions) => string;
  highlight: string; // language identifier for syntax highlighting
}

export const languageConfigs: Record<string, LanguageConfig> = {
  curl: {
    name: "cURL",
    icon: SiCurl,
    highlight: "bash",
    generator: ({ url, method, headers = {}, body }) => {
      const headerStrings = Object.entries(headers)
        .map(([key, value]) => `-H '${key}: ${value}'`)
        .join(" \\\n    ");

      return [
        `curl -X ${method.toUpperCase()} '${url}'`,
        ...headerStrings.split("\n"),
        body ? `    -d '${body}'` : "",
      ]
        .filter(Boolean)
        .join(" \\\n");
    },
  },
  python: {
    name: "Python",
    icon: SiPython,
    highlight: "python",
    generator: ({ url, method, headers = {}, body }) => {
      return [
        "import requests",
        "import json",
        "",
        `url = "${url}"`,
        "headers = " + JSON.stringify(headers, null, 4).replace(/^/gm, ""),
        body ? `payload = json.loads('''${body}''')` : "",
        "",
        "response = requests." + method.toLowerCase() + "(",
        "    url=url,",
        "    headers=headers,",
        body ? "    json=payload" : "",
        ")",
        "",
        "try:",
        "    result = response.json()",
        "    print(json.dumps(result, indent=4))",
        "except ValueError:",
        "    print(response.text)",
      ]
        .filter(Boolean)
        .join("\n");
    },
  },
  axios: {
    name: "Axios",
    icon: SiAxios,
    highlight: "javascript",
    generator: ({ url, method, headers = {}, body }) => {
      return [
        'import axios from "axios";',
        "",
        "const config = {",
        `    method: "${method.toUpperCase()}",`,
        `    url: "${url}",`,
        "    headers: " +
          JSON.stringify(headers, null, 4).replace(/^/gm, "    "),
        body ? `    data: ${body.replace(/^/gm, "    ")},` : "",
        "};",
        "",
        "async function makeRequest() {",
        "    try {",
        "        const { data } = await axios(config);",
        "        console.log(JSON.stringify(data, null, 4));",
        "    } catch (error) {",
        "        console.error(error.response?.data || error.message);",
        "    }",
        "}",
        "",
        "makeRequest();",
      ]
        .filter(Boolean)
        .join("\n");
    },
  },
  fetch: {
    name: "Fetch",
    icon: SiJavascript,
    highlight: "javascript",
    generator: ({ url, method, headers = {}, body }) => {
      return [
        "async function makeRequest() {",
        "    try {",
        "        const response = await fetch(",
        `            "${url}",`,
        "            {",
        `                method: "${method.toUpperCase()}",`,
        "                headers: " +
          JSON.stringify(headers, null, 4).replace(/^/gm, "                "),
        body
          ? `                body: '${body.replace(/^/gm, "                ")}'`
          : "",
        "            }",
        "        );",
        "",
        "        const data = await response.json();",
        "        console.log(JSON.stringify(data, null, 4));",
        "    } catch (error) {",
        '        console.error("Error:", error);',
        "    }",
        "}",
        "",
        "makeRequest();",
      ]
        .filter(Boolean)
        .join("\n");
    },
  },
  clojure: {
    name: "Clojure (clj-http)",
    icon: SiClojure,
    highlight: "clojure",
    generator: ({ url, method, headers = {}, body }) => `
      (require '[clj-http.client :as client])
      
      (client/${method.toLowerCase()} "${url}"
        {:headers ${JSON.stringify(headers, null, 4)}
         ${body ? `\n:body ${body}` : ""}
         :as :json})`,
  },
  csharpHttp: {
    name: "C# HttpClient",
    icon: SiSharp,
    highlight: "csharp",
    generator: ({ url, method, headers = {}, body }) => `
      using System.Net.Http;
      using System.Text;
      using System.Threading.Tasks;
      
      var client = new HttpClient();
      ${Object.entries(headers)
        .map(([k, v]) => `client.DefaultRequestHeaders.Add("${k}", "${v}");`)
        .join("\n")}
      
      ${body ? `var content = new StringContent(${body}, Encoding.UTF8, "application/json");` : ""}
      var response = await client.${method}Async("${url}"${body ? ", content" : ""});
      
      var result = await response.Content.ReadAsStringAsync();
      Console.WriteLine(result);`,
  },
  restsharp: {
    name: "C# RestSharp",
    icon: SiSharp,
    highlight: "csharp",
    generator: ({ url, method, headers = {}, body }) => `
      using RestSharp;
      
      var client = new RestClient("${url}");
      var request = new RestRequest(Method.${method.toUpperCase()});
      ${Object.entries(headers)
        .map(([k, v]) => `request.AddHeader("${k}", "${v}");`)
        .join("\n")}
      ${body ? `request.AddJsonBody(${body});` : ""}
      
      var response = await client.ExecuteAsync(request);
      Console.WriteLine(response.Content);`,
  },
  go: {
    name: "Go",
    icon: SiGo,
    highlight: "go",
    generator: ({ url, method, headers = {}, body }) => `
      package main
      
      import (
        "fmt"
        "io/ioutil"
        "net/http"
        ${body ? `"strings"` : ""}
      )
      
      func main() {
        ${body ? `body := strings.NewReader(\`${body}\`)` : ""}
        req, err := http.NewRequest("${method}", "${url}", ${body ? "body" : "nil"})
        if err != nil {
          panic(err)
        }
        
        ${Object.entries(headers)
          .map(([k, v]) => `req.Header.Set("${k}", "${v}")`)
          .join("\n")}
        
        resp, err := http.DefaultClient.Do(req)
        if err != nil {
          panic(err)
        }
        defer resp.Body.Close()
        
        bodyText, err := ioutil.ReadAll(resp.Body)
        if err != nil {
          panic(err)
        }
        
        fmt.Printf("%s\\n", bodyText)
      }`,
  },
  httpRaw: {
    name: "HTTP Raw",
    icon: VscJson,
    highlight: "http",
    generator: ({ url, method, headers = {}, body }) => `
      ${method.toUpperCase()} ${url} HTTP/1.1
      ${Object.entries(headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n")}
      
      ${body || ""}`,
  },
  php: {
    name: "PHP",
    icon: SiPhp,
    highlight: "php",
    generator: ({ url, method, headers = {}, body }) => `
      <?php
      $curl = curl_init();
      
      curl_setopt_array($curl, [
        CURLOPT_URL => "${url}",
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => "",
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => "${method.toUpperCase()}",
        ${body ? `CURLOPT_POSTFIELDS => ${body},` : ""}
        CURLOPT_HTTPHEADER => [
          ${Object.entries(headers)
            .map(([k, v]) => `"${k}: ${v}"`)
            .join(",\n          ")}
        ],
      ]);
      
      $response = curl_exec($curl);
      $err = curl_error($curl);
      
      curl_close($curl);
      
      if ($err) {
        echo "Error: " . $err;
      } else {
        echo $response;
      }`,
  },

  ruby: {
    name: "Ruby",
    icon: SiRuby,
    highlight: "ruby",
    generator: ({ url, method, headers = {}, body }) => `
      require 'uri'
      require 'net/http'
      require 'json'

      uri = URI('${url}')
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = uri.scheme == 'https'

      request = Net::HTTP::${method.charAt(0).toUpperCase() + method.slice(1).toLowerCase()}.new(uri)
      ${Object.entries(headers)
        .map(([k, v]) => `request["${k}"] = "${v}"`)
        .join("\n")}
      ${body ? `request.body = ${body}` : ""}

      response = http.request(request)
      puts response.read_body`,
  },

  swift: {
    name: "Swift",
    icon: SiSwift,
    highlight: "swift",
    generator: ({ url, method, headers = {}, body }) => `
      import Foundation

      let url = URL(string: "${url}")!
      var request = URLRequest(url: url)
      request.httpMethod = "${method.toUpperCase()}"
      ${Object.entries(headers)
        .map(([k, v]) => `request.setValue("${v}", forHTTPHeaderField: "${k}")`)
        .join("\n")}
      ${body ? `request.httpBody = Data("${body}".utf8)` : ""}

      let task = URLSession.shared.dataTask(with: request) { data, response, error in
          if let error = error {
              print("Error: \(error)")
              return
          }
          if let data = data {
              print(String(data: data, encoding: .utf8)!)
          }
      }

      task.resume()`,
  },

  kotlin: {
    name: "Kotlin",
    icon: SiKotlin,
    highlight: "kotlin",
    generator: ({ url, method, headers = {}, body }) => `
      import okhttp3.*

      val client = OkHttpClient()

      val request = Request.Builder()
          .url("${url}")
          .method("${method.toUpperCase()}", ${
            body
              ? `RequestBody.create(
              MediaType.parse("application/json"), "${body}"
          )`
              : "null"
          })
          ${Object.entries(headers)
            .map(([k, v]) => `.addHeader("${k}", "${v}")`)
            .join("\n          ")}
          .build()

      client.newCall(request).execute().use { response ->
          println(response.body()?.string())
      }`,
  },

  powershell: {
    name: "PowerShell",
    icon: SiPowers,
    highlight: "powershell",
    generator: ({ url, method, headers = {}, body }) => `
      $headers = @{
          ${Object.entries(headers)
            .map(([k, v]) => `"${k}" = "${v}"`)
            .join("\n    ")}
      }

      $params = @{
          Uri = "${url}"
          Method = "${method.toUpperCase()}"
          Headers = $headers
          ${body ? `Body = '${body}'` : ""}
      }

      $response = Invoke-RestMethod @params
      $response | ConvertTo-Json -Depth 10`,
  },

  perl: {
    name: "Perl",
    icon: SiPerl,
    highlight: "perl",
    generator: ({ url, method, headers = {}, body }) => `
      use strict;
      use warnings;
      use LWP::UserAgent;
      use JSON;

      my $ua = LWP::UserAgent->new;
      my $req = HTTP::Request->new('${method.toUpperCase()}' => '${url}');
      ${Object.entries(headers)
        .map(([k, v]) => `$req->header('${k}' => '${v}');`)
        .join("\n")}
      ${body ? `$req->content('${body}');` : ""}

      my $resp = $ua->request($req);
      print $resp->decoded_content;`,
  },

  rust: {
    name: "Rust",
    icon: SiRust,
    highlight: "rust",
    generator: ({ url, method, headers = {}, body }) => `
      use reqwest;
      
      #[tokio::main]
      async fn main() -> Result<(), Box<dyn std::error::Error>> {
          let client = reqwest::Client::new();
          let response = client
              .${method.toLowerCase()}("${url}")
              ${Object.entries(headers)
                .map(([k, v]) => `.header("${k}", "${v}")`)
                .join("\n              ")}
              ${body ? `.json(&serde_json::json!(${body}))` : ""}
              .send()
              .await?;
          
          println!("{}", response.text().await?);
          Ok(())
      }`,
  },
};

export type CodeGenLanguage = keyof typeof languageConfigs;

// Helper function for proper indentation
function indentCode(code: string, spaces: number = 4): string {
  return code
    .split("\n")
    .map((line) => (line.trim() ? " ".repeat(spaces) + line : line))
    .join("\n");
}
