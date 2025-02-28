import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { toast } from "sonner";
import { ImportSource } from "@/types";
import { cn } from "@/lib/utils";

interface ImportFormProps {
  onClose: () => void;
  onImport: (source: ImportSource, data: string) => Promise<void>;
}

export function ImportForm({ onClose, onImport }: ImportFormProps) {
  const [importUrl, setImportUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportUrl = async () => {
    try {
      if (!importUrl.trim()) {
        toast.error("Please enter a valid URL");
        return;
      }
      await onImport("url", importUrl);
      setImportUrl("");
      onClose();
      toast.success("Collection imported successfully");
    } catch (error) {
      toast.error("Failed to import collection");
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const extension = file.name.split(".").pop()?.toLowerCase();

      let source: ImportSource = "file";
      if (extension === "har") source = "postman";
      else if (extension === "json") {
        if (text.includes('"_type": "hoppscotch"')) source = "hoppscotch";
        else if (text.includes('"_postman_id"')) source = "postman";
        else if (text.includes('"openapi"')) source = "openapi";
      }

      await onImport(source, text);
      toast.success("Collection imported successfully");
    } catch (error) {
      toast.error("Failed to import collection");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      let isValidData = false;
      try {
        const parsed = JSON.parse(text);
        isValidData =
          parsed.info?.schema?.includes("postman") ||
          parsed._type === "hoppscotch" ||
          parsed.openapi ||
          parsed.swagger ||
          Array.isArray(parsed) ||
          (parsed.requests && Array.isArray(parsed.requests));
      } catch (e) {
        throw new Error("Invalid JSON format");
      }

      if (!isValidData) {
        throw new Error("Unsupported collection format");
      }

      await onImport("clipboard", text);
      toast.success("Collection imported successfully");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to import from clipboard");
    }
  };

  return (
    <div className="p-4 bg-slate-900/50 border-b border-slate-700">
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-slate-300">
            Import Collection
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 w-7 p-0 hover:bg-slate-900/25"
          >
            <X className="h-4 w-4 text-slate-400" />
          </Button>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">
              Import from URL
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter URL (Postman, OpenAPI, etc.)"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                className="h-8 bg-slate-900/25 border-slate-700 text-sm"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleImportUrl}
                disabled={!importUrl.trim()}
                className={cn(
                  "h-8 px-3 bg-slate-900/25 hover:bg-slate-700 border border-slate-700",
                  "text-slate-300 hover:text-slate-200 transition-colors",
                  !importUrl.trim() && "opacity-50"
                )}
              >
                Import
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">
              Import from file
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json,.har,.yaml,.yml"
              className="hidden"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-8 bg-slate-900/25 hover:bg-slate-700 text-slate-300 hover:text-slate-200 border border-slate-700"
            >
              Choose File
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">
              Import from clipboard
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePaste}
              className="w-full h-8 bg-slate-900/25 hover:bg-slate-700 text-slate-300 hover:text-slate-200 border border-slate-700"
            >
              Paste from Clipboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
