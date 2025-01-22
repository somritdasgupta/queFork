import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Layers } from "lucide-react";
import { useState } from "react";
import { CollectionsPanel } from "./collections-panel";
import { HistoryPanel } from "./history-panel";
import { Collection, HistoryItem, SavedRequest } from "@/types";

interface MobileNavProps {
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
}

export function MobileNav({
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
}: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<"collections" | "history">(
    "collections"
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className="bg-slate-900 hover:bg-slate-800 border-1 border-slate-700 md:hidden transition-colors"
        >
          <Layers className="h-8 text-slate-400" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="w-[100vw] p-0 h-[92vh] rounded-t-lg">
        <SheetHeader className="px-4 py-2 border-b border-gray-200 sticky top-0 bg-white z-10 rounded-t-lg">
          <div className="flex items-center justify-between rounded-lg">
            <SheetTitle className="text-lg font-semibold rounded-lg">
              {activePanel === "collections" ? "Collections" : "History"}
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setOpen(false)}
            ></Button>
          </div>
          <div className="flex gap-2 mt-2 bg-slate-50 border-slate-200 border-2 rounded-lg p-1">
            <Button
              variant={activePanel === "collections" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActivePanel("collections")}
              className="flex-1 text-slate-400"
            >
              Collections
            </Button>
            <Button
              variant={activePanel === "history" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActivePanel("history")}
              className="flex-1 text-slate-400"
            >
              History
            </Button>
          </div>
        </SheetHeader>
        <div className="h-[calc(100%-120px)] mb-8 overflow-y-auto">
          {activePanel === "collections" ? (
            <CollectionsPanel
              collections={collections}
              onSelectRequest={(request) => {
                onSelectRequest(request);
                setOpen(false);
              }}
              onSaveRequest={onSaveRequest}
              onCreateCollection={onCreateCollection}
              onDeleteCollection={onDeleteCollection}
              onDeleteRequest={onDeleteRequest}
            />
          ) : (
            <HistoryPanel
              history={history}
              onSelectItem={(item) => {
                onSelectHistoryItem(item);
                setOpen(false);
              }}
              onClearHistory={onClearHistory}
              onDeleteItem={onDeleteHistoryItem}
              isMobile={true}
              onToggleHistorySaving={function (): void {
                throw new Error("Function not implemented.");
              }}
              isHistorySavingEnabled={false}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
