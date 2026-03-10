import React, { useState, useRef } from "react";
import {
  Plus,
  Trash2,
  Copy,
  CopyPlus,
  ClipboardPaste,
  CircleCheck,
  Circle,
  Eye,
  EyeOff,
  Hash,
  GripVertical,
} from "lucide-react";
import type { KeyValuePair } from "@/types/api";
import { CodeEditor } from "@/components/CodeEditor";
import { toast } from "sonner";

interface Props {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  showDescription?: boolean;
  compact?: boolean;
}

export function KeyValueEditor({
  pairs,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
  showDescription = true,
  compact = false,
}: Props) {
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [maskedValues, setMaskedValues] = useState<Set<string>>(new Set());
  const [encodedValues, setEncodedValues] = useState<Set<string>>(new Set());
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const add = () => {
    onChange([
      ...pairs,
      {
        id: crypto.randomUUID(),
        key: "",
        value: "",
        description: "",
        enabled: true,
      },
    ]);
  };

  React.useEffect(() => {
    if (pairs.length === 0) {
      onChange([
        {
          id: crypto.randomUUID(),
          key: "",
          value: "",
          description: "",
          enabled: true,
        },
      ]);
    }
  }, [pairs.length, onChange]);

  const update = (id: string, field: keyof KeyValuePair, val: any) => {
    onChange(pairs.map((p) => (p.id === id ? { ...p, [field]: val } : p)));
  };

  const remove = (id: string) => {
    if (pairs.length <= 1) return;
    onChange(pairs.filter((p) => p.id !== id));
  };

  const duplicate = (pair: KeyValuePair) => {
    const newPair = { ...pair, id: crypto.randomUUID() };
    const idx = pairs.findIndex((p) => p.id === pair.id);
    const next = [...pairs];
    next.splice(idx + 1, 0, newPair);
    onChange(next);
  };

  const copyPair = (pair: KeyValuePair) => {
    navigator.clipboard.writeText(`${pair.key}: ${pair.value}`);
    toast.success("Copied");
  };

  const toggleMask = (id: string) => {
    setMaskedValues((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleEncode = (id: string) => {
    const pair = pairs.find((p) => p.id === id);
    if (!pair) return;
    if (encodedValues.has(id)) {
      try {
        update(id, "value", decodeURIComponent(pair.value));
        setEncodedValues((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
        toast.success("Decoded");
      } catch {
        toast.error("Failed to decode");
      }
    } else {
      update(id, "value", encodeURIComponent(pair.value));
      setEncodedValues((prev) => {
        const n = new Set(prev);
        n.add(id);
        return n;
      });
      toast.success("URL encoded");
    }
  };

  const toggleAll = (enabled: boolean) => {
    onChange(pairs.map((p) => ({ ...p, enabled })));
  };

  const clearAll = () => {
    onChange([
      {
        id: crypto.randomUUID(),
        key: "",
        value: "",
        description: "",
        enabled: true,
      },
    ]);
    toast.success("Cleared all");
  };

  const copyAllAsCurl = () => {
    const headerStr = pairs
      .filter((p) => p.enabled && p.key)
      .map((p) => `-H '${p.key}: ${p.value}'`)
      .join(" ");
    navigator.clipboard.writeText(headerStr);
    toast.success("Copied as cURL headers");
  };

  const copyAllAsJson = () => {
    const obj: Record<string, string> = {};
    pairs
      .filter((p) => p.enabled && p.key)
      .forEach((p) => {
        obj[p.key] = p.value;
      });
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    toast.success("Copied as JSON");
  };

  const handleBulkImport = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.trim().split("\n");
    const newPairs: KeyValuePair[] = lines
      .map((line) => {
        const sep = line.indexOf(":") !== -1 ? ":" : "=";
        const idx = line.indexOf(sep);
        if (idx === -1) return null;
        return {
          id: crypto.randomUUID(),
          key: line.slice(0, idx).trim(),
          value: line.slice(idx + 1).trim(),
          description: "",
          enabled: true,
        };
      })
      .filter(Boolean) as KeyValuePair[];
    onChange([...pairs, ...newPairs]);
    setBulkText("");
    setShowBulkImport(false);
    toast.success(`Imported ${newPairs.length} pairs`);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    // Make the drag image slightly transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
    }
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIdx(idx);
  };

  const handleDragLeave = () => {
    setDragOverIdx(null);
  };

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIdx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const next = [...pairs];
    const [dragged] = next.splice(dragIdx, 1);
    next.splice(dropIdx, 0, dragged);
    onChange(next);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const activeCount = pairs.filter((p) => p.enabled && p.key).length;

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-0 border-b border-border bg-surface-sunken">
        <button
          onClick={add}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border-r border-border"
          title="Add row"
        >
          <Plus className="h-3 w-3" />
        </button>
        <button
          onClick={() => setShowBulkImport(!showBulkImport)}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold transition-colors border-r border-border ${showBulkImport ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
          title="Bulk Import"
        >
          <ClipboardPaste className="h-3 w-3" />
        </button>
        <button
          onClick={() => toggleAll(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border-r border-border"
          title="Enable All"
        >
          <CircleCheck className="h-3 w-3" />
        </button>
        <button
          onClick={() => toggleAll(false)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border-r border-border"
          title="Disable All"
        >
          <Circle className="h-3 w-3" />
        </button>
        <button
          onClick={clearAll}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-destructive hover:bg-accent transition-colors border-r border-border"
          title="Clear All"
        >
          <Trash2 className="h-3 w-3" />
        </button>
        <div className="flex-1" />
        <button
          onClick={copyAllAsJson}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[9px] font-bold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border-l border-border"
          title="Copy all as JSON"
        >
          JSON
        </button>
        <button
          onClick={copyAllAsCurl}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[9px] font-bold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border-l border-border"
          title="Copy all as cURL headers"
        >
          cURL
        </button>
        {activeCount > 0 && (
          <span className="px-2 text-[9px] font-extrabold text-primary border-l border-border py-1.5">
            {activeCount}
          </span>
        )}
      </div>

      {/* Bulk import area */}
      {showBulkImport && (
        <div className="border-b border-border flex flex-col">
          <div className="px-3 py-1.5 border-b border-border bg-surface-sunken shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Bulk Import
            </span>
          </div>
          <div className="relative flex-1 bg-surface-sunken">
            <CodeEditor
              value={bulkText}
              onChange={setBulkText}
              placeholder={
                "Key: Value\nContent-Type: application/json\nX-Custom: value"
              }
              language="text"
              minHeight="100px"
            />
          </div>
          <div className="flex gap-1.5 px-3 py-1.5 bg-surface-sunken border-t border-border">
            <button
              onClick={handleBulkImport}
              className="px-3 py-1 text-[11px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Import
            </button>
            <button
              onClick={() => setShowBulkImport(false)}
              className="px-3 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center border-b border-border bg-surface-sunken text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <div className="w-6 shrink-0" />
        <div className="w-8 shrink-0" />
        <div className="flex-1 px-2 py-1.5 border-r border-border">
          {keyPlaceholder}
        </div>
        <div className="flex-1 px-2 py-1.5 border-r border-border">
          {valuePlaceholder}
        </div>
        {showDescription && !compact && (
          <div className="flex-1 px-2 py-1.5 border-r border-border">
            Description
          </div>
        )}
        <div className="w-[100px] shrink-0 px-2 py-1.5 text-center">
          Actions
        </div>
      </div>

      {/* Rows */}
      {pairs.map((pair, idx) => (
        <div
          key={pair.id}
          draggable
          onDragStart={(e) => handleDragStart(e, idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, idx)}
          onDragEnd={handleDragEnd}
          className={`flex items-center border-b border-border transition-all hover:bg-accent/30 ${!pair.enabled ? "opacity-30 blur-[0.3px]" : ""} ${dragIdx === idx ? "opacity-40" : ""} ${dragOverIdx === idx && dragIdx !== idx ? "border-t-2 border-t-primary" : ""}`}
        >
          {/* Drag handle */}
          <div className="w-6 shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground/20 hover:text-muted-foreground/50 transition-colors">
            <GripVertical className="h-3 w-3" />
          </div>
          <div className="w-8 shrink-0 flex items-center justify-center">
            <button
              onClick={() => update(pair.id, "enabled", !pair.enabled)}
              className={`transition-colors ${pair.enabled ? "text-primary" : "text-muted-foreground/30 hover:text-muted-foreground"}`}
            >
              {pair.enabled ? (
                <CircleCheck className="h-3.5 w-3.5" />
              ) : (
                <Circle className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          <div className="flex-1 border-r border-border">
            <input
              value={pair.key}
              onChange={(e) => update(pair.id, "key", e.target.value)}
              placeholder={keyPlaceholder}
              className="w-full h-8 px-2 text-[12px] font-mono bg-transparent focus:outline-none focus:bg-accent/50 placeholder:text-muted-foreground/20 text-foreground transition-colors"
            />
          </div>
          <div className="flex-1 border-r border-border relative">
            <input
              value={pair.value}
              onChange={(e) => update(pair.id, "value", e.target.value)}
              placeholder={valuePlaceholder}
              type={maskedValues.has(pair.id) ? "password" : "text"}
              className="w-full h-8 px-2 text-[12px] font-mono bg-transparent focus:outline-none focus:bg-accent/50 placeholder:text-muted-foreground/20 text-foreground transition-colors"
            />
          </div>
          {showDescription && !compact && (
            <div className="flex-1 border-r border-border">
              <input
                value={(pair as any).description || ""}
                onChange={(e) =>
                  update(pair.id, "description" as any, e.target.value)
                }
                placeholder="Description"
                className="w-full h-8 px-2 text-[12px] bg-transparent focus:outline-none focus:bg-accent/50 placeholder:text-muted-foreground/20 text-foreground transition-colors"
              />
            </div>
          )}
          <div className="w-[100px] shrink-0 flex items-center justify-center gap-0">
            <button
              onClick={() => toggleMask(pair.id)}
              className={`p-1 transition-colors ${maskedValues.has(pair.id) ? "text-primary" : "text-muted-foreground/40 hover:text-foreground"}`}
              title={maskedValues.has(pair.id) ? "Show" : "Mask"}
            >
              {maskedValues.has(pair.id) ? (
                <EyeOff className="h-2.5 w-2.5" />
              ) : (
                <Eye className="h-2.5 w-2.5" />
              )}
            </button>
            <button
              onClick={() => toggleEncode(pair.id)}
              className={`p-1 transition-colors ${encodedValues.has(pair.id) ? "text-primary" : "text-muted-foreground/40 hover:text-foreground"}`}
              title={encodedValues.has(pair.id) ? "Decode" : "Encode"}
            >
              <Hash className="h-2.5 w-2.5" />
            </button>
            <button
              onClick={() => copyPair(pair)}
              className="p-1 text-muted-foreground/40 hover:text-foreground transition-colors"
              title="Copy"
            >
              <Copy className="h-2.5 w-2.5" />
            </button>
            <button
              onClick={() => duplicate(pair)}
              className="p-1 text-muted-foreground/40 hover:text-foreground transition-colors"
              title="Duplicate"
            >
              <CopyPlus className="h-2.5 w-2.5" />
            </button>
            <button
              onClick={() => remove(pair.id)}
              className={`p-1 transition-colors ${pairs.length <= 1 ? "text-muted-foreground/10 cursor-not-allowed" : "text-muted-foreground/40 hover:text-destructive"}`}
              title="Delete"
              disabled={pairs.length <= 1}
            >
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
