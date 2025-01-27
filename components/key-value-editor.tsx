import React, { useState, useCallback, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Trash2,
  Key,
  Type,
  AlignLeft,
  Copy,
  GripVertical,
  Eye,
  EyeOff,
  ListPlus,
  List,
  MoreVertical,
  PackagePlusIcon,
} from "lucide-react";
import { KeyValuePair, Environment } from "@/types";
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
import { CSS, Transform } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const generateStableId = (index: number, existingId?: string) =>
  existingId || `pair-${index}-${Math.random().toString(36).substr(2, 9)}`;

interface KeyValueEditorProps {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  addButtonText?: string;
  showDescription?: boolean;
  presetKeys?: string[];
  requireUniqueKeys?: boolean;
  onAddToEnvironment?: (key: string, value: string) => void;
  environments?: Environment[];
  currentEnvironment?: Environment | null;
  onEnvironmentChange?: (environmentId: string) => void;
  onEnvironmentsUpdate?: (environments: Environment[]) => void;
  isEnvironmentEditor?: boolean;
  preventFirstItemDeletion?: boolean;
  autoSave?: boolean;
}

interface KeyValueInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: React.ElementType;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  className?: string;
}

// Update KeyValueInput component with proper types
const KeyValueInput = React.memo(
  ({
    value,
    onChange,
    placeholder,
    icon: Icon,
    onPaste,
    className,
  }: KeyValueInputProps) => {
    const [localValue, setLocalValue] = useState(value);
    const [isFocused, setIsFocused] = useState(false);
    const changeTimeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
      if (!isFocused) {
        setLocalValue(value);
      }
      return () => {
        if (changeTimeoutRef.current) {
          clearTimeout(changeTimeoutRef.current);
        }
      };
    }, [value, isFocused]);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue);

        if (changeTimeoutRef.current) {
          clearTimeout(changeTimeoutRef.current);
        }

        changeTimeoutRef.current = setTimeout(() => {
          onChange(newValue);
        }, 300);
      },
      [onChange]
    );

    return (
      <div className="relative">
        <Icon className="absolute left-2.5 top-2 h-4 w-4 text-slate-500 hidden sm:block" />
        <Input
          value={localValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            onChange(localValue);
          }}
          onPaste={onPaste}
          placeholder={placeholder}
          className={cn(
            "h-8 bg-slate-900 border-slate-700 text-slate-300 placeholder:text-slate-500",
            "focus:border-slate-600 focus:ring-slate-700",
            "rounded-none text-xs transition-colors",
            typeof window !== "undefined" && window.innerWidth < 640
              ? "pl-3"
              : "pl-9",
            className
          )}
        />
      </div>
    );
  }
);

KeyValueInput.displayName = "KeyValueInput";
const SortableItem = React.memo(
  ({
    pair,
    index,
    children,
  }: {
    pair: KeyValuePair;
    index: number;
    children: React.ReactNode;
  }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: pair.id || index,
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
          "transition-shadow",
          isDragging && "shadow-lg bg-slate-800"
        )}
        {...attributes}
      >
        <div className="group flex items-start min-w-0">
          <button
            {...listeners}
            className="flex items-center justify-center w-8 h-8 -ml-8 text-slate-200 opacity-50 group-hover:opacity-100 transition-opacity"
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

const restrictToVerticalAxis = {
  modifiers: [
    ({ transform }: { transform: Transform }) => ({
      ...transform,
      x: 0,
    }),
  ],
};

