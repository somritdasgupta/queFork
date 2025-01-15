"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  MoreVertical,
  FolderPlus,
  Save,
  Folder,
  Tag,
  History,
  Filter,
  SortAsc,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { Collection, Folder as FolderType, SavedRequest } from "@/types";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

interface CollectionsPanelProps {
  collections: Collection[];
  onSelectRequest: (request: SavedRequest) => void;
  onSaveRequest: (collectionId: string, request: Partial<SavedRequest>) => void;
  onCreateCollection: (collection: Partial<Collection>) => void;
  onCreateFolder: (collectionId: string, folder: Partial<FolderType>) => void;
  onDeleteCollection: (collectionId: string) => void;
  onDeleteFolder: (collectionId: string, folderId: string) => void;
  onDeleteRequest: (collectionId: string, requestId: string) => void;
}

export function CollectionsPanel({
  collections,
  onSelectRequest,
  onSaveRequest,
  onCreateCollection,
  onCreateFolder,
  onDeleteCollection,
  onDeleteFolder,
  onDeleteRequest,
}: CollectionsPanelProps) {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "date">("name");
  const [filterBy, setFilterBy] = useState<string>("");
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [newCollection, setNewCollection] = useState({
    name: "",
    description: "",
  });

  const handleCreateCollection = () => {
    if (!newCollection.name) {
      toast.error("Collection name is required");
      return;
    }

    const collection: Partial<Collection> = {
      id: uuidv4(),
      name: newCollection.name,
      description: newCollection.description,
      folders: [],
      requests: [],
    };

    onCreateCollection(collection);
    setNewCollection({ name: "", description: "" });
    setIsCreateOpen(false);
    toast.success("Collection created successfully");
  };

  const handleCreateFolder = (
    collectionId: string,
    parentFolderId?: string
  ) => {
    const name = prompt("Enter folder name:");
    if (name) {
      const newFolder = {
        id: uuidv4(),
        name,
        folders: [],
        requests: [],
        parentId: parentFolderId,
      };
      onCreateFolder(collectionId, newFolder);
      setExpandedFolders([...expandedFolders, newFolder.id]);
      toast.success("Folder created successfully");
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) =>
      prev.includes(folderId)
        ? prev.filter((id) => id !== folderId)
        : [...prev, folderId]
    );
  };

  const renderCollectionHeader = (collection: Collection) => {
    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-gray-400 transition-transform duration-200" />
          <span className="text-sm font-medium text-gray-700">
            {collection.name}
          </span>
          {collection.requests.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {collection.requests.length} requests
            </Badge>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right" className="w-[200px]">
            <DropdownMenuLabel>Collection Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleCreateFolder(collection.id)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              New Folder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSaveRequest(collection.id, {})}>
              <Save className="mr-2 h-4 w-4" />
              Save Request
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleDeleteCollection(collection.id)}
              className="text-red-600"
            >
              Delete Collection
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const renderFolder = (
    collectionId: string,
    folder: FolderType,
    level = 0
  ) => {
    const isExpanded = expandedFolders.includes(folder.id);

    return (
      <div
        key={folder.id}
        className="relative"
        style={{ marginLeft: `${level * 12}px` }}
      >
        <div
          className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-gray-50 cursor-pointer group"
          onClick={() => toggleFolder(folder.id)}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <ChevronRight
              className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                isExpanded ? "transform rotate-90" : ""
              }`}
            />
            <Folder className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700 truncate">
              {folder.name}
            </span>
            {(folder.requests.length > 0 || folder.folders.length > 0) && (
              <Badge variant="secondary" className="text-xs">
                {folder.requests.length + folder.folders.length}
              </Badge>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="right"
              className="w-[160px]"
            >
              <DropdownMenuItem
                onClick={() => handleCreateFolder(collectionId, folder.id)}
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                New Subfolder
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  onSaveRequest(collectionId, { folderId: folder.id })
                }
              >
                <Save className="mr-2 h-4 w-4" />
                Add Request
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDeleteFolder(collectionId, folder.id)}
                className="text-red-600"
              >
                Delete Folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isExpanded && (
          <div className="pl-4 border-l border-gray-200 ml-3 mt-1">
            {folder.folders.map((subFolder) =>
              renderFolder(collectionId, subFolder, level + 1)
            )}
            {folder.requests.map((request) =>
              renderRequest(collectionId, request, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  const renderRequest = (
    collectionId: string,
    request: SavedRequest,
    level = 0
  ) => (
    <div
      key={request.id}
      className="group relative max-w-[calc(100%-15rem)]"
      style={{ marginLeft: `${level * 12}px` }}
    >
      <div
        className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-gray-50 cursor-pointer"
        onClick={() => onSelectRequest(request)}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 ">
          <Badge
            variant="outline"
            className={`method-${request.method.toLowerCase()} shrink-0 text-xs`}
          >
            {request.method}
          </Badge>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-gray-700 truncate">
              {request.name || request.url}
            </div>
            <div className="text-xs text-gray-500 truncate">{request.url}</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteRequest(collectionId, request.id);
          }}
          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const handleDeleteCollection = (collectionId: string) => {
    if (confirm("Are you sure you want to delete this collection?")) {
      onDeleteCollection(collectionId);
      toast.success("Collection deleted successfully");
    }
  };

  const sortedCollections = [...collections].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    // Sort by creation date
    return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
    return 0;
  });

  const filteredCollections = sortedCollections.filter((collection) =>
    collection.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Collections</h2>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Collection</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Input
                    placeholder="Collection Name"
                    value={newCollection.name}
                    onChange={(e) =>
                      setNewCollection((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Textarea
                    placeholder="Description (optional)"
                    value={newCollection.description}
                    onChange={(e) =>
                      setNewCollection((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateCollection}>
                  Create Collection
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortBy(sortBy === "name" ? "date" : "name")}
            className="text-xs h-8 px-3 gap-1.5"
          >
            <SortAsc className="h-3 w-3" />
            Sort by {sortBy}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 px-3 gap-1.5"
              >
                <Filter className="h-3 w-3" />
                {filterBy || "All Methods"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setFilterBy("")}>
                All Methods
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterBy("GET")}>
                GET
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterBy("POST")}>
                POST
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterBy("PUT")}>
                PUT
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterBy("DELETE")}>
                DELETE
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search collections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-8 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredCollections.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              No collections found
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2 max-w-full">
              {filteredCollections.map((collection) => (
                <AccordionItem
                  key={collection.id}
                  value={collection.id}
                  className="border rounded-lg"
                >
                  <AccordionTrigger className="px-3 py-2 hover:no-underline data-[state=open]:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      {renderCollectionHeader(collection)}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="py-2 space-y-0.5">
                      {collection.folders.length === 0 &&
                      collection.requests.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          No requests or folders yet. Click the menu to add
                          some.
                        </div>
                      ) : (
                        <div className="min-w-0 overflow-hidden">
                          {collection.folders.map((folder) =>
                            renderFolder(collection.id, folder)
                          )}
                          {collection.requests
                            .filter(
                              (request) =>
                                !filterBy || request.method === filterBy
                            )
                            .map((request) =>
                              renderRequest(collection.id, request)
                            )}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </ScrollArea>

      <style jsx global>{`
        .method-get {
          color: #22c55e;
          border-color: #22c55e;
        }
        .method-post {
          color: #3b82f6;
          border-color: #3b82f6;
        }
        .method-put {
          color: #f59e0b;
          border-color: #f59e0b;
        }
        .method-delete {
          color: #ef4444;
          border-color: #ef4444;
        }
        .method-patch {
          color: #8b5cf6;
          border-color: #8b5cf6;
        }
      `}</style>
    </div>
  );
}
