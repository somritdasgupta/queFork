import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
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
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Transform } from "@dnd-kit/utilities";

import dynamic from "next/dynamic";
import { useVirtualizer } from "@tanstack/react-virtual";
import { debounce } from "lodash";
import { cn } from "@/lib/utils";

import {
  Key,
  Type,
  AlignLeft,
  ArrowUpRight,
  CheckCircle,
  XCircle,
  Copy,
  PackagePlusIcon,
  Trash2,
  Eraser,
  EllipsisIcon,
  CircleArrowOutUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavigableElement, useKeyboardNavigation } from "./keyboard-navigation";
import { BulkEditor } from "./editor/bulk-editor";
import { EditorToolbar } from "./editor/editor-toolbar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@radix-ui/react-popover";
import { STYLES, createEmptyPair, utils } from "./editor/constants";
import { ActionButton, VirtualItem } from "./editor/ui-components";
import { EnvironmentForm } from "./editor/environment-form";
import { KeyValueInput } from "./editor/key-value-input";
import { SortableItem } from "./editor/sortable-item";

// Client-only DnD components
const DndContextClient = dynamic(
  () => import("@dnd-kit/core").then((mod) => mod.DndContext),
  { ssr: false }
);
const SortableContextClient = dynamic(
  () => import("@dnd-kit/sortable").then((mod) => mod.SortableContext),
  { ssr: false }
);

// Helpers
const restrictToVerticalAxis = {
  modifiers: [
    ({ transform }: { transform: Transform }) => ({
      ...transform,
      x: 0,
    }),
  ],
};

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
  onSourceRedirect?: (source: { tab: string; type?: string }) => void;
}

