import { Button } from "@/components/ui/button";
import { X, Check } from "lucide-react";

interface DeleteConfirmationProps {
  type: "collection" | "request";
  onCancel: (e: React.MouseEvent) => void;
  onConfirm: (e: React.MouseEvent) => void;
  className?: string;
}

export function DeleteConfirmation({
  type,
  onCancel,
  onConfirm,
  className,
}: DeleteConfirmationProps) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-2 bg-slate-800/50 border-t border-slate-700 ${className}`}
    >
      <span className="text-xs text-slate-400">Delete {type}?</span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-6 w-6 p-0 hover:bg-slate-700/50"
        >
          <X className="h-3.5 w-3.5 text-slate-400" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onConfirm}
          className="h-6 w-6 p-0 hover:bg-slate-700/50"
        >
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        </Button>
      </div>
    </div>
  );
}
