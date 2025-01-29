import React, { useState, useCallback, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge"; // Add this import
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
  PackagePlusIcon,
  Check,
  Eraser,
  EllipsisIcon,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NavigableElement, useKeyboardNavigation } from "./keyboard-navigation";

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
  isMobile?: boolean;
  className?: string;
}

interface KeyValueInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: React.ElementType;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  className?: string;
  pairId: string; // Add pairId to props interface
  isValue?: boolean; // Add isValue to props interface
}

const KeyValueInput = React.memo(
  ({
    ...props
  }: KeyValueInputProps & {
    navigableElements: React.RefObject<NavigableElement[]>;
    setFocus: (id: string) => void;
  }) => {
    const [localValue, setLocalValue] = useState(props.value);
    const [isFocused, setIsFocused] = useState(false);
    const changeTimeoutRef = useRef<NodeJS.Timeout>();
    const inputRef = useRef<HTMLInputElement>(null);
    const inputId = useRef(`kv-${Math.random()}`).current;

    useEffect(() => {
      if (!isFocused) {
        setLocalValue(props.value);
      }
      return () => {
        if (changeTimeoutRef.current) {
          clearTimeout(changeTimeoutRef.current);
        }
      };
    }, [props.value, isFocused]);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue);

        if (changeTimeoutRef.current) {
          clearTimeout(changeTimeoutRef.current);
        }

        changeTimeoutRef.current = setTimeout(() => {
          props.onChange(newValue);
        }, 300);
      },
      [props.onChange]
    );

    useEffect(() => {
      if (inputRef.current && props.navigableElements.current) {
        props.navigableElements.current.push({
          id: inputId,
          ref: inputRef.current,
          type: "key-value-pair",
          groupId: props.pairId,
          parentId: props.isValue
            ? `value-${props.pairId}`
            : `key-${props.pairId}`,
        });
      }
    }, [inputId, props.pairId, props.isValue, props.navigableElements]);

    return (
      <div className="relative">
        <props.icon className="absolute left-2.5 top-2 h-4 w-4 text-slate-500 hidden sm:block" />
        <Input
          ref={inputRef}
          value={localValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            props.onChange(localValue);
          }}
          onPaste={props.onPaste}
          placeholder={props.placeholder}
          className={cn(
            "h-8 bg-slate-900 border-slate-700 text-slate-300 placeholder:text-slate-500",
            "focus:border-slate-600 focus:ring-slate-700",
            "rounded-none text-xs font-medium transition-colors",
            typeof window !== "undefined" && window.innerWidth < 640
              ? "pl-3"
              : "pl-9",
            props.className
          )}
          onKeyDown={(e) => {
            if (e.key === "Tab" && !e.shiftKey) {
              e.preventDefault();
              // Find next input in sequence
              const nextElement = props.navigableElements.current?.find(
                (el) => el.groupId === props.pairId && el.id > inputId
              );
              if (nextElement) {
                props.setFocus(nextElement.id);
              }
            }
          }}
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
          "transition-shadow pl-8", // Add left padding for drag handle
          isDragging && "shadow-lg bg-slate-800"
        )}
        {...attributes}
      >
        <div className="group flex items-start min-w-0 relative">
          {" "}
          {/* Add relative positioning */}
          <button
            {...listeners}
            className="flex items-center justify-center w-8 h-8 absolute left-0 -ml-8 text-slate-200 opacity-30 group-hover:opacity-100 transition-opacity border-r border-slate-700"
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
  isMobile = false,
  className,
}: KeyValueEditorProps) {
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkContent, setBulkContent] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const navigableElements = useRef<NavigableElement[]>([]);

  const { setFocus } = useKeyboardNavigation(
    navigableElements.current,
    (direction, currentId) => {
      const currentElement = navigableElements.current.find(
        (el) => el.id === currentId
      );
      if (!currentElement) return;

      let nextId: string | undefined;

      switch (direction) {
        case "down":
          // Move to next pair
          const nextPair = navigableElements.current.find(
            (el) =>
              el.groupId === currentElement.groupId &&
              navigableElements.current.indexOf(el) >
                navigableElements.current.indexOf(currentElement)
          );
          nextId = nextPair?.id;
          break;
        case "up":
          // Move to previous pair
          const prevPair = [...navigableElements.current]
            .reverse()
            .find(
              (el) =>
                el.groupId === currentElement.groupId &&
                navigableElements.current.indexOf(el) <
                  navigableElements.current.indexOf(currentElement)
            );
          nextId = prevPair?.id;
          break;
        case "right":
          // Move to value field if on key field
          if (currentElement.type === "key-value-pair") {
            const valueField = navigableElements.current.find(
              (el) =>
                el.parentId === currentElement.parentId &&
                el.type === "key-value-pair"
            );
            nextId = valueField?.id;
          }
          break;
        case "left":
          // Move to key field if on value field
          if (currentElement.type === "key-value-pair") {
            const keyField = navigableElements.current.find(
              (el) =>
                el.parentId === currentElement.parentId &&
                el.type === "key-value-pair"
            );
            nextId = keyField?.id;
          }
          break;
      }

      if (nextId) {
        setFocus(nextId);
      }
    },
    (id) => {
      // Handle selection - maybe toggle enabled state or focus input
      const element = navigableElements.current.find((el) => el.id === id);
      if (element?.ref instanceof HTMLInputElement) {
        element.ref.focus();
      }
    },
    (id) => {
      // Handle Delete key press
      const pair = navigableElements.current.find((el) => el.id === id);
      if (pair && pair.type === "key-value-pair") {
        const index = pairs.findIndex((p) => p.id === pair.groupId);
        if (index !== -1) {
          removePair(index);
        }
      }
    },
    (id) => {
      // Handle Backspace key press (clear)
      const element = navigableElements.current.find((el) => el.id === id);
      if (element?.type === "key-value-pair") {
        const pair = pairs.find((p) => p.id === element.groupId);
        if (pair) {
          const isValue = element.parentId?.startsWith("value-");
          updatePair(pairs.indexOf(pair), isValue ? "value" : "key", "");
        }
      }
    }
  );

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
          key: pair.key || "", // Ensure empty string if null/undefined
          value: pair.value || "", // Ensure empty string if null/undefined
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

    try {
      // Try to parse as JSON first (our smart copy format)
      const parsed = JSON.parse(pastedText);
      if (parsed.key !== undefined && parsed.value !== undefined) {
        const newPairs = pairs.map((p, i) =>
          i === index ? { ...p, key: parsed.key, value: parsed.value } : p
        );
        onChange(newPairs);
        toast.success("Pasted key-value pair");
        return;
      }
    } catch {
      // If not JSON, try the colon format
      if (pastedText.includes(":")) {
        const [key, ...valueParts] = pastedText.split(":");
        const value = valueParts.join(":").trim();

        const newPairs = pairs.map((p, i) =>
          i === index ? { ...p, key: key.trim(), value } : p
        );
        onChange(newPairs);
        toast.success("Pasted key-value pair");
        return;
      }
    }

    // Fallback to normal paste in the specific field
    updatePair(index, field, pastedText);
    toast.success(`Pasted as ${field}`);
  };

  const handleSmartCopy = (index: number) => {
    const pair = pairs[index];
    const copyFormat = JSON.stringify({ key: pair.key, value: pair.value });
    navigator.clipboard.writeText(copyFormat).then(() => {
      setCopiedIndex(index);
      toast.success("Copied key-value pair", {
        description: `${pair.key}: ${pair.value}`,
      });
      // Reset copy feedback after 2 seconds
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  const handleBulkEdit = () => {
    if (isBulkMode) {
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

      // Apply changes immediately
      const finalPairs =
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
            ];

      onChange(finalPairs);
      setIsBulkMode(false);
      setBulkContent("");
      toast.success(`Bulk edit applied - ${finalPairs.length} items`);
    } else {
      const content = pairs
        .filter((p) => p.key || p.value)
        .map((p) => `${!p.enabled ? "#" : ""}${p.key}: ${p.value}`)
        .join("\n");
      setBulkContent(content);
      setIsBulkMode(true);
    }
  };

  const handleAddToEnvironment = (index: number) => {
    const pair = pairs[index];
    if (!pair.key.trim()) {
      toast.error("Please enter a key first");
      return;
    }

    window.dispatchEvent(new CustomEvent('environmentSaveAction', {
      detail: {
        key: pair.key,
        value: pair.value,
        type: pair.type || "text",
        isMobile: window.innerWidth < 768,
        switchPanel: true,
        showForm: true
      }
    }));

    // Provide immediate feedback
    toast.success("Opening environment selector...");
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
    const [isExpanded, setIsExpanded] = useState(false);

    return (
      <>
        {/* Desktop View - Show all buttons */}
        <div className="hidden sm:flex border-l border-slate-700">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleSmartCopy(index)}
            className="h-8 w-8 rounded-none border-y border-r border-slate-700 bg-slate-900 hover:bg-slate-800"
          >
            {copiedIndex === index ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <Copy className="h-4 w-4 text-blue-400" />
            )}
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removePair(index)}
            className="h-8 w-8 rounded-none border-y border-r border-slate-700 bg-slate-900 hover:bg-slate-800"
          >
            {pairs.length > 1 ? (
              <Trash2 className="h-4 w-4 text-red-400" />
            ) : (
              <Eraser className="h-4 w-4 text-red-400" />
            )}
          </Button>
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

        {/* Mobile View - Expandable buttons */}
        <div className="sm:hidden flex items-center relative border-l border-slate-700">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="h-8 w-8 text-slate-400 hover:text-slate-300 hover:bg-transparent"
          >
            <EllipsisIcon className={cn(
              "h-4 w-4 transition-transform duration-200",
              isExpanded && "rotate-90"
            )} />
          </Button>

          <div className={cn(
            "flex absolute right-full top-0 gap-1 overflow-hidden transition-all duration-200",
            isExpanded ? "w-auto opacity-100 mr-2" : "w-0 opacity-0"
          )}>
            {/* Mobile expanded buttons */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 bg-slate-800 text-slate-400 hover:text-slate-300 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                removePair(index);
              }}
            >
              <Trash2 className="h-4 w-4 text-red-400" />
            </Button>
            {!isEnvironmentEditor && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 bg-slate-800 text-slate-400 hover:text-slate-300 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToEnvironment(index);
                }}
              >
                <PackagePlusIcon className="h-4 w-4 text-purple-400" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 bg-slate-800 text-slate-400 hover:text-slate-300 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                handleSmartCopy(index);
              }}
            >
              {copiedIndex === index ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4 text-blue-400" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 bg-slate-800 text-slate-400 hover:text-slate-300 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                updatePair(index, "enabled", !pair.enabled);
              }}
            >
              {pair.enabled ? (
                <Eye className="h-4 w-4 text-emerald-400" />
              ) : (
                <EyeOff className="h-4 w-4 text-slate-500" />
              )}
            </Button>
          </div>
        </div>
      </>
    );
  };

  // Calculate height based on number of pairs
  const getEditorHeight = () => {
    const pairHeight = 32; // Height of each pair row in pixels
    const minHeight = pairHeight; // Minimum height for 1 pair
    const maxPairs = 6; // Maximum pairs before scrolling
    const currentPairs = pairs.length;

    if (currentPairs <= maxPairs) {
      return `${currentPairs * pairHeight}px`;
    }
    return `${maxPairs * pairHeight}px`;
  };

  const getActivePairsCount = () => {
    if (isBulkMode) {
      // Count active pairs from bulk content
      return bulkContent
        .split("\n")
        .filter((line) => line.trim() && !line.trim().startsWith("#")).length;
    }
    // Count from regular pairs
    return pairs.filter((p) => p.enabled && p.key).length;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50">
        <div className="flex items-center justify-between px-2 h-10">
          <span className="text-xs font-medium text-slate-400">
            {isBulkMode ? "Bulk Edit Mode" : "Key-Value Pairs"}
          </span>
          <Badge
            variant="secondary"
            className="text-xs bg-slate-800 text-slate-400"
          >
            {getActivePairsCount()} Active Pair
          </Badge>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea
          className={cn(
            "w-full transition-all duration-200 bg-slate-900/50 backdrop-blur-sm scroll-container touch-scroll",
            pairs.length > 6 ? "h-[192px]" : "h-auto"
          )}
        >
          <div className="divide-y divide-slate-700/50">
            {isBulkMode ? (
              <Textarea
                value={bulkContent}
                onChange={(e) => setBulkContent(e.target.value)}
                placeholder={`• Format: key: value\n• Examples:\n  • api_key: your-key-here\n  • base_url: https://api.example.com\n  • disabled_key: #key: value`}
                className="w-full min-h-[300px] border border-slate-700 text-xs 
                  rounded-none bg-slate-950 
                  text-slate-300 placeholder:text-slate-500
                  focus:outline-none focus:ring-1 focus:ring-slate-700
                  font-mono"
              />
            ) : (
              <div className="relative min-h-[32px]">
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
                    <div className="divide-y divide-slate-700/50">
                      {pairs.map((pair, index) => (
                        <SortableItem
                          key={pair.id || `temp-${index}`}
                          pair={pair}
                          index={index}
                        >
                          <div className="flex w-full hover:bg-slate-800/50 transition-colors">
                            <div
                              className={cn(
                                "grid flex-1 gap-px",
                                showDescription
                                  ? "grid-cols-[1fr_1fr_1fr]"
                                  : "grid-cols-[1fr_1fr]",
                                !pair.enabled && "opacity-30"
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
                                onPaste={(e) =>
                                  handleSmartPaste(e, index, "key")
                                }
                                className="flex-1 bg-slate-900 border-slate-700 text-slate-300 
                                  placeholder:text-slate-500 focus:border-slate-800 
                                  focus:ring-0 focus:ring-slate-800 
                                  transition-colors"
                                pairId={pair.id || `temp-${index}`}
                                navigableElements={navigableElements}
                                setFocus={setFocus}
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
                                className="flex-1 bg-slate-900 border-slate-700 text-slate-300 
                                  placeholder:text-slate-500 focus:border-slate-800 
                                  focus:ring-0 focus:ring-slate-800 
                                  transition-colors"
                                pairId={pair.id || `temp-${index}`}
                                isValue
                                navigableElements={navigableElements}
                                setFocus={setFocus}
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
                                  className="flex-1 bg-slate-900 border-slate-700 text-slate-300 
                                    placeholder:text-slate-500 focus:border-slate-800 
                                    focus:ring-0 focus:ring-slate-800 
                                    transition-colors"
                                  pairId={pair.id || `temp-${index}`}
                                  navigableElements={navigableElements}
                                  setFocus={setFocus}
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
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex border-t border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <Button
          variant="ghost"
          onClick={handleAddPair}
          className="flex-1 h-8 rounded-none text-slate-400 hover:bg-slate-800 hover:text-slate-300 
            border-r border-slate-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2 text-emerald-500" />
          <span className="text-xs">
            {pairs.length === 0 ? "Add First Item" : addButtonText}
          </span>
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            if (isBulkMode) handleBulkEdit();
            else {
              setBulkContent(
                pairs
                  .filter((p) => p.key || p.value)
                  .map((p) => `${!p.enabled ? "#" : ""}${p.key}: ${p.value}`)
                  .join("\n")
              );
              setIsBulkMode(true);
            }
          }}
          className={cn(
            "h-8 w-full w-[32px] sm:w-[128px] transition-colors flex items-center justify-center gap-2",
            isBulkMode
              ? "text-blue-400 hover:text-blue-500 hover:bg-transparent"
              : "text-slate-400 hover:bg-transparent hover:text-slate-300"
          )}
        >
          {isBulkMode ? (
            <>
              <List className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Exit Bulk</span>
            </>
          ) : (
            <>
              <ListPlus className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Bulk Edit</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
