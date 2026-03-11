import React, { useState, useRef, useCallback, useEffect } from "react";
import type { Collection, RequestConfig, ResponseData } from "@/types/api";
import {
  createEmptyCollection,
  createEmptyRequest,
  getMethodColor,
} from "@/types/api";
import {
  parsePostmanCollection,
  importQueForkCollection,
  exportToPostman,
  exportCollectionAsJson,
} from "@/lib/postman-import";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Pencil,
  FolderPlus,
  Search,
  Play,
  Square,
  Copy,
  Download,
  Upload,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  Loader2,
  Clock,
  FileText,
  EllipsisVertical,
} from "lucide-react";
import { toast } from "sonner";

interface RunResult {
  requestId: string;
  status: "pending" | "running" | "success" | "failed";
  response?: ResponseData;
  duration: number;
}

interface Props {
  collections: Collection[];
  onChange: (collections: Collection[]) => void;
  onOpenRequest: (req: RequestConfig) => void;
  onRunRequest?: (req: RequestConfig) => Promise<ResponseData>;
}

export function CollectionPanel({
  collections,
  onChange,
  onOpenRequest,
  onRunRequest,
}: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDescId, setEditingDescId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [runResults, setRunResults] = useState<Record<string, RunResult[]>>({});
  const [runningId, setRunningId] = useState<string | null>(null);
  const [exportMenuId, setExportMenuId] = useState<string | null>(null);
  const [mobileMenuId, setMobileMenuId] = useState<string | null>(null);
  const [mobileReqMenuId, setMobileReqMenuId] = useState<string | null>(null);
  const stopRef = useRef(false);
  const importRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  // Close dropdown menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-menu-dropdown]")) {
        setExportMenuId(null);
        setMobileMenuId(null);
        setMobileReqMenuId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addCollection = () => {
    const col = createEmptyCollection();
    onChange([...collections, col]);
    setExpandedIds((prev) => new Set(prev).add(col.id));
    setEditingId(col.id);
    toast.success("Collection created");
  };

  const removeCollection = (id: string) => {
    onChange(collections.filter((c) => c.id !== id));
    toast.success("Collection removed");
  };

  const duplicateCollection = (col: Collection) => {
    const dup: Collection = {
      ...col,
      id: crypto.randomUUID(),
      name: `${col.name} (copy)`,
      requests: col.requests.map((r) => ({ ...r, id: crypto.randomUUID() })),
    };
    onChange([...collections, dup]);
    setExpandedIds((prev) => new Set(prev).add(dup.id));
    toast.success("Collection duplicated");
  };

  const addRequestToCollection = (collectionId: string) => {
    const req = createEmptyRequest();
    req.collectionId = collectionId;
    onChange(
      collections.map((c) =>
        c.id === collectionId ? { ...c, requests: [...c.requests, req] } : c,
      ),
    );
    onOpenRequest(req);
  };

  const removeRequest = (collectionId: string, requestId: string) => {
    onChange(
      collections.map((c) =>
        c.id === collectionId
          ? { ...c, requests: c.requests.filter((r) => r.id !== requestId) }
          : c,
      ),
    );
  };

  const duplicateRequest = (collectionId: string, req: RequestConfig) => {
    const dup: RequestConfig = {
      ...req,
      id: crypto.randomUUID(),
      name: req.name ? `${req.name} (copy)` : "Copy",
      collectionId,
    };
    onChange(
      collections.map((c) =>
        c.id === collectionId ? { ...c, requests: [...c.requests, dup] } : c,
      ),
    );
    toast.success("Request duplicated");
  };

  const moveRequest = (
    collectionId: string,
    index: number,
    direction: -1 | 1,
  ) => {
    const newIndex = index + direction;
    onChange(
      collections.map((c) => {
        if (c.id !== collectionId) return c;
        if (newIndex < 0 || newIndex >= c.requests.length) return c;
        const reqs = [...c.requests];
        [reqs[index], reqs[newIndex]] = [reqs[newIndex], reqs[index]];
        return { ...c, requests: reqs };
      }),
    );
  };

  const updateCollectionName = (id: string, name: string) => {
    onChange(collections.map((c) => (c.id === id ? { ...c, name } : c)));
  };

  const updateCollectionDescription = (id: string, description: string) => {
    onChange(collections.map((c) => (c.id === id ? { ...c, description } : c)));
  };

  // ── Collection Runner ──────────────────────────────────────────────
  const runCollection = useCallback(
    async (col: Collection) => {
      if (!onRunRequest || col.requests.length === 0) return;

      stopRef.current = false;
      setRunningId(col.id);
      setExpandedIds((prev) => new Set(prev).add(col.id));

      const results: RunResult[] = col.requests.map((r) => ({
        requestId: r.id,
        status: "pending" as const,
        duration: 0,
      }));
      setRunResults((prev) => ({ ...prev, [col.id]: [...results] }));

      for (let i = 0; i < col.requests.length; i++) {
        if (stopRef.current) break;

        results[i] = { ...results[i], status: "running" };
        setRunResults((prev) => ({ ...prev, [col.id]: [...results] }));

        const start = performance.now();
        try {
          const response = await onRunRequest(col.requests[i]);
          const duration = Math.round(performance.now() - start);
          const success =
            response.status > 0 && response.status < 400 && !response.error;
          results[i] = {
            requestId: col.requests[i].id,
            status: success ? "success" : "failed",
            response,
            duration,
          };
        } catch {
          results[i] = {
            requestId: col.requests[i].id,
            status: "failed",
            duration: Math.round(performance.now() - start),
          };
        }
        setRunResults((prev) => ({ ...prev, [col.id]: [...results] }));
      }

      setRunningId(null);
      const passed = results.filter((r) => r.status === "success").length;
      const failed = results.filter((r) => r.status === "failed").length;
      toast.success(`Run complete: ${passed} passed, ${failed} failed`);
    },
    [onRunRequest],
  );

  const stopRun = () => {
    stopRef.current = true;
    setRunningId(null);
  };

  // ── Import / Export ────────────────────────────────────────────────
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        let imported: Collection;
        try {
          imported = parsePostmanCollection(text);
        } catch {
          imported = importQueForkCollection(text);
        }
        onChange([...collections, imported]);
        setExpandedIds((prev) => new Set(prev).add(imported.id));
        toast.success(
          `Imported "${imported.name}" (${imported.requests.length} requests)`,
        );
      } catch {
        toast.error("Failed to import. Supported: Postman v2.1, queFork JSON");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const exportCollection = (col: Collection, format: "quefork" | "postman") => {
    const json =
      format === "postman" ? exportToPostman(col) : exportCollectionAsJson(col);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${col.name.replace(/[^a-zA-Z0-9\-_]/g, "_")}.${format === "postman" ? "postman_collection" : "quefork"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMenuId(null);
    toast.success(
      `Exported as ${format === "postman" ? "Postman" : "queFork"} format`,
    );
  };

  // ── Filter ─────────────────────────────────────────────────────────
  const q = searchQuery.trim().toLowerCase();
  const filteredCollections = q
    ? collections
        .map((col) => ({
          ...col,
          requests: col.requests.filter(
            (r) =>
              r.name?.toLowerCase().includes(q) ||
              r.url?.toLowerCase().includes(q) ||
              r.method.toLowerCase().includes(q),
          ),
        }))
        .filter(
          (col) =>
            col.name.toLowerCase().includes(q) || col.requests.length > 0,
        )
    : collections;

  return (
    <div className="flex flex-col h-full">
      {/* Header with inline search */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border bg-surface-elevated">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/40" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search collections..."
            aria-label="Search collections"
            className="w-full text-[10px] font-medium bg-transparent pl-6 pr-6 py-1 focus:outline-none border border-border rounded-md text-foreground placeholder:text-muted-foreground/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => importRef.current?.click()}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            title="Import collection (Postman / queFork JSON)"
            aria-label="Import collection"
          >
            <Upload className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={addCollection}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            title="New collection"
            aria-label="New collection"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-2 py-1">
          {filteredCollections.map((col) => {
            const isExpanded = expandedIds.has(col.id);
            const results = runResults[col.id];
            const isRunning = runningId === col.id;

            return (
              <div key={col.id} className="mb-1">
                {/* Collection header */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-accent/70 transition-all group cursor-pointer">
                  <button
                    onClick={() => toggle(col.id)}
                    className="text-muted-foreground/60 shrink-0"
                    title={
                      isExpanded ? "Collapse collection" : "Expand collection"
                    }
                    aria-label={
                      isExpanded ? "Collapse collection" : "Expand collection"
                    }
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>
                  <FolderOpen
                    className={`h-3.5 w-3.5 shrink-0 transition-colors ${isExpanded ? "text-primary" : "text-primary/60"}`}
                  />
                  {editingId === col.id ? (
                    <input
                      autoFocus
                      value={col.name}
                      onChange={(e) =>
                        updateCollectionName(col.id, e.target.value)
                      }
                      onFocus={(e) => e.target.select()}
                      onBlur={() => setEditingId(null)}
                      onKeyDown={(e) => e.key === "Enter" && setEditingId(null)}
                      aria-label="Collection name"
                      title="Collection name"
                      placeholder="Collection name"
                      className="flex-1 text-[10px] font-bold bg-transparent focus:outline-none border-b border-primary min-w-0 text-foreground"
                    />
                  ) : (
                    <span
                      onClick={() => toggle(col.id)}
                      onDoubleClick={() => setEditingId(col.id)}
                      className="flex-1 text-[10px] font-bold truncate cursor-default min-w-0 text-foreground/90"
                    >
                      {col.name}
                    </span>
                  )}
                  <span className="text-[8px] font-extrabold text-muted-foreground/30 bg-muted/50 px-1.5 py-0.5 rounded-full shrink-0">
                    {col.requests.length}
                  </span>
                  {isMobile ? (
                    <div className="relative shrink-0" data-menu-dropdown>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMobileMenuId(
                            mobileMenuId === col.id ? null : col.id,
                          );
                        }}
                        className="p-0.5 text-muted-foreground hover:text-foreground rounded"
                        title="More actions"
                        aria-label="More actions"
                      >
                        <EllipsisVertical className="h-3 w-3" />
                      </button>
                      {mobileMenuId === col.id && (
                        <div className="absolute right-0 top-full mt-1 z-30 bg-card border border-border rounded-md shadow-lg py-0.5 min-w-[140px]">
                          <button
                            onClick={() => {
                              setEditingId(col.id);
                              setMobileMenuId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-[9px] font-bold text-foreground/80 hover:bg-accent flex items-center gap-2"
                          >
                            <Pencil className="h-2.5 w-2.5" /> Rename
                          </button>
                          <button
                            onClick={() => {
                              setEditingDescId(
                                editingDescId === col.id ? null : col.id,
                              );
                              setMobileMenuId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-[9px] font-bold text-foreground/80 hover:bg-accent flex items-center gap-2"
                          >
                            <FileText className="h-2.5 w-2.5" /> Description
                          </button>
                          {onRunRequest &&
                            col.requests.length > 0 &&
                            (isRunning ? (
                              <button
                                onClick={() => {
                                  stopRun();
                                  setMobileMenuId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 text-[9px] font-bold text-destructive hover:bg-accent flex items-center gap-2"
                              >
                                <Square className="h-2.5 w-2.5" /> Stop run
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  runCollection(col);
                                  setMobileMenuId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 text-[9px] font-bold text-foreground/80 hover:bg-accent flex items-center gap-2"
                              >
                                <Play className="h-2.5 w-2.5" /> Run all
                              </button>
                            ))}
                          <button
                            onClick={() => {
                              addRequestToCollection(col.id);
                              setMobileMenuId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-[9px] font-bold text-foreground/80 hover:bg-accent flex items-center gap-2"
                          >
                            <Plus className="h-2.5 w-2.5" /> Add request
                          </button>
                          <button
                            onClick={() => {
                              duplicateCollection(col);
                              setMobileMenuId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-[9px] font-bold text-foreground/80 hover:bg-accent flex items-center gap-2"
                          >
                            <Copy className="h-2.5 w-2.5" /> Duplicate
                          </button>
                          <button
                            onClick={() => {
                              exportCollection(col, "quefork");
                              setMobileMenuId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-[9px] font-bold text-foreground/80 hover:bg-accent flex items-center gap-2"
                          >
                            <Download className="h-2.5 w-2.5" /> Export queFork
                          </button>
                          <button
                            onClick={() => {
                              exportCollection(col, "postman");
                              setMobileMenuId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-[9px] font-bold text-foreground/80 hover:bg-accent flex items-center gap-2"
                          >
                            <Download className="h-2.5 w-2.5" /> Export Postman
                          </button>
                          <button
                            onClick={() => {
                              removeCollection(col.id);
                              setMobileMenuId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-[9px] font-bold text-destructive hover:bg-accent flex items-center gap-2"
                          >
                            <Trash2 className="h-2.5 w-2.5" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-0 shrink-0">
                      <button
                        onClick={() => setEditingId(col.id)}
                        className="p-0.5 text-muted-foreground hover:text-foreground rounded"
                        title="Rename"
                        aria-label="Rename collection"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={() =>
                          setEditingDescId(
                            editingDescId === col.id ? null : col.id,
                          )
                        }
                        className={`p-0.5 rounded ${editingDescId === col.id ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                        title="Edit description"
                        aria-label="Edit collection description"
                      >
                        <FileText className="h-2.5 w-2.5" />
                      </button>
                      {onRunRequest &&
                        col.requests.length > 0 &&
                        (isRunning ? (
                          <button
                            onClick={stopRun}
                            className="p-0.5 text-destructive hover:text-destructive/80 rounded"
                            title="Stop run"
                            aria-label="Stop collection run"
                          >
                            <Square className="h-2.5 w-2.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => runCollection(col)}
                            className="p-0.5 text-muted-foreground hover:text-method-get rounded"
                            title="Run all requests"
                            aria-label="Run all requests"
                          >
                            <Play className="h-2.5 w-2.5" />
                          </button>
                        ))}
                      <button
                        onClick={() => addRequestToCollection(col.id)}
                        className="p-0.5 text-muted-foreground hover:text-foreground rounded"
                        title="Add request"
                        aria-label="Add request to collection"
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={() => duplicateCollection(col)}
                        className="p-0.5 text-muted-foreground hover:text-foreground rounded"
                        title="Duplicate collection"
                        aria-label="Duplicate collection"
                      >
                        <Copy className="h-2.5 w-2.5" />
                      </button>
                      <div className="relative" data-menu-dropdown>
                        <button
                          onClick={() =>
                            setExportMenuId(
                              exportMenuId === col.id ? null : col.id,
                            )
                          }
                          className="p-0.5 text-muted-foreground hover:text-foreground rounded"
                          title="Export collection"
                          aria-label="Export collection"
                        >
                          <Download className="h-2.5 w-2.5" />
                        </button>
                        {exportMenuId === col.id && (
                          <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-md shadow-lg py-0.5 min-w-[120px]">
                            <button
                              onClick={() => exportCollection(col, "quefork")}
                              className="w-full text-left px-3 py-1.5 text-[9px] font-bold text-foreground/80 hover:bg-accent transition-colors"
                            >
                              queFork JSON
                            </button>
                            <button
                              onClick={() => exportCollection(col, "postman")}
                              className="w-full text-left px-3 py-1.5 text-[9px] font-bold text-foreground/80 hover:bg-accent transition-colors"
                            >
                              Postman v2.1
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeCollection(col.id)}
                        className="p-0.5 text-muted-foreground hover:text-destructive rounded"
                        title="Delete"
                        aria-label="Delete collection"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Description editor */}
                {editingDescId === col.id && (
                  <div className="ml-4 pl-3 border-l border-border/50 mt-0.5 px-2.5">
                    <textarea
                      value={col.description}
                      onChange={(e) =>
                        updateCollectionDescription(col.id, e.target.value)
                      }
                      placeholder="Add a description..."
                      aria-label="Collection description"
                      className="w-full text-[10px] font-medium bg-surface-sunken border border-border rounded px-2 py-1.5 resize-none focus:outline-none focus:border-primary/50 text-foreground/80 placeholder:text-muted-foreground/25"
                      rows={2}
                    />
                  </div>
                )}

                {/* Run results summary */}
                {results && results.length > 0 && isExpanded && (
                  <div className="ml-4 pl-3 border-l border-border/50 px-2.5 py-1">
                    <div className="flex items-center gap-2 text-[9px] font-bold">
                      {isRunning && (
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      )}
                      <span className="text-method-get">
                        {results.filter((r) => r.status === "success").length}{" "}
                        passed
                      </span>
                      <span className="text-method-delete">
                        {results.filter((r) => r.status === "failed").length}{" "}
                        failed
                      </span>
                      {!isRunning && (
                        <span className="text-muted-foreground/40">
                          {Math.round(
                            results.reduce((sum, r) => sum + r.duration, 0),
                          )}
                          ms total
                        </span>
                      )}
                      <button
                        onClick={() =>
                          setRunResults((prev) => {
                            const next = { ...prev };
                            delete next[col.id];
                            return next;
                          })
                        }
                        className="text-muted-foreground/30 hover:text-foreground ml-auto"
                        title="Clear results"
                        aria-label="Clear run results"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Requests */}
                {isExpanded && (
                  <div className="ml-4 pl-3 border-l border-border/50 mt-0.5 mb-1">
                    {col.requests.map((req, idx) => {
                      const result = results?.find(
                        (r) => r.requestId === req.id,
                      );
                      return (
                        <div
                          key={req.id}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-accent/70 transition-all group/req mb-0.5 cursor-pointer"
                          onClick={() => onOpenRequest(req)}
                        >
                          {/* Run status indicator */}
                          {result && (
                            <span className="shrink-0">
                              {result.status === "running" && (
                                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                              )}
                              {result.status === "success" && (
                                <Check className="h-3 w-3 text-method-get" />
                              )}
                              {result.status === "failed" && (
                                <X className="h-3 w-3 text-method-delete" />
                              )}
                              {result.status === "pending" && (
                                <Clock className="h-3 w-3 text-muted-foreground/30" />
                              )}
                            </span>
                          )}
                          <span
                            className={`text-[9px] font-extrabold shrink-0 min-w-[32px] ${getMethodColor(req.method)}`}
                          >
                            {req.method}
                          </span>
                          <span className="text-[10px] font-mono font-medium truncate text-foreground/80 group-hover/req:text-foreground flex-1 transition-colors">
                            {req.name || req.url || "Untitled"}
                          </span>
                          {/* Run result details */}
                          {result &&
                            result.status !== "pending" &&
                            result.status !== "running" && (
                              <span className="text-[8px] font-bold text-muted-foreground/40 shrink-0">
                                {result.response?.status || "err"} ·{" "}
                                {result.duration}ms
                              </span>
                            )}
                          {/* Action buttons */}
                          {isMobile ? (
                            <div
                              className="relative shrink-0"
                              data-menu-dropdown
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMobileReqMenuId(
                                    mobileReqMenuId === req.id ? null : req.id,
                                  );
                                }}
                                className="p-0.5 text-muted-foreground hover:text-foreground rounded"
                                title="More actions"
                                aria-label="More actions"
                              >
                                <EllipsisVertical className="h-3 w-3" />
                              </button>
                              {mobileReqMenuId === req.id && (
                                <div className="absolute right-0 top-full mt-1 z-30 bg-card border border-border rounded-md shadow-lg py-0.5 min-w-[120px]">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      duplicateRequest(col.id, req);
                                      setMobileReqMenuId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-[9px] font-bold text-foreground/80 hover:bg-accent flex items-center gap-2"
                                  >
                                    <Copy className="h-2.5 w-2.5" /> Duplicate
                                  </button>
                                  {idx > 0 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        moveRequest(col.id, idx, -1);
                                        setMobileReqMenuId(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 text-[9px] font-bold text-foreground/80 hover:bg-accent flex items-center gap-2"
                                    >
                                      <ArrowUp className="h-2.5 w-2.5" /> Move
                                      up
                                    </button>
                                  )}
                                  {idx < col.requests.length - 1 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        moveRequest(col.id, idx, 1);
                                        setMobileReqMenuId(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 text-[9px] font-bold text-foreground/80 hover:bg-accent flex items-center gap-2"
                                    >
                                      <ArrowDown className="h-2.5 w-2.5" /> Move
                                      down
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeRequest(col.id, req.id);
                                      setMobileReqMenuId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-[9px] font-bold text-destructive hover:bg-accent flex items-center gap-2"
                                  >
                                    <Trash2 className="h-2.5 w-2.5" /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-0 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  duplicateRequest(col.id, req);
                                }}
                                className="p-0.5 text-muted-foreground hover:text-foreground"
                                title="Duplicate request"
                                aria-label="Duplicate request"
                              >
                                <Copy className="h-2.5 w-2.5" />
                              </button>
                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveRequest(col.id, idx, -1);
                                  }}
                                  className="p-0.5 text-muted-foreground hover:text-foreground"
                                  title="Move up"
                                  aria-label="Move request up"
                                >
                                  <ArrowUp className="h-2.5 w-2.5" />
                                </button>
                              )}
                              {idx < col.requests.length - 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveRequest(col.id, idx, 1);
                                  }}
                                  className="p-0.5 text-muted-foreground hover:text-foreground"
                                  title="Move down"
                                  aria-label="Move request down"
                                >
                                  <ArrowDown className="h-2.5 w-2.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeRequest(col.id, req.id);
                                }}
                                className="p-0.5 text-muted-foreground hover:text-destructive"
                                title="Delete request"
                                aria-label="Delete request"
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {col.requests.length === 0 && (
                      <p className="text-[9px] text-muted-foreground/25 py-2 px-2.5 font-medium italic">
                        No requests
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {collections.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <FolderPlus className="h-6 w-6 text-muted-foreground/15" />
            <p className="text-[10px] text-muted-foreground/30 font-bold">
              No collections
            </p>
            <button
              onClick={addCollection}
              className="text-[9px] font-bold text-primary hover:text-primary/80 transition-colors px-3 py-1 rounded-full bg-primary/10 hover:bg-primary/15"
            >
              Create one
            </button>
          </div>
        )}

        {collections.length > 0 &&
          filteredCollections.length === 0 &&
          searchQuery && (
            <div className="flex flex-col items-center justify-center py-8 gap-1">
              <Search className="h-5 w-5 text-muted-foreground/15" />
              <p className="text-[10px] text-muted-foreground/30 font-bold">
                No matches
              </p>
            </div>
          )}
      </div>

      {/* Hidden file input for import */}
      <input
        ref={importRef}
        type="file"
        accept=".json"
        className="hidden"
        aria-label="Import collection file"
        onChange={handleImportFile}
      />
    </div>
  );
}
