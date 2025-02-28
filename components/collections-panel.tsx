"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { AccordionContent, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Trash2, Save, Copy, Download } from "lucide-react";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Collection, ImportSource, SavedRequest } from "@/types";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { cn } from "@/lib/utils";
import {
  NavigableElement,
  useKeyboardNavigation,
} from "./keyboard-navigation/keyboard-navigation";
import dynamic from "next/dynamic";

// Import components
import { RequestSaveForm } from "./collections-panel/request-save-form";
import { CollectionHeader } from "./collections-panel/collection-header";
import { RequestItem } from "./collections-panel/request-item";
import { ImportForm } from "./collections-panel/import-form";
import { SearchBar } from "./collections-panel/search-bar";
import { ToolbarButtons } from "./collections-panel/toolbar-buttons";
import { SortFilterBar } from "./collections-panel/sort-filter-bar";
import { EmptyState } from "./collections-panel/empty-state";
import { DeleteConfirmation } from "./collections-panel/delete-confirmation";

const DynamicAccordion = dynamic(
  () => import("@/components/ui/accordion").then((mod) => mod.Accordion),
  { ssr: false }
);

const DynamicAccordionItem = dynamic(
  () => import("@/components/ui/accordion").then((mod) => mod.AccordionItem),
  { ssr: false }
);

// Keep the CollectionsPanelProps interface
interface CollectionsPanelProps {
  collections: Collection[];
  onSelectRequest: (request: SavedRequest) => void;
  onSaveRequest: (collectionId: string, request: Partial<SavedRequest>) => void;
  onCreateCollection: (collection: {
    name: string;
    description: string;
    apiVersion: string;
  }) => Promise<string>;

  onDeleteCollection: (collectionId: string) => void;
  onDeleteRequest: (collectionId: string, requestId: string) => void;
  onUpdateCollections?: (collections: Collection[]) => void;
  onExportCollections: () => void;
  onExportCollection: (collectionId: string) => void;
  onSwitchToCollections?: () => void;
  onImportCollections: (source: ImportSource, data: string) => Promise<void>;
}