export function KeyValueEditor({
  pairs = [],
  onChange,
  addButtonText = "Add Item",
  showDescription = false,
  presetKeys = [],
  requireUniqueKeys = false,
  onAddToEnvironment,
  environments = [],
  currentEnvironment,
  onEnvironmentChange,
  onEnvironmentsUpdate,
  isEnvironmentEditor = false,
  preventFirstItemDeletion = false,
  autoSave = false,
}: KeyValueEditorProps) {
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkContent, setBulkContent] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  // Setup DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance to start
        tolerance: 5, // Tolerance for slight horizontal movement
        delay: 100, // Small delay to prevent accidental drags
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Ensure stable IDs and at least one pair
  useEffect(() => {
    if (pairs.length === 0) {
      onChange([
        {
          id: generateStableId(0),
          key: "",
          value: "",
          description: "",
          enabled: true,
          type: "text",
          showSecrets: false,
        },
      ]);
    } else if (pairs.some((pair) => !pair.id)) {
      onChange(
        pairs.map((pair, index) => ({
          ...pair,
          id: generateStableId(index, pair.id),
        }))
      );
    }
  }, [pairs, onChange]);

  // Core functionality handlers
  const handleAddPair = useCallback(() => {
    // Simply add a new pair with a unique ID while preserving existing pairs
    const newPair = {
      id: generateStableId(pairs.length + Math.random()), // Ensure unique ID
      key: "",
      value: "",
      description: "",
      enabled: true,
      type: "text",
      showSecrets: false,
    };

    // Important: Use spread operator to preserve existing pairs
    onChange([...pairs, newPair]);
  }, [pairs, onChange]);

  const removePair = useCallback(
    (index: number) => {
      if (preventFirstItemDeletion && index === 0) {
        const clearedPair = {
          ...pairs[0],
          key: "",
          value: "",
          description: "",
        };
        onChange([clearedPair, ...pairs.slice(1)]);
        return;
      }

      if (pairs.length <= 1) {
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

      onChange(pairs.filter((_, i) => i !== index));
    },
    [pairs, onChange, preventFirstItemDeletion]
  );

  const updatePair = useCallback(
    (index: number, field: keyof KeyValuePair, value: string | boolean) => {
      const newPairs = pairs.map((pair, i) => {
        if (i === index) {
          // Preserve all existing fields while updating the specified one
          return { ...pair, [field]: value };
        }
        return pair;
      });

      if (field === "key" && requireUniqueKeys && typeof value === "string") {
        const isDuplicate = newPairs.some(
          (p, i) => i !== index && p.key === value && value !== ""
        );
        if (isDuplicate) {
          toast.error("Duplicate keys are not allowed");
          return;
        }
      }

      onChange(newPairs);
      if (autoSave) {
        toast.success("Variable updated");
      }
    },
    [pairs, onChange, requireUniqueKeys, autoSave]
  );

  const handleSmartPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    index: number,
    field: "key" | "value"
  ) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text").trim();

    if (pastedText.includes(":")) {
      const [key, ...valueParts] = pastedText.split(":");
      const value = valueParts.join(":").trim();

      if (key && value) {
        onChange(
          pairs.map((p, i) =>
            i === index ? { ...p, key: key.trim(), value } : p
          )
        );
        toast.success("Pasted key-value pair");
        return;
      }
    }

    updatePair(index, field, pastedText);
    toast.success(`Pasted as ${field}`);
  };

  const handleSmartCopy = (index: number) => {
    const pair = pairs[index];
    const copyFormat = `${pair.key}: ${pair.value}`;
    navigator.clipboard.writeText(copyFormat).then(() => {
      toast.success("Copied key-value pair to clipboard", {
        description: copyFormat,
      });
    });
  };

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
          id: generateStableId(Math.random()),
          key: key?.trim() || "",
          value: value || "",
          description: "",
          enabled: !isDisabled,
          type: "text",
          showSecrets: false,
        };
      });

    if (
      requireUniqueKeys &&
      new Set(newPairs.map((p) => p.key)).size !== newPairs.length
    ) {
      toast.error("Duplicate keys found in bulk edit");
      return;
    }

    onChange(
      newPairs.length > 0
        ? newPairs
        : [
            {
              id: generateStableId(0),
              key: "",
              value: "",
              description: "",
              enabled: true,
              type: "text",
              showSecrets: false,
            },
          ]
    );
    setIsBulkMode(false);
    toast.success("Bulk edit applied");
  };

  const handleAddToEnvironment = (index: number) => {
    const pair = pairs[index];
    if (!pair.key.trim()) {
      toast.error("Please enter a key first");
      return;
    }

    onAddToEnvironment?.(pair.key, pair.value);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = pairs.findIndex((p) => p.id === active.id);
      const newIndex = pairs.findIndex((p) => p.id === over.id);

      // Ensure valid indices before updating
      if (oldIndex !== -1 && newIndex !== -1) {
        const updatedPairs = arrayMove([...pairs], oldIndex, newIndex);
        onChange(updatedPairs);
      }
    }
  };

  const renderItemActions = (pair: KeyValuePair, index: number) => {
    return (
      <>
        {/* Desktop Actions - Hidden on mobile */}
        <div className="hidden sm:flex border-l border-slate-700">
          <Button
        variant="ghost"
        size="icon"
        onClick={() => handleSmartCopy(index)}
        className="h-8 w-8 rounded-none border-y border-r border-slate-700 bg-slate-900 hover:bg-slate-800"
          >
        <Copy className="h-4 w-4 text-blue-400" />
          </Button>
          <Button
        variant="ghost"
        size="icon"
        onClick={() => updatePair(index, "enabled", !pair.enabled)}
        className={cn(
          "h-8 w-8 rounded-none border-y border-r border-slate-700",
          pair.enabled ? "bg-slate-900 hover:bg-slate-800" : "bg-slate-800"
        )}
          >
        {pair.enabled ? (
          <Eye className="h-4 w-4 text-emerald-400" />
        ) : (
          <EyeOff className="h-4 w-4 text-slate-500" />
        )}
          </Button>
          {pairs.length > 1 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => removePair(index)}
          className="h-8 w-8 rounded-none border-y border-r border-slate-700 bg-slate-900 hover:bg-slate-800"
        >
          <Trash2 className="h-4 w-4 text-red-400" />
        </Button>
          )}
          {!isEnvironmentEditor && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleAddToEnvironment(index)}
          className="h-8 w-8 rounded-none border-y border-r border-slate-700 bg-slate-900 hover:bg-slate-800"
        >
          <PackagePlusIcon className="h-4 w-4 text-purple-400" />
        </Button>
          )}
        </div>

        {/* Mobile Actions */}
        {isMounted && (
          <div className="sm:hidden border-l border-slate-700">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-none border-y border-r border-slate-700 bg-slate-900 hover:bg-slate-800"
            >
          <MoreVertical className="h-4 w-4 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
            <DropdownMenuContent
            align="end"
            className="w-[160px] rounded-md bg-slate-800 border-slate-800"
            >
            <div className="flex items-center justify-around p-2">
              <button
              className="hover:opacity-80"
              onClick={() => handleSmartCopy(index)}
              >
              <Copy className="h-4 w-4 text-blue-400" />
              </button>
              <button
              className="hover:opacity-80"
              onClick={() => updatePair(index, "enabled", !pair.enabled)}
              >
              {pair.enabled ? (
                <EyeOff className="h-4 w-4 text-slate-400" />
              ) : (
                <Eye className="h-4 w-4 text-emerald-400" />
              )}
              </button>
              {pairs.length > 1 && (
              <button
                className="hover:opacity-80"
                onClick={() => removePair(index)}
              >
                <Trash2 className="h-4 w-4 text-red-400" />
              </button>
              )}
              {!isEnvironmentEditor && (
              <button
                className="hover:opacity-80"
                onClick={() => handleAddToEnvironment(index)}
              >
                <PackagePlusIcon className="h-4 w-4 text-purple-400" />
              </button>
              )}
            </div>
            </DropdownMenuContent>
          </DropdownMenu>
            </div>
          )}
          </>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="min-h-0 flex-1 relative">
        <ScrollArea className="absolute inset-0">
          <div className="pl-8">
            {" "}
            {/* Add padding for drag handle */}
            {isBulkMode ? (
              <Textarea
                value={bulkContent}
                onChange={(e) => setBulkContent(e.target.value)}
                placeholder={`• Format: key: value\n• Examples:\n  • api_key: your-key-here\n  • base_url: https://api.example.com\n  • disabled_key: this is disabled`}
                className="min-h-[200px] w-full text-xs rounded-none bg-slate-900 border-slate-700 text-slate-300 placeholder:text-slate-500"
              />
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={restrictToVerticalAxis.modifiers}
              >
                <SortableContext
                  items={pairs.map((p) => p.id || `temp-${Math.random()}`)} // Ensure unique IDs
                  strategy={verticalListSortingStrategy}
                >
                  <div className="divide-y divide-slate-700">
                    {pairs.map((pair, index) => (
                      <SortableItem
                        key={pair.id || `temp-${index}`}
                        pair={pair}
                        index={index}
                      >
                        <div className="flex w-full">
                          <div
                            className={cn(
                              "grid flex-1",
                              showDescription
                                ? "grid-cols-[1fr_1fr_1fr]"
                                : "grid-cols-[1fr_1fr]",
                              !pair.enabled && "opacity-50"
                            )}
                          >
                            <KeyValueInput
                              key={`key-${pair.id}-${index}`}
                              value={pair.key}
                              onChange={(value: string) =>
                                updatePair(index, "key", value)
                              }
                              placeholder="Key"
                              icon={Key}
                              onPaste={(e) => handleSmartPaste(e, index, "key")}
                              className="flex-1 bg-slate-950 border-slate-800 text-slate-300 placeholder:text-slate-600 focus:border-slate-700 focus:ring-slate-700"
                            />
                            <KeyValueInput
                              key={`value-${pair.id}-${index}`}
                              value={pair.value}
                              onChange={(value: string) =>
                                updatePair(index, "value", value)
                              }
                              placeholder="Value"
                              icon={Type}
                              onPaste={(e) =>
                                handleSmartPaste(e, index, "value")
                              }
                              className="flex-1 bg-slate-950 border-slate-800 text-slate-300 placeholder:text-slate-600 focus:border-slate-700 focus:ring-slate-700"
                            />
                            {showDescription && (
                              <KeyValueInput
                                key={`desc-${pair.id}-${index}`}
                                value={pair.description || ""}
                                onChange={(value: string) =>
                                  updatePair(index, "description", value)
                                }
                                placeholder="Description"
                                icon={AlignLeft}
                                className="flex-1 bg-slate-950 border-slate-800 text-slate-300 placeholder:text-slate-600 focus:border-slate-700 focus:ring-slate-700"
                              />
                            )}
                          </div>
                          {renderItemActions(pair, index)}
                        </div>
                      </SortableItem>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex border-t border-slate-700">
        <Button
          variant="ghost"
          onClick={handleAddPair}
          className="flex-1 h-8 rounded-none bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-slate-200 border-r border-slate-700"
        >
          <Plus className="h-4 w-4 mr-2 text-emerald-400" />
          {pairs.length === 0 ? "Add First Item" : addButtonText}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (isBulkMode) handleBulkEdit();
            else {
              setBulkContent(
                pairs
                  .map((p) => `${!p.enabled ? "#" : ""}${p.key}: ${p.value}`)
                  .join("\n")
              );
              setIsBulkMode(true);
            }
          }}
          className={cn(
            "h-8 w-8 rounded-none",
            isBulkMode
              ? "bg-blue-900/20 text-blue-400 border-blue-800/30 hover:bg-blue-900/30"
              : "bg-slate-900 text-cyan-400 hover:bg-slate-800 hover:text-cyan-300"
          )}
        >
          {isBulkMode ? (
            <List className="h-4 w-4" />
          ) : (
            <ListPlus className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
