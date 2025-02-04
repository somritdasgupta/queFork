import React, { useState, useCallback, useRef, useEffect } from "react";
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
  Eye,
  EyeOff,
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
import { useId } from "react";
import dynamic from "next/dynamic";

// generateStableId is now predictable
const generateStableId = (index: number, existingId?: string) => {
  if (existingId) return existingId;
  return `pair-${index}-${Date.now()}`;
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
            "h-8 bg-transparent text-slate-300 select-none",
            "border border-slate-800/60 focus:border-slate-600",
            "rounded-none text-[12px] leading-4 py-1",
            typeof window !== "undefined" && window.innerWidth < 640
              ? "pl-3"
              : "pl-9",
            "select-none touch-none",
            "focus:ring-1 focus:ring-slate-600/50",
            "transition-all duration-150",
            props.className
          )}
          inputMode="text"
          data-lpignore="true"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          onKeyDown={props.onKeyDown}
        />
      </div>
    );
  }
);

KeyValueInput.displayName = "KeyValueInput";

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
    const itemId = useId(); // Use React's useId for stable IDs
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
  expandedItemId,
  onExpandedChange,
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

  const removePair = useCallback(
    (index: number) => {
      // Special handling for environment editor
      if (isEnvironmentEditor) {
        if (pairs.length <= 1) {
          // Always allow clearing the first/only pair in environment editor
          const clearedPair = {
            ...pairs[0],
            key: "",
            value: "",
            description: "",
            enabled: true,
          };
          onChange([clearedPair]);
          if (autoSave) toast.success("Cleared pair");
          return;
        }

        // Allow deletion of any pair in environment editor
        onChange(pairs.filter((_, i) => i !== index));
        if (autoSave) toast.success("Item removed");
        return;
      }

      // Normal key-value editor behavior
      if (pairs.length <= 1) {
        const clearedPair = {
          ...pairs[0],
          key: "",
          value: "",
          description: "",
          enabled: true,
        };
        onChange([clearedPair]);
        toast.success("Cleared pair");
        return;
      }

      if (preventFirstItemDeletion && index === 0) {
        toast.error("Cannot delete the first item");
        return;
      }

      onChange(pairs.filter((_, i) => i !== index));
    },
    [pairs, onChange, preventFirstItemDeletion, isEnvironmentEditor, autoSave]
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
    const pastedText = e.clipboardData.getData("text").trim();

    // Try smart paste first for special formats
    try {
      const parsed = JSON.parse(pastedText);
      if (parsed.key !== undefined && parsed.value !== undefined) {
        // Smart paste - update both fields
        const newPairs = pairs.map((p, i) =>
          i === index ? { ...p, key: parsed.key, value: parsed.value } : p
        );
        onChange(newPairs);
        toast.success("Pasted key-value pair");
        e.preventDefault();
        return;
      }
    } catch {
      // Try colon format
      if (pastedText.includes(":")) {
        const [key, ...valueParts] = pastedText.split(":");
        const value = valueParts.join(":").trim();

        // Smart paste - update both fields
        const newPairs = pairs.map((p, i) =>
          i === index ? { ...p, key: key.trim(), value } : p
        );
        onChange(newPairs);
        toast.success("Pasted key-value pair");
        e.preventDefault();
        return;
      }

      // Regular paste - only update the current field
      if (field === "key" || field === "value") {
        updatePair(index, field, pastedText);
        // Don't prevent default and don't show toast for normal paste
        return;
      }
    }
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
              key={i}
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
              isExpanded ? "w-[115px] opacity-100" : "w-0 opacity-0"
            )}
          >
            {actionButtons.map((button, i) => (
              <Button
                key={i}
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
              "h-8 w-8 p-0 transition-transform duration-900",
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
  const renderDndContent = () => {
    if (!isMounted) return null;

    return (
      <DndContextClient
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={restrictToVerticalAxis.modifiers}
      >
        <SortableContextClient
          items={pairs.map((p) => p.id || `temp-${p.key}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="divide-y divide-slate-700/50 touch-pan-y">
            {pairs.map((pair, index) => (
              <SortableItem
                key={pair.id || `stable-${index}`}
                pair={pair}
                index={index}
              >
                <div className="flex w-full hover:bg-slate-800/50 transition-colors">
                  <div
                    className={cn(
                      "grid flex-1",
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
                      onPaste={(e) => handleSmartPaste(e, index, "key")}
                      className="text-xs flex-1 bg-slate-900 border-slate-700 text-slate-300 
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
                      onPaste={(e) => handleSmartPaste(e, index, "value")}
                      className="text-xs flex-1 bg-slate-900 border-slate-700 text-slate-300 
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
        </SortableContextClient>
      </DndContextClient>
    );
  };

  // Calculate the width of 4 action buttons (28px each) plus gaps (4px each)
  const ACTION_BUTTONS_WIDTH = "132px"; // (7 * 4 buttons = 28px) + (4px * 3 gaps) = 132px

  useEffect(() => {
    const updateHeight = () => {
      const calculatedHeight = Math.min(
        pairs.length * 32 + 36,
        window.innerHeight * 0.5
      );
      setContainerHeight(`${calculatedHeight}px`);
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, [pairs.length]);

  return (
    <div
      className="flex flex-col"
      style={{
        minHeight: containerHeight,
        maxHeight: "50vh",
      }}
    >
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {isBulkMode ? (
          <Textarea
            value={bulkContent}
            onChange={(e) => setBulkContent(e.target.value)}
            placeholder={`• Format: key: value\n• Examples:\n  • api_key: your-key-here\n  • base_url: https://api.example.com\n  • disabled_key: #key: value`}
            className="w-full h-full min-h-[200px] bg-transparent
              text-slate-300 placeholder:text-slate-500
              focus:outline-none focus:ring-1 focus:ring-slate-600/50 
              border border-slate-800/60 focus:border-slate-600
              font-mono resize-none transition-all duration-150"
          />
        ) : (
          <div className="w-full h-full">
            {isMounted && (
              <DndContextClient
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={restrictToVerticalAxis.modifiers}
              >
                <SortableContextClient
                  items={pairs.map((p) => p.id || `temp-${p.key}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-[1px]">
                    {pairs.map((pair, index) => (
                      <SortableItem
                        key={pair.id || `stable-${index}`}
                        pair={pair}
                        index={index}
                      >
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
                              key={`key-${pair.id}-${index}`}
                              value={pair.key}
                              onChange={(value: string) =>
                                updatePair(index, "key", value)
                              }
                              placeholder="Key"
                              icon={Key}
                              onPaste={(e) => handleSmartPaste(e, index, "key")}
                              className="text-xs flex-1 bg-transparent 
                                border-0 focus:ring-0
                                text-slate-300 placeholder:text-slate-500 
                                transition-colors group-hover:bg-slate-800/50"
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
                              className="text-xs flex-1 bg-transparent 
                                border-0 focus:ring-0
                                text-slate-300 placeholder:text-slate-500 
                                transition-colors group-hover:bg-slate-800/50"
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
                                className="text-xs flex-1 bg-transparent 
                                  border-0 focus:ring-0
                                  text-slate-300 placeholder:text-slate-500 
                                  transition-colors group-hover:bg-slate-800/50"
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
                </SortableContextClient>
              </DndContextClient>
            )}
          </div>
        )}
      </div>

      <div className="flex-none flex border-t border-slate-800 bg-slate-900/90 backdrop-blur-sm divide-x divide-slate-800">
        <Button
          variant="ghost"
          onClick={handleAddPair}
          className="flex-1 h-9 rounded-none hover:bg-slate-800 text-blue-400 
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
            "h-9 transition-all rounded-none justify-center gap-2",
            "bg-slate-900/50 hover:bg-slate-800 text-blue-400",
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
            "h-9 px-4 transition-all rounded-none justify-center",
            "bg-slate-900/50 hover:bg-slate-800 text-blue-400",
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
