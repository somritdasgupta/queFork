import React, { useState, useRef } from "react";
import { parseCurl } from "@/lib/curl-parser";
import type { RequestConfig } from "@/types/api";
import { SyntaxHighlighter } from "./SyntaxHighlighter";
import { CodeEditor } from "./CodeEditor";
import {
  Upload,
  FileText,
  Clipboard,
  X,
  AlertCircle,
  Check,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImport: (request: RequestConfig) => void;
}

export function ImportDialog({ isOpen, onClose, onImport }: Props) {
  const [curlInput, setCurlInput] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImport = () => {
    if (!curlInput.trim()) {
      toast.error("Paste a cURL command");
      return;
    }
    try {
      const req = parseCurl(curlInput);
      onImport(req);
      setCurlInput("");
      setShowPreview(false);
      onClose();
      toast.success("Imported successfully");
    } catch {
      toast.error("Failed to parse cURL command");
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setCurlInput(text);
    } catch {
      toast.error("Unable to read clipboard");
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCurlInput(text);
    };
    reader.readAsText(file);
  };

  // Try to parse for preview
  let parsedPreview: RequestConfig | null = null;
  if (curlInput.trim()) {
    try {
      parsedPreview = parseCurl(curlInput);
    } catch {
      parsedPreview = null;
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl mx-4 bg-card shadow-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface-elevated">
          <div className="flex items-center gap-2">
            <Upload className="h-3.5 w-3.5 text-primary" />
            <h3 className="text-[12px] font-black">Import Request</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            title="Close import dialog"
            aria-label="Close import dialog"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Drop zone + editor area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          className={`relative transition-colors ${dragOver ? "bg-primary/5" : ""}`}
        >
          {/* CodeEditor for cURL input */}
          <div className="relative">
            <CodeEditor
              value={curlInput}
              onChange={(val) => setCurlInput(val)}
              placeholder={`curl -X POST 'https://api.example.com/data' \\\n  -H 'Content-Type: application/json' \\\n  -H 'Authorization: Bearer token123' \\\n  -d '{"key": "value"}'`}
              language="javascript"
              minHeight="200px"
            />
            {/* Action buttons overlay */}
            <div className="absolute top-2 right-2 flex items-center gap-1">
              <button
                onClick={handlePaste}
                className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-muted-foreground hover:text-foreground bg-surface-elevated/90 backdrop-blur-sm border border-border transition-colors"
              >
                <Clipboard className="h-2.5 w-2.5" />
                Paste
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-muted-foreground hover:text-foreground bg-surface-elevated/90 backdrop-blur-sm border border-border transition-colors"
              >
                <FileText className="h-2.5 w-2.5" />
                File
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.sh,.curl,.json"
                className="hidden"
                aria-label="Import request file"
                onChange={(e) =>
                  e.target.files?.[0] && readFile(e.target.files[0])
                }
              />
            </div>
          </div>

          {/* Drag overlay */}
          {dragOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary">
              <div className="text-center">
                <Upload className="h-6 w-6 text-primary mx-auto mb-1" />
                <p className="text-[11px] font-bold text-primary">
                  Drop file here
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Parsed preview */}
        {parsedPreview && (
          <div className="border-t border-border bg-surface-sunken">
            <div className="px-4 py-1.5 border-b border-border">
              <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-wider">
                Preview
              </p>
            </div>
            <div className="px-4 py-2 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-primary">
                  {parsedPreview.method}
                </span>
                <span className="text-[10px] font-mono text-foreground truncate">
                  {parsedPreview.url}
                </span>
              </div>
              {parsedPreview.headers.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-bold text-muted-foreground">
                    {parsedPreview.headers.length} headers
                  </span>
                </div>
              )}
              {parsedPreview.body.raw && (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-bold text-muted-foreground">
                    Body: {parsedPreview.body.type}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Help text */}
        <div className="flex items-center gap-1.5 px-4 py-1.5 text-[9px] text-muted-foreground/30 border-t border-border">
          <AlertCircle className="h-2.5 w-2.5 shrink-0" />
          <span className="font-bold">
            Paste cURL from DevTools, Postman, or Insomnia. Drag & drop .sh/.txt
            files.
          </span>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-2.5 border-t border-border bg-surface-elevated">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!curlInput.trim()}
            className="flex items-center gap-1 px-4 py-1.5 text-[10px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 transition-colors"
          >
            <ArrowRight className="h-3 w-3" />
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
