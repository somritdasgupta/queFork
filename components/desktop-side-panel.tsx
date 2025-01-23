import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CollectionsPanel } from "@/components/collections-panel";
import { HistoryPanel } from "@/components/history-panel";
import { Collection, HistoryItem, SavedRequest } from "@/types";
import { FolderOpen, History } from "lucide-react";

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
      icon: <FolderOpen className="h-4 w-4 text-emerald-500" />,
      content: <CollectionsPanel {...props} />,
    },
    {
      id: "history" as const,
      label: "History",
      icon: <History className="h-4 w-4 text-blue-500" />,
      content: <HistoryPanel {...props} onSelectItem={props.onSelectHistoryItem} onDeleteItem={props.onDeleteHistoryItem} onExportHistory={props.onExportHistory} />,
    },
  ];

  return (
    <div className="h-full flex flex-col glass-panel">
      <div className="panel-header">
        <div className="tab-container">
          <div className="grid grid-cols-2 tab-list">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activePanel === tab.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setActivePanel(tab.id)}
                className="tab-button"
              >
                {tab.icon}
                <span className="ml-1.5">{tab.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
      <div className="panel-body">
        {tabs.find((tab) => tab.id === activePanel)?.content}
      </div>
    </div>
  );
};

export default DesktopSidePanel;