export function CollectionsPanel({ ...props }: CollectionsPanelProps) {
  // State declarations
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "method" | "date">("name");
  const [filterBy, setFilterBy] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const navigableElements = useRef<NavigableElement[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    type: "collection" | "request";
    parentId?: string;
  } | null>(null);

  // Effects
  useEffect(() => {
    setActiveRequest((window as any).__ACTIVE_REQUEST__);
  }, []);

  // Handlers and memoized values
  const handleCreateCollection = useCallback(
    async (collection: {
      name: string;
      description: string;
      apiVersion: string;
    }) => {
      await props.onCreateCollection(collection);
      setIsCreating(false);
      toast.success("Collection created successfully");
    },
    [props.onCreateCollection]
  );

  const handleDeleteCollection = useCallback(
    (collectionId: string) => {
      props.onDeleteCollection(collectionId);
      toast.success("Collection deleted successfully");
      setDeleteConfirm(null);
    },
    [props.onDeleteCollection]
  );

  const handleDeleteRequest = useCallback(
    (collectionId: string, requestId: string) => {
      props.onDeleteRequest(collectionId, requestId);
      toast.success("Request deleted");
      setDeleteConfirm(null);
    },
    [props.onDeleteRequest]
  );

  const handleQuickSave = useCallback(
    (collectionId: string) => {
      if (!activeRequest?.url) {
        toast.error("No active request to save");
        return;
      }

      const urlObj = new URL(activeRequest.url);
      const friendlyName =
        urlObj.pathname.split("/").filter(Boolean).pop() ||
        urlObj.hostname.split(".")[0] ||
        "Untitled Request";

      const savedRequest: Partial<SavedRequest> = {
        id: uuidv4(),
        method: activeRequest.method,
        url: activeRequest.url,
        name: friendlyName,
        headers: activeRequest.headers || [],
        params: activeRequest.params || [],
        body: activeRequest.body,
        auth: activeRequest.auth,
        timestamp: Date.now(),
        response: activeRequest.response,
        statusCode: activeRequest.response?.status || 0,
        runConfig: {
          iterations: 1,
          delay: 0,
          parallel: false,
          environment: null,
        },
      };

      props.onSaveRequest(collectionId, savedRequest);
      toast.success(`Saved "${friendlyName}" to collection`);
    },
    [activeRequest, props.onSaveRequest]
  );

  const canQuickSave = useMemo(() => {
    return activeRequest?.url && activeRequest?.method;
  }, [activeRequest]);

  const handleDuplicateCollection = useCallback(
    (collection: Collection) => {
      const duplicate = {
        name: `${collection.name} (Copy)`,
        description: collection.description || "",
        apiVersion: collection.apiVersion || "",
        copySource: true,
      };
      props.onCreateCollection(duplicate);
      toast.success("Collection duplicated");
    },
    [props.onCreateCollection]
  );

  // ... keep keyboard navigation logic ...
  const { setFocus } = useKeyboardNavigation(
    navigableElements.current,
    (direction, currentId) => {
      const currentElement = navigableElements.current.find(
        (el) => el.id === currentId
      );
      if (!currentElement) return;

      let nextId: string | undefined;

      switch (direction) {
        case "down":
          nextId = navigableElements.current.find(
            (el) =>
              el.parentId === currentElement.parentId &&
              navigableElements.current.indexOf(el) >
                navigableElements.current.indexOf(currentElement)
          )?.id;
          break;
        case "up":
          const reversedElements = [...navigableElements.current].reverse();
          nextId = reversedElements.find(
            (el) =>
              el.parentId === currentElement.parentId &&
              navigableElements.current.indexOf(el) <
                navigableElements.current.indexOf(currentElement)
          )?.id;
          break;
        case "right":
          if (currentElement.type === "collection") {
          }
          break;
        case "left":
          if (currentElement.type === "request") {
            nextId = currentElement.parentId;
          }
          break;
      }

      if (nextId) {
        setFocus(nextId);
      }
    },
    (id) => {
      const element = navigableElements.current.find((el) => el.id === id);
      if (element?.type === "request") {
        const request = props.collections
          .flatMap((c) => c.requests)
          .find((r) => r.id === id);
        if (request) {
          props.onSelectRequest(request);
        }
      }
    },
    (id) => {
      const element = navigableElements.current.find((el) => el.id === id);
      if (element?.type === "collection") {
        handleDeleteCollection(id);
      } else if (element?.type === "request" && element.parentId) {
        handleDeleteRequest(element.parentId, id);
      }
    }
  );

  const filteredCollections = useMemo(() => {
    return props.collections
      .filter((collection: Collection) => {
        const nameMatch = collection.name
          .toLowerCase()
          .includes(search.toLowerCase());
        const methodMatch = filterBy
          ? collection.requests?.some((request) => request.method === filterBy)
          : true;
        return nameMatch && methodMatch;
      })
      .sort((a: Collection, b: Collection) => {
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        } else if (sortBy === "method") {
          return (a.requests[0]?.method || "").localeCompare(
            b.requests[0]?.method || ""
          );
        } else {
          return (
            new Date(b.lastModified || 0).getTime() -
            new Date(a.lastModified || 0).getTime()
          );
        }
      });
  }, [props.collections, search, filterBy, sortBy]);

  return (
    <div className="h-full flex flex-col bg-slate-900/50">
      <div className="p-1.5 space-y-1.5 border-b border-slate-800">
        <div className="flex items-center gap-1.5">
          <SearchBar value={search} onChange={setSearch} />
          <ToolbarButtons
            onCreateClick={() => setIsCreating(true)}
            onImportClick={() => setIsImporting(true)}
            onExportClick={props.onExportCollections}
          />
        </div>
        <SortFilterBar
          sortBy={sortBy}
          onSortChange={setSortBy}
          filterBy={filterBy}
          onFilterChange={setFilterBy}
        />
      </div>

      <ScrollArea className="flex-1">
        {isImporting && (
          <ImportForm
            onClose={() => setIsImporting(false)}
            onImport={props.onImportCollections}
          />
        )}

        {isCreating && (
          <RequestSaveForm
            mode="collection-only"
            collections={[]}
            onClose={() => setIsCreating(false)}
            onCreateCollection={handleCreateCollection}
            onSaveToCollection={() => {}}
            pendingRequest={{}}
            className="border-none"
          />
        )}

        {props.collections.length === 0 && !isCreating ? (
          <EmptyState onCreateClick={() => setIsCreating(true)} />
        ) : (
          <DynamicAccordion
            type="multiple"
            className="divide-y divide-slate-800"
          >
            {filteredCollections.map((collection) => (
              <DynamicAccordionItem
                key={collection.id}
                value={collection.id}
                className="border-0"
              >
                <div className="flex items-center justify-between py-0.5">
                  <AccordionTrigger className="flex-1 px-2 py-1 text-slate-500 hover:no-underline">
                    <CollectionHeader
                      collection={collection}
                      onAction={() => {}}
                    />
                  </AccordionTrigger>
                  <div className="flex items-center gap-1 px-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickSave(collection.id);
                      }}
                      disabled={!canQuickSave}
                      className="h-7 w-7 p-0 hover:bg-slate-800"
                      title={
                        canQuickSave
                          ? "Save current request"
                          : "No active request"
                      }
                    >
                      <Save
                        className={cn(
                          "h-3.5 w-3.5",
                          canQuickSave ? "text-blue-400" : "text-slate-500"
                        )}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateCollection(collection);
                      }}
                      className="h-7 w-7 p-0 hover:bg-slate-800"
                    >
                      <Copy className="h-3.5 w-3.5 text-emerald-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        props.onExportCollection(collection.id);
                      }}
                      className="h-7 w-7 p-0 hover:bg-slate-800"
                    >
                      <Download className="h-3.5 w-3.5 text-purple-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm({
                          id: collection.id,
                          type: "collection",
                        });
                      }}
                      className="h-7 w-7 p-0 hover:bg-slate-800"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </Button>
                  </div>
                </div>
                {deleteConfirm?.id === collection.id &&
                  deleteConfirm.type === "collection" && (
                    <div className="border-t border-slate-700">
                      <DeleteConfirmation
                        type="collection"
                        onCancel={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(null);
                        }}
                        onConfirm={(e) => {
                          e.stopPropagation();
                          handleDeleteCollection(collection.id);
                        }}
                      />
                    </div>
                  )}
                <AccordionContent className="pt-0 pb-0">
                  <div className="bg-slate-900/75 divide-y divide-slate-800">
                    {collection.requests?.length > 0 ? (
                      collection.requests.map((request) => (
                        <div key={request.id}>
                          <RequestItem
                            request={request}
                            collection={collection}
                            onSelectRequest={props.onSelectRequest}
                            onDeleteRequest={handleDeleteRequest}
                            onUpdateCollections={props.onUpdateCollections}
                            deleteConfirm={deleteConfirm}
                            setDeleteConfirm={setDeleteConfirm}
                            navigableElements={navigableElements}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="py-2 text-xs text-slate-500 text-center">
                        No requests in this collection
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </DynamicAccordionItem>
            ))}
          </DynamicAccordion>
        )}
      </ScrollArea>
    </div>
  );
}