export function KeyValueEditor({
  pairs = [createEmptyPair(utils.generateStableId(0))], // Ensure default value has one empty pair
  onChange,
  addButtonText = "Add Item",
  showDescription = false,
  requireUniqueKeys = false,
  onAddToEnvironment,
  environments = [],
  onEnvironmentsUpdate,
  preventFirstItemDeletion = false,
  autoSave = false,
  onSourceRedirect,
  ...props
}: KeyValueEditorProps) {
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkContent, setBulkContent] = useState("");
  const [selectedPairForEnv, setSelectedPairForEnv] = useState<{
    key: string;
    value: string;
    type: "text" | "secret";
  } | null>(null);
  const [showEnvironmentForm, setShowEnvironmentForm] = useState(false);
  const navigableElements = useRef<NavigableElement[]>([]);
  const parentRef = useRef<HTMLDivElement>(null);

  // Setup DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
        tolerance: 5,
        delay: 100,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { setFocus } = useKeyboardNavigation(
    navigableElements.current,
    (direction, currentId) => {
      const currentElement = navigableElements.current?.find(
        (el) => el.id === currentId
      );
      if (!currentElement) return;

      let nextId: string | undefined;

      switch (direction) {
        case "down":
          // Find next element in same group
          const nextElement = navigableElements.current?.find(
            (el) =>
              el.groupId === currentElement.groupId &&
              navigableElements.current.indexOf(el) >
                navigableElements.current.indexOf(currentElement)
          );
          nextId = nextElement?.id;
          break;
        case "up":
          // Find previous element in same group
          const prevElement = [...(navigableElements.current || [])]
            .reverse()
            .find(
              (el) =>
                el.groupId === currentElement.groupId &&
                navigableElements.current.indexOf(el) <
                  navigableElements.current.indexOf(currentElement)
            );
          nextId = prevElement?.id;
          break;
        case "right":
        case "left":
          // Toggle between key and value fields
          const targetParentId =
            direction === "right"
              ? `value-${currentElement.groupId}`
              : `key-${currentElement.groupId}`;
          const targetElement = navigableElements.current?.find(
            (el) => el.parentId === targetParentId
          );
          nextId = targetElement?.id;
          break;
      }

      if (nextId) setFocus(nextId);
    },
    (id) => {
      const element = navigableElements.current?.find((el) => el.id === id);
      if (element?.ref instanceof HTMLInputElement) {
        element.ref.focus();
      }
    },
    (id) => {
      // Handle keyboard delete action
      const element = navigableElements.current?.find((el) => el.id === id);
      if (element?.type === "key-value-pair") {
        const pairIndex = pairs.findIndex((p) => p.id === element.groupId);
        if (pairIndex !== -1) {
          const newPairs = [...pairs];
          newPairs.splice(pairIndex, 1);
          onChange(newPairs);
        }
      }
    }
  );

  // Core functionality handlers
  const handleAddPair = useCallback(() => {
    const newPair = createEmptyPair(
      utils.generateStableId(pairs.length + Math.random())
    );
    onChange([...pairs, newPair]);
  }, [pairs, onChange]);

  const debouncedSave = useMemo(
    () =>
      debounce((pairs: KeyValuePair[]) => {
        if (autoSave) {
          // Only debounce if autoSave is enabled
          onChange(pairs);
        }
      }, 1000),
    [onChange, autoSave]
  );

  const ensurePairId = useCallback(
    (pair: KeyValuePair, index: number): string => {
      return pair.id || utils.generateStableId(index);
    },
    []
  );

  const updatePair = useCallback(
    (index: number, field: keyof KeyValuePair, value: string | boolean) => {
      requestAnimationFrame(() => {
        const newPairs = [...pairs];
        const updatedPair = {
          ...newPairs[index],
          [field]: value,
          id: ensurePairId(newPairs[index], index),
        };
        newPairs[index] = updatedPair;
        onChange(newPairs);
      });
    },
    [pairs, onChange, ensurePairId]
  );

  const handleSmartPaste = useCallback(
    (
      e: React.ClipboardEvent<HTMLInputElement>,
      index: number,
      field: "key" | "value"
    ) => {
      // ... existing smart paste logic ...
    },
    [pairs, onChange, requireUniqueKeys, updatePair]
  );

  const handleBulkEdit = () => {
    if (isBulkMode) {
      try {
        const newPairs = bulkContent
          .split("\n")
          .filter((line: string) => line.trim())
          .map((line: string) => {
            const isDisabled = line.startsWith("#");
            const cleanLine = isDisabled ? line.slice(1).trim() : line.trim();

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
              id: utils.generateStableId(Math.random()),
              key,
              value,
              description: "",
              enabled: !isDisabled,
              type: "text",
              showSecrets: false,
            };
          })
          .filter((pair: KeyValuePair) => pair.key || pair.value);

        // Always ensure at least one pair
        onChange(
          newPairs.length > 0
            ? newPairs
            : [createEmptyPair(utils.generateStableId(0))]
        );

        setIsBulkMode(false);
        setBulkContent("");
        toast.success(`Bulk edit applied - ${newPairs.length} items`);
      } catch (error) {
        toast.error("Error processing bulk edit");
      }
    } else {
      const content = pairs
        .filter((p: KeyValuePair) => p.key || p.value)
        .map(
          (p: KeyValuePair) => `${!p.enabled ? "#" : ""}${p.key}: ${p.value}`
        )
        .join("\n");
      setBulkContent(content);
      setIsBulkMode(true);
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = pairs.findIndex((p) => p.id === active.id);
      const newIndex = pairs.findIndex((p) => p.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onChange(arrayMove([...pairs], oldIndex, newIndex));
      }
    }
  };

  const rowVirtualizer = useVirtualizer({
    count: pairs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 10,
    initialRect: { width: 0, height: 68 },
    scrollToFn: (offset, { behavior }) => {
      if (parentRef.current) {
        parentRef.current.scrollTop = offset;
      }
    },
    getItemKey: useCallback(
      (index: number) => pairs[index]?.id || `fallback-${index}`,
      [pairs]
    ),
  });

  // Force initial render to show first item
  useEffect(() => {
    rowVirtualizer.measure();
  }, []);

  // Add initial pairs effect
  useEffect(() => {
    if (!pairs.length) {
      onChange([createEmptyPair(utils.generateStableId(0))]);
    }
  }, [pairs.length, onChange]);

  const visiblePairs = useMemo(
    () =>
      rowVirtualizer.getVirtualItems().map((virtualRow) => ({
        pair: pairs[virtualRow.index],
        virtualRow,
      })),
    [rowVirtualizer, pairs]
  );

  const renderActionButtons = (pair: KeyValuePair, index: number) => {
    if (pair.source && onSourceRedirect) {
      return (
        <ActionButton
          icon={CircleArrowOutUpRight}
          onClick={() => onSourceRedirect(pair.source!)}
          className="text-yellow-400 hover:text-blue-300 hover:bg-blue-400/10"
          title={`Configure in ${pair.source.tab} tab`}
        />
      );
    }

    const isLastItem = pairs.length === 1;
    const isFirstItem = index === 0 && preventFirstItemDeletion;
    const shouldShowClear = isLastItem || isFirstItem;

    return (
      <ActionButton
        icon={shouldShowClear ? Eraser : Trash2}
        onClick={() => {
          if (shouldShowClear) {
            // Clear the pair instead of removing it
            const clearedPair = createEmptyPair(
              pair.id || utils.generateStableId(index)
            );
            const newPairs = [...pairs];
            newPairs[index] = clearedPair;
            onChange(newPairs);
          } else {
            // Only remove if it's not the last pair
            const newPairs = pairs.filter((_, i) => i !== index);
            onChange(
              newPairs.length
                ? newPairs
                : [createEmptyPair(utils.generateStableId(0))]
            );
          }
        }}
        variant={shouldShowClear ? "clear" : "delete"}
        title={shouldShowClear ? "Clear field" : "Remove field"}
      />
    );
  };

  const renderMobileActions = (pair: KeyValuePair, index: number) => (
    <div className="sm:hidden">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 hover:bg-transparent rounded-none"
          >
            <EllipsisIcon className="h-4 w-4 text-slate-400" />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="left" className="w-auto p-1 mr-1 bg-transparent">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updatePair(index, "enabled", !pair.enabled)}
              className={cn(
                "h-6 w-6",
                pair.enabled ? "text-emerald-400" : "text-slate-500"
              )}
              title={pair.enabled ? "Disable" : "Enable"}
            >
              {pair.enabled ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(
                  JSON.stringify({
                    key: pair.key,
                    value: pair.value,
                  })
                );
                toast.success("Copied to clipboard");
              }}
              className="h-6 w-6 p-0 text-blue-400"
              title="Copy"
            >
              <Copy className="h-4 w-4" />
            </Button>

            {onAddToEnvironment && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedPairForEnv({
                    key: pair.key,
                    value: pair.value,
                    type: "text",
                  });
                  setShowEnvironmentForm(true);
                }}
                className="h-6 w-6 p-0 text-purple-400"
                title="Add to environment"
              >
                <PackagePlusIcon className="h-4 w-4" />
              </Button>
            )}

            {renderActionButtons(pair, index)}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <div
      className="flex flex-col"
      style={{
        maxHeight: "38vh", // Only set max-height, let height be automatic
        minHeight: "68px", // Keep minimum height for one row + toolbar
      }}
    >
      {showEnvironmentForm && selectedPairForEnv && (
        <EnvironmentForm
          environments={environments}
          selectedPair={selectedPairForEnv}
          onClose={() => {
            setShowEnvironmentForm(false);
            setSelectedPairForEnv(null);
          }}
          onEnvironmentsUpdate={onEnvironmentsUpdate!}
          onEnvironmentSave={(envId) => {
            if (selectedPairForEnv) {
              const event = new CustomEvent("environmentSave", {
                detail: {
                  key: selectedPairForEnv.key,
                  value: selectedPairForEnv.value,
                  type: selectedPairForEnv.type,
                  environmentId: envId,
                },
              });
              window.dispatchEvent(event);
              setShowEnvironmentForm(false);
              setSelectedPairForEnv(null);
              toast.success(`Added to environment`);
            }
          }}
        />
      )}

      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto min-h-[32px] scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent"
        style={{
          height: isBulkMode ? "38vh" : "auto", // Use auto height in normal mode
          willChange: "transform",
        }}
      >
        {isBulkMode ? (
          <BulkEditor content={bulkContent} onChange={setBulkContent} />
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
                items={pairs.map(
                  (p) => p.id || utils.generateStableId(pairs.indexOf(p))
                )}
                strategy={verticalListSortingStrategy}
              >
                {visiblePairs.map(({ pair, virtualRow }) => {
                  const pairId = ensurePairId(pair, virtualRow.index);

                  return (
                    <VirtualItem
                      key={pairId}
                      id={pairId}
                      size={virtualRow.size}
                      start={virtualRow.start}
                    >
                      <SortableItem
                        pair={{ ...pair, id: pairId }}
                        index={virtualRow.index}
                      >
                        <div
                          className={cn(
                            "flex w-full transition-colors group border border-slate-800/40",
                            pair.source
                              ? "bg-slate-800/20"
                              : "hover:bg-slate-800/50 hover:border-slate-600/40"
                          )}
                        >
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
                              value={pair.key}
                              onChange={(value) =>
                                updatePair(virtualRow.index, "key", value)
                              }
                              placeholder="Key"
                              icon={Key}
                              onPaste={(e) =>
                                handleSmartPaste(e, virtualRow.index, "key")
                              }
                              className={cn(
                                STYLES.input.base,
                                STYLES.input.text,
                                STYLES.input.hover
                              )}
                              pairId={pairId}
                              navigableElements={navigableElements}
                              setFocus={setFocus}
                              disabled={!!pair.source}
                            />
                            <KeyValueInput
                              value={pair.value}
                              onChange={(value) =>
                                updatePair(virtualRow.index, "value", value)
                              }
                              placeholder="Value"
                              icon={Type}
                              onPaste={(e) =>
                                handleSmartPaste(e, virtualRow.index, "value")
                              }
                              className={cn(
                                STYLES.input.base,
                                STYLES.input.text,
                                STYLES.input.hover
                              )}
                              pairId={pairId}
                              isValue
                              navigableElements={navigableElements}
                              setFocus={setFocus}
                              disabled={!!pair.source}
                            />
                            {showDescription && (
                              <KeyValueInput
                                value={pair.description || ""}
                                onChange={(value) =>
                                  updatePair(
                                    virtualRow.index,
                                    "description",
                                    value
                                  )
                                }
                                placeholder="Description"
                                icon={AlignLeft}
                                className={cn(
                                  STYLES.input.base,
                                  STYLES.input.text,
                                  STYLES.input.hover
                                )}
                                pairId={pairId}
                                navigableElements={navigableElements}
                                setFocus={setFocus}
                                disabled={!!pair.source}
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-1 relative px-1">
                            <div className="hidden sm:flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  updatePair(
                                    virtualRow.index,
                                    "enabled",
                                    !pair.enabled
                                  )
                                }
                                className={cn(
                                  "h-6 w-6 p-0",
                                  pair.enabled
                                    ? "text-emerald-400"
                                    : "text-slate-500"
                                )}
                                title={pair.enabled ? "Disable" : "Enable"}
                              >
                                {pair.enabled ? (
                                  <CheckCircle className="h-4 w-4" />
                                ) : (
                                  <XCircle className="h-4 w-4" />
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    JSON.stringify({
                                      key: pair.key,
                                      value: pair.value,
                                    })
                                  );
                                  toast.success("Copied to clipboard");
                                }}
                                className="h-6 w-6 p-0 text-blue-400"
                                title="Copy"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>

                              {onAddToEnvironment && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPairForEnv({
                                      key: pair.key,
                                      value: pair.value,
                                      type: "text",
                                    });
                                    setShowEnvironmentForm(true);
                                  }}
                                  className="h-6 w-6 p-0 text-purple-400"
                                  title="Add to environment"
                                >
                                  <PackagePlusIcon className="h-4 w-4" />
                                </Button>
                              )}

                              {renderActionButtons(pair, virtualRow.index)}
                            </div>

                            {renderMobileActions(pair, virtualRow.index)}
                          </div>
                        </div>
                      </SortableItem>
                    </VirtualItem>
                  );
                })}
              </SortableContextClient>
            </DndContextClient>
          </div>
        )}
      </div>

      <EditorToolbar
        isBulkMode={isBulkMode}
        pairsCount={pairs.length}
        onAddPair={handleAddPair}
        onBulkEdit={handleBulkEdit}
        onBulkAdd={(count) => {
          const newPairs = Array.from({ length: count }, () => ({
            id: utils.generateStableId(pairs.length + Math.random()),
            key: "",
            value: "",
            description: "",
            enabled: true,
            type: "text",
            showSecrets: false,
          }));
          onChange([...pairs, ...newPairs]);
          toast.success(`Added ${count} new fields`);
        }}
        addButtonText={addButtonText}
      />
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
