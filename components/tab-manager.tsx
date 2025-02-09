import React, { useState, useCallback, useEffect, useRef } from "react";
import { Tab, TabContextType } from "@/types";
import {
  X,
  Plus,
  Copy,
  ChevronsLeft,
  ChevronsRight,
  GripHorizontal,
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
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers"; // Add this import
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

const formatDomain = (url: string): string => {
  try {
    const urlObj = new URL(url.replace(/^ws(s)?:\/\//i, "http$1://"));
    const parts = urlObj.hostname.split(".");
    return parts.length > 2 ? parts[parts.length - 2] : parts[0];
  } catch {
    return url.split("/")[0];
  }
};

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
  const getDefaultTabState = (): Tab["state"] => ({
    method: "GET",
    url: "",
    headers: [
      { key: "", value: "", enabled: true, showSecrets: false, type: "" },
    ],
    params: [
      { key: "", value: "", enabled: true, showSecrets: false, type: "" },
    ],
    body: { type: "none", content: "" },
    auth: { type: "none" },
    isWebSocketMode: false,
    response: null,
    isLoading: false,
    preRequestScript: "",
    testScript: "",
    testResults: [],
    scriptLogs: [],
  });

  // Create a default tab with a stable ID for SSR
  const defaultTab = {
    id: "default-tab",
    title: "New Request",
    type: "rest" as const,
    active: true,
    state: getDefaultTabState(),
    lastAccessed: 0, // Use 0 instead of Date.now() for SSR consistency
  };

  // Use useEffect for client-side initialization
  const [tabs, setTabs] = useState<Tab[]>([defaultTab]);
  const [activeTab, setActiveTab] = useState<string>(defaultTab.id);

  // Move localStorage operations to useEffect
  useEffect(() => {
    const storedTabs = getStoredTabs();
    if (storedTabs.length > 0) {
      setTabs(storedTabs);
      const activeStoredTab =
        storedTabs.find((t) => t.active)?.id || storedTabs[0]?.id;
      setActiveTab(activeStoredTab);
    }
  }, []);

  // Save tabs to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      // Clean tabs before saving
      const tabsToSave = tabs
        .slice(-MAX_TABS) // Keep only the last MAX_TABS
        .map(cleanTabForStorage);

      const serializedTabs = JSON.stringify(tabsToSave);

      // Check size before saving
      if (serializedTabs.length * 2 > MAX_STORAGE_SIZE) {
        // If too large, remove old tabs until it fits
        while (
          tabsToSave.length > 1 &&
          serializedTabs.length * 2 > MAX_STORAGE_SIZE
        ) {
          tabsToSave.shift(); // Remove oldest tab
        }
        // Try saving again
        localStorage.setItem("api-tabs", JSON.stringify(tabsToSave));
      } else {
        localStorage.setItem("api-tabs", serializedTabs);
      }
    } catch (error) {
      console.warn("Failed to save tabs to localStorage:", error);
      // Attempt recovery by clearing old data
      try {
        localStorage.removeItem("api-tabs");
        // Keep only the active tab
        const activeTabData = tabs.find((t) => t.id === activeTab);
        if (activeTabData) {
          localStorage.setItem(
            "api-tabs",
            JSON.stringify([cleanTabForStorage(activeTabData)])
          );
        }
      } catch (e) {
        console.error("Failed to recover storage:", e);
      }
    }
  }, [tabs, activeTab]);

  const addTab = useCallback((tabData?: Partial<Tab>) => {
    const newTab: Tab = {
      id: uuidv4(),
      title: tabData?.title || "New Request",
      type: tabData?.type || "rest",
      active: true,
      lastAccessed: Date.now(),
      state: {
        ...getDefaultTabState(),
        ...tabData?.state,
      },
      ...tabData,
    };

    setTabs((prev) =>
      prev.map((t) => ({ ...t, active: false })).concat(newTab)
    );
    setActiveTab(newTab.id);
  }, []);

  const removeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        const newTabs = prev.filter((t) => t.id !== id);
        // Ensure we don't exceed max tabs
        if (newTabs.length > MAX_TABS) {
          newTabs.splice(0, newTabs.length - MAX_TABS);
        }
        if (newTabs.length === 0) {
          return [
            {
              id: uuidv4(),
              title: "New Request",
              type: "rest",
              active: true,
              lastAccessed: Date.now(),
              state: getDefaultTabState(),
            },
          ];
        }
        if (id === activeTab) {
          const activeIndex = prev.findIndex((t) => t.id === id);
          const newActiveTab = prev[activeIndex - 1] || prev[activeIndex + 1];
          if (newActiveTab) {
            newActiveTab.active = true;
            setActiveTab(newActiveTab.id);
          }
        }
        return newTabs;
      });
    },
    [activeTab]
  );

  const updateTab = useCallback((id: string, updates: Partial<Tab>) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === id ? { ...tab, ...updates } : tab))
    );
  }, []);

  const duplicateTab = useCallback(
    (id: string) => {
      const tab = tabs.find((t) => t.id === id);
      if (tab) {
        addTab({
          ...tab,
          id: uuidv4(),
          title: `${tab.title} (copy)`,
          active: true,
        });
      }
    },
    [tabs, addTab]
  );

  useEffect(() => {
    const cleanup = setInterval(
      () => {
        setTabs((current) => {
          // Remove tabs older than 15 days
          const fifteenDaysAgo = Date.now() - 15 * 24 * 60 * 60 * 1000;
          return current.filter((tab) => {
            const lastAccessed = tab.lastAccessed || Date.now();
            return lastAccessed > fifteenDaysAgo || tab.id === activeTab;
          });
        });
      },
      24 * 60 * 60 * 1000
    ); // Run once per day

    return () => clearInterval(cleanup);
  }, [activeTab]);

  // Update last accessed time when switching tabs
  const setActiveTabWithTimestamp = useCallback((id: string) => {
    setActiveTab(id);
    setTabs((current) =>
      current.map((tab) =>
        tab.id === id ? { ...tab, lastAccessed: Date.now() } : tab
      )
    );
  }, []);

  return (
    <TabContext.Provider
      value={{
        tabs,
        activeTab,
        addTab,
        removeTab,
        updateTab,
        setActiveTab: setActiveTabWithTimestamp,
        duplicateTab,
        setTabs, // Add setTabs to the context
      }}
    >
      {children}
    </TabContext.Provider>
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

  // Get status helper function
  const getTabStatus = (tab: Tab) => {
    // Update WebSocket status check
    if (tab.state.isWebSocketMode) {
      const wsState = tab.state.wsState;
      if (wsState) {
        switch (wsState.connectionStatus) {
          case "connected":
            return { color: "bg-green-500", tooltip: "WebSocket Connected" };
          case "connecting":
            return {
              color: "bg-yellow-500 animate-pulse",
              tooltip: "Connecting...",
            };
          case "error":
            return { color: "bg-red-500", tooltip: "Connection Error" };
          default:
            return { color: "bg-slate-500", tooltip: "Disconnected" };
        }
      }
      // Show different color when WebSocket mode is enabled but not yet connected
      return { color: "bg-purple-500/50", tooltip: "WebSocket Mode" };
    }

    // Rest of the status checks remain the same
    if (tab.state.isLoading) {
      return { color: "bg-blue-500 animate-pulse", tooltip: "Loading" };
    }
    if (tab.state.response) {
      const status = tab.state.response.status;
      if (status >= 200 && status < 300) {
        return { color: "bg-emerald-500", tooltip: `Success (${status})` };
      }
      if (status >= 400) {
        return { color: "bg-red-500", tooltip: `Error (${status})` };
      }
    }
    return { color: "bg-slate-500", tooltip: "Ready" };
  };

  const status = getTabStatus(tab);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center min-w-[180px] max-w-[320px] h-8 px-2",
        "border-r border-slate-800 select-none",
        tab.id === activeTab
          ? "bg-slate-900 border-b-2 border-b-blue-500"
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
        <GripHorizontal className="h-4 w-4 text-slate-600" />
      </div>

      <button
        onClick={() => onSelect(tab.id)}
        className="flex-1 flex items-center min-w-0 h-full gap-2 px-2"
      >
        <div
          className={cn("w-2 h-2 rounded-full transition-colors", status.color)}
          title={status.tooltip}
        />
        <div className="truncate text-sm flex items-center gap-2">
          <span
            className={cn(
              "font-mono text-xs px-2 rounded-full border font-black",
              tab.state.isWebSocketMode
                ? "text-purple-400 border-purple-500/20"
                : getMethodColorClass(tab.state.method)
            )}
          >
            {tab.state.isWebSocketMode ? "WS" : tab.state.method || "GET"}
          </span>
          {tab.state.url && (
            <span className="text-slate-400 text-xs truncate">
              {formatDomain(tab.state.url)}
            </span>
          )}
        </div>
      </button>

      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onDuplicate(tab.id)}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-400"
          title="Duplicate tab"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onClose(tab.id)}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-400"
          title="Close tab"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
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
    <div className="flex items-center bg-slate-950 border-b border-slate-800">
      {canScrollLeft && (
        <button
          onClick={() => handleScroll("left")}
          className="p-2 hover:bg-slate-800 text-slate-400"
        >
          <ChevronsLeft className="h-4 w-4" />
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
          className="p-2 hover:bg-slate-800 text-slate-400"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      )}

      <button
        onClick={() => addTab()}
        className={cn(
          "p-2 hover:bg-slate-800 text-slate-400",
          canScrollRight ? "border-l border-slate-800" : ""
        )}
        title="New tab"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
};

const getMethodColorClass = (method: string) => {
  switch (method) {
    case "GET":
      return "text-emerald-400 border-emerald-500/20";
    case "POST":
      return "text-blue-400 border-blue-500/20";
    case "PUT":
      return "text-yellow-400 border-yellow-500/20";
    case "DELETE":
      return "text-red-400 border-red-500/20";
    case "PATCH":
      return "text-purple-400 border-purple-500/20";
    default:
      return "text-slate-400 border-slate-500/20";
  }
};
