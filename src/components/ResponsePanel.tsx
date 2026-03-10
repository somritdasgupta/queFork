import React, { useState, useMemo, useCallback, useRef } from "react";
import type { ResponseData, TestResult } from "@/types/api";
import { getStatusColor } from "@/types/api";
import {
  CircleCheck,
  XCircle,
  Copy,
  Check,
  Send,
  Plus,
  Layers,
  FolderOpen,
  Upload,
  Keyboard,
  Zap,
  ChevronRight,
  ChevronDown,
  Maximize2,
  Minimize2,
  ChevronsDownUp,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

type ResponseMode = "normal" | "collapsed" | "expanded";

interface Props {
  response: ResponseData | null;
  loading: boolean;
  testResults: TestResult[];
  onAction?: (action: string) => void;
  responseMode?: ResponseMode;
  onResponseModeChange?: (mode: ResponseMode) => void;
}

type TabKey = "body" | "preview" | "headers" | "tests";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function tryFormatJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

// Highlight search matches in text
function HighlightText({
  text,
  query,
  className = "",
}: {
  text: string;
  query: string;
  className?: string;
}) {
  if (!query) return <span className={className}>{text}</span>;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let last = 0,
    key = 0;
  let pos = lower.indexOf(q);
  while (pos !== -1) {
    if (pos > last)
      parts.push(
        <span key={key++} className={className}>
          {text.slice(last, pos)}
        </span>,
      );
    parts.push(
      <mark
        key={key++}
        className="bg-primary/30 text-foreground rounded-none px-0"
      >
        {text.slice(pos, pos + query.length)}
      </mark>,
    );
    last = pos + query.length;
    pos = lower.indexOf(q, last);
  }
  if (last < text.length)
    parts.push(
      <span key={key++} className={className}>
        {text.slice(last)}
      </span>,
    );
  return <>{parts}</>;
}

function findBlocks(lines: string[]): Map<number, number> {
  const blocks = new Map<number, number>();
  const stack: { char: string; line: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimEnd();
    for (const ch of trimmed) {
      if (ch === "{" || ch === "[") {
        stack.push({ char: ch, line: i });
      } else if (ch === "}" || ch === "]") {
        const open = stack.pop();
        if (open && open.line !== i) {
          blocks.set(open.line, i);
        }
      }
    }
  }
  return blocks;
}

function CollapsibleJsonView({
  body,
  searchQuery = "",
}: {
  body: string;
  searchQuery?: string;
}) {
  const formatted = tryFormatJson(body);
  const lines = useMemo(() => formatted.split("\n"), [formatted]);
  const blocks = useMemo(() => findBlocks(lines), [lines]);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleBlock = useCallback((lineIdx: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(lineIdx)) next.delete(lineIdx);
      else next.add(lineIdx);
      return next;
    });
  }, []);

  const visibleLines: {
    originalIndex: number;
    content: string;
    isCollapsible: boolean;
    isCollapsed: boolean;
  }[] = [];
  let skip = -1;

  for (let i = 0; i < lines.length; i++) {
    if (i <= skip) continue;
    const endLine = blocks.get(i);
    const isCollapsible = endLine !== undefined && endLine > i;
    const isCollapsed = collapsed.has(i);

    if (isCollapsible && isCollapsed) {
      const openChar = lines[i].trimEnd().includes("{") ? "{" : "[";
      const closeChar = openChar === "{" ? "}" : "]";
      const itemCount = endLine! - i - 1;
      const trailing = lines[endLine!].trim().replace(/^[}\]]/, "");
      visibleLines.push({
        originalIndex: i,
        content: `${lines[i].trimEnd()} ... ${itemCount} items ${closeChar}${trailing}`,
        isCollapsible: true,
        isCollapsed: true,
      });
      skip = endLine!;
    } else {
      visibleLines.push({
        originalIndex: i,
        content: lines[i],
        isCollapsible,
        isCollapsed: false,
      });
    }
  }

  const lineNumWidth = String(lines.length).length;
  const lineNumColClass =
    lineNumWidth >= 4 ? "w-14" : lineNumWidth === 3 ? "w-12" : "w-10";

  return (
    <div ref={containerRef} className="overflow-auto h-full bg-surface-sunken">
      <table className="w-full border-collapse">
        <tbody>
          {visibleLines.map((vl) => (
            <tr key={vl.originalIndex} className="hover:bg-accent/10 group">
              <td
                className={`select-none text-right align-top shrink-0 border-r border-border bg-surface-sunken sticky left-0 ${lineNumColClass}`}
              >
                {vl.isCollapsible ? (
                  <button
                    onClick={() => toggleBlock(vl.originalIndex)}
                    className="w-full px-1.5 py-0 text-[11px] font-mono leading-[1.65] text-muted-foreground/60 hover:text-primary hover:bg-accent/30 transition-colors flex items-center justify-end gap-0.5"
                  >
                    {vl.isCollapsed ? (
                      <ChevronRight className="h-2.5 w-2.5 opacity-70" />
                    ) : (
                      <ChevronDown className="h-2.5 w-2.5 opacity-70" />
                    )}
                    <span>{vl.originalIndex + 1}</span>
                  </button>
                ) : (
                  <span className="block px-2 py-0 text-[11px] font-mono leading-[1.65] text-muted-foreground/40">
                    {vl.originalIndex + 1}
                  </span>
                )}
              </td>
              <td className="px-0 py-0">
                <pre className="font-mono text-[11px] leading-[1.65] text-foreground whitespace-pre pl-3 pr-3">
                  {vl.isCollapsed ? (
                    <HighlightText
                      text={vl.content}
                      query={searchQuery}
                      className="text-muted-foreground"
                    />
                  ) : (
                    <SyntaxLine
                      content={vl.content}
                      searchQuery={searchQuery}
                    />
                  )}
                </pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SyntaxLine({
  content,
  searchQuery = "",
}: {
  content: string;
  searchQuery?: string;
}) {
  const parts: React.ReactNode[] = [];
  let remaining = content;
  let key = 0;

  while (remaining.length > 0) {
    const strMatch = remaining.match(/^("(?:[^"\\]|\\.)*")/);
    if (strMatch) {
      const isKey = remaining
        .slice(strMatch[0].length)
        .trimStart()
        .startsWith(":");
      parts.push(
        <span
          key={key++}
          className={isKey ? "text-primary font-bold" : "text-status-success"}
        >
          <HighlightText text={strMatch[0]} query={searchQuery} />
        </span>,
      );
      remaining = remaining.slice(strMatch[0].length);
      continue;
    }
    const numMatch = remaining.match(/^(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/);
    if (numMatch) {
      parts.push(
        <span key={key++} className="text-method-post font-bold">
          <HighlightText text={numMatch[0]} query={searchQuery} />
        </span>,
      );
      remaining = remaining.slice(numMatch[0].length);
      continue;
    }
    const boolMatch = remaining.match(/^(true|false|null)/);
    if (boolMatch) {
      parts.push(
        <span key={key++} className="text-method-put font-bold">
          <HighlightText text={boolMatch[0]} query={searchQuery} />
        </span>,
      );
      remaining = remaining.slice(boolMatch[0].length);
      continue;
    }
    const punctMatch = remaining.match(/^([{}[\]:,])/);
    if (punctMatch) {
      parts.push(
        <span key={key++} className="text-muted-foreground">
          {punctMatch[0]}
        </span>,
      );
      remaining = remaining.slice(1);
      continue;
    }
    parts.push(<span key={key++}>{remaining[0]}</span>);
    remaining = remaining.slice(1);
  }

  return <>{parts}</>;
}

function flattenJson(
  data: any,
  prefix = "",
): { key: string; value: string; type: string }[] {
  const rows: { key: string; value: string; type: string }[] = [];
  if (data === null || data === undefined) {
    rows.push({ key: prefix || "value", value: "null", type: "null" });
    return rows;
  }
  if (typeof data !== "object") {
    rows.push({
      key: prefix || "value",
      value: String(data),
      type: typeof data,
    });
    return rows;
  }
  if (Array.isArray(data)) {
    if (
      data.length > 0 &&
      data.every(
        (item) =>
          typeof item === "object" && item !== null && !Array.isArray(item),
      )
    ) {
      return [];
    }
    data.forEach((item, i) => {
      rows.push(...flattenJson(item, prefix ? `${prefix}[${i}]` : `[${i}]`));
    });
    return rows;
  }
  for (const [key, value] of Object.entries(data)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object") {
      rows.push(...flattenJson(value, path));
    } else {
      rows.push({
        key: path,
        value: value === null ? "null" : String(value),
        type: typeof value,
      });
    }
  }
  return rows;
}

function isArrayOfObjects(data: any): boolean {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    data.every(
      (item) =>
        typeof item === "object" && item !== null && !Array.isArray(item),
    )
  );
}

function ArrayTable({
  data,
  searchQuery = "",
}: {
  data: Record<string, any>[];
  searchQuery?: string;
}) {
  const allKeys = Array.from(
    new Set(data.flatMap((item) => Object.keys(item))),
  );
  const q = searchQuery.toLowerCase();
  const filtered = q
    ? data.filter((item) =>
        allKeys.some((k) =>
          String(item[k] ?? "")
            .toLowerCase()
            .includes(q),
        ),
      )
    : data;
  return (
    <div className="overflow-auto h-full">
      {q && (
        <div className="px-3 py-1 bg-surface-sunken border-b border-border text-[9px] font-bold text-muted-foreground">
          Showing {filtered.length}/{data.length} rows matching "{searchQuery}"
        </div>
      )}
      <table className="w-full text-[12px] font-mono">
        <thead>
          <tr className="bg-surface-sunken">
            <th className="px-3 py-2 text-left font-extrabold text-muted-foreground border-b border-r border-border text-[10px] uppercase tracking-wider">
              #
            </th>
            {allKeys.map((key) => (
              <th
                key={key}
                className="px-3 py-2 text-left font-extrabold text-muted-foreground border-b border-r border-border text-[10px] uppercase tracking-wider whitespace-nowrap"
              >
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((item, i) => (
            <tr
              key={i}
              className="border-b border-border hover:bg-accent/30 transition-colors"
            >
              <td className="px-3 py-1.5 text-muted-foreground border-r border-border">
                {i}
              </td>
              {allKeys.map((key) => (
                <td key={key} className="px-3 py-1.5 border-r border-border">
                  <CellValue value={item[key]} searchQuery={searchQuery} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CellValue({
  value,
  searchQuery = "",
}: {
  value: any;
  searchQuery?: string;
}) {
  if (value === null || value === undefined)
    return <span className="text-muted-foreground italic">null</span>;
  if (typeof value === "boolean")
    return (
      <span className="text-method-put font-bold">
        <HighlightText text={String(value)} query={searchQuery} />
      </span>
    );
  if (typeof value === "number")
    return (
      <span className="text-method-post font-bold">
        <HighlightText text={String(value)} query={searchQuery} />
      </span>
    );
  if (typeof value === "object")
    return (
      <span className="text-muted-foreground">
        <HighlightText text={JSON.stringify(value)} query={searchQuery} />
      </span>
    );
  return (
    <span className="text-status-success">
      <HighlightText text={String(value)} query={searchQuery} />
    </span>
  );
}

function KeyValueTable({
  rows,
  searchQuery = "",
}: {
  rows: { key: string; value: string; type: string }[];
  searchQuery?: string;
}) {
  const q = searchQuery.toLowerCase();
  const filtered = q
    ? rows.filter(
        (r) =>
          r.key.toLowerCase().includes(q) || r.value.toLowerCase().includes(q),
      )
    : rows;
  return (
    <div className="overflow-auto h-full">
      {q && (
        <div className="px-3 py-1 bg-surface-sunken border-b border-border text-[9px] font-bold text-muted-foreground">
          Showing {filtered.length}/{rows.length} rows matching "{searchQuery}"
        </div>
      )}
      <table className="w-full text-[12px] font-mono">
        <thead>
          <tr className="bg-surface-sunken">
            <th className="px-3 py-2 text-left font-extrabold text-muted-foreground border-b border-r border-border text-[10px] uppercase tracking-wider">
              Key
            </th>
            <th className="px-3 py-2 text-left font-extrabold text-muted-foreground border-b border-border text-[10px] uppercase tracking-wider">
              Value
            </th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row, i) => (
            <tr
              key={i}
              className="border-b border-border hover:bg-accent/30 transition-colors"
            >
              <td className="px-3 py-1.5 font-bold text-primary border-r border-border whitespace-nowrap">
                <HighlightText text={row.key} query={searchQuery} />
              </td>
              <td className="px-3 py-1.5 break-all">
                <CellValue
                  value={
                    row.type === "number"
                      ? Number(row.value)
                      : row.type === "boolean"
                        ? row.value === "true"
                        : row.value
                  }
                  searchQuery={searchQuery}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ onAction }: { onAction?: (action: string) => void }) {
  const shortcuts = [
    { icon: Send, label: "Send Request", shortcut: "⌘ ↵", action: "send" },
    { icon: Plus, label: "New Request", shortcut: "⌘ N", action: "new" },
    { icon: Upload, label: "Import cURL", shortcut: "⌘ I", action: "import" },
    {
      icon: Layers,
      label: "Environments",
      shortcut: "⌘ B",
      action: "environments",
    },
    {
      icon: FolderOpen,
      label: "Collections",
      shortcut: "⌘ B",
      action: "collections",
    },
    {
      icon: Keyboard,
      label: "Command Palette",
      shortcut: "⌘ K",
      action: "command",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-5 w-5 text-primary" />
        <h3 className="text-[14px] font-black text-foreground">Get Started</h3>
      </div>
      <p className="text-[12px] text-muted-foreground font-bold mb-8 text-center max-w-[280px]">
        Enter a URL above and hit Send, or use one of these shortcuts.
      </p>
      <div className="grid grid-cols-2 gap-px bg-border w-full max-w-[400px]">
        {shortcuts.map((s) => (
          <button
            key={s.action}
            onClick={() => onAction?.(s.action)}
            className="flex items-center gap-3 px-4 py-3 bg-surface-elevated hover:bg-accent transition-colors text-left"
          >
            <s.icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-foreground">{s.label}</p>
            </div>
            <kbd className="text-[9px] font-mono font-bold text-muted-foreground bg-surface-sunken border border-border px-1.5 py-0.5 shrink-0">
              {s.shortcut}
            </kbd>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ResponsePanel({
  response,
  loading,
  testResults,
  onAction,
  responseMode = "normal",
  onResponseModeChange,
}: Props) {
  const [tab, setTab] = useState<TabKey>("body");
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const parsedJson = useMemo(() => {
    if (!response?.body) return null;
    try {
      return JSON.parse(response.body);
    } catch {
      return null;
    }
  }, [response?.body]);

  const copyBody = () => {
    if (response?.body) {
      navigator.clipboard.writeText(response.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Copied");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse [animation-delay:300ms]" />
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse [animation-delay:600ms]" />
        </div>
        <p className="text-[13px] text-muted-foreground font-bold">
          Sending request...
        </p>
      </div>
    );
  }

  if (!response) {
    return <EmptyState onAction={onAction} />;
  }

  const passedTests = testResults.filter((t) => t.passed).length;
  const totalTests = testResults.length;
  const hasJson = parsedJson !== null;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Status bar */}
      <div className="flex items-center gap-3 px-3 h-[37px] border-b border-border bg-surface-elevated shrink-0">
        <span
          className={`text-[13px] font-extrabold ${response.error ? "text-destructive" : getStatusColor(response.status)}`}
        >
          {response.error
            ? "Error"
            : `${response.status} ${response.statusText}`}
        </span>
        <span className="text-[12px] text-muted-foreground font-bold">
          {response.time} ms
        </span>
        <span className="text-[12px] text-muted-foreground font-bold">
          {formatSize(response.size)}
        </span>
        {totalTests > 0 && (
          <span
            className={`text-[12px] font-extrabold ${passedTests === totalTests ? "text-status-success" : "text-destructive"}`}
          >
            {passedTests}/{totalTests} tests
          </span>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          <button
            onClick={() => {
              setShowSearch((s) => !s);
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            className={`p-1.5 transition-colors ${showSearch ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            title="Search response (⌘F)"
            aria-label="Search response"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={copyBody}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            title="Copy response"
            aria-label="Copy response"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
          {onResponseModeChange && (
            <button
              onClick={() => {
                const cycle: Record<ResponseMode, ResponseMode> = {
                  normal: "expanded",
                  expanded: "collapsed",
                  collapsed: "normal",
                };
                onResponseModeChange(cycle[responseMode]);
              }}
              className={`p-1.5 transition-colors ${responseMode !== "normal" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              title={
                responseMode === "normal"
                  ? "Expand"
                  : responseMode === "expanded"
                    ? "Collapse"
                    : "Restore"
              }
              aria-label={
                responseMode === "normal"
                  ? "Expand response panel"
                  : responseMode === "expanded"
                    ? "Collapse response panel"
                    : "Restore response panel"
              }
            >
              {responseMode === "expanded" ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : responseMode === "collapsed" ? (
                <ChevronsDownUp className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Collapsed mode: only status bar visible */}
      {responseMode === "collapsed" ? null : (
        <>
          {/* Search bar */}
          {showSearch && (
            <div className="flex items-center gap-2 px-3 h-[33px] border-b border-border bg-surface-sunken shrink-0">
              <Search className="h-3 w-3 text-muted-foreground shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search response text"
                placeholder="Search in response..."
                className="flex-1 bg-transparent text-[11px] font-mono text-foreground placeholder:text-muted-foreground/50 outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setShowSearch(false);
                    setSearchQuery("");
                  }
                }}
              />
              {searchQuery && (
                <span className="text-[9px] font-bold text-muted-foreground shrink-0">
                  {(() => {
                    const q = searchQuery.toLowerCase();
                    const body = response.body.toLowerCase();
                    let count = 0,
                      pos = 0;
                    while ((pos = body.indexOf(q, pos)) !== -1) {
                      count++;
                      pos += q.length;
                    }
                    return `${count} match${count !== 1 ? "es" : ""}`;
                  })()}
                </span>
              )}
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery("");
                }}
                className="p-0.5 text-muted-foreground hover:text-foreground"
                title="Close search"
                aria-label="Close search"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-border shrink-0">
            {(["body", "preview", "headers", "tests"] as TabKey[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-2 text-[12px] font-bold capitalize border-b-2 transition-colors ${
                  tab === t
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
                {t === "headers" && (
                  <span className="ml-1 text-[10px] text-muted-foreground font-bold">
                    ({Object.keys(response.headers).length})
                  </span>
                )}
                {t === "tests" && totalTests > 0 && (
                  <span
                    className={`ml-1 text-[10px] font-extrabold ${passedTests === totalTests ? "text-status-success" : "text-destructive"}`}
                  >
                    ({passedTests}/{totalTests})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content - scrollable */}
          <div className="flex-1 overflow-auto min-h-0">
            {tab === "body" && (
              <CollapsibleJsonView
                body={response.body}
                searchQuery={searchQuery}
              />
            )}
            {tab === "preview" && (
              <>
                {hasJson ? (
                  isArrayOfObjects(parsedJson) ? (
                    <ArrayTable data={parsedJson} searchQuery={searchQuery} />
                  ) : (
                    <KeyValueTable
                      rows={flattenJson(parsedJson)}
                      searchQuery={searchQuery}
                    />
                  )
                ) : (
                  <div className="p-3">
                    <pre className="font-mono text-[12px] leading-relaxed text-foreground whitespace-pre-wrap break-all">
                      <HighlightText text={response.body} query={searchQuery} />
                    </pre>
                  </div>
                )}
              </>
            )}
            {tab === "headers" && (
              <div className="overflow-auto">
                <table className="w-full text-[12px] font-mono">
                  <thead>
                    <tr className="bg-surface-sunken">
                      <th className="px-3 py-2 text-left font-extrabold text-muted-foreground border-b border-r border-border text-[10px] uppercase tracking-wider">
                        Header
                      </th>
                      <th className="px-3 py-2 text-left font-extrabold text-muted-foreground border-b border-border text-[10px] uppercase tracking-wider">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(response.headers).map(([k, v]) => (
                      <tr
                        key={k}
                        className="border-b border-border hover:bg-accent/30 transition-colors"
                      >
                        <td className="px-3 py-1.5 font-bold text-primary border-r border-border whitespace-nowrap">
                          {k}
                        </td>
                        <td className="px-3 py-1.5 text-foreground break-all">
                          {v}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {Object.keys(response.headers).length === 0 && (
                  <p className="text-[13px] text-muted-foreground p-4 text-center font-bold">
                    No headers in response.
                  </p>
                )}
              </div>
            )}
            {tab === "tests" && (
              <div>
                {testResults.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-surface-elevated border-b border-border">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Results
                    </span>
                    <span
                      className={`text-[11px] font-extrabold ${passedTests === totalTests ? "text-status-success" : "text-destructive"}`}
                    >
                      {passedTests} passed · {totalTests - passedTests} failed
                    </span>
                  </div>
                )}
                {testResults.map((t, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 px-3 py-2 text-[12px] border-b border-border ${t.passed ? "bg-status-success/5" : "bg-destructive/5"}`}
                  >
                    {t.passed ? (
                      <CircleCheck className="h-3.5 w-3.5 text-status-success shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                    )}
                    <span className="font-bold flex-1">{t.name}</span>
                    {!t.passed && (
                      <span className="text-destructive text-[11px] font-bold truncate max-w-[200px]">
                        {t.message}
                      </span>
                    )}
                  </div>
                ))}
                {totalTests === 0 && (
                  <p className="text-[13px] text-muted-foreground py-8 text-center font-bold">
                    Write tests in the Tests tab and send a request to see
                    results.
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
