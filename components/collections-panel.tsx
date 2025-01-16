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
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  MoreVertical,
  FolderPlus,
  Save,
  Folder,
  Tag as TagIcon,
  History,
  Filter,
  SortAsc,
  ChevronDown,
  ChevronRight,
  Settings,
  Trash2,
  Edit,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
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
  onUpdateCollections?: (collections: Collection[]) => void;
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
  onUpdateCollections,
}: CollectionsPanelProps) {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "method" | "date">("name");
  const [filterBy, setFilterBy] = useState<string>("");
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [newCollection, setNewCollection] = useState({
    name: "",
    description: "",
    apiVersion: "",
    tags: [] as string[],
  });
  const [newTag, setNewTag] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Helper function to get all unique tags from collections
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    collections.forEach((collection) => {
      collection.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet);
  }, [collections]);

  const handleCreateCollection = () => {
    if (!newCollection.name) {
      toast.error("Collection name is required");
      return;
    }

    const collection: Partial<Collection> = {
      id: uuidv4(),
      name: newCollection.name,
      description: newCollection.description,
      apiVersion: newCollection.apiVersion,
      tags: newCollection.tags || [],
      folders: [],
      requests: [],
      lastModified: new Date().toISOString(),
    };

    onCreateCollection(collection);
    setNewCollection({ name: "", description: "", apiVersion: "", tags: [] });
    setIsCreateOpen(false);
    toast.success("Collection created successfully");
  };

  const handleAddTag = useCallback(
    (collectionId: string, tag: string) => {
      if (!tag.trim()) {
        toast.error("Tag cannot be empty");
        return;
      }

      const updatedCollections = collections.map((collection) => {
        if (collection.id === collectionId) {
          const existingTags = collection.tags || [];
          if (existingTags.includes(tag)) {
            toast.error("Tag already exists");
            return collection;
          }
          return {
            ...collection,
            tags: [...existingTags, tag],
            lastModified: new Date().toISOString(),
          };
        }
        return collection;
      });

      if (onUpdateCollections) {
        onUpdateCollections(updatedCollections);
        toast.success("Tag added successfully");
        setNewTag("");
        setIsTagDialogOpen(false);
      }
    },
    [collections, onUpdateCollections]
  );

  const handleRemoveTag = useCallback(
    (collectionId: string, tagToRemove: string) => {
      const updatedCollections = collections.map((collection) => {
        if (collection.id === collectionId) {
          return {
            ...collection,
            tags: (collection.tags || []).filter((tag) => tag !== tagToRemove),
            lastModified: new Date().toISOString(),
          };
        }
        return collection;
      });

      if (onUpdateCollections) {
        onUpdateCollections(updatedCollections);
        toast.success("Tag removed successfully");
      }
    },
    [collections, onUpdateCollections]
  );

  const renderCollectionHeader = (collection: Collection) => {
    return (
      <div className="flex items-center justify-between w-full group">
        <div className="flex items-center gap-2 min-w-0">
          <ChevronRight className="h-4 w-4 text-gray-400 transition-transform duration-200" />
          <span className="text-sm font-medium text-gray-700 truncate">
            {collection.name}
          </span>
          {collection.apiVersion && (
            <Badge
              variant="secondary"
              className="text-xs bg-blue-100 text-blue-800"
            >
              v{collection.apiVersion}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 max-w-[200px] overflow-x-auto hide-scrollbar">
            {collection.tags?.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-xs whitespace-nowrap hover:bg-gray-100 cursor-pointer transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveTag(collection.id, tag);
                }}
              >
                {tag}
                <span className="ml-1 opacity-0 group-hover:opacity-100">
                  ×
                </span>
              </Badge>
            ))}
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
            <DropdownMenuContent
              align="start"
              side="bottom" // Changed from "right" to "bottom"
              className="w-[200px]"
              sideOffset={5}
            >
              <DropdownMenuLabel>Collection Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleCreateFolder(collection.id)}
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                New Folder
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onSaveRequest(collection.id, {})}
              >
                <Save className="mr-2 h-4 w-4" />
                Save Request
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedCollectionId(collection.id);
                  setIsTagDialogOpen(true);
                }}
              >
                <TagIcon className="mr-2 h-4 w-4" />
                Manage Tags
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDeleteCollection(collection.id)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Collection
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  const renderRequest = (
    collectionId: string,
    request: SavedRequest,
    folderId?: string
  ) => (
    <div key={request.id} className="group relative">
      <div
        className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => onSelectRequest(request)}
      >
        <div className="border-2 p-1 rounded-md bg-gray-50 flex items-center gap-2 min-w-0 flex-1">
          <Badge
            variant="outline"
            className={`method-${request.method.toLowerCase()} shrink-0 text-xs font-mono`}
          >
            {request.method}
          </Badge>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-mono text-gray-700 truncate">
              {request.name || request.url}
            </div>
          </div>
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
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuItem
              onClick={() => onDeleteRequest(collectionId, request.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Request
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

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
          className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-gray-50 cursor-pointer group transition-colors"
          onClick={() => toggleFolder(folder.id)}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <ChevronRight
              className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                isExpanded ? "rotate-90" : ""
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
            <DropdownMenuContent align="end" className="w-[160px]">
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
                <Trash2 className="mr-2 h-4 w-4" />
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
              renderRequest(collectionId, request)
            )}
          </div>
        )}
      </div>
    );
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) =>
      prev.includes(folderId)
        ? prev.filter((id) => id !== folderId)
        : [...prev, folderId]
    );
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

  const handleDeleteCollection = (collectionId: string) => {
    if (confirm("Are you sure you want to delete this collection?")) {
      onDeleteCollection(collectionId);
      toast.success("Collection deleted successfully");
    }
  };

  const filteredCollections = useMemo(() => {
    return collections
      .filter((collection) => {
        const nameMatch = collection.name
          .toLowerCase()
          .includes(search.toLowerCase());
        const methodMatch =
          !filterBy ||
          collection.requests.some((req) => req.method === filterBy) ||
          collection.folders.some((folder) =>
            folder.requests.some((req) => req.method === filterBy)
          );
        const tagMatch =
          selectedTags.length === 0 ||
          selectedTags.every((tag) => collection.tags?.includes(tag));
        return nameMatch && methodMatch && tagMatch;
      })
      .sort((a, b) => {
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
  }, [collections, search, filterBy, selectedTags, sortBy]);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header Section */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Directories</h2>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                New Collection
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Collection</DialogTitle>
                <DialogDescription>
                  Create a new collection to organize your API requests.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
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
                  <label className="text-sm font-medium">API Version</label>
                  <Input
                    placeholder="e.g., 1.0.0"
                    value={newCollection.apiVersion}
                    onChange={(e) =>
                      setNewCollection((prev) => ({
                        ...prev,
                        apiVersion: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
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

        {/* Filters Section */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setSortBy((prev) =>
                prev === "name" ? "date" : prev === "date" ? "method" : "name"
              )
            }
            className="text-xs h-8 px-3 gap-1.5"
          >
            <SortAsc className="h-3 w-3" />
            Sort: {sortBy}
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 px-3 gap-1.5"
              >
                <TagIcon className="h-3 w-3" />
                {selectedTags.length ? `${selectedTags.length} Tags` : "Tags"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
              {allTags.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-gray-500">
                  No tags available
                </div>
              ) : (
                allTags.map((tag) => (
                  <DropdownMenuCheckboxItem
                    key={tag}
                    checked={selectedTags.includes(tag)}
                    onCheckedChange={(checked) => {
                      setSelectedTags((prev) =>
                        checked ? [...prev, tag] : prev.filter((t) => t !== tag)
                      );
                    }}
                  >
                    {tag}
                  </DropdownMenuCheckboxItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search collections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-8 bg-gray-100"
          />
        </div>
      </div>

      {/* Collections List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {filteredCollections.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              No collections found
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {filteredCollections.map((collection) => (
                <AccordionItem
                  key={collection.id}
                  value={collection.id}
                  className="relative group rounded-lg border-2 border-gray-200 hover:border-gray-200 bg-gray-50 hover:bg-gray-50 transition-colors"
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
                          No requests or folders yet
                        </div>
                      ) : (
                        <div className="min-w-0">
                          {collection.folders.map((folder) =>
                            renderFolder(collection.id, folder)
                          )}
                          {collection.requests
                            .filter((request) => !request.folderId)
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

      {/* Tag Management Dialog */}
      <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
        <DialogContent className="sm:max-w-[425px] fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <DialogHeader>
            <DialogTitle>Manage Tags</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add new tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => {
                  if (newTag.trim()) {
                    handleAddTag(selectedCollectionId, newTag);
                    setNewTag("");
                  }
                }}
                disabled={!newTag.trim()}
              >
                Add
              </Button>
            </div>
            <div className="max-h-[200px] overflow-y-auto">
              {/* Display existing tags */}
              {collections
                .find((c) => c.id === selectedCollectionId)
                ?.tags?.map((tag) => (
                  <div
                    key={tag}
                    className="flex items-center justify-between py-2"
                  >
                    <span>{tag}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTag(selectedCollectionId, tag)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTagDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Styles */}
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
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
