import React, { useState } from "react";
import type { Collection, RequestConfig } from "@/types/api";
import {
  createEmptyCollection,
  createEmptyRequest,
  getMethodColor,
} from "@/types/api";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Pencil,
  FolderPlus,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  collections: Collection[];
  onChange: (collections: Collection[]) => void;
  onOpenRequest: (req: RequestConfig) => void;
}

export function CollectionPanel({
  collections,
  onChange,
  onOpenRequest,
}: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const updateCollectionName = (id: string, name: string) => {
    onChange(collections.map((c) => (c.id === id ? { ...c, name } : c)));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-elevated">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-3.5 w-3.5 text-muted-foreground/50" />
          <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60">
            Collections
          </h3>
        </div>
        <button
          onClick={addCollection}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          title="New collection"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-2 py-1">
          {collections.map((col) => {
            const isExpanded = expandedIds.has(col.id);
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
                  <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => setEditingId(col.id)}
                      className="p-0.5 text-muted-foreground hover:text-foreground rounded"
                      title="Rename"
                    >
                      <Pencil className="h-2.5 w-2.5" />
                    </button>
                    <button
                      onClick={() => addRequestToCollection(col.id)}
                      className="p-0.5 text-muted-foreground hover:text-foreground rounded"
                      title="Add request"
                    >
                      <Plus className="h-2.5 w-2.5" />
                    </button>
                    <button
                      onClick={() => removeCollection(col.id)}
                      className="p-0.5 text-muted-foreground hover:text-destructive rounded"
                      title="Delete"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>

                {/* Requests */}
                {isExpanded && (
                  <div className="ml-4 pl-3 border-l border-border/50 mt-0.5 mb-1">
                    {col.requests.map((req) => (
                      <button
                        key={req.id}
                        onClick={() => onOpenRequest(req)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-accent/70 transition-all text-left group/req mb-0.5"
                      >
                        <span
                          className={`text-[9px] font-extrabold shrink-0 min-w-[32px] ${getMethodColor(req.method)}`}
                        >
                          {req.method}
                        </span>
                        <span className="text-[10px] font-mono font-medium truncate text-foreground/80 group-hover/req:text-foreground flex-1 transition-colors">
                          {req.url || req.name || "Untitled"}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeRequest(col.id, req.id);
                          }}
                          className="p-0.5 opacity-0 group-hover/req:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                          title="Delete request"
                          aria-label="Delete request"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </button>
                    ))}
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
      </div>
    </div>
  );
}
