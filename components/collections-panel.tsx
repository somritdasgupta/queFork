"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AccordionContent, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Save,
  Filter,
  SortAsc,
  Trash2,
  FolderOpen,
  X,
  Copy,
  Download,
  Pencil,
  DownloadIcon,
  Upload,
  Check,
} from "lucide-react";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Collection, SavedRequest, ImportSource } from "@/types";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { cn } from "@/lib/utils";
import { NavigableElement, useKeyboardNavigation } from "./keyboard-navigation";
import dynamic from "next/dynamic";

// Dynamic import for components that need to be client-side only
const DynamicAccordion = dynamic(
  () => import("@/components/ui/accordion").then((mod) => mod.Accordion),
  {
    ssr: false,
  }
);

const DynamicAccordionItem = dynamic(
  () => import("@/components/ui/accordion").then((mod) => mod.AccordionItem),
  {
    ssr: false,
  }
);

interface CollectionsPanelProps {
  collections: Collection[];
  onSelectRequest: (request: SavedRequest) => void;
  onSaveRequest: (collectionId: string, request: Partial<SavedRequest>) => void;
  onCreateCollection: (collection: Partial<Collection>) => void;
  onDeleteCollection: (collectionId: string) => void;
  onDeleteRequest: (collectionId: string, requestId: string) => void;
  onUpdateCollections?: (collections: Collection[]) => void;
  onExportCollections: () => void;
  onExportCollection: (collectionId: string) => void;
  onSwitchToCollections?: () => void;
  onImportCollections: (source: ImportSource, data: string) => Promise<void>;
}

// Change the CollectionHeader to use div elements
const CollectionHeader = ({
  collection,
}: {
  collection: Collection;
  onAction: (action: string) => void;
}) => (
  <div className="flex items-center justify-between w-full">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-400 truncate">
          {collection.name}
        </span>
        {collection.apiVersion && (
          <Badge className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/20">
            v{collection.apiVersion}
          </Badge>
        )}
        <Badge
          variant="outline"
          className="text-[10px] px-1 bg-transparent border-slate-700 text-slate-400"
        >
          {collection.requests?.length || 0}
        </Badge>
      </div>
    </div>
  </div>
);

