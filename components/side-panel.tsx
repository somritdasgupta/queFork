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

export const SidePanel: React.FC<SidePanelProps> = ({
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
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldShowLabels, setShouldShowLabels] = useState(true);
  const [activePanel, setActivePanel] = useState<
    "tabs" | "collections" | "history" | "environments"
  >("tabs");

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
      // Switch to collections panel
      setActivePanel("collections");

      // Only open sheet if we're in mobile mode and the event indicates mobile
      if (isMobile && e.detail.isMobile) {
        setIsOpen(true);
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
  }, [isMobile]);

  useEffect(() => {
    const handleSaveAndShow = (e: CustomEvent) => {
      const { request, isMobile } = e.detail;

      // Set panel and open sheet if mobile
      setActivePanel("collections");
      if (isMobile && isMobile) {
        setIsOpen(true);
      }

      // Small delay to ensure panel switch is complete
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("showCollectionSaveForm", {
            detail: request,
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
  }, [isMobile]);

  useEffect(() => {
    const handleEnvironmentAction = (e: CustomEvent) => {
      // First, switch the panel and open sheet if needed
      setActivePanel("environments");
      if (isMobile && e.detail.isMobile) {
        setIsOpen(true);
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
  }, [isMobile]);

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
            if (isMobile) setIsOpen(false);
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
          <TabsList className="flex w-full justify-start bg-slate-900/70 rounded-none border-b border-slate-700 p-0">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                onClick={() => setActivePanel(tab.id)}
                className={cn(
                  "flex-1 h-10 rounded-none border-b-4 border-transparent px-2 lg:px-4 py-2 font-medium text-xs text-slate-400",
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
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <div className="flex flex-col gap-2 w-full rounded-lg">
            <Button
              variant="default"
              size="icon"
              className="w-full h-8 px-4 border-2 border-slate-800 bg-slate-900 hover:bg-slate-800 transition-colors rounded-lg flex items-center justify-center"
            >
              <Layers
                className="h-4 w-4 transition-transform duration-200"
                strokeWidth={1}
                style={{
                  stroke: "white",
                  fill: "yellow",
                  fillOpacity: 0.25,
                }}
              />
            </Button>
          </div>
        </SheetTrigger>
        <SheetContent
          position="bottom"
          className="w-[100vw] p-0 h-[88vh] rounded-t-2xl bg-slate-950
            backdrop-blur-xl
            border-t-2 border-slate-800/60
            shadow-[0_-15px_50px_-15px_rgba(0,0,0,0.45)]
            animate-in slide-in-from-bottom duration-300
            overflow-hidden flex flex-col"
        >
          <SheetTitle className="sr-only">Side Panel</SheetTitle>
          <div className="flex flex-col h-full overflow-hidden">
            <div className="rounded-t-2xl flex-1 overflow-hidden">
              <PanelContent />
            </div>
            <div className="mt-auto flex justify-center relative">
              <Button
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="absolute -top-16 rounded-full w-4 
                  bg-slate-800/90 hover:bg-slate-700/90 
                  text-slate-400 hover:text-slate-300 
                  border border-slate-600/50 backdrop-blur-sm
                  transform hover:-translate-y-1 active:translate-y-0
                  transition-all duration-300 shadow-lg
                  group"
              >
                <X className="h-5 w-5 transition-transform group-hover:scale-90" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
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
