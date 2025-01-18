import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CollectionsPanel } from "@/components/collections-panel";
import { HistoryPanel } from "@/components/history-panel";
import { Collection, HistoryItem, SavedRequest} from "@/types";

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
}

const DesktopSidePanel = ({
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
}: DesktopSidePanelProps) => {
  const [activePanel, setActivePanel] = useState<"collections" | "history">(
    "collections"
  );

  return (
    <div className="h-full flex flex-col bg-white border-2 rounded-lg">
      <div className="px-2 py-2">
        <div className="flex bg-blue-100 border-blue-200 border-2 shadow-inner shadow-lg rounded-lg p-1">
          <Button
            variant={activePanel === "collections" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActivePanel("collections")}
            className="flex-1"
          >
            Collections
          </Button>
          <Button
            variant={activePanel === "history" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActivePanel("history")}
            className="flex-1"
          >
            History
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {activePanel === "collections" ? (
          <CollectionsPanel
            collections={collections}
            onSelectRequest={onSelectRequest}
            onSaveRequest={onSaveRequest}
            onCreateCollection={onCreateCollection}
            onDeleteCollection={onDeleteCollection}
            onDeleteRequest={onDeleteRequest}
          />
        ) : (
          <HistoryPanel
            history={history}
            onSelectItem={onSelectHistoryItem}
            onClearHistory={onClearHistory}
            onDeleteItem={onDeleteHistoryItem}
            onToggleHistorySaving={onToggleHistorySaving}
            isHistorySavingEnabled={isHistorySavingEnabled}
          />
        )}
      </div>
    </div>
  );
};

export default DesktopSidePanel;
