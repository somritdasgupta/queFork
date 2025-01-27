import React, { useState } from "react";
import { CollectionsPanel } from "@/components/collections-panel";
import { HistoryPanel } from "@/components/history-panel";
import { Collection, HistoryItem, SavedRequest } from "@/types";
import { FolderOpen, History } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DesktopSidePanelProps {
  collections: Collection[];
  history: HistoryItem[];
  onSelectRequest: (request: SavedRequest) => void;
  onSelectHistoryItem: (item: HistoryItem) => void;
  onClearHistory: () => void;
  onCreateCollection: (collection: Partial<Collection>) => void;
  onSaveRequest: (collectionId: string, request: Partial<SavedRequest>) => void;
  onDeleteCollection: (collectionId: string) => void;
  onDeleteRequest: (collectionId: string, requestId: string) => void;
  onDeleteHistoryItem: (id: string) => void;
  isHistorySavingEnabled: boolean;
  onToggleHistorySaving: (enabled: boolean) => void;
  onExportCollections: () => void;
  onExportHistory: () => void;
  onExportCollection: (collectionId: string) => void;
}

const DesktopSidePanel = ({ ...props }: DesktopSidePanelProps) => {
  const [activePanel, setActivePanel] = useState<"collections" | "history">(
    "collections"
  );

  const tabs = [
    {
      id: "collections" as const,
      label: "Collections",
      icon: <FolderOpen className="h-4 w-4" />,
      content: <CollectionsPanel {...props} />,
    },
    {
      id: "history" as const,
      label: "History",
      icon: <History className="h-4 w-4" />,
      content: (
        <HistoryPanel
          {...props}
          onSelectItem={props.onSelectHistoryItem}
          onDeleteItem={props.onDeleteHistoryItem}
          onExportHistory={props.onExportHistory}
        />
      ),
    },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-900/40">
      <div className="flex flex-col h-full">
        <div className="bg-slate-950">
          <Tabs className="flex w-full">
            <TabsList className="flex w-full justify-start rounded-none bg-slate-800 border-b-2 border-slate-700 p-0">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  onClick={() => setActivePanel(tab.id)}
                  className="rounded-none border-b-4 border-transparent px-4 py-2 font-medium text-xs md:text-sm data-[state=active]:border-blue-400 data-[state=active]:text-blue-400 data-[state=active]:bg-slate-800"
                  data-state={activePanel === tab.id ? "active" : "inactive"}
                >
                  <div className="flex items-center gap-2">
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
    </div>
  );
};

export default DesktopSidePanel;
