import { FileJson, FileCode, FormInput, FileText } from "lucide-react";
import { ContentType } from "@/types";
import React, { JSX } from "react";

export type EditorType = "none" | "text" | "json" | "form" | "binary";

export type ContentTypeOption = {
  value: ContentType;
  label: string;
  editor: EditorType;
  description?: string;
};

export const contentTypeOptions = {
  data: [
    { value: "application/json", label: "JSON", editor: "json" },
    { value: "multipart/form-data", label: "Form", editor: "form" },
    { value: "text/plain", label: "Text", editor: "text" },
    { value: "application/octet-stream", label: "Binary", editor: "binary" },
    { value: "application/xml", label: "XML", editor: "text" },
    { value: "text/csv", label: "CSV", editor: "text" },
    { value: "text/yaml", label: "YAML", editor: "text" },
    { value: "none", label: "None", editor: "none" },
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
