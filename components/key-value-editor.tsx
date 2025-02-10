import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  memo,
  useMemo,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Key,
  Type,
  AlignLeft,
  Copy,
  GripVertical,
  ListPlus,
  List,
  PackagePlusIcon,
  Check,
  Eraser,
  EllipsisIcon,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { KeyValuePair, Environment } from "@/types";
import { toast } from "sonner";
import {
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Transform } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { NavigableElement, useKeyboardNavigation } from "./keyboard-navigation";
import dynamic from "next/dynamic";
import { useVirtualizer } from "@tanstack/react-virtual";
import { debounce } from "lodash";

// generateStableId is now predictable
const generateStableId = (index: number, existingId?: string) => {
  if (existingId) return existingId;
  return `pair-${index}-${Math.random().toString(36).substr(2, 9)}`;
};

// These are client-only DnD components...
const DndContextClient = dynamic(
  () => import("@dnd-kit/core").then((mod) => mod.DndContext),
  { ssr: false }
);

const SortableContextClient = dynamic(
  () => import("@dnd-kit/sortable").then((mod) => mod.SortableContext),
  { ssr: false }
);

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
  expandedItemId?: string | null;
  onExpandedChange?: (id: string | null) => void;
  onSave?: (pairs: KeyValuePair[]) => void;
}

interface KeyValueInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: React.ElementType;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  className?: string;
  pairId: string;
  isValue?: boolean;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  navigableElements: React.RefObject<NavigableElement[]>;
  setFocus: (id: string) => void;
}

const useStableId = (prefix: string, id?: string) => {
  const generatedId = useRef(
    `${prefix}-${Math.random().toString(36).slice(2)}`
  );
  return id || generatedId.current;
};

const useDebounced = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

// Memoize KeyValueInput component
const KeyValueInput = memo(function KeyValueInput({
  value,
  onChange,
  placeholder,
  icon: Icon,
  onPaste,
  className,
  pairId,
  isValue,
  onKeyDown,
  navigableElements,
}: KeyValueInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const debouncedValue = useDebounced(localValue, 150);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useRef(`kv-${Math.random()}`).current;

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value);
    }
  }, [value, isFocused]);

  useEffect(() => {
    if (debouncedValue !== value) {
      onChange(debouncedValue);
    }
  }, [debouncedValue, onChange, value]);

  useEffect(() => {
    if (inputRef.current && navigableElements.current) {
      navigableElements.current.push({
        id: inputId,
        ref: inputRef.current,
        type: "key-value-pair",
        groupId: pairId,
        parentId: isValue ? `value-${pairId}` : `key-${pairId}`,
      });
    }
  }, [inputId, pairId, isValue, navigableElements]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  return (
    <div className="relative">
      <Icon className="absolute left-2.5 top-2 h-4 w-4 text-slate-500 hidden sm:block" />
      <Input
        ref={inputRef}
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
          "h-8 bg-transparent text-slate-300 select-none",
          "border border-slate-800/60 focus:border-slate-600",
          "rounded-none text-[12px] leading-4 py-1",
          typeof window !== "undefined" && window.innerWidth < 640
            ? "pl-3"
            : "pl-9",
          "select-none touch-none",
          "focus:ring-1 focus:ring-slate-600/50",
          "transition-all duration-150",
          className
        )}
        inputMode="text"
        data-lpignore="true"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        onKeyDown={onKeyDown}
      />
    </div>
  );
});

