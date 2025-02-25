import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { Tab, TabContextType } from "@/types";
import {
  X,
  Plus,
  Copy,
  ChevronsLeft,
  ChevronsRight,
  GripHorizontal,
  Search,
  GripVertical,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DndContextProps,
  MeasuringStrategy,
} from "@dnd-kit/core";
import {
  restrictToHorizontalAxis,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers"; // Add this import
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  formatDomain,
  getMethodColorClass,
  getTabStatus,
} from "@/lib/tab-utils";

class CustomPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: "onPointerDown" as const,
      handler: ({ nativeEvent: event }: { nativeEvent: PointerEvent }) => {
        // Add touch support and improve grip handle detection
        const isTouch = event.pointerType === "touch";
        const gripHandle = (event.target as HTMLElement).closest(
          "[data-grab-handle]"
        );

        return !!(
          event.button === 1 || // Middle mouse button
          (event.button === 0 && event.metaKey) || // Left click + meta key
          (event.button === 0 && gripHandle) || // Left click on grip
          (isTouch && gripHandle) // Touch on grip handle
        );
      },
    },
  ];
}

const TabContext = React.createContext<
  | (TabContextType & {
      setTabs: React.Dispatch<React.SetStateAction<Tab[]>>;
    })
  | undefined
>(undefined);

export const useTabManager = () => {
  const context = React.useContext(TabContext);
  if (!context)
    throw new Error("useTabManager must be used within TabProvider");
  return context;
};

const MAX_TABS = 50; // Maximum number of tabs to keep
const MAX_STORAGE_SIZE = 4.5 * 1024 * 1024; // 4.5MB limit to be safe

const cleanTabForStorage = (tab: Tab): Tab => {
  return {
    ...tab,
    state: {
      ...tab.state,
      // Clear response data and other large objects
      response: null,
      scriptLogs: [],
      // Keep only essential data
      headers: tab.state.headers?.slice(0, 20) || [],
      params: tab.state.params?.slice(0, 20) || [],
      body: {
        type: tab.state.body?.type || "none",
        content:
          typeof tab.state.body?.content === "string"
            ? tab.state.body.content.slice(0, 1000) // Limit content size
            : "",
      },
    },
  };
};

const getStoredTabs = (): Tab[] => {
  // Remove the window check since this will only run on the client side
  try {
    const savedTabs = localStorage.getItem("api-tabs");
    if (savedTabs) {
      return JSON.parse(savedTabs);
    }
  } catch (e) {
    console.warn("Failed to load stored tabs:", e);
  }
  return [];
};

