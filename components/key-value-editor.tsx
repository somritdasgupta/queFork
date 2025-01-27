import React, { useState, useCallback, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Trash2, Key, Type, AlignLeft, Copy,
  GripVertical, Eye, EyeOff, ListPlus, List,
  MoreVertical, PackagePlusIcon,
} from "lucide-react";
import { KeyValuePair, Environment } from "@/types";
import { toast } from "sonner";
import {
  DndContext, closestCenter, KeyboardSensor,
  PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Utility function for generating stable IDs
const generateStableId = (index: number, existingId?: string) => 
  existingId || `pair-${index}-${Math.random().toString(36).substr(2, 9)}`;

// Types
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

// Base input component with controlled updates
const KeyValueInput = React.memo(({
  value,
  onChange,
  placeholder,
  icon: Icon,
  onPaste,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: React.ElementType;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  className: string;
}) => {
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

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    if (changeTimeoutRef.current) {
      clearTimeout(changeTimeoutRef.current);
    }
    
    changeTimeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, 300);
  }, [onChange]);

  return (
    <div className="relative">
      <Icon className="absolute left-2.5 top-3 h-4 w-4 text-slate-400 hidden sm:block" />
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
          "bg-slate-50 border-2 border-slate-200 rounded-lg text-xs transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-slate-900",
          typeof window !== "undefined" && window.innerWidth < 640 ? "pl-3" : "pl-9",
          className
        )}
      />
    </div>
  );
});

KeyValueInput.displayName = "KeyValueInput";

// Sortable item component
const SortableItem = React.memo(({ pair, index, children }: {
  pair: KeyValuePair;
  index: number;
  children: React.ReactNode;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ 
    id: pair.id || index 
  });

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
        {children}
      </div>
    </div>
  );
});

SortableItem.displayName = "SortableItem";