export function CollectionsPanel({ ...props }: CollectionsPanelProps) {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "method" | "date">("name");
  const [filterBy, setFilterBy] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [newCollection, setNewCollection] = useState({
    name: "",
    description: "",
    apiVersion: "",
  });
  const [pendingSaveRequest, setPendingSaveRequest] =
    useState<Partial<SavedRequest> | null>(null);
  const [requestName, setRequestName] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigableElements = useRef<NavigableElement[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    type: "collection" | "request";
    parentId?: string;
  } | null>(null);

  const [activeRequest, setActiveRequest] = useState<any>(null);

  useEffect(() => {
    // Access window only after component is mounted (client-side)
    setActiveRequest((window as any).__ACTIVE_REQUEST__);
  }, []);


  useEffect(() => {
    const handleSaveRequest = (e: CustomEvent) => {
      const requestData = e.detail;
      setPendingSaveRequest(requestData);
      setShowSaveForm(true);

      // Immediate focus attempt
      requestAnimationFrame(() => {
        const input = document.querySelector(
          'input[placeholder="Request name"]'
        ) as HTMLInputElement;
        if (input) {
          input.focus();
        }
      });
    };

    window.addEventListener("saveRequest", handleSaveRequest as EventListener);

    return () => {
      window.removeEventListener(
        "saveRequest",
        handleSaveRequest as EventListener
      );
    };
  }, []);

  useEffect(() => {
    const handleShowSaveForm = (e: CustomEvent) => {
      const requestData = e.detail;
      setPendingSaveRequest(requestData);
      setShowSaveForm(true);

      // Focus input after a very short delay to ensure form is rendered
      requestAnimationFrame(() => {
        const input = document.querySelector(
          'input[placeholder="Request name"]'
        ) as HTMLInputElement;
        if (input) {
          input.focus();
        }
      });
    };

    window.addEventListener(
      "showCollectionSaveForm",
      handleShowSaveForm as EventListener
    );

    return () => {
      window.removeEventListener(
        "showCollectionSaveForm",
        handleShowSaveForm as EventListener
      );
    };
  }, []);

  const handleCreateCollection = (initialRequest?: Partial<SavedRequest>) => {
    if (!newCollection.name) {
      toast.error("Collection name is required");
      return;
    }

    const completeRequest: SavedRequest | undefined = initialRequest
      ? {
          id: uuidv4(),
          statusCode: 0,
          timestamp: Date.now(),
          name: requestName || initialRequest.url || "Untitled Request",
          description: "",
          method: initialRequest.method || "GET",
          url: initialRequest.url || "",
          headers: initialRequest.headers || [],
          params: initialRequest.params || [],
          body: initialRequest.body || { type: "none", content: "" },
          auth: initialRequest.auth || { type: "none" },
          response: initialRequest.response,
          preRequestScript: initialRequest.preRequestScript || "",
          testScript: initialRequest.testScript || "",
          testResults: initialRequest.testResults || [],
          scriptLogs: initialRequest.scriptLogs || [],
        }
      : undefined;

    const collection: Partial<Collection> = {
      id: uuidv4(),
      name: newCollection.name,
      description: newCollection.description,
      apiVersion: newCollection.apiVersion,
      requests: completeRequest ? [completeRequest] : [],
      lastModified: new Date().toISOString(),
    };

    props.onCreateCollection(collection);
    setNewCollection({ name: "", description: "", apiVersion: "" });
    setIsCreating(false);
    toast.success(
      initialRequest
        ? "Request saved to new collection"
        : "Collection created successfully"
    );
  };

  const handleDeleteCollection = (collectionId: string) => {
    if (
      deleteConfirm?.id === collectionId &&
      deleteConfirm.type === "collection"
    ) {
      navigableElements.current = navigableElements.current.filter(
        (el) => el.id !== collectionId && el.parentId !== collectionId
      );
      props.onDeleteCollection(collectionId);
      toast.success("Collection deleted successfully");
      setDeleteConfirm(null);

      const nextElement = navigableElements.current[0];
      if (nextElement) {
        setFocus(nextElement.id);
      }
    } else {
      setDeleteConfirm({ id: collectionId, type: "collection" });
    }
  };

  const handleDeleteRequest = (collectionId: string, requestId: string) => {
    if (deleteConfirm?.id === requestId && deleteConfirm.type === "request") {
      navigableElements.current = navigableElements.current.filter(
        (el) => el.id !== requestId
      );
      props.onDeleteRequest(collectionId, requestId);
      toast.success("Request deleted");
      setDeleteConfirm(null);

      const collectionElement = navigableElements.current.find(
        (el) => el.id === collectionId
      );
      if (collectionElement) {
        setFocus(collectionElement.id);
      }
    } else {
      setDeleteConfirm({
        id: requestId,
        type: "request",
        parentId: collectionId,
      });
    }
  };

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

  const renderDeleteConfirmation = (
    type: "collection" | "request",
    id: string,
    parentId?: string
  ) => (
    <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50 border-t border-slate-700/50">
      <span className="text-xs text-slate-400">Delete {type}?</span>
      <div className="flex items-center gap-1 ml-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteConfirm(null);
          }}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4 text-slate-400" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            type === "collection"
              ? handleDeleteCollection(id)
              : handleDeleteRequest(parentId!, id);
          }}
          className="h-6 w-6 p-0"
        >
          <Check className="h-4 w-4 text-emerald-400" />
        </Button>
      </div>
    </div>
  );

  const renderRequestItem = useCallback(
    (request: SavedRequest, collection: Collection) => {
      const [isEditing, setIsEditing] = useState(false);
      const [editName, setEditName] = useState(request.name || request.url);
      const inputRef = useRef<HTMLInputElement>(null);

      const handleRename = (newName: string) => {
        if (!newName.trim() || newName === request.name) {
          setIsEditing(false);
          setEditName(request.name || request.url);
          return;
        }

        // Create deep copy of collections to ensure state update
        const updatedCollections = props.collections.map((c) => {
          if (c.id === collection.id) {
            return {
              ...c,
              requests: c.requests.map((r) =>
                r.id === request.id ? { ...r, name: newName.trim() } : r
              ),
              lastModified: new Date().toISOString(),
            };
          }
          return c;
        });

        // Update the collections through the parent component
        if (props.onUpdateCollections) {
          props.onUpdateCollections(updatedCollections);
        }

        // Update local state
        setIsEditing(false);
        setEditName(newName.trim());

        toast.success("Request renamed");
      };

      // Update local state when request name changes from props
      useEffect(() => {
        setEditName(request.name || request.url);
      }, [request.name, request.url]);

      useEffect(() => {
        if (isEditing && inputRef.current) {
          inputRef.current.focus();
        }
      }, [isEditing]);

      return (
        <div key={`request-${request.id}`} className="flex flex-col">
          <div
            key={request.id}
            ref={(el) => {
              if (el) {
                navigableElements.current.push({
                  id: request.id,
                  ref: el,
                  type: "request",
                  parentId: collection.id,
                });
              }
            }}
            tabIndex={0}
            className="group border-t border-slate-700/50 outline-none focus:bg-slate-900/25"
          >
            <div className="flex items-center gap-2 px-4 py-2 hover:bg-slate-900/25 transition-colors justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 text-xs font-mono border",
                    request.method === "GET" &&
                      "text-emerald-400 border-emerald-500/20",
                    request.method === "POST" &&
                      "text-blue-400 border-blue-500/20",
                    request.method === "PUT" &&
                      "text-yellow-400 border-yellow-500/20",
                    request.method === "DELETE" &&
                      "text-red-400 border-red-500/20",
                    request.method === "PATCH" &&
                      "text-purple-400 border-purple-500/20"
                  )}
                >
                  {request.method}
                </Badge>

                <div
                  className="flex-1 min-w-0"
                  onClick={() => !isEditing && props.onSelectRequest(request)}
                >
                  {isEditing ? (
                    <Input
                      ref={inputRef}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-6 text-xs bg-slate-900"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleRename(editName);
                        } else if (e.key === "Escape") {
                          setIsEditing(false);
                          setEditName(request.name || request.url);
                        }
                      }}
                      onBlur={() => handleRename(editName)}
                      maxLength={50}
                    />
                  ) : (
                    <div className="text-xs font-medium text-slate-300 truncate cursor-pointer">
                      {request.name || request.url}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditing(true);
                    setEditName(request.name || request.url);
                  }}
                  className="h-7 w-7 p-0"
                  title="Rename request"
                >
                  <Pencil className="h-3 w-3 text-blue-400" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm({
                      id: request.id,
                      type: "request",
                      parentId: collection.id,
                    });
                  }}
                  className="h-7 w-7 p-0"
                  title="Delete request"
                >
                  <Trash2 className="h-3 w-3 text-red-400" />
                </Button>
              </div>
            </div>
          </div>
          {deleteConfirm?.id === request.id &&
            deleteConfirm.type === "request" &&
            renderDeleteConfirmation("request", request.id, collection.id)}
        </div>
      );
    },
    [props.collections, props.onUpdateCollections, deleteConfirm]
  );

  const handleQuickSave = (collectionId: string) => {
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
  };

  const canQuickSave = useMemo(() => {
    return activeRequest?.url && activeRequest?.method;
  }, [activeRequest]);

  const handleDuplicateCollection = useCallback(
    (collection: Collection) => {
      const duplicate: Collection = {
        ...collection,
        id: uuidv4(),
        name: `${collection.name} (Copy)`,
        lastModified: new Date().toISOString(),
      };
      props.onCreateCollection(duplicate);
      toast.success("Collection duplicated");
    },
    [props.onCreateCollection]
  );

  const renderCollectionActions = useCallback(
    (collection: Collection) => {
      return (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleQuickSave(collection.id)}
            disabled={!canQuickSave}
            className={cn(
              "h-8 w-8 hover:text-slate-300",
              !canQuickSave && "opacity-50 cursor-not-allowed"
            )}
            title={
              canQuickSave
                ? "Save current request"
                : "No active request to save"
            }
          >
            <Save
              className={cn(
                "h-4 w-4",
                canQuickSave ? "text-blue-400" : "text-slate-500"
              )}
            />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDuplicateCollection(collection)}
            className="h-8 w-8 hover:text-slate-300"
            title="Duplicate collection"
          >
            <Copy className="h-4 w-4 text-emerald-400" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => props.onExportCollection(collection.id)}
            className="h-8 w-8 hover:text-slate-300"
            title="Export collection"
          >
            <Download className="h-4 w-4 text-purple-400" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteConfirm({ id: collection.id, type: "collection" });
            }}
            className="h-8 w-8 hover:text-slate-300"
            title="Delete collection"
          >
            <Trash2 className="h-4 w-4 text-red-400" />
          </Button>
        </div>
      );
    },
    [canQuickSave, handleQuickSave, handleDuplicateCollection]
  );


  const renderCollectionItem = (collection: Collection) => (
    <DynamicAccordionItem
      key={`collection-${collection.id}`}
      value={collection.id}
      className="px-0 border-y-2 border-slate-700/50"
      suppressHydrationWarning
    >
      <div className="flex items-center w-full">
        <div className="flex-1">
          <AccordionTrigger className="w-full p-4 text-slate-500 [&[data-state=open]]:bg-slate-900/25 transition-colors [&>svg]:hidden">
            <CollectionHeader collection={collection} onAction={() => {}} />
          </AccordionTrigger>
        </div>
        <div className="pr-4">{renderCollectionActions(collection)}</div>
      </div>
      {deleteConfirm?.id === collection.id &&
        deleteConfirm.type === "collection" && (
          <div className="w-full">
            {renderDeleteConfirmation("collection", collection.id)}
          </div>
        )}
      <AccordionContent className="pt-0 pb-0">
        <div
          key={`collection-content-${collection.id}`}
          className="bg-slate-900/75"
        >
          {collection.requests?.length > 0 ? (
            collection.requests.map((request) => (
              <div key={`request-wrapper-${request.id}`}>
                {renderRequestItem(request, collection)}
              </div>
            ))
          ) : (
            <div className="py-3 text-sm text-slate-500 text-center border-t border-slate-700/50">
              No requests in this collection
            </div>
          )}
        </div>
      </AccordionContent>
    </DynamicAccordionItem>
  );

  const handleSaveToCollection = (
    collectionId: string,
    request: Partial<SavedRequest>
  ) => {
    props.onSaveRequest(collectionId, {
      ...request,
      preRequestScript:
        (window as any).__ACTIVE_REQUEST__?.preRequestScript ||
        request.preRequestScript,
      testScript:
        (window as any).__ACTIVE_REQUEST__?.testScript || request.testScript,
      testResults:
        (window as any).__ACTIVE_REQUEST__?.testResults || request.testResults,
      scriptLogs:
        (window as any).__ACTIVE_REQUEST__?.scriptLogs || request.scriptLogs,
      runConfig: {
        iterations: 1,
        delay: 0,
        parallel: false,
        environment: null,
        timeout: 30000,
        stopOnError: true,
        retryCount: 0,
        validateResponse: false,
      },
      ...pendingSaveRequest,
    });
    setPendingSaveRequest(null);
    setRequestName("");
    setShowSaveForm(false);
    toast.success(`Saved to collection`);
  };

  const handleImportUrl = async () => {
    try {
      if (!importUrl.trim()) {
        toast.error("Please enter a valid URL");
        return;
      }
      await props.onImportCollections("url", importUrl);
      setIsImporting(false);
      setImportUrl("");
      toast.success("Collection imported successfully");
    } catch (error) {
      toast.error("Failed to import collection");
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const extension = file.name.split(".").pop()?.toLowerCase();

      let source: ImportSource = "file";
      if (extension === "har") source = "postman";
      else if (extension === "json") {
        // Try to detect format from content
        if (text.includes('"_type": "hoppscotch"')) source = "hoppscotch";
        else if (text.includes('"_postman_id"')) source = "postman";
        else if (text.includes('"openapi"')) source = "openapi";
      }

      await props.onImportCollections(source, text);
      toast.success("Collection imported successfully");
    } catch (error) {
      toast.error("Failed to import collection");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();

      // Validate if the text is valid JSON or contains specific markers
      let isValidData = false;
      try {
        const parsed = JSON.parse(text);
        isValidData =
          // Check for common collection format markers
          parsed.info?.schema?.includes("postman") || // Postman
          parsed._type === "hoppscotch" || // Hoppscotch
          parsed.openapi || // OpenAPI
          parsed.swagger || // Swagger
          Array.isArray(parsed) || // Array of requests
          (parsed.requests && Array.isArray(parsed.requests)); // Generic collection format
      } catch (e) {
        throw new Error("Invalid JSON format");
      }

      if (!isValidData) {
        throw new Error("Unsupported collection format");
      }

      await props.onImportCollections("clipboard", text);
      toast.success("Collection imported successfully");
      setIsImporting(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to import from clipboard");
    }
  };

  return (
    <div
      className="h-full flex flex-col bg-slate-950"
      suppressHydrationWarning
    >
      <div className="h-full flex flex-col bg-slate-900/75">
        <Input
          placeholder="Search collections"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 rounded-none border-x-0 text-xs bg-slate-900 border-slate-700"
        />
        <div className="sticky top-0 z-10 bg-slate-900/25 border-b border-slate-700">
          <div className="flex items-center p-2 gap-2">
            <div className="flex items-center gap-1 w-full">
              {/* Sort button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setSortBy((prev) =>
                    prev === "name"
                      ? "date"
                      : prev === "date"
                        ? "method"
                        : "name"
                  )
                }
                className="w-full h-8 px-2 bg-slate-900/25 border border-slate-700 text-xs"
              >
                <SortAsc className="h-4 w-4 text-blue-400" />
                <span className="hidden lg:inline capitalize">{sortBy}</span>
              </Button>

              {/* Filter dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-8 px-2 bg-slate-900/25 border border-slate-700 text-xs"
                  >
                    <Filter className="h-4 w-4 text-purple-400" />
                    <span className="hidden lg:inline">
                      {filterBy || "All"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-32 bg-slate-800/90 border-slate-700 text-slate-400"
                >
                  <DropdownMenuItem onClick={() => setFilterBy("")}>
                    All Methods
                  </DropdownMenuItem>
                  {["GET", "POST", "PUT", "DELETE", "PATCH"].map((method) => (
                    <DropdownMenuItem
                      key={method}
                      onClick={() => setFilterBy(method)}
                    >
                      {method}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json,.har,.yaml,.yml"
                className="hidden"
              />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreating(true)}
                className="w-full h-8 px-2 bg-slate-900/25 border border-slate-700 text-xs"
              >
                <Plus className="h-4 w-4 text-emerald-400" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsImporting(true)}
                className="w-full h-8 px-2 bg-slate-900/25 border border-slate-700 text-xs"
              >
                <Upload className="h-4 w-4 text-yellow-400" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={props.onExportCollections}
                className="w-full h-8 px-2 bg-slate-900/25 border border-slate-700 text-xs"
              >
                <DownloadIcon className="h-4 w-4 text-emerald-400" />
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {isImporting && (
            <div className="p-4 bg-slate-900/50 border-b border-slate-700">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-medium text-slate-300">
                    Import Collection
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsImporting(false)}
                    className="h-7 w-7 p-0 hover:bg-slate-900/25"
                  >
                    <X className="h-4 w-4 text-slate-400" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400">
                      Import from URL
                    </label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter URL (Postman, OpenAPI, etc.)"
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                        className="h-8 bg-slate-900/25 border-slate-700 text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleImportUrl}
                        disabled={!importUrl.trim()}
                        className={cn(
                          "h-8 px-3 bg-slate-900/25 hover:bg-slate-700 border border-slate-700",
                          "text-slate-300 hover:text-slate-200 transition-colors",
                          !importUrl.trim() && "opacity-50"
                        )}
                      >
                        Import
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400">
                      Import from file
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-8 bg-slate-900/25 hover:bg-slate-700 text-slate-300 hover:text-slate-200 border border-slate-700"
                    >
                      Choose File
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400">
                      Import from clipboard
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePaste}
                      className="w-full h-8 bg-slate-900/25 hover:bg-slate-700 text-slate-300 hover:text-slate-200 border border-slate-700"
                    >
                      Paste from Clipboard
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isCreating && (
            <div className="p-4 bg-slate-900/50 border-b border-slate-700">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-medium text-slate-300">
                    Create Collection
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsCreating(false);
                      setNewCollection({
                        name: "",
                        description: "",
                        apiVersion: "",
                      });
                    }}
                    className="h-7 w-7 p-0 hover:bg-slate-900/25"
                  >
                    <X className="h-4 w-4 text-slate-400" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400">
                      Collection Name
                    </label>
                    <Input
                      placeholder="Enter collection name"
                      value={newCollection.name}
                      maxLength={15}
                      onChange={(e) =>
                        setNewCollection((prev) => ({
                          ...prev,
                          name: e.target.value.slice(0, 15),
                        }))
                      }
                      className="h-8 bg-slate-900/25 border-slate-700 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400">
                      API Version
                    </label>
                    <Input
                      placeholder="e.g., 1.0.0"
                      value={newCollection.apiVersion}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (
                          /^[0-9.]*$/.test(value) &&
                          (value.match(/\./g) || []).length <= 3
                        ) {
                          const groups = value.split(".");
                          const isValid = groups.every(
                            (group) =>
                              !group ||
                              (parseInt(group) <= 999 && group.length <= 3)
                          );
                          if (isValid) {
                            setNewCollection((prev) => ({
                              ...prev,
                              apiVersion: value,
                            }));
                          }
                        }
                      }}
                      className="h-8 bg-slate-900/25 border-slate-700 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400">
                      Description (Optional)
                    </label>
                    <Textarea
                      placeholder="Enter collection description"
                      value={newCollection.description}
                      onChange={(e) =>
                        setNewCollection((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      className="bg-slate-900/25 border-slate-700 min-h-[80px] text-sm"
                    />
                  </div>

                  <Button
                    onClick={() => handleCreateCollection()}
                    disabled={
                      !newCollection.name.trim() ||
                      !newCollection.apiVersion.trim()
                    }
                    className={cn(
                      "w-full h-8 bg-slate-900/25 hover:bg-slate-700 text-slate-300 hover:text-slate-200 border border-slate-700",
                      "disabled:opacity-50"
                    )}
                  >
                    Create Collection
                  </Button>
                </div>
              </div>
            </div>
          )}

          {showSaveForm && pendingSaveRequest && (
            <div className="border-b border-slate-700 bg-slate-900/50">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-slate-300">
                    Save Request
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPendingSaveRequest(null);
                      setRequestName("");
                      setShowSaveForm(false);
                    }}
                    className="h-7 w-7 p-0"
                  >
                    <X className="h-4 w-4 text-slate-400" />
                  </Button>
                </div>

                <Input
                  autoFocus
                  placeholder="Request name"
                  value={requestName}
                  onChange={(e) => setRequestName(e.target.value)}
                  className="h-8 bg-slate-950 border-slate-700"
                  maxLength={15}
                />

                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-400 mb-2">
                    Select Collection
                  </div>
                  <div className="space-y-1">
                    {props.collections.map((collection) => (
                      <Button
                        key={collection.id}
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (!requestName) {
                            toast.error("Please enter a request name");
                            return;
                          }
                          handleSaveToCollection(collection.id, {
                            ...pendingSaveRequest,
                            name: requestName,
                          });
                        }}
                        className="w-full justify-start text-left h-8 px-3 text-slate-300 hover:text-slate-200 hover:bg-slate-900/25"
                      >
                        <FolderOpen className="h-4 w-4 mr-2 text-slate-400" />
                        {collection.name}
                        <Badge
                          variant="outline"
                          className="ml-2 text-[10px] px-1 bg-transparent border-slate-700 text-slate-400"
                        >
                          {collection.requests?.length || 0}
                        </Badge>
                      </Button>
                    ))}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCreating(true)}
                    className="w-full justify-start text-left h-8 px-3 text-emerald-400 hover:text-emerald-300 hover:bg-slate-900/25"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Collection
                  </Button>
                </div>
              </div>
            </div>
          )}

          {props.collections.length === 0 && !isCreating ? (
            <div className="flex flex-col items-center justify-center h-[calc(75vh)] space-y-4 p-4">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="p-3 rounded-lg bg-gradient-to-b from-slate-800 to-slate-900/50 ring-1 ring-slate-700/50">
                  <FolderOpen className="h-6 w-6 text-slate-400" />
                </div>
                <h3 className="text-sm font-medium text-slate-300">
                  No Collections
                </h3>
                <p className="text-xs text-slate-500 max-w-[15rem] leading-relaxed">
                  Create a collection to organize and save your API requests
                </p>
              </div>

              <div className="flex flex-col gap-2 w-48">
                <Button
                  onClick={() => setIsCreating(true)}
                  className="w-full h-8 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs gap-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Collection
                </Button>
              </div>
            </div>
          ) : (
            <div suppressHydrationWarning>
              <DynamicAccordion type="multiple">
                {filteredCollections.map((collection) => (
                  <div
                    key={`collection-wrapper-${collection.id}`}
                    suppressHydrationWarning
                  >
                    {renderCollectionItem(collection)}
                  </div>
                ))}
              </DynamicAccordion>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
