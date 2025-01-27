"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Layers, FolderOpen, History } from "lucide-react";
import { useState } from "react";
import { CollectionsPanel } from "./collections-panel";
import { HistoryPanel } from "./history-panel";
import { Collection, HistoryItem, SavedRequest } from "@/types";

interface MobileNavProps {
  collections: Collection[];
  history: HistoryItem[];
  className?: string;
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

interface NavItem {
  id: "collections" | "history";
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}

export function MobileNav({ ...props }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<"collections" | "history">(
    "collections"
  );

  const tabs = [
    {
      id: "collections" as const,
      label: "Collections",
      icon: <FolderOpen className="h-4 w-4 text-emerald-500" />,
      content: (
        <CollectionsPanel
          {...props}
          onSelectRequest={(req) => {
            props.onSelectRequest(req);
            setOpen(false);
          }}
          onExportCollection={props.onExportCollection}
        />
      ),
    },
    {
      id: "history" as const,
      label: "History",
      icon: <History className="h-4 w-4 text-blue-500" />,
      content: (
        <HistoryPanel
          {...props}
          onSelectItem={(item) => {
            props.onSelectHistoryItem(item);
            setOpen(false);
          }}
          onDeleteItem={props.onDeleteHistoryItem}
          onToggleHistorySaving={props.onToggleHistorySaving}
          isHistorySavingEnabled={props.isHistorySavingEnabled}
          onExportHistory={props.onExportHistory}
        />
      ),
    },
  ];

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
      <SheetContent
        side="bottom"
        className="w-[100vw] p-0 h-[92vh] rounded-t-lg bg-white/80"
      >
        <SheetHeader>
          <div className="flex items-center justify-between rounded-lg">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setOpen(false)}
            ></Button>
          </div>
          <div className="flex gap-2 mt-2 tab-container px-2">
            {tabs.map((item: NavItem) => (
              <Button
                key={item.id}
                variant={activePanel === item.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setActivePanel(item.id)}
                className="flex-1 tab-button mobile-tab-button"
              >
                {item.icon}
                <span className="ml-1.5">{item.label}</span>
              </Button>
            ))}
          </div>
        </SheetHeader>
        <div className="h-[calc(100%-120px)] mb-8 overflow-y-auto panel-body">
          {tabs.find((tab) => tab.id === activePanel)?.content}
        </div>
      </SheetContent>
    </Sheet>
  );
}
