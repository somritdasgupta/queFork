"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PanelRightClose } from "lucide-react";
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
          className="bg-blue-50 hover:bg-blue-100 active:bg-blue-200 border-2 border-blue-200 md:hidden transition-colors"
        >
          <PanelRightClose className="h-8 text-slate-800" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] p-0">
        <SheetHeader className="px-4 py-2 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">
              {activePanel === "collections" ? "Collections" : "History"}
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setOpen(false)}
            ></Button>
          </div>
          <div className="flex gap-2 mt-2 bg-blue-100 border-blue-200 border-2 shadow-inner shadow-lg rounded-lg p-1">
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
        </SheetHeader>
        <div className="h-[calc(100vh-5rem)]">
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
              onToggleHistorySaving={function (enabled: boolean): void {
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
