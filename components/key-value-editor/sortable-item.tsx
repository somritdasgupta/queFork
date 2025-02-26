import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";
import { useStableId } from "./hooks";

interface SortableItemProps {
  pair: {
    id: string;
  };
  index: number;
  children: React.ReactNode;
}

export const SortableItem = React.memo(
  ({ pair, index, children }: SortableItemProps) => {
    const itemId = useStableId("sortable-item", pair.id);
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: pair.id || `${itemId}-${index}`,
      transition: {
        duration: 200,
        easing: "ease",
      },
    });

    const style = {
      transform: transform ? `translate(0px, ${transform.y}px)` : undefined,
      transition,
      zIndex: isDragging ? 1 : 0,
      position: "relative" as const,
      touchAction: "none",
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "transition-shadow pl-8",
          isDragging && "shadow-lg bg-slate-800"
        )}
        {...attributes}
        aria-describedby={itemId}
      >
        <div className="group flex items-start min-w-0 relative">
          <button
            {...listeners}
            className="flex items-center justify-center w-8 h-8 absolute -ml-8 left-0 text-slate-200 opacity-30 group-hover:opacity-100 transition-opacity"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          {children}
        </div>
      </div>
    );
  }
);

SortableItem.displayName = "SortableItem";
