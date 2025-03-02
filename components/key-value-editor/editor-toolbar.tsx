import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  List,
  ListPlus,
  CheckCircle2,
  XCircle,
  MinusCircle,
  PlusCircle,
  CopyX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { STYLES } from "./constants";

interface EditorToolbarProps {
  isBulkMode: boolean;
  pairsCount: number;
  onAddPair: () => void;
  onBulkEdit: () => void;
  onBulkAdd: (count: number) => void;
  addButtonText: string;
  onPurge: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  isBulkMode,
  pairsCount,
  onAddPair,
  onBulkEdit,
  onBulkAdd,
  addButtonText,
  onPurge,
}) => {
  const [isAddingMultiple, setIsAddingMultiple] = useState(false);
  const [fieldCount, setFieldCount] = useState("");

  const handleIncrement = () => {
    const current = parseInt(fieldCount) || 0;
    if (current < 50) {
      setFieldCount((current + 1).toString());
    }
  };

  const handleDecrement = () => {
    const current = parseInt(fieldCount) || 0;
    if (current > 1) {
      setFieldCount((current - 1).toString());
    }
  };

  const handleBulkAdd = (count: number) => {
    // Ensure at least one item is added
    const validCount = Math.max(1, count);
    onBulkAdd(validCount);
  };

  return (
    <div className="flex-none flex border-y border-slate-800 bg-slate-900/90 backdrop-blur-sm divide-x divide-slate-800">
      <Button
        variant="ghost"
        onClick={onPurge}
        className={cn(
          STYLES.button.common,
          "w-8 justify-center",
          "border-slate-800 hover:border-red-600/40",
          "text-blue-400 hover:text-red-400"
        )}
        title="Purge all items"
      >
        <CopyX className="h-4 w-4" />
      </Button>

      <div
        className={cn(
          "flex-1 h-8 rounded-none",
          "bg-slate-900/50 border-slate-800",
          "transition-all flex items-center justify-between px-2 gap-2",
          "hover:border-slate-600",
          isBulkMode && "opacity-50 pointer-events-none"
        )}
      >
        {isAddingMultiple ? (
          <div className="flex items-center justify-center w-full gap-2 animate-in slide-in-from-left-5">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsAddingMultiple(false);
                setFieldCount("");
              }}
              className={STYLES.button.icon}
            >
              <XCircle className="h-4 w-4 text-red-400" />
            </Button>
            <div className="relative flex items-center">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDecrement}
                className={`absolute left-0 ${STYLES.button.icon} z-10`}
              >
                <MinusCircle className="h-4 w-4 text-slate-500" />
              </Button>

              <Input
                type="number"
                min="1"
                max="50"
                value={fieldCount || 1}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 0 && val <= 50) {
                    setFieldCount(e.target.value);
                  }
                }}
                className={cn(
                  STYLES.input.toolbar,
                  "w-20 text-center pl-6 pr-6",
                  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                )}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const count = parseInt(fieldCount || "1");
                    if (count > 0 && count <= 50) {
                      handleBulkAdd(count);
                      setIsAddingMultiple(false);
                    } else {
                      toast.error("Please enter a number between 1 and 50");
                    }
                  } else if (e.key === "Escape") {
                    setIsAddingMultiple(false);
                    setFieldCount("1");
                  }
                }}
              />

              <Button
                size="sm"
                variant="ghost"
                onClick={handleIncrement}
                className={`absolute right-0 ${STYLES.button.icon} z-10`}
              >
                <PlusCircle className="h-4 w-4 text-slate-500" />
              </Button>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const count = parseInt(fieldCount || "1");
                if (count > 0 && count <= 50) {
                  handleBulkAdd(count);
                  setIsAddingMultiple(false);
                } else {
                  toast.error("Please enter a number between 1 and 50");
                }
              }}
              className={STYLES.button.icon}
            >
              <CheckCircle2 className="h-4 w-4 text-blue-400" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => !isBulkMode && !isAddingMultiple && onAddPair()}
              disabled={isBulkMode}
              className={cn(
                "flex items-center gap-2 transition-colors",
                !isBulkMode
                  ? "hover:text-blue-300 text-blue-400"
                  : "text-slate-500 cursor-not-allowed"
              )}
            >
              <Plus
                className={cn(
                  "h-4 w-4 transition-transform",
                  !isBulkMode && "group-hover:scale-110"
                )}
              />
              <span className="text-xs font-medium">
                {pairsCount === 0 ? "Add First Item" : addButtonText}
              </span>
            </button>
            <Badge
              variant="secondary"
              onClick={() => {
                if (!isBulkMode) {
                  setIsAddingMultiple(true);
                }
              }}
              className={cn(
                "text-[10px] py-0 h-4 bg-slate-800 text-blue-400",
                "transition-colors border border-slate-600/50",
                !isBulkMode &&
                  "cursor-pointer hover:bg-slate-600 hover:border-slate-600",
                isBulkMode && "opacity-50 cursor-not-allowed"
              )}
            >
              {pairsCount}
            </Badge>
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        onClick={onBulkEdit}
        className={cn(
          STYLES.button.common,
          "justify-center gap-2",
          "hidden sm:flex w-[132px]",
          "border-slate-800 hover:border-slate-600",
          "group",
          isBulkMode ? "text-yellow-400" : "text-blue-400"
        )}
      >
        {isBulkMode ? (
          <>
            <List className="h-4 w-4 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium">Exit Bulk</span>
          </>
        ) : (
          <>
            <ListPlus className="h-4 w-4 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium">Bulk Edit</span>
          </>
        )}
      </Button>

      <Button
        variant="ghost"
        onClick={onBulkEdit}
        className={cn(
          STYLES.button.common,
          "w-8 justify-center",
          "sm:hidden border-slate-800 hover:border-slate-600",
          "group",
          isBulkMode ? "text-yellow-400" : "text-blue-400"
        )}
      >
        {isBulkMode ? (
          <List className="h-4 w-4 group-hover:scale-110 transition-transform" />
        ) : (
          <ListPlus className="h-4 w-4 group-hover:scale-110 transition-transform" />
        )}
      </Button>
    </div>
  );
};