export const TabProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Create a default tab with a stable ID for SSR
  const defaultTab = {
    id: "default-tab",
    title: "New Request",
    type: "rest" as const,
    active: true,
    lastAccessed: Date.now(), // This causes hydration mismatch
    state: {
      method: "GET",
      url: "",
      headers: [
        { key: "", value: "", enabled: true, showSecrets: false, type: "" },
      ],
      params: [
        { key: "", value: "", enabled: true, showSecrets: false, type: "" },
      ],
      body: { type: "none" as const, content: "" },
      auth: { type: "none" as const },
      isWebSocketMode: false,
      response: null,
      isLoading: false,
    },
  };

  // Use null as initial state and initialize in useEffect
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState(false);

  // Move initialization to useEffect to avoid hydration mismatch
  useEffect(() => {
    if (!isInitialized) {
      const storedTabs = getStoredTabs();
      if (storedTabs.length > 0) {
        setTabs(storedTabs);
        const activeStoredTab =
          storedTabs.find((t) => t.active)?.id || storedTabs[0]?.id;
        setActiveTab(activeStoredTab);
      } else {
        // Set default tab with current timestamp only on client side
        setTabs([{ ...defaultTab, lastAccessed: Date.now() }]);
        setActiveTab(defaultTab.id);
      }
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Add useEffect to save tabs to localStorage when they change
  useEffect(() => {
    if (isInitialized && tabs.length > 0) {
      try {
        // Clean tabs before storage to reduce size
        const cleanedTabs = tabs.map(cleanTabForStorage);
        localStorage.setItem("api-tabs", JSON.stringify(cleanedTabs));
      } catch (error) {
        console.warn("Failed to save tabs:", error);
      }
    }
  }, [tabs, isInitialized]);

  // Modify setActiveTab to properly handle tab activation
  const handleTabActivation = useCallback((tabId: string) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) => ({
        ...tab,
        active: tab.id === tabId,
        lastAccessed: tab.id === tabId ? Date.now() : tab.lastAccessed,
      }))
    );
    setActiveTab(tabId);

    // Reset the global request state when switching tabs
    if (typeof window !== "undefined" && window.__ACTIVE_REQUEST__) {
      window.__ACTIVE_REQUEST__ = null;
    }
  }, []);

  // Add suppressHydrationWarning to the root div in TabBar component
  return (
    <TabContext.Provider
      value={{
        tabs,
        setTabs,
        activeTab,
        updateTab: useCallback((id: string, updates: Partial<Tab>) => {
          setTabs((prev) =>
            prev.map((tab) => {
              if (tab.id === id) {
                // Ensure we create a deep copy of state properties
                const newState = {
                  ...tab.state,
                  ...updates.state,
                  headers: [...(updates.state?.headers || tab.state.headers)],
                  params: [...(updates.state?.params || tab.state.params)],
                  body: { ...(updates.state?.body || tab.state.body) },
                  auth: { ...(updates.state?.auth || tab.state.auth) },
                };

                return {
                  ...tab,
                  ...updates,
                  state: newState,
                  lastAccessed: Date.now(),
                };
              }
              return tab;
            })
          );
        }, []),
        addTab: useCallback((options = {}) => {
          const newTab: Tab = {
            id: uuidv4(),
            title: "New Request",
            type: "rest",
            active: true,
            lastAccessed: Date.now(),
            state: {
              method: "GET",
              url: "",
              headers: [
                {
                  key: "",
                  value: "",
                  enabled: true,
                  showSecrets: false,
                  type: "",
                },
              ],
              params: [
                {
                  key: "",
                  value: "",
                  enabled: true,
                  showSecrets: false,
                  type: "",
                },
              ],
              body: { type: "none", content: "" },
              auth: { type: "none" },
              isWebSocketMode: false,
              response: null,
              isLoading: false,
            },
            ...options,
          };

          setTabs((prev) => {
            const newTabs = [...prev, newTab];
            // Save to storage
            try {
              localStorage.setItem(
                "api-tabs",
                JSON.stringify(newTabs.map(cleanTabForStorage))
              );
            } catch (error) {
              console.warn("Failed to save tabs:", error);
            }
            return newTabs;
          });
          setActiveTab(newTab.id);
        }, []),
        removeTab: useCallback(
          (id: string) => {
            setTabs((prev) => {
              // Don't remove if it's the last tab
              if (prev.length <= 1) return prev;

              const filtered = prev.filter((t) => t.id !== id);
              const lastTab = filtered[filtered.length - 1];

              // Update active tab if removing the active one
              if (id === activeTab) {
                setActiveTab(lastTab.id);
              }

              // Save to storage
              try {
                localStorage.setItem(
                  "api-tabs",
                  JSON.stringify(filtered.map(cleanTabForStorage))
                );
              } catch (error) {
                console.warn("Failed to save tabs:", error);
              }

              return filtered;
            });
          },
          [activeTab]
        ),
        setActiveTab: handleTabActivation, // Replace the old setActiveTab
        duplicateTab: useCallback(
          (id: string) => {
            const tab = tabs.find((t) => t.id === id);
            if (tab) {
              const newTab = { ...tab, id: uuidv4(), lastAccessed: Date.now() };
              setTabs((prev) => [...prev, newTab]);
              setActiveTab(newTab.id);
            }
          },
          [tabs]
        ),
      }}
    >
      {children}
    </TabContext.Provider>
  );
};

