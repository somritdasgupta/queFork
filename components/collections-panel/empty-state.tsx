import { Button } from "@/components/ui/button";
import { FolderOpen, Plus } from "lucide-react";

interface EmptyStateProps {
  onCreateClick: () => void;
}

export function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(75vh)] space-y-4 p-4">
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="p-3 rounded-lg bg-gradient-to-b from-slate-800 to-slate-900/50 ring-1 ring-slate-700/50">
          <FolderOpen className="h-6 w-6 text-slate-400" />
        </div>
        <h3 className="text-sm font-medium text-slate-300">No Collections</h3>
        <p className="text-xs text-slate-500 max-w-[15rem] leading-relaxed">
          Create a collection to organize and save your API requests
        </p>
      </div>

      <div className="flex flex-col gap-2 w-48">
        <Button
          onClick={onCreateClick}
          className="w-full h-8 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs gap-2"
        >
          <Plus className="h-3.5 w-3.5" />
          New Collection
        </Button>
      </div>
    </div>
  );
}
