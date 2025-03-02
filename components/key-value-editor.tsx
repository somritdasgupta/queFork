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
import { cn } from "@/lib/utils";

import {
  Key,
  Type,
  CheckCircle,
  XCircle,
  Copy,
  PackagePlusIcon,
  Eraser,
  EllipsisIcon,
  CircleArrowOutUpRight,
  SquareX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NavigableElement,
  useKeyboardNavigation,
} from "./keyboard-navigation/keyboard-navigation";
import { BulkEditor } from "./key-value-editor/bulk-editor";
import { EditorToolbar } from "./key-value-editor/editor-toolbar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverPortal,
} from "@radix-ui/react-popover";
import { STYLES, createEmptyPair, utils } from "./key-value-editor/constants";
import { ActionButton } from "./key-value-editor/ui-components";
import { EnvironmentForm } from "./key-value-editor/environment-form";
import { KeyValueInput } from "./key-value-editor/key-value-input";
import { SortableItem } from "./key-value-editor/sortable-item";
import { SuggestionsWrapper } from "./key-value-editor/suggestions/suggestions-wrapper";
import { HeaderSuggestions } from "./key-value-editor/suggestions/header-suggestions";

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
  suggestions?: {
    renderContent: (
      index: number,
      value: string,
      onSelect: (suggestion: any) => void
    ) => React.ReactNode;
    onSelect: (index: number, suggestion: any) => void;
  };
}

