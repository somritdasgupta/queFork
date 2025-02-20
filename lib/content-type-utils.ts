import { FileJson, FileCode, FormInput, FileText } from "lucide-react";
import { ContentType } from "@/types";
import React, { JSX } from "react";

export const contentTypeOptions = {
  None: [{ value: "none", label: "None", category: "None", editor: "none" }],
  Text: [
    { value: "json", label: "JSON", category: "Text", editor: "json" },
    {
      value: "application/json",
      label: "JSON (application/json)",
      category: "Text",
      editor: "json",
    },
  ],
  Structured: [
    {
      value: "application/x-www-form-urlencoded",
      label: "URL Encoded",
      category: "Structured",
      editor: "form",
    },
    {
      value: "multipart/form-data",
      label: "Form Data",
      category: "Structured",
      editor: "form",
    },
  ],
  Binary: [
    {
      value: "application/octet-stream",
      label: "Binary",
      category: "Binary",
      editor: "binary",
    },
  ],
} as const;

export function getIconForContentType(type: ContentType): JSX.Element {
  switch (true) {
    case type.includes("json"):
      return React.createElement(FileJson, {
        className: "h-4 w-4 text-blue-400",
      });
    case type.includes("xml"):
      return React.createElement(FileCode, {
        className: "h-4 w-4 text-orange-400",
      });
    case type.includes("form"):
      return React.createElement(FormInput, {
        className: "h-4 w-4 text-green-400",
      });
    default:
      return React.createElement(FileText, {
        className: "h-4 w-4 text-slate-400",
      });
  }
}

export function getEditorLanguage(type: ContentType): string {
  if (type.includes("json")) return "json";
  if (type.includes("xml")) return "xml";
  if (type.includes("html")) return "html";
  return "plaintext";
}
