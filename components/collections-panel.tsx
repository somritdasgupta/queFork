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
  ArrowDownToLine,
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
  onExportCollections: () => void;
  onExportCollection: (collectionId: string) => void;
}


export function CollectionsPanel({
  collections,
  onSelectRequest,
  onSaveRequest,
  onCreateCollection,
  onDeleteCollection,
  onDeleteRequest,
  onExportCollections,
  onExportCollection,
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
            <Badge className="text-xs bg-blue-100 text-blue-800">
              v{collection.apiVersion}
            </Badge>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-70 hover:opacity-100 transition-opacity"
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
            <DropdownMenuItem onClick={() => onExportCollection(collection.id)}>
              <ArrowDownToLine className="mr-2 h-4 w-4" />
              Export Collection
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
    <div className="h-full flex flex-col bg-slate-800">
      <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setSortBy((prev) =>
                prev === "name" ? "date" : prev === "date" ? "method" : "name"
              )
            }
            className="flex items-center h-9 w-full border border-slate-700 rounded-none bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
          >
            <SortAsc className="h-4 w-4 text-blue-400" />
            <span className="text-xs capitalize">{sortBy}</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center h-9 w-full border border-slate-700 rounded-none bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
              >
                <Filter className="h-4 w-4 text-purple-400" />
                <span className="text-xs">{filterBy || 'All'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-slate-800 border border-slate-700">
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

          <div className="flex">
            <Button
              variant="ghost"
              size="sm"
              onClick={onExportCollections}
              className="h-9 w-full rounded-none border-2 border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
            >
              <ArrowDownToLine className="h-4 w-4 text-emerald-400" />
            </Button>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-full border-2 border-slate-700 rounded-none bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
                >
                  <Plus className="h-4 w-4 text-cyan-400" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border border-slate-700">
                <DialogHeader>
                  <DialogTitle>Create New Collection</DialogTitle>
                  <DialogDescription>
                    Create a new collection to organize your API requests.
                  </DialogDescription>
                </DialogHeader>
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
                  <div className="">
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
                  <div className="">
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
                <DialogFooter>
                  <div className="flex flex-col gap-3 justify-end w-full">
                    <Button
                      onClick={handleCreateCollection}
                      disabled={
                        !newCollection.name.trim() ||
                        !newCollection.apiVersion.trim()
                      }
                      className="text-slate-400"
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
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search collections"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-9 rounded-none w-full bg-slate-900 border-y-2 border-slate-700 text-slate-300 placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Collections List */}
      <ScrollArea className="flex-1">
        {collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-700 mb-4">
              <Clock className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-300 mb-2">
              No Collections Yet
            </h3>
            <p className="text-sm text-slate-400 max-w-sm">
              Create your first collection to organize your API requests.
            </p>
          </div>
        ) : (
          <div>
            <Accordion type="multiple">
              {filteredCollections.map((collection) => (
                <AccordionItem
                  key={collection.id}
                  value={collection.id}
                  className="border-b-2 border-slate-700 bg-slate-900 overflow-hidden"
                >
                  <AccordionTrigger className="p-2 hover:no-underline">
                    {renderCollectionHeader(collection)}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div>
                      {collection.requests?.length > 0 ? (
                        collection.requests.map((request) => (
                          <div key={request.id} className="group">
                            <div
                              className="flex items-center gap-2 px-4 py-2 text-slate-50 bg-blue-900 border-y-2 hover:bg-slate-900  cursor-pointer transition-colors"
                              onClick={() => onSelectRequest(request)}
                            >
                              <Badge
                                variant="outline"
                                className={`method-${request.method.toLowerCase()} shrink-0 text-xs font-mono`}
                              >
                                {request.method}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-gray-700 truncate">
                                  {request.name || request.url}
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 opacity-70 hover:opacity-100 transition-opacity"
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
