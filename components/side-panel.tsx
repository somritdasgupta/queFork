import React, { useState } from "react";
import { CollectionsPanel } from "@/components/collections-panel";
import { HistoryPanel } from "@/components/history-panel";
import { SidePanelProps } from "@/types";
import { FolderOpen, History, BoxIcon, Layers, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnvironmentPanel } from "@/components/environment-panel";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EnvironmentSelector } from "@/components/environment-selector";

const SidePanel = (props: SidePanelProps): JSX.Element => {
  const [isOpen, setIsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<
    "collections" | "history" | "environments"
  >("collections");

  const tabs = [
    {
      id: "collections" as const,
      label: "Collections",
      icon: <FolderOpen className="h-4 w-4" />,
      content: (
        <CollectionsPanel
          {...props}
          key="collections-panel"
          onSwitchToCollections={() => setActivePanel("collections")}
        />
      ),
    },
    {
      id: "history" as const,
      label: "History",
      icon: <History className="h-4 w-4" />,
      content: (
        <HistoryPanel
          {...props}
          history={props.history}
          onClearHistory={props.onClearHistory}
          isHistorySavingEnabled={props.isHistorySavingEnabled}
          onToggleHistorySaving={props.onToggleHistorySaving}
          onSelectItem={(item) => {
            props.onSelectHistoryItem(item);
            if (props.isMobile) setIsOpen(false);
          }}
          onDeleteItem={props.onDeleteHistoryItem}
          onExportHistory={props.onExportHistory}
        />
      ),
    },
    {
      id: "environments" as const,
      label: "Environments",
      icon: <BoxIcon className="h-4 w-4" />,
      content: (
        <EnvironmentPanel
          environments={props.environments}
          currentEnvironment={props.currentEnvironment}
          onEnvironmentChange={props.onEnvironmentChange}
          onEnvironmentsUpdate={props.onEnvironmentsUpdate}
        />
      ),
    },
  ];

  const PanelContent = () => (
    <div className="flex flex-col h-full">
      <div className="bg-slate-950">
        <Tabs className="flex w-full" defaultValue={activePanel}>
          <TabsList className="flex w-full justify-start rounded-none bg-slate-900 border-b border-slate-700 p-0">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                onClick={() => setActivePanel(tab.id)}
                className={cn(
                  "flex-1 h-10 rounded-none border-b-4 border-transparent px-4 py-2 font-medium text-xs text-slate-400 whitespace-nowrap",
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
                  {tab.label}
                </div>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <div className="flex-1 overflow-hidden bg-slate-800">
        {tabs.find((tab) => tab.id === activePanel)?.content}
      </div>
    </div>
  );

  if (props.isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <div className="flex flex-col gap-2 w-full">
            <Button
              variant="default"
              size="icon"
              className="w-full h-10 p-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 md:hidden transition-colors rounded-md flex items-center justify-center"
            >
              <Layers className="h-5 w-5 text-slate-400" />
            </Button>
          </div>
        </SheetTrigger>
        <SheetContent
          position="bottom"
          className="w-[100vw] p-0 h-[90vh] bg-slate-800 border-t border-slate-700 rounded-t-lg"
        >
          <div className="flex flex-col h-full">
            <div className="rounded-t-lg overflow-hidden flex-1">
              <PanelContent />
            </div>
            <div className="mt-auto flex justify-center relative">
              <Button
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="absolute -top-8 rounded-full w-16 h-4 bg-slate-800 hover:bg-slate-700 
                  text-slate-400 hover:text-slate-300 border-2 border-slate-700
                  transform hover:-translate-y-1 active:translate-y-0
                  transition-all duration-300 animate-pulse"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className={cn(
        "h-full flex flex-col bg-slate-900/40 w-full",
        props.className
      )}
    >
      <PanelContent />
    </div>
  );
};

export default SidePanel;
