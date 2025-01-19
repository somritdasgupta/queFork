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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  MoreVertical,
  Save,
  Filter,
  SortAsc,
  Trash2,
  Clock,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Collection, SavedRequest } from "@/types";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

interface CollectionsPanelProps {
  collections: Collection[];
  onSelectRequest: (request: SavedRequest) => void;
  onSaveRequest: (collectionId: string, request: Partial<SavedRequest>) => void;
  onCreateCollection: (collection: Partial<Collection>) => void;
  onDeleteCollection: (collectionId: string) => void;
  onDeleteRequest: (collectionId: string, requestId: string) => void;
  onUpdateCollections?: (collections: Collection[]) => void;
}

export function CollectionsPanel({
  collections,
  onSelectRequest,
  onSaveRequest,
  onCreateCollection,
  onDeleteCollection,
  onDeleteRequest,
}: CollectionsPanelProps) {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "method" | "date">("name");
  const [filterBy, setFilterBy] = useState<string>("");
  const [newCollection, setNewCollection] = useState({
    name: "",
    description: "",
    apiVersion: "",
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
      apiVersion: newCollection.apiVersion,
      requests: [],
      lastModified: new Date().toISOString(),
    };

    onCreateCollection(collection);
    setNewCollection({ name: "", description: "", apiVersion: "" });
    setIsCreateOpen(false);
    toast.success("Collection created successfully");
  };

  const renderCollectionHeader = (collection: Collection) => {
    return (
      <div className="flex items-center justify-between w-full group">
        <div className="flex items-center gap-2 min-w-0">
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-50 hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="bottom"
            className="w-[200px]"
            sideOffset={5}
          >
            <DropdownMenuLabel>Collection Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => onSaveRequest(collection.id, {})}>
              <Save className="mr-2 h-4 w-4" />
              Save Request
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
    );
  };

  const handleDeleteCollection = (collectionId: string) => {
    onDeleteCollection(collectionId);
    toast.success("Collection deleted successfully");
  };

  const filteredCollections = useMemo(() => {
    return collections
      .filter((collection) => {
        const nameMatch = collection.name
          .toLowerCase()
          .includes(search.toLowerCase());
        const methodMatch = filterBy
          ? collection.requests?.some((request) => request.method === filterBy)
          : true;
        return nameMatch && methodMatch;
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
  }, [collections, search, filterBy, sortBy]);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header Section */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setSortBy((prev) =>
                prev === "name" ? "date" : prev === "date" ? "method" : "name"
              )
            }
            className="text-xs h-8 w-full border-2 shadow-inner"
          >
            <SortAsc className="h-3 w-3" />
            {sortBy}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 w-full border-2 shadow-inner"
              >
                <Filter className="h-3 w-3" />
                {filterBy || "All"}
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

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 p-2 border-2 shadow-inner">
                <Plus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:top-[50%] top-[unset] bottom-0 sm:bottom-[unset] sm:translate-y-[-50%] translate-y-0 rounded-t-lg sm:rounded-lg max-w-md">
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
                    maxLength={15}
                    onChange={(e) =>
                      setNewCollection((prev) => ({
                        ...prev,
                        name: e.target.value.slice(0, 15),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">API Version</label>
                  <Input
                    placeholder="e.g., 1.0.0"
                    value={newCollection.apiVersion}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow only numbers and dots, max 3 dots
                      if (
                        /^[0-9.]*$/.test(value) &&
                        (value.match(/\./g) || []).length <= 3
                      ) {
                        // Split by dots and validate each group is max 999
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
                <div className="flex flex-col gap-3 justify-end w-full">
                  <Button
                    onClick={handleCreateCollection}
                    disabled={
                      !newCollection.name.trim() ||
                      !newCollection.apiVersion.trim()
                    }
                  >
                    Create Collection
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search collections"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-8 bg-gray-100 shadow-inner"
          />
        </div>
      </div>

      {/* Collections List */}
      <ScrollArea className="flex-1">
        {collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-12 py-12 px-4">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 p-6 mb-8 shadow-lg shadow-inner">
              <Clock className="h-8 w-8 text-gray-400 animate-pulse" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Collections Found
            </h3>
            <div className="max-w-sm text-center space-y-2">
              <p className="text-sm text-gray-500">
                Create your first collection to organize your API requests and
                they will show up here.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <Accordion type="multiple" className="space-y-4">
              {filteredCollections.map((collection) => (
                <AccordionItem
                  key={collection.id}
                  value={collection.id}
                  className="border-2 rounded-lg hover:border-gray-300 bg-gray-50 transition-colors"
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    {renderCollectionHeader(collection)}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="px-4 py-2 space-y-2">
                      {collection.requests?.length > 0 ? (
                        collection.requests.map((request) => (
                          <div key={request.id} className="group">
                            <div
                              className="flex items-center gap-2 p-2 bg-white border-2 border-gray-200 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                              onClick={() => onSelectRequest(request)}
                            >
                              <Badge
                                variant="outline"
                                className={`method-${request.method.toLowerCase()} shrink-0 text-xs font-mono`}
                              >
                                {request.method}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-mono text-gray-700 truncate">
                                  {request.name || request.url}
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 opacity-50 hover:opacity-100 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-[160px]"
                                >
                                  <DropdownMenuItem
                                    onClick={() =>
                                      onDeleteRequest(collection.id, request.id)
                                    }
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Request
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-gray-500 text-center py-2">
                          No requests in this collection
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
