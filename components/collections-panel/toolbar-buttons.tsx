import { Button } from "@/components/ui/button";
import { Plus, Upload, DownloadIcon } from "lucide-react";

interface ToolbarButtonsProps {
  onCreateClick: () => void;
  onImportClick: () => void;
  onExportClick: () => void;
}

export function ToolbarButtons({
  onCreateClick,
  onImportClick,
  onExportClick,
}: ToolbarButtonsProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={onCreateClick}
        className="h-7 w-7 p-0 hover:bg-slate-800 rounded-md border border-slate-800"
        title="New collection"
      >
        <Plus className="h-3.5 w-3.5 text-emerald-400" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onImportClick}
        className="h-7 w-7 p-0 hover:bg-slate-800 rounded-md border border-slate-800"
        title="Import collection"
      >
        <Upload className="h-3.5 w-3.5 text-yellow-400" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onExportClick}
        className="h-7 w-7 p-0 hover:bg-slate-800 rounded-md border border-slate-800"
        title="Export all collections"
      >
        <DownloadIcon className="h-3.5 w-3.5 text-emerald-400" />
      </Button>
    </div>
  );
}