export function KeyValueEditor({
  pairs = [createEmptyPair(utils.generateStableId(0))], // Ensure default value has one empty pair
  onChange,
  addButtonText = "Add Item",
  requireUniqueKeys = false,
  onAddToEnvironment,
  environments = [],
  onEnvironmentsUpdate,
  preventFirstItemDeletion = false,
  autoSave = false,
  onSourceRedirect,
  suggestions,
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
  const [showSuggestionsFor, setShowSuggestionsFor] = useState<number | null>(
    null
  );

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

  const ensurePairId = useCallback(
    (pair: KeyValuePair, index: number): string => {
      return pair.id || utils.generateStableId(index);
    },
    []
  );

  const updatePair = useCallback(
    (index: number, field: keyof KeyValuePair, value: string | boolean) => {
      const newPairs = [...pairs];
      const updatedPair = {
        ...newPairs[index],
        [field]: value,
        id: ensurePairId(newPairs[index], index),
      };
      newPairs[index] = updatedPair;
      onChange(newPairs);
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

  const handlePurge = useCallback(() => {
    // Keep only source items
    const sourceItems = pairs.filter((p) => p.source);
    onChange(
      sourceItems.length
        ? sourceItems
        : [createEmptyPair(utils.generateStableId(0))]
    );
    toast.success("All custom items purged");
  }, [pairs, onChange]);

  const handleBulkEdit = () => {
    if (isBulkMode) {
      try {
        // Keep existing source items
        const sourceItems = pairs.filter((p) => p.source);
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

        // Combine source items with new pairs
        onChange([...newPairs, ...sourceItems]);

        setIsBulkMode(false);
        setBulkContent("");
        toast.success(`Bulk edit applied - ${newPairs.length} items`);
      } catch (error) {
        toast.error("Error processing bulk edit");
      }
    } else {
      // Only include non-source items in bulk editor
      const content = pairs
        .filter((p: KeyValuePair) => !p.source && (p.key || p.value))
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

  // Force initial render to show first item
  useEffect(() => {
    if (!pairs.length) {
      onChange([createEmptyPair(utils.generateStableId(0))]);
    }
  }, [pairs.length, onChange]);

  const canPerformActions = useCallback((pair: KeyValuePair) => {
    return pair.key.trim() !== "" && pair.value.trim() !== "";
  }, []);

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
        icon={shouldShowClear ? Eraser : SquareX}
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
              disabled={!canPerformActions(pair)}
              className={cn(
                "h-6 w-6 p-0",
                canPerformActions(pair) ? "text-blue-400" : "text-slate-600",
                "transition-colors"
              )}
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
                disabled={!canPerformActions(pair)}
                className={cn(
                  "h-6 w-6 p-0",
                  canPerformActions(pair)
                    ? "text-purple-400"
                    : "text-slate-600",
                  "transition-colors"
                )}
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

  const handleKeyChange = (index: number, value: string) => {
    const newPairs = [...pairs];
    newPairs[index].key = value;
    onChange(newPairs);
  };

  const renderKeyInput = (
    pair: KeyValuePair,
    index: number,
    pairId: string
  ) => {
    if (!suggestions) {
      return (
        <KeyValueInput
          value={pair.key}
          onChange={(value) => handleKeyChange(index, value)}
          placeholder="Key"
          icon={Key}
          onPaste={(e) => handleSmartPaste(e, index, "key")}
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
      );
    }

    return (
      <SuggestionsWrapper
        value={pair.key}
        onChange={(value) => handleKeyChange(index, value)}
        isOpen={showSuggestionsFor === index}
        onOpenChange={(open) => setShowSuggestionsFor(open ? index : null)}
        inputProps={{
          placeholder: "Key",
          icon: Key,
          onPaste: (e: React.ClipboardEvent<HTMLInputElement>) =>
            handleSmartPaste(e, index, "key"),
          className: cn(
            STYLES.input.base,
            STYLES.input.text,
            STYLES.input.hover
          ),
          pairId,
          navigableElements,
          setFocus,
          disabled: !!pair.source,
        }}
        renderSuggestions={(value, onSelect) => (
          <HeaderSuggestions value={value} onSelect={onSelect} />
        )}
      />
    );
  };

  // Modify sort function to keep source items at bottom
  const sortedPairs = useMemo(() => {
    return [...pairs].sort((a, b) => {
      // Source items go to bottom
      if (a.source && !b.source) return 1;
      if (!a.source && b.source) return -1;
      // Within source items, maintain their order
      if (a.source && b.source) return 0;
      // For non-source items, maintain existing sort
      return 0;
    });
  }, [pairs]);

  return (
    <div className="flex flex-col">
      <div className="flex flex-col h-full min-h-[68px]">
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
                    type: "text",
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
          className={cn(
            "flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent",
            "max-h-[calc(38vh-68px)]" // Subtract toolbar height
          )}
        >
          {isBulkMode ? (
            <BulkEditor
              content={bulkContent}
              onChange={setBulkContent}
              footer={
                pairs.some((p) => p.source) ? (
                  <div className="text-xs text-yellow-500 px-3 py-2 bg-yellow-500/10">
                    Note: Items from other tabs will be preserved but not shown
                    in bulk editor
                  </div>
                ) : null
              }
            />
          ) : (
            <DndContextClient
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={restrictToVerticalAxis.modifiers}
            >
              <SortableContextClient
                items={sortedPairs.map(
                  (p) => p.id || utils.generateStableId(pairs.indexOf(p))
                )}
                strategy={verticalListSortingStrategy}
              >
                {sortedPairs.map((pair, index) => {
                  const pairId = ensurePairId(pair, index);
                  return (
                    <SortableItem
                      key={pairId}
                      pair={{ ...pair, id: pairId }}
                      index={index}
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
                            "grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
                            !pair.enabled && "opacity-50"
                          )}
                        >
                          {renderKeyInput(pair, index, pairId)}
                          <KeyValueInput
                            value={pair.value}
                            onChange={(value) =>
                              updatePair(index, "value", value)
                            }
                            placeholder="Value"
                            icon={Type}
                            onPaste={(e) => handleSmartPaste(e, index, "value")}
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
                        </div>
                        <div className="flex items-center gap-1 relative px-1">
                          <div className="hidden sm:flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                updatePair(index, "enabled", !pair.enabled)
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
                              disabled={!canPerformActions(pair)}
                              className={cn(
                                "h-6 w-6 p-0",
                                canPerformActions(pair)
                                  ? "text-blue-400"
                                  : "text-slate-600",
                                "transition-colors"
                              )}
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
                                disabled={!canPerformActions(pair)}
                                className={cn(
                                  "h-6 w-6 p-0",
                                  canPerformActions(pair)
                                    ? "text-purple-400"
                                    : "text-slate-600",
                                  "transition-colors"
                                )}
                                title="Add to environment"
                              >
                                <PackagePlusIcon className="h-4 w-4" />
                              </Button>
                            )}

                            {renderActionButtons(pair, index)}
                          </div>

                          {renderMobileActions(pair, index)}
                        </div>
                      </div>
                    </SortableItem>
                  );
                })}
              </SortableContextClient>
            </DndContextClient>
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
          onPurge={handlePurge}
        />
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