// Main KeyValueEditor component
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
    useSensor(PointerSensor),
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
      onChange([{
        id: generateStableId(0),
        key: "",
        value: "",
        description: "",
        enabled: true,
        type: "text",
        showSecrets: false,
      }]);
    } else if (pairs.some(pair => !pair.id)) {
      onChange(pairs.map((pair, index) => ({
        ...pair,
        id: generateStableId(index, pair.id),
      })));
    }
  }, [pairs, onChange]);

  // Core functionality handlers
  const handleAddPair = useCallback(() => {
    // Simply add a new pair with a unique ID while preserving existing pairs
    const newPair = {
      id: generateStableId(pairs.length + Math.random()),  // Ensure unique ID
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

  const removePair = useCallback((index: number) => {
    if (preventFirstItemDeletion && index === 0) {
      const clearedPair = { ...pairs[0], key: "", value: "", description: "" };
      onChange([clearedPair, ...pairs.slice(1)]);
      return;
    }

    if (pairs.length <= 1) {
      const clearedPair = { ...pairs[0], key: "", value: "", description: "", enabled: true };
      onChange([clearedPair]);
      return;
    }

    onChange(pairs.filter((_, i) => i !== index));
  }, [pairs, onChange, preventFirstItemDeletion]);

  const updatePair = useCallback((index: number, field: keyof KeyValuePair, value: string | boolean) => {
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
  }, [pairs, onChange, requireUniqueKeys, autoSave]);

  const handleSmartPaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number, field: "key" | "value") => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text").trim();

    if (pastedText.includes(":")) {
      const [key, ...valueParts] = pastedText.split(":");
      const value = valueParts.join(":").trim();

      if (key && value) {
        onChange(pairs.map((p, i) => 
          i === index ? { ...p, key: key.trim(), value } : p
        ));
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

    if (requireUniqueKeys && new Set(newPairs.map(p => p.key)).size !== newPairs.length) {
      toast.error("Duplicate keys found in bulk edit");
      return;
    }

    onChange(newPairs.length > 0 ? newPairs : [{
      id: generateStableId(0),
      key: "",
      value: "",
      description: "",
      enabled: true,
      type: "text",
      showSecrets: false,
    }]);
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
      onChange(arrayMove([...pairs], oldIndex, newIndex));
    }
  };

  const renderItemActions = (pair: KeyValuePair, index: number) => {
    return (
      <>
        {/* Desktop Actions - Hidden on mobile */}
        <div className="hidden sm:flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleSmartCopy(index)}
            className="h-10 w-9 rounded-lg border-2 border-slate-200 bg-slate-50 hover:bg-slate-100"
          >
            <Copy className="h-4 w-4 text-slate-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => updatePair(index, "enabled", !pair.enabled)}
            className={cn(
              "h-10 w-9 rounded-lg border-2",
              pair.enabled
                ? "border-slate-200 bg-slate-50 hover:bg-slate-100"
                : "border-slate-300 bg-slate-100/50"
            )}
          >
            {pair.enabled ? (
              <Eye className="h-4 w-4 text-slate-600" />
            ) : (
              <EyeOff className="h-4 w-4 text-slate-400" />
            )}
          </Button>
          {pairs.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removePair(index)}
              className="h-10 w-9 rounded-lg border-2 border-slate-200 bg-slate-50 hover:bg-slate-100"
            >
              <Trash2 className="h-4 w-4 text-slate-600" />
            </Button>
          )}
          {!isEnvironmentEditor && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleAddToEnvironment(index)}
              className="h-10 w-9 rounded-lg border-2 border-slate-200 bg-slate-50 hover:bg-slate-100"
            >
              <PackagePlusIcon className="h-4 w-4 text-slate-600" />
            </Button>
          )}
        </div>

        {/* Mobile Actions */}
        {isMounted && (
          <div className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-9 rounded-lg border-2 border-slate-200 bg-slate-50 hover:bg-slate-100"
                >
                  <MoreVertical className="h-4 w-4 text-slate-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[160px]">
                <DropdownMenuItem onClick={() => handleSmartCopy(index)}>
                  <Copy className="mr-2 h-4 w-4 text-slate-600" />
                  <span>Copy</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updatePair(index, "enabled", !pair.enabled)}>
                  {pair.enabled ? (
                    <>
                      <EyeOff className="mr-2 h-4 w-4 text-slate-400" />
                      <span>Disable</span>
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4 text-slate-600" />
                      <span>Enable</span>
                    </>
                  )}
                </DropdownMenuItem>
                {pairs.length > 1 && (
                  <DropdownMenuItem onClick={() => removePair(index)}>
                    <Trash2 className="mr-2 h-4 w-4 text-slate-600" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                )}
                {!isEnvironmentEditor && (
                  <DropdownMenuItem onClick={() => handleAddToEnvironment(index)}>
                    <PackagePlusIcon className="mr-2 h-4 w-4 text-slate-600" />
                    <span>Add to Environment</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-4">
      <ScrollArea className="h-auto max-h-[210px] overflow-y-auto rounded-lg">
        {isBulkMode ? (
          <Textarea
            value={bulkContent}
            onChange={(e) => setBulkContent(e.target.value)}
            placeholder="# Format: key: value&#10;# Examples:&#10;api_key: your-key-here&#10;base_url: https://api.example.com&#10;#disabled_key: this is disabled"
            className="min-h-[200px] w-full font-mono text-xs bg-slate-50 border-2 border-slate-200 whitespace-pre-wrap break-words overflow-x-hidden rounded-lg"
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={pairs.map((p) => p.id || "")}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3 pl-8">
                {pairs.map((pair, index) => (
                  <SortableItem key={pair.id} pair={pair} index={index}>
                    <div
                      className={cn(
                        "grid flex-1 gap-3",
                        showDescription
                          ? "grid-cols-[1fr_1fr_1fr]"
                          : "grid-cols-[1fr_1fr]",
                        !pair.enabled && "opacity-50"
                      )}
                    >
                      <KeyValueInput
                        value={pair.key}
                        onChange={(value) => updatePair(index, "key", value)}
                        placeholder="Key"
                        icon={Key}
                        onPaste={(e) => handleSmartPaste(e, index, "key")}
                        className="flex-1"
                      />
                      <KeyValueInput
                        value={pair.value}
                        onChange={(value) => updatePair(index, "value", value)}
                        placeholder="Value"
                        icon={Type}
                        onPaste={(e) => handleSmartPaste(e, index, "value")}
                        className="flex-1"
                      />
                      {showDescription && (
                        <KeyValueInput
                          value={pair.description || ""}
                          onChange={(value) => updatePair(index, "description", value)}
                          placeholder="Description"
                          icon={AlignLeft}
                          className="flex-1"
                        />
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
          onClick={handleAddPair}
          className="flex-1 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-300 font-medium rounded-lg transition-colors"
        >
          <Plus />
          {pairs.length === 0 ? "Add First Item" : addButtonText}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            if (isBulkMode) {
              handleBulkEdit();
            } else {
              setBulkContent(pairs
                .map(p => `${!p.enabled ? "#" : ""}${p.key}: ${p.value}`)
                .join("\n"));
              setIsBulkMode(true);
            }
          }}
          className={cn(
            "w-9 rounded-lg border-2 transition-colors",
            isBulkMode
              ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
              : "bg-slate-900 text-slate-400 border-1 border-slate-700 hover:bg-slate-800 hover:text-slate-300"
          )}
        >
          {isBulkMode ? <List className="h-4 w-4" /> : <ListPlus className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
