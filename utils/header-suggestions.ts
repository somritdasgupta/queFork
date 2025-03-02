export interface HeaderSuggestion {
  name: string;
  description: string;
  commonValues?: string[];
}

export const headerSuggestions: HeaderSuggestion[] = [
  {
    name: "Accept",
    description: "Media types that are acceptable for the response",
    commonValues: ["application/json", "text/plain", "application/xml", "*/*"],
  },
  {
    name: "Content-Type",
    description: "The media type of the body of the request",
    commonValues: [
      "application/json",
      "application/x-www-form-urlencoded",
      "multipart/form-data",
    ],
  },
  {
    name: "Authorization",
    description: "Authentication credentials for HTTP authentication",
  },
  {
    name: "User-Agent",
    description: "Information about the user agent originating the request",
  },
  {
    name: "Cache-Control",
    description:
      "Directives for caching mechanisms in both requests and responses",
    commonValues: ["no-cache", "no-store", "max-age=0"],
  },
  {
    name: "Accept-Language",
    description: "Acceptable languages for response",
    commonValues: ["en-US", "en-GB", "fr-FR", "*"],
  },
];