export const TabBar: React.FC = () => {
  const {
    tabs,
    activeTab,
    addTab,
    removeTab,
    setActiveTab,
    duplicateTab,
    setTabs, // Get setTabs from context
  } = useTabManager();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const tabListRef = useRef<HTMLDivElement>(null);
  const leftObserverRef = useRef<HTMLDivElement>(null);
  const rightObserverRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Update scroll buttons visibility
  useEffect(() => {
    if (
      !tabListRef.current ||
      !leftObserverRef.current ||
      !rightObserverRef.current
    )
      return;

    const options = {
      root: tabListRef.current,
      threshold: 1.0,
    };

    const leftObserver = new IntersectionObserver(([entry]) => {
      setCanScrollLeft(!entry.isIntersecting);
    }, options);

    const rightObserver = new IntersectionObserver(([entry]) => {
      setCanScrollRight(!entry.isIntersecting);
    }, options);

    leftObserver.observe(leftObserverRef.current);
    rightObserver.observe(rightObserverRef.current);

    return () => {
      leftObserver.disconnect();
      rightObserver.disconnect();
    };
  }, [tabs]);

  const sensors = useSensors(
    useSensor(CustomPointerSensor, {
      activationConstraint: {
        distance: 5, // Increase for better touch control
        delay: 100, // Add small delay for touch
        tolerance: 8, // Increase tolerance for touch
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = () => {
    setIsDragging(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTabs((currentTabs: Tab[]) => {
        const oldIndex = currentTabs.findIndex((t) => t.id === active.id);
        const newIndex = currentTabs.findIndex((t) => t.id === over.id);

        return arrayMove(currentTabs, oldIndex, newIndex);
      });
    }
  };

  const handleScroll = (direction: "left" | "right") => {
    if (tabListRef.current) {
      const scrollAmount = direction === "left" ? -200 : 200;
      tabListRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div
      className="flex items-center bg-slate-900/75 border-b border-slate-800"
      suppressHydrationWarning
    >
      {canScrollLeft && (
        <button
          onClick={() => handleScroll("left")}
          className="p-1.5 hover:bg-slate-800 text-slate-400 border-r border-slate-800"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        modifiers={[restrictToHorizontalAxis]}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
        autoScroll={{
          enabled: true,
          threshold: { x: 0.2, y: 0 },
          acceleration: 10,
        }}
      >
        <div
          ref={tabListRef}
          className="flex-1 flex overflow-x-auto scrollbar-hide relative"
        >
          {/* Left observer */}
          <div ref={leftObserverRef} className="absolute left-0 h-full w-4" />

          <SortableContext
            items={tabs.map((t) => t.id)}
            strategy={horizontalListSortingStrategy}
          >
            <AnimatePresence initial={false}>
              {tabs.map((tab) => (
                <SortableTab
                  key={tab.id}
                  tab={tab}
                  activeTab={activeTab}
                  onSelect={setActiveTab}
                  onDuplicate={duplicateTab}
                  onClose={removeTab}
                />
              ))}
            </AnimatePresence>
          </SortableContext>

          {/* Right observer */}
          <div ref={rightObserverRef} className="absolute right-0 h-full w-4" />
        </div>
      </DndContext>

      {canScrollRight && (
        <button
          onClick={() => handleScroll("right")}
          className="p-1.5 hover:bg-slate-800 text-slate-400 border-l border-slate-800"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>
      )}

      <button
        onClick={() => addTab()}
        className={cn(
          "p-1.5 hover:bg-slate-800 text-slate-400 border-l border-slate-800",
          "hover:text-slate-300 transition-colors"
        )}
        title="New tab"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

interface SortableTabProps {
  tab: Tab;
  activeTab: string;
  onSelect: (id: string) => void;
  onDuplicate: (id: string) => void;
  onClose: (id: string) => void;
}

const SortableTab: React.FC<SortableTabProps> = ({
  tab,
  activeTab,
  onSelect,
  onDuplicate,
  onClose,
}) => {
  const { tabs } = useTabManager(); // Add this line to get tabs from context
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const style = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition: transition || undefined,
    zIndex: isDragging ? 2 : 1,
  };

  const status = getTabStatus(tab);
  const isLastTab = tabs.length === 1; // Now tabs is properly defined

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center min-w-[160px] max-w-[280px] h-7 px-1.5",
        "border-r border-slate-800 select-none",
        tab.id === activeTab
          ? "bg-slate-800/75 border-b-2 border-b-blue-500"
          : "hover:bg-slate-800/50",
        isDragging && "opacity-50"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        data-grab-handle
        className="px-1 cursor-grab hover:bg-slate-700/50 rounded"
      >
        <GripHorizontal className="h-3.5 w-3.5 text-slate-600" />
      </div>

      <button
        onClick={() => onSelect(tab.id)}
        className="flex-1 flex items-center min-w-0 h-full gap-1.5 px-1.5"
      >
        <div
          className={cn(
            "w-1.5 h-1.5 rounded-full transition-colors",
            status.color
          )}
          title={status.tooltip}
        />
        <div className="truncate text-sm flex items-center gap-1.5">
          <span
            className={cn(
              "font-mono text-[10px] px-1.5 rounded-full border font-medium",
              tab.state.isWebSocketMode
                ? "text-purple-400 border-purple-500/20"
                : getMethodColorClass(tab.state.method)
            )}
          >
            {tab.state.isWebSocketMode ? "WSS" : tab.state.method || "GET"}
          </span>
          {tab.state.url && (
            <span className="text-[10px] text-slate-400 truncate">
              {formatDomain(tab.state.url)}
            </span>
          )}
        </div>
      </button>

      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onDuplicate(tab.id)}
          className="p-1 hover:bg-slate-700 rounded text-slate-400"
          title="Duplicate tab"
        >
          <Copy className="h-3 w-3" />
        </button>
        {!isLastTab && ( // Only show close button if not the last tab
          <button
            onClick={() => onClose(tab.id)}
            className="p-1 hover:bg-slate-700 rounded text-slate-400"
            title="Close tab"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </motion.div>
  );
};

interface SortableTabItemProps {
  tab: Tab;
  activeTab: string;
  onSelect: (id: string) => void;
  onDuplicate: (id: string) => void;
  onClose: (id: string) => void;
}

export const SortableTabItem: React.FC<SortableTabItemProps> = ({
  tab,
  activeTab,
  onSelect,
  onDuplicate,
  onClose,
}) => {
  const { tabs } = useTabManager(); // Add this line to get tabs from context
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
  };

  const status = getTabStatus(tab);
  const isLastTab = tabs.length === 1; // Now tabs is properly defined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center w-full h-10 px-2 gap-2 group",
        "border-l-2 select-none transition-colors",
        tab.id === activeTab
          ? "bg-slate-800/50 border-blue-500"
          : "border-transparent hover:bg-slate-800/30",
        isDragging && "opacity-50"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="p-1 cursor-grab hover:bg-slate-700/50 rounded"
      >
        <GripVertical className="h-4 w-4 text-slate-600" />
      </div>

      <button
        onClick={() => onSelect(tab.id)}
        className="flex-1 flex items-center min-w-0 h-full gap-2"
      >
        <div
          className={cn("w-2 h-2 rounded-full transition-colors", status.color)}
          title={status.tooltip}
        />
        <div className="truncate text-sm flex items-center gap-2">
          <span
            className={cn(
              "font-mono text-xs px-2 rounded-full border",
              tab.state.isWebSocketMode
                ? "text-purple-400 border-purple-500/20"
                : getMethodColorClass(tab.state.method)
            )}
          >
            {tab.state.isWebSocketMode ? "WSS" : tab.state.method || "GET"}
          </span>
          <span className="text-slate-400 text-xs truncate">
            {tab.state.url ? formatDomain(tab.state.url) : "New Request"}
          </span>
        </div>
      </button>

      <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(tab.id);
          }}
          className="p-1 hover:bg-slate-700 rounded text-slate-400"
          title="Duplicate tab"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        {!isLastTab && ( // Only show close button if not the last tab
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose(tab.id);
            }}
            className="p-1 hover:bg-slate-700 rounded text-slate-400"
            title="Close tab"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export const VerticalTabList: React.FC = () => {
  const {
    tabs,
    activeTab,
    setActiveTab,
    addTab,
    removeTab,
    duplicateTab,
    setTabs,
  } = useTabManager();
  const [searchQuery, setSearchQuery] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredTabs = useMemo(() => {
    if (!searchQuery.trim()) return tabs;

    const query = searchQuery.toLowerCase();
    return tabs.filter(
      (tab) =>
        tab.state.url?.toLowerCase().includes(query) ||
        tab.state.method?.toLowerCase().includes(query)
    );
  }, [tabs, searchQuery]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTabs((currentTabs) => {
        const oldIndex = currentTabs.findIndex((t) => t.id === active.id);
        const newIndex = currentTabs.findIndex((t) => t.id === over.id);
        return arrayMove(currentTabs, oldIndex, newIndex);
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50">
      <div className="p-1.5 space-y-1.5 border-b border-slate-800">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tabs..."
              className="w-full bg-slate-900 text-xs rounded-md pl-7 pr-2 py-1.5
                border border-slate-800 focus:border-slate-700
                text-slate-300 placeholder:text-slate-500
                focus:outline-none focus:ring-1 focus:ring-slate-700"
            />
          </div>
          <button
            onClick={() => addTab()}
            className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400
              border border-slate-800"
            title="New tab"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext
            items={filteredTabs.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {filteredTabs.map((tab) => (
              <SortableTabItem
                key={tab.id}
                tab={tab}
                activeTab={activeTab}
                onSelect={setActiveTab}
                onDuplicate={duplicateTab}
                onClose={removeTab}
              />
            ))}
          </SortableContext>
        </DndContext>

        {filteredTabs.length === 0 && searchQuery && (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <p className="text-xs text-slate-500">No tabs match your search</p>
          </div>
        )}
      </div>
    </div>
  );
};
