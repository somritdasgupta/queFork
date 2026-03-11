import React, { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { xml } from "@codemirror/lang-xml";
import { css } from "@codemirror/lang-css";
import { python } from "@codemirror/lang-python";
import { sql } from "@codemirror/lang-sql";
import { EditorView } from "@codemirror/view";
import { search, searchKeymap } from "@codemirror/search";
import { foldGutter, foldKeymap } from "@codemirror/language";
import { keymap } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  language?: string;
  minHeight?: string;
  readOnly?: boolean;
}

function getExtensions(language: string) {
  const lang = language.toLowerCase();
  switch (lang) {
    case "javascript":
    case "js":
      return [javascript()];
    case "json":
      return [json()];
    case "graphql":
      return [javascript()];
    case "xml":
    case "html":
    case "markup":
    case "soap":
      return [xml()];
    case "css":
      return [css()];
    case "python":
      return [python()];
    case "sql":
      return [sql()];
    default:
      return [javascript()];
  }
}

// Syntax highlighting matching the response panel's color scheme
const appHighlightStyle = HighlightStyle.define([
  { tag: tags.propertyName, color: "hsl(var(--primary))", fontWeight: "bold" },
  { tag: tags.string, color: "hsl(var(--status-success))" },
  { tag: tags.number, color: "hsl(var(--method-post))" },
  { tag: tags.bool, color: "hsl(var(--method-put))", fontWeight: "bold" },
  { tag: tags.null, color: "hsl(var(--method-put))", fontWeight: "bold" },
  { tag: tags.keyword, color: "hsl(var(--method-delete))" },
  {
    tag: tags.comment,
    color: "hsl(var(--muted-foreground))",
    fontStyle: "italic",
  },
  { tag: tags.variableName, color: "hsl(var(--foreground))" },
  { tag: tags.function(tags.variableName), color: "hsl(var(--primary))" },
  { tag: tags.definition(tags.variableName), color: "hsl(var(--foreground))" },
  { tag: tags.typeName, color: "hsl(var(--method-patch))" },
  { tag: tags.operator, color: "hsl(var(--muted-foreground))" },
  { tag: tags.punctuation, color: "hsl(var(--muted-foreground))" },
  { tag: tags.bracket, color: "hsl(var(--muted-foreground))" },
  { tag: tags.attributeName, color: "hsl(var(--primary))" },
  { tag: tags.attributeValue, color: "hsl(var(--status-success))" },
  { tag: tags.tagName, color: "hsl(var(--method-delete))" },
  { tag: tags.angleBracket, color: "hsl(var(--muted-foreground))" },
]);

// Detect dark mode from the document
function isDarkMode() {
  if (typeof document === "undefined") return true;
  return document.documentElement.classList.contains("dark");
}

// Custom theme matching the app's surface-sunken background
const editorTheme = EditorView.theme({
  "&": {
    fontSize: "11px",
    backgroundColor: "hsl(var(--surface-sunken))",
  },
  ".cm-content": {
    fontFamily:
      "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    caretColor: "hsl(var(--foreground))",
    lineHeight: "1.7",
    padding: "6px 0",
  },
  ".cm-line": {
    padding: "0 8px",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-gutters": {
    backgroundColor: "hsl(var(--surface-sunken))",
    borderRight: "1px solid hsl(var(--border))",
    color: "hsl(var(--muted-foreground) / 0.25)",
    fontSize: "10px",
    minWidth: "32px",
  },
  ".cm-gutterElement": {
    padding: "0 4px 0 8px !important",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "hsl(var(--accent) / 0.3)",
    color: "hsl(var(--muted-foreground) / 0.5)",
  },
  ".cm-activeLine": {
    backgroundColor: "hsl(var(--accent) / 0.08)",
  },
  ".cm-selectionBackground": {
    backgroundColor: "hsl(var(--primary) / 0.2) !important",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "hsl(var(--primary) / 0.3) !important",
  },
  ".cm-cursor": {
    borderLeftColor: "hsl(var(--foreground))",
  },
  ".cm-placeholder": {
    color: "hsl(var(--muted-foreground) / 0.25)",
    fontStyle: "italic",
  },
  ".cm-scroller": {
    overflow: "auto",
  },
  // Match the panel background for non-editing chrome
  ".cm-panels": {
    backgroundColor: "hsl(var(--surface-sunken))",
    borderColor: "hsl(var(--border))",
  },
  ".cm-panels.cm-panels-top": {
    borderBottom: "1px solid hsl(var(--border))",
  },
  ".cm-search": {
    fontSize: "11px",
    fontFamily:
      "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  },
  ".cm-search input": {
    backgroundColor: "hsl(var(--background))",
    border: "1px solid hsl(var(--border))",
    color: "hsl(var(--foreground))",
    borderRadius: "3px",
    padding: "1px 4px",
    fontSize: "11px",
  },
  ".cm-search button": {
    backgroundColor: "hsl(var(--accent))",
    color: "hsl(var(--foreground))",
    borderRadius: "3px",
    fontSize: "10px",
    padding: "1px 6px",
  },
  ".cm-searchMatch": {
    backgroundColor: "hsl(var(--primary) / 0.2)",
    outline: "1px solid hsl(var(--primary) / 0.4)",
  },
  ".cm-searchMatch-selected": {
    backgroundColor: "hsl(var(--primary) / 0.4)",
  },
  ".cm-foldGutter .cm-gutterElement": {
    padding: "0 2px !important",
    cursor: "pointer",
    color: "hsl(var(--muted-foreground) / 0.3)",
  },
  ".cm-foldGutter .cm-gutterElement:hover": {
    color: "hsl(var(--foreground))",
  },
});

export function CodeEditor({
  value,
  onChange,
  placeholder = "",
  language = "javascript",
  minHeight = "120px",
  readOnly = false,
}: Props) {
  const extensions = useMemo(
    () => [
      ...getExtensions(language),
      EditorView.lineWrapping,
      syntaxHighlighting(appHighlightStyle),
      search(),
      foldGutter(),
      keymap.of([...searchKeymap, ...foldKeymap]),
    ],
    [language],
  );

  return (
    <div
      className="relative w-full bg-surface-sunken flex-1 flex flex-col overflow-hidden"
      style={{ minHeight }}
    >
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        theme={editorTheme}
        placeholder={placeholder}
        readOnly={readOnly}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false, // we add our own above with custom styling
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: false,
          indentOnInput: true,
          tabSize: 2,
          searchKeymap: false, // we add our own above
        }}
        className="flex-1 min-h-0 [&_.cm-editor]:h-full [&_.cm-scroller]:!overflow-auto"
        style={{ height: "100%" }}
      />
    </div>
  );
}