// Modify SortableItem component
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
    const itemId = useStableId("sortable-item", pair.id); // Use stable ID hook
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
          "transition-shadow pl-8", // Add left padding for drag handle
          isDragging && "shadow-lg bg-slate-800"
        )}
        {...attributes}
        aria-describedby={itemId} // Use stable ID
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
  requireUniqueKeys = false,
  onAddToEnvironment,
  environments = [],
  currentEnvironment,
  isEnvironmentEditor = false,
  preventFirstItemDeletion = false,
  autoSave = false,
}: KeyValueEditorProps) {
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkContent, setBulkContent] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const navigableElements = useRef<NavigableElement[]>([]);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [containerHeight, setContainerHeight] = useState("auto");

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

  const debouncedOnChange = useMemo(
    () =>
      debounce((newPairs: KeyValuePair[]) => {
        onChange(newPairs);
      }, 100),
    [onChange]
  );

  const updatePair = useCallback(
    (index: number, field: keyof KeyValuePair, value: string | boolean) => {
      const newPairs = [...pairs];
      const updatedPair = { ...newPairs[index], [field]: value };
      newPairs[index] = updatedPair;

      if (field === "key" && requireUniqueKeys && typeof value === "string") {
        const isDuplicate = newPairs.some(
          (p, i) => i !== index && p.key === value && value !== ""
        );
        if (isDuplicate) {
          toast.error("Duplicate keys are not allowed");
          return;
        }
      }

      debouncedOnChange(newPairs);
      // Immediate feedback for UI
      onChange(newPairs);
    },
    [pairs, requireUniqueKeys, debouncedOnChange, onChange]
  );

  const handleSmartPaste = useCallback(
    (
      e: React.ClipboardEvent<HTMLInputElement>,
      index: number,
      field: "key" | "value"
    ) => {
      const pastedText = e.clipboardData.getData("text").trim();

      // Helper to update both key and value
      const updateBothFields = (key: string, value: string) => {
        const newPairs = [...pairs];
        newPairs[index] = {
          ...newPairs[index],
          key: key.trim(),
          value: value.trim(),
        };

        if (requireUniqueKeys) {
          const isDuplicate = newPairs.some(
            (p, i) => i !== index && p.key === key.trim() && key.trim() !== ""
          );
          if (isDuplicate) {
            toast.error("Key already exists");
            return false;
          }
        }

        onChange(newPairs);
        toast.success("Pasted key-value pair");
        return true;
      };

      // Try different paste formats
      if (pastedText.includes(":")) {
        const colonIndex = pastedText.indexOf(":");
        const key = pastedText.substring(0, colonIndex);
        const value = pastedText.substring(colonIndex + 1);

        if (key && value) {
          if (updateBothFields(key, value)) {
            e.preventDefault();
            return;
          }
        }
      }

      try {
        const parsed = JSON.parse(pastedText);
        if (parsed && typeof parsed === "object") {
          if (parsed.key !== undefined && parsed.value !== undefined) {
            if (updateBothFields(parsed.key, parsed.value)) {
              e.preventDefault();
              return;
            }
          }
        }
      } catch {}

      // Default to normal paste if smart paste fails
      if (field === "key" || field === "value") {
        updatePair(index, field, pastedText);
      }
    },
    [pairs, onChange, requireUniqueKeys, updatePair]
  );

  const handleBulkEdit = () => {
    if (isBulkMode) {
      try {
        const newPairs = bulkContent
          .split("\n")
          .filter((line) => line.trim())
          .map((line) => {
            const isDisabled = line.startsWith("#");
            const cleanLine = isDisabled ? line.slice(1).trim() : line.trim();

            // Handle both colon and JSON formats
            let key = "",
              value = "";

            if (cleanLine.startsWith("{")) {
              try {
                const parsed = JSON.parse(cleanLine);
                key = parsed.key || "";
                value = parsed.value || "";
              } catch {
                const colonIndex = cleanLine.indexOf(":");
                if (colonIndex > -1) {
                  key = cleanLine.substring(0, colonIndex).trim();
                  value = cleanLine.substring(colonIndex + 1).trim();
                }
              }
            } else if (cleanLine.includes(":")) {
              const colonIndex = cleanLine.indexOf(":");
              key = cleanLine.substring(0, colonIndex).trim();
              value = cleanLine.substring(colonIndex + 1).trim();
            }

            return {
              id: generateStableId(Math.random()),
              key,
              value,
              description: "",
              enabled: !isDisabled,
              type: "text",
              showSecrets: false,
            };
          })
          .filter((pair) => pair.key || pair.value); // Remove empty pairs

        if (requireUniqueKeys) {
          const keys = new Set();
          const hasDuplicates = newPairs.some((pair) => {
            if (!pair.key) return false;
            if (keys.has(pair.key)) return true;
            keys.add(pair.key);
            return false;
          });

          if (hasDuplicates) {
            toast.error("Duplicate keys found in bulk edit");
            return;
          }
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
        setBulkContent("");
        toast.success(`Bulk edit applied - ${newPairs.length} items`);
      } catch (error) {
        toast.error("Error processing bulk edit");
        console.error(error);
      }
    } else {
      // Entering bulk mode - format existing pairs
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
    if (!pair.key.trim() || !pair.value.trim()) {
      toast.error("Both key and value must be filled");
      return;
    }

    // Find the target environment (assuming it's accessible)
    const targetEnvironment = currentEnvironment || environments[0];
    if (!targetEnvironment) {
      toast.error("No environment selected");
      return;
    }

    // Create the new variable
    const newVariable = {
      key: pair.key,
      value: pair.value,
      type: pair.type || "text",
    };

    // Dispatch the event with additional logic for first empty row
    window.dispatchEvent(
      new CustomEvent("environmentSaveAction", {
        detail: {
          ...newVariable,
          useFirstEmptyRow: true, // Add this flag
          isMobile: window.innerWidth < 768,
          switchPanel: true,
          showForm: true,
        },
      })
    );

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
    const isExpanded = expandedRowId === pair.id;
    const isSinglePair = pairs.length === 1;
    const hasContent = pair.key.trim() || pair.value.trim();
    const isComplete = pair.key.trim() && pair.value.trim();

    // Common buttons configuration
    const actionButtons = [
      {
        icon: pair.enabled ? CheckCircle : XCircle,
        onClick: () => updatePair(index, "enabled", !pair.enabled),
        className: cn(
          "h-7 w-7 p-0",
          isComplete
            ? pair.enabled
              ? "text-emerald-400"
              : "text-slate-500"
            : "text-slate-500/50 cursor-not-allowed"
        ),
        title: pair.enabled ? "Disable" : "Enable",
        disabled: !isComplete,
      },
      {
        icon: copiedIndex === index ? Check : Copy,
        onClick: () => handleSmartCopy(index),
        className: "h-7 w-7 p-0 text-blue-400",
        title: "Copy pair",
        disabled: !hasContent,
      },
      ...(onAddToEnvironment
        ? [
            {
              icon: PackagePlusIcon,
              onClick: () => handleAddToEnvironment(index),
              className: cn(
                "h-7 w-7 p-0",
                isComplete
                  ? "text-purple-400"
                  : "text-purple-400/50 cursor-not-allowed"
              ),
              title: "Save to environment",
              disabled: !isComplete,
            },
          ]
        : []),
      {
        icon: isSinglePair ? Eraser : Trash2,
        onClick: () => removePair(index),
        className: cn(
          "h-7 w-7 p-0 text-red-400",
          !hasContent && isSinglePair && "text-red-400/50"
        ),
        title: isSinglePair ? "Clear" : "Remove",
        disabled: false,
      },
    ];

    return (
      <div className="flex items-center gap-1 relative">
        {/* Desktop buttons */}
        <div className="hidden sm:flex items-center gap-1 px-1">
          {actionButtons.map((button, i) => (
            <Button
              key={`desktop-${button.title}-${i}`} // Added unique key
              variant="ghost"
              size="sm"
              onClick={button.onClick}
              className={button.className}
              title={button.title}
              disabled={button.disabled}
            >
              <button.icon className="h-4 w-4" />
            </Button>
          ))}
        </div>

        {/* Mobile buttons with animation */}
        <div className="sm:hidden">
          <div
            className={cn(
              "absolute bg-slate-900 right-full flex items-center transition-all duration-900 ease overflow-hidden",
              isExpanded ? "w-[115px] h-8 opacity-100" : "w-0 opacity-0"
            )}
          >
            {actionButtons.map((button, i) => (
              <Button
                key={`mobile-${button.title}-${i}`} // Added unique key
                variant="ghost"
                size="sm"
                onClick={button.onClick}
                className={button.className}
                disabled={button.disabled}
              >
                <button.icon className="h-4 w-4" />
              </Button>
            ))}
          </div>

          {/* Toggle button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setExpandedRowId(isExpanded ? null : pair.id || null)
            }
            className={cn(
              "h-8 w-8 p-0 transition-transform duration-900 rounded-none",
              isExpanded && "rotate-90"
            )}
          >
            <EllipsisIcon className="h-4 w-4 text-slate-400" />
          </Button>
        </div>
      </div>
    );
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

  // Wrap DnD content in client-only rendering

  // Calculate the width of 4 action buttons (28px each) plus gaps (4px each)

  useEffect(() => {
    const updateHeight = () => {
      const maxHeight = window.innerHeight * 0.4; // 40vh
      let calculatedHeight;

      if (isBulkMode) {
        // Bulk mode always uses maximum height
        calculatedHeight = maxHeight;
      } else {
        // Regular mode: height based on number of pairs, but capped at 40vh
        calculatedHeight = Math.min(
          pairs.length * 32 + 36, // 32px per row + 36px padding
          maxHeight
        );
      }

      setContainerHeight(`${calculatedHeight}px`);
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, [pairs.length, isBulkMode]);

  // Add virtualization
  const parentRef = useRef<HTMLDivElement>(null);
  const [parentWidth, setParentWidth] = useState(0);

  // Optimize virtualization
  const rowVirtualizer = useVirtualizer({
    count: pairs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32, // height of each row
    overscan: 5, // number of items to render outside visible area
  });

  // Optimize width calculations
  useEffect(() => {
    if (parentRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setParentWidth(entry.contentRect.width);
        }
      });
      resizeObserver.observe(parentRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  // Optimized pair update function

  // Optimized clear/remove functionality
  const removePair = useCallback(
    (index: number) => {
      if (pairs.length <= 1) {
        const clearedPair = {
          ...pairs[0],
          id: generateStableId(0),
          key: "",
          value: "",
          description: "",
          enabled: true,
        };
        onChange([clearedPair]);
        if (autoSave) toast.success("Cleared pair");
        return;
      }

      if (preventFirstItemDeletion && index === 0) {
        toast.error("Cannot delete the first item");
        return;
      }

      const newPairs = pairs.filter((_, i) => i !== index);
      onChange(newPairs);
      if (autoSave) toast.success("Item removed");
    },
    [pairs, onChange, preventFirstItemDeletion, autoSave]
  );

  // Optimized copy functionality with memoization
  const handleSmartCopy = useCallback(
    (index: number) => {
      const pair = pairs[index];
      if (!pair) return;

      const copyFormat = JSON.stringify({
        key: pair.key,
        value: pair.value,
      });

      navigator.clipboard
        .writeText(copyFormat)
        .then(() => {
          setCopiedIndex(index);
          toast.success("Copied key-value pair", {
            description: `${pair.key}: ${pair.value}`,
          });
          setTimeout(() => setCopiedIndex(null), 2000);
        })
        .catch(() => toast.error("Failed to copy to clipboard"));
    },
    [pairs]
  );

  const renderBulkEditor = () => (
    <div className="flex flex-col h-full">
      <Textarea
        value={bulkContent}
        onChange={(e) => setBulkContent(e.target.value)}
        placeholder={`Format: key: value\n\nExamples:\napi_key: your-key-here\nbase_url: https://api.example.com\n#disabled_key: value\n\nOr JSON format:\n{"key": "api_key", "value": "your-key-here"}`}
        className={cn(
          "w-full flex-1 bg-transparent",
          "text-slate-300 placeholder:text-slate-500",
          "focus:outline-none focus:ring-1 focus:ring-slate-600/50",
          "border border-slate-800/60 focus:border-slate-600",
          "font-mono text-sm leading-relaxed",
          "resize-none transition-all duration-150",
          "p-4"
        )}
      />
      <div className="flex-none px-2 bg-slate-800/50 border-t border-slate-700/50">
        <span className="text-xs text-slate-400">
          Tip: Use # to disable a line, or JSON format for complex values
        </span>
      </div>
    </div>
  );

  return (
    <div
      className="flex flex-col"
      style={{
        height: containerHeight,
        maxHeight: "38vh", // Ensure max height is enforced
      }}
    >
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
      >
        {isBulkMode ? (
          renderBulkEditor()
        ) : (
          <div
            className="w-full relative"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            <DndContextClient
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={restrictToVerticalAxis.modifiers}
            >
              <SortableContextClient
                items={pairs.map((p) => {
                  // Ensure each item has a guaranteed unique ID
                  if (!p.id) {
                    p.id = generateStableId(pairs.indexOf(p));
                  }
                  return p.id;
                })}
                strategy={verticalListSortingStrategy}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const pair = pairs[virtualRow.index];
                  if (!pair.id) {
                    pair.id = generateStableId(virtualRow.index);
                  }
                  return (
                    <div
                      key={pair.id}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <SortableItem pair={pair} index={virtualRow.index}>
                        <div className="flex w-full hover:bg-slate-800/50 transition-colors group border border-slate-800/40 hover:border-slate-700/40">
                          <div
                            className={cn(
                              "grid gap-[1px] flex-1",
                              showDescription
                                ? "grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]"
                                : "grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
                              !pair.enabled && "opacity-50"
                            )}
                          >
                            <KeyValueInput
                              key={`key-${pair.id}-${virtualRow.index}`}
                              value={pair.key}
                              onChange={(value: string) =>
                                updatePair(virtualRow.index, "key", value)
                              }
                              placeholder="Key"
                              icon={Key}
                              onPaste={(e) =>
                                handleSmartPaste(e, virtualRow.index, "key")
                              }
                              className="text-xs flex-1 bg-transparent 
                                border-0 focus:ring-0
                                text-slate-300 placeholder:text-slate-500 
                                transition-colors group-hover:bg-slate-800/50"
                              pairId={pair.id || `temp-${virtualRow.index}`}
                              navigableElements={navigableElements}
                              setFocus={setFocus}
                            />
                            <KeyValueInput
                              key={`value-${pair.id}-${virtualRow.index}`}
                              value={pair.value}
                              onChange={(value: string) =>
                                updatePair(virtualRow.index, "value", value)
                              }
                              placeholder="Value"
                              icon={Type}
                              onPaste={(e) =>
                                handleSmartPaste(e, virtualRow.index, "value")
                              }
                              className="text-xs flex-1 bg-transparent 
                                border-0 focus:ring-0
                                text-slate-300 placeholder:text-slate-500 
                                transition-colors group-hover:bg-slate-800/50"
                              pairId={pair.id || `temp-${virtualRow.index}`}
                              isValue
                              navigableElements={navigableElements}
                              setFocus={setFocus}
                            />
                            {showDescription && (
                              <KeyValueInput
                                key={`desc-${pair.id}-${virtualRow.index}`}
                                value={pair.description || ""}
                                onChange={(value: string) =>
                                  updatePair(
                                    virtualRow.index,
                                    "description",
                                    value
                                  )
                                }
                                placeholder="Description"
                                icon={AlignLeft}
                                className="text-xs flex-1 bg-transparent 
                                  border-0 focus:ring-0
                                  text-slate-300 placeholder:text-slate-500 
                                  transition-colors group-hover:bg-slate-800/50"
                                pairId={pair.id || `temp-${virtualRow.index}`}
                                navigableElements={navigableElements}
                                setFocus={setFocus}
                              />
                            )}
                          </div>
                          {renderItemActions(pair, virtualRow.index)}
                        </div>
                      </SortableItem>
                    </div>
                  );
                })}
              </SortableContextClient>
            </DndContextClient>
          </div>
        )}
      </div>

      <div className="flex-none flex border-y border-slate-800 bg-slate-900/90 backdrop-blur-sm divide-x divide-slate-800">
        <Button
          variant="ghost"
          onClick={handleAddPair}
          className="flex-1 h-8 rounded-none text-blue-400 
            bg-slate-900/50 border-slate-800
            transition-all flex items-center justify-center gap-2
            hover:border-slate-700 group"
        >
          <Plus className="h-4 w-4 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-medium">
            {pairs.length === 0 ? "Add First Item" : addButtonText}
          </span>
          <Badge
            variant="secondary"
            className="ml-2 text-[10px] py-0 h-4 bg-slate-800 text-slate-400 
              transition-colors border border-slate-700/50"
          >
            {getActivePairsCount()}
          </Badge>
        </Button>

        {/* Desktop bulk edit button */}
        <Button
          variant="ghost"
          onClick={handleBulkEdit}
          className={cn(
            "h-8 transition-all rounded-none justify-center gap-2",
            "bg-slate-900/50 text-blue-400",
            "hidden sm:flex w-[132px]",
            "border-slate-800 hover:border-slate-700",
            "group"
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

        {/* Mobile bulk edit button */}
        <Button
          variant="ghost"
          onClick={handleBulkEdit}
          className={cn(
            "h-8 w-8 transition-all rounded-none justify-center",
            "bg-slate-900/50 text-blue-400",
            "sm:hidden border-slate-800 hover:border-slate-700",
            "group"
          )}
        >
          {isBulkMode ? (
            <List className="h-4 w-4 group-hover:scale-110 transition-transform" />
          ) : (
            <ListPlus className="h-4 w-4 group-hover:scale-110 transition-transform" />
          )}
        </Button>
      </div>
    </div>
  );
}

export const useSortedPairs = (pairs: KeyValuePair[]) => {
  return useMemo(() => {
    return [...pairs].sort((a, b) => {
      if (a.enabled !== b.enabled) return b.enabled ? 1 : -1;
      return a.key.localeCompare(b.key);
    });
  }, [pairs]);
};
