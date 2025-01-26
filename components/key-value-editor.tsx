import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Trash2,
  Key,
  Type,
  AlignLeft,
  Copy,
  GripVertical,
  FileText,
  Eye,
  EyeOff,
  ListPlus,
  List,
  MoreVertical,
} from "lucide-react";
import { KeyValuePair } from "@/types";
import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface KeyValueEditorProps {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  addButtonText?: string;
  showDescription?: boolean;
  presetKeys?: string[];
  requireUniqueKeys?: boolean;
}

// SortableItem component for drag-and-drop
function SortableItem({ pair, index, ...props }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: pair.id || index });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="group flex items-start gap-2 relative">
        <button
          className="absolute -left-8 top-3 opacity-70 hover:opacity-100 cursor-grab active:cursor-grabbing"
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-slate-400" />
        </button>
        {props.children}
      </div>
    </div>
  );
}

export function KeyValueEditor({
  pairs,
  onChange,
  addButtonText = "Add Item",
  showDescription = false,
  presetKeys = [],
  requireUniqueKeys = false,
}: KeyValueEditorProps) {
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkContent, setBulkContent] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Setup DndKit sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const addPair = () => {
    const newPair = {
      id: `pair-${Date.now()}`,
      key: "",
      value: "",
      description: "",
      enabled: true,
      type: "",
      showSecrets: false,
    };
    onChange([...pairs, newPair]);
  };

  // Modify the removePair function to prevent deletion of last pair
  const removePair = (index: number) => {
    if (pairs.length <= 1) {
      // If it's the last pair, just clearing its values instead of removing
      const clearedPair = {
        ...pairs[0],
        key: "",
        value: "",
        description: "",
        enabled: true,
      };
      onChange([clearedPair]);
      return;
    }

    const newPairs = [...pairs];
    newPairs.splice(index, 1);
    onChange(newPairs);
  };

  const updatePair = (
    index: number,
    field: keyof KeyValuePair,
    value: string | boolean
  ) => {
    const newPairs = [...pairs];

    if (field === "key" && requireUniqueKeys && typeof value === "string") {
      const isDuplicate = pairs.some((p, i) => i !== index && p.key === value);
      if (isDuplicate) {
        toast.error("Duplicate keys are not allowed");
        return;
      }
    }

    newPairs[index] = { ...newPairs[index], [field]: value };
    onChange(newPairs);
  };

  const copyValue = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard");
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = pairs.findIndex((p) => p.id === active.id);
      const newIndex = pairs.findIndex((p) => p.id === over.id);

      // Create new array with reordered items
      const reorderedPairs = arrayMove([...pairs], oldIndex, newIndex).map(
        (pair, index) => ({
          ...pair,
          // Ensure each pair has a stable ID
          id: pair.id || `pair-${Date.now()}-${index}`,
        })
      );

      // Update parent component with new order
      onChange(reorderedPairs);
    }
  };

  // Ensure each pair has an ID when rendered
  const pairsWithIds = pairs.map((pair, index) => ({
    ...pair,
    id: pair.id || `pair-${Date.now()}-${index}`,
  }));

  // Modify handleBulkEdit to ensure at least one pair exists
  const handleBulkEdit = () => {
    const newPairs = bulkContent
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const isDisabled = line.startsWith("#");
        const cleanLine = isDisabled ? line.slice(1) : line;
        const [key, ...valueParts] = cleanLine.split(":");
        const value = valueParts.join(":").trim();

        return {
          id: `pair-${Date.now()}-${Math.random()}`,
          key: key?.trim() || "",
          value: value || "",
          description: "",
          enabled: !isDisabled,
          type: "",
          showSecrets: false,
        };
      })
      .filter((pair) => pair.key); // Filter out invalid entries

    // If no valid pairs were found, create a default empty pair
    if (newPairs.length === 0) {
      newPairs.push({
        id: `pair-${Date.now()}-${Math.random()}`,
        key: "",
        value: "",
        description: "",
        enabled: true,
        type: "",
        showSecrets: false,
      });
    }

    if (requireUniqueKeys) {
      const keys = new Set();
      const duplicates = newPairs.some((pair) => {
        if (keys.has(pair.key)) return true;
        keys.add(pair.key);
        return false;
      });

      if (duplicates) {
        toast.error("Duplicate keys found in bulk edit");
        return;
      }
    }

    onChange(newPairs);
    setIsBulkMode(false);
    toast.success("Bulk edit applied");
  };

  // Improve smart paste handler
  const handleSmartPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    index: number,
    field: "key" | "value"
  ) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text").trim();

    // Check if text contains a colon (potential key-value pair)
    if (pastedText.includes(":")) {
      const [key, ...valueParts] = pastedText.split(":");
      const value = valueParts.join(":").trim();

      if (key && value) {
        const newPairs = [...pairs];
        // Always update both fields regardless of paste target
        newPairs[index] = {
          ...newPairs[index],
          key: key.trim(),
          value: value,
        };
        onChange(newPairs);
        toast.success("Pasted key-value pair");
        return;
      }
    }

    // If no colon or invalid format, just update the current field
    updatePair(index, field, pastedText);
    toast.success(`Pasted as ${field}`);
  };

  // Improve copy feedback
  const handleSmartCopy = (index: number) => {
    const pair = pairs[index];
    const copyFormat = `${pair.key}: ${pair.value}`;
    navigator.clipboard.writeText(copyFormat).then(() => {
      toast.success("Copied key-value pair to clipboard", {
        description: copyFormat,
      });
    });
  };

  const toggleBulkMode = () => {
    if (isBulkMode) {
      handleBulkEdit();
    } else {
      // Only add colon if there's actual content
      const content = pairs
        .map((pair) => {
          const prefix = pair.enabled ? "" : "#";
          const key = pair.key.trim();
          const value = pair.value.trim();
          if (!key && !value) return "";
          return `${prefix}${key}${key || value ? ": " : ""}${value}`;
        })
        .filter(Boolean)
        .join("\n");
      setBulkContent(content);
    }
    setIsBulkMode(!isBulkMode);
  };

  const renderItemActions = (pair: KeyValuePair, index: number) => {
    return (
      <>
        {/* Desktop Actions - Hidden on mobile */}
        <div className="hidden sm:flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSmartCopy(index)}
            className="h-9 px-3 rounded-lg border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => updatePair(index, "enabled", !pair.enabled)}
            className={cn(
              "h-9 w-9 rounded-lg border-2 transition-colors",
              pair.enabled
                ? "border-slate-200 bg-slate-50 hover:bg-slate-100"
                : "border-slate-300 bg-slate-100/50 text-slate-400"
            )}
          >
            {pair.enabled ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
          </Button>
          {pairs.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removePair(index)}
              className="h-9 w-9 rounded-lg border-2 border-slate-200 hover:border-red-200 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Mobile Actions - Only shown on mobile */}
        <div className="sm:hidden">
          {isMounted && ( // Prevent hydration mismatch
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg border-2 border-slate-200 bg-slate-50 hover:bg-slate-100"
                >
                  <MoreVertical className="h-4 w-4 text-slate-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 p-1.5 border-2 border-slate-200 bg-slate-50"
              >
                <div className="space-y-1">
                  {/* Copy Options Group */}
                  <div className="space-y-1">
                    <DropdownMenuItem
                      onClick={() => handleSmartCopy(index)}
                      className="flex items-center px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5 mr-2" />
                      Copy as Key: Value
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => copyValue(pair.key)}
                      className="flex items-center px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
                    >
                      <Key className="h-3.5 w-3.5 mr-2" />
                      Copy Key
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => copyValue(pair.value)}
                      className="flex items-center px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
                    >
                      <Type className="h-3.5 w-3.5 mr-2" />
                      Copy Value
                    </DropdownMenuItem>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-slate-200 my-1" />

                  {/* Toggle and Delete Group */}
                  <div className="space-y-1">
                    <DropdownMenuItem
                      onClick={() =>
                        updatePair(index, "enabled", !pair.enabled)
                      }
                      className="flex items-center px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
                    >
                      {pair.enabled ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5 mr-2" />
                          Disable Item
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5 mr-2" />
                          Enable Item
                        </>
                      )}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => removePair(index)}
                      disabled={pairs.length === 1}
                      className={cn(
                        "flex items-center px-2 py-1.5 text-xs rounded-md cursor-pointer",
                        pairs.length === 1
                          ? "text-slate-400 hover:bg-transparent cursor-not-allowed"
                          : "text-red-600 hover:bg-red-50"
                      )}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      {pairs.length === 1 ? "Cannot Delete" : "Delete Item"}
                    </DropdownMenuItem>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </>
    );
  };

  // Add responsive icon classes
  const fieldIconClasses =
    "absolute left-2.5 top-3 h-4 w-4 text-slate-400 hidden sm:block";
  const inputClasses = (isMobile: boolean) =>
    cn(
      "bg-slate-50 border-2 border-slate-200 rounded-lg text-xs transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-slate-900",
      isMobile ? "pl-3" : "pl-9"
    );

  return (
    <div className="space-y-4">
      <ScrollArea className="h-auto max-h-[210px] overflow-y-auto">
        {isBulkMode ? (
          <Textarea
            value={bulkContent}
            onChange={(e) => setBulkContent(e.target.value)}
            placeholder="# Format: key: value
# Examples:
api_key: your-key-here
base_url: https://api.example.com
#disabled_key: this is disabled

# Paste copied pairs here"
            className="min-h-[200px] w-full font-mono text-xs bg-slate-50 border-2 border-slate-200 whitespace-pre-wrap break-words overflow-x-hidden"
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={pairsWithIds.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3 pl-8">
                {pairsWithIds.map((pair, index) => (
                  <SortableItem key={pair.id} pair={pair} index={index}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSmartCopy(index)}
                      className="absolute -left-14 top-3 h-6 w-6 opacity-70 hover:opacity-100 hidden sm:flex"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <div
                      className={cn(
                        "grid flex-1 gap-3",
                        showDescription
                          ? "grid-cols-[1fr_1fr_1fr]"
                          : "grid-cols-[1fr_1fr]",
                        !pair.enabled && "opacity-50"
                      )}
                    >
                      <div className="relative">
                        <Key className={fieldIconClasses} />
                        <Input
                          placeholder="Key"
                          value={pair.key}
                          onChange={(e) =>
                            updatePair(index, "key", e.target.value)
                          }
                          onPaste={(e) => handleSmartPaste(e, index, "key")}
                          className={inputClasses(
                            typeof window !== "undefined" &&
                              window.innerWidth < 640
                          )}
                        />
                      </div>
                      <div className="relative">
                        <Type className={fieldIconClasses} />
                        <Input
                          placeholder="Value"
                          value={pair.value}
                          onChange={(e) =>
                            updatePair(index, "value", e.target.value)
                          }
                          onPaste={(e) => handleSmartPaste(e, index, "value")}
                          className={inputClasses(
                            typeof window !== "undefined" &&
                              window.innerWidth < 640
                          )}
                        />
                      </div>
                      {showDescription && (
                        <div className="relative">
                          <AlignLeft className={fieldIconClasses} />
                          <Input
                            placeholder="Description"
                            value={pair.description || ""}
                            onChange={(e) =>
                              updatePair(index, "description", e.target.value)
                            }
                            className={inputClasses(
                              typeof window !== "undefined" &&
                                window.innerWidth < 640
                            )}
                          />
                        </div>
                      )}
                    </div>
                    {renderItemActions(pair, index)}
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </ScrollArea>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={addPair}
          className="flex-1 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-300 font-medium rounded-lg h-10 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {pairs.length === 0 ? "Add First Item" : addButtonText}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleBulkMode}
          className={cn(
            "h-10 w-32 rounded-lg transition-colors flex items-center justify-center",
            isBulkMode
              ? "bg-emerald-900/10 text-emerald-600 border-emerald-200 hover:bg-emerald-900/20"
              : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
          )}
        >
          {isBulkMode ? (
            <>
              <List className="h-4 w-4" />
              <span className="text-xs">
                ({bulkContent.split("\n").filter((line) => line.trim()).length})
              </span>
            </>
          ) : (
            <>
              <ListPlus className="h-4 w-4" />
              <span className="text-xs">({pairs.length})</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
