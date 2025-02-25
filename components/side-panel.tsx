import React, { useState, useEffect } from "react";
import { CollectionsPanel } from "@/components/collections-panel";
import { HistoryPanel } from "@/components/history-panel";
import type { SidePanelProps } from "@/types";
import {
  BoxesIcon,
  BoxIcon,
  Layers,
  RewindIcon,
  X,
  GalleryVerticalEnd,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnvironmentPanel } from "@/components/environment-panel";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VerticalTabList } from "@/components/tab-manager";

export const SidePanel: React.FC<
  SidePanelProps & {
    isOpen?: boolean;
    onClose?: () => void;
    defaultPanel?: "tabs" | "collections" | "history" | "environments";
  }
> = ({
  collections,
  history,
  onSelectRequest,
  onSelectHistoryItem,
  onClearHistory,
  onCreateCollection,
  onSaveRequest,
  onDeleteCollection,
  onDeleteRequest,
  onDeleteHistoryItem,
  isHistorySavingEnabled,
  onToggleHistorySaving,
  onExportCollections,
  onExportHistory,
  onExportCollection,
  environments,
  currentEnvironment,
  onEnvironmentChange,
  onEnvironmentsUpdate,
  onUpdateCollections,
  onImportCollections,
  isMobile,
  className,
  isOpen,
  onClose,
  defaultPanel,
}) => {
  const [shouldShowLabels, setShouldShowLabels] = useState(true);
  const [activePanel, setActivePanel] = useState<
    "tabs" | "collections" | "history" | "environments"
  >(defaultPanel || "tabs");

  useEffect(() => {
    const checkWidth = () => {
      if (typeof window !== "undefined") {
        setShouldShowLabels(window.innerWidth >= window.innerWidth * 0.25);
      }
    };

    checkWidth(); // Initial check
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  useEffect(() => {
    const handleSaveRequestAction = (e: CustomEvent) => {
      setActivePanel("collections");
      if (isMobile && e.detail.isMobile && onClose) {
        onClose();
      }
      // Forward the request data to CollectionsPanel
      window.dispatchEvent(
        new CustomEvent("saveRequest", {
          detail: e.detail.request,
        })
      );
    };

    window.addEventListener(
      "saveRequestAction",
      handleSaveRequestAction as EventListener
    );

    return () => {
      window.removeEventListener(
        "saveRequestAction",
        handleSaveRequestAction as EventListener
      );
    };
  }, [isMobile, onClose]);

  useEffect(() => {
    const handleSaveAndShow = (e: CustomEvent) => {
      setActivePanel("collections");

      // Small delay to ensure panel switch is complete
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("showCollectionSaveForm", {
            detail: {
              ...e.detail.request,
              isMobile: e.detail.isMobile,
            },
          })
        );
      }, 50);
    };

    window.addEventListener(
      "saveAndShowRequest",
      handleSaveAndShow as EventListener
    );
    return () => {
      window.removeEventListener(
        "saveAndShowRequest",
        handleSaveAndShow as EventListener
      );
    };
  }, []);

  useEffect(() => {
    const handleEnvironmentAction = (e: CustomEvent) => {
      setActivePanel("environments");
      if (isMobile && e.detail.isMobile && onClose) {
        onClose();
      }

      // Use a minimal timeout to ensure panel switch is complete
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("showEnvironmentSaveForm", {
            detail: {
              key: e.detail.key,
              value: e.detail.value,
              type: e.detail.type,
            },
          })
        );
      }, 0);
    };

    window.addEventListener(
      "environmentSaveAction",
      handleEnvironmentAction as EventListener
    );
    return () => {
      window.removeEventListener(
        "environmentSaveAction",
        handleEnvironmentAction as EventListener
      );
    };
  }, [isMobile, onClose]);

  const tabs = [
    {
      id: "tabs" as const,
      label: "Tabs",
      icon: (
        <GalleryVerticalEnd
          className="h-4 w-4"
          strokeWidth={2}
          style={{
            stroke: "currentColor",
            fill: "yellow",
            fillOpacity: 0.2,
          }}
        />
      ),
      content: <VerticalTabList />,
    },
    {
      id: "collections" as const,
      label: "Collections",
      icon: (
        <BoxesIcon
          className="h-4 w-4"
          strokeWidth={2}
          style={{
            stroke: "currentColor",
            fill: "yellow",
            fillOpacity: 0.2,
          }}
        />
      ),
      content: (
        <CollectionsPanel
          collections={collections}
          key="collections-panel"
          onSwitchToCollections={() => setActivePanel("collections")}
          onUpdateCollections={onUpdateCollections}
          onSelectRequest={onSelectRequest}
          onSaveRequest={onSaveRequest}
          onCreateCollection={onCreateCollection}
          onDeleteCollection={onDeleteCollection}
          onDeleteRequest={onDeleteRequest}
          onExportCollection={onExportCollection}
          onExportCollections={onExportCollections}
          onImportCollections={onImportCollections}
        />
      ),
    },
    {
      id: "history" as const,
      label: "History",
      icon: (
        <RewindIcon
          className="h-4 w-4"
          strokeWidth={2}
          style={{
            stroke: "currentColor",
            fill: "yellow",
            fillOpacity: 0.2,
          }}
        />
      ),
      content: (
        <HistoryPanel
          history={history}
          onClearHistory={onClearHistory}
          isHistorySavingEnabled={isHistorySavingEnabled}
          onToggleHistorySaving={onToggleHistorySaving}
          onSelectItem={(item) => {
            onSelectHistoryItem(item);
            if (isMobile && onClose) onClose();
          }}
          onDeleteItem={onDeleteHistoryItem}
          onExportHistory={onExportHistory}
        />
      ),
    },
    {
      id: "environments" as const,
      label: "Environments",
      icon: (
        <BoxIcon
          className="h-4 w-4"
          strokeWidth={2}
          style={{
            stroke: "currentColor",
            fill: "yellow",
            fillOpacity: 0.2,
          }}
        />
      ),
      content: (
        <EnvironmentPanel
          environments={environments}
          currentEnvironment={currentEnvironment}
          onEnvironmentChange={onEnvironmentChange}
          onEnvironmentsUpdate={onEnvironmentsUpdate}
        />
      ),
    },
  ];

  const PanelContent = () => (
    <div className="flex flex-col h-full">
      <div className="bg-slate-950">
        <Tabs className="flex w-full" defaultValue={activePanel}>
          <TabsList className="flex h-8 w-full overflow-x-auto justify-start bg-slate-900/70 rounded-none border-b border-slate-700 p-0">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                onClick={() => setActivePanel(tab.id)}
                className={cn(
                  "flex-1 h-8 rounded-none border-b-4 border-transparent px-2 lg:px-4 py-2 font-medium text-xs text-slate-400",
                  "data-[state=active]:border-blue-400",
                  "data-[state=active]:text-blue-400",
                  "data-[state=active]:bg-slate-800",
                  "hover:text-slate-300",
                  "hover:bg-slate-800",
                  "transition-colors"
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  {tab.icon}
                  {shouldShowLabels && <span className="truncate"></span>}
                </div>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <div className="flex-1 overflow-hidden bg-gradient-to-b from-slate-900 to-slate-900/90">
        {tabs.find((tab) => tab.id === activePanel)?.content}
      </div>
    </div>
  );

  if (isMobile) {
    return <PanelContent />;
  }

  return (
    <div
      className={cn("h-full flex flex-col bg-slate-900/40 w-full", className)}
    >
      <PanelContent />
    </div>
  );
};

export default SidePanel;
