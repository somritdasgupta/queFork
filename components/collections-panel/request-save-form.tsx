import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collection, SavedRequest } from "@/types";
import { toast } from "sonner";
import { Plus, X, SendHorizonal, CheckCircle, BoxesIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface RequestSaveFormProps {
  collections: Collection[];
  onClose: () => void;
  onSaveToCollection: (
    collectionId: string,
    request: Partial<SavedRequest>
  ) => void;
  onCreateCollection: (collection: {
    name: string;
    description: string;
    apiVersion: string;
  }) => Promise<void>;
  pendingRequest: Partial<SavedRequest>;
  className?: string;
  mode?: "collection-only" | "save-request";
}

export function RequestSaveForm({
  collections,
  onClose,
  onSaveToCollection,
  onCreateCollection,
  pendingRequest,
  className,
  mode = "save-request",
}: RequestSaveFormProps) {
  // Update state to include isCreatingCollection
  const [formState, setFormState] = useState({
    requestName: "",
    isCreatingCollection: false,
    newCollection: {
      name: "",
      description: "",
      apiVersion: "",
    },
  });

  // Common handlers
  const resetForm = () => {
    setFormState((prev) => ({
      ...prev,
      isCreatingCollection: false,
      newCollection: { name: "", description: "", apiVersion: "" },
    }));
  };

  const handleCreateCollection = useCallback(async () => {
    const { newCollection } = formState;
    if (!newCollection.name || !newCollection.apiVersion) {
      toast.error("Collection name and version are required");
      return;
    }

    try {
      await onCreateCollection(newCollection);
      resetForm();
      toast.success("Collection created");
    } catch (error) {
      toast.error("Failed to create collection");
    }
  }, [formState.newCollection, onCreateCollection]);

  const handleSaveToCollection = (collectionId: string) => {
    if (!formState.requestName.trim()) {
      toast.error("Please enter a request name");
      return;
    }

    onSaveToCollection(collectionId, {
      ...pendingRequest,
      name: formState.requestName.trim(),
    });

    setFormState((prev) => ({ ...prev, requestName: "" }));
    onClose();
  };

  // Shared components
  const HeaderSection = ({
    title,
    subtitle,
  }: {
    title: string;
    subtitle: string;
  }) => (
    <div className="flex items-center justify-between mb-3">
      <div className="flex flex-col">
        <h2 className="text-sm font-medium text-slate-200">{title}</h2>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="h-6 w-6 p-0 hover:bg-slate-800/50"
      >
        <X className="h-3.5 w-3.5 text-slate-400" />
      </Button>
    </div>
  );

  // Shared components for collection creation
  const CollectionCreationFields = () => (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <Input
          autoFocus
          placeholder="Collection name"
          value={formState.newCollection.name}
          maxLength={15}
          onChange={(e) =>
            setFormState((prev) => ({
              ...prev,
              newCollection: {
                ...prev.newCollection,
                name: e.target.value.slice(0, 15),
              },
            }))
          }
          className="h-8 bg-slate-800/50 border-slate-700/50 text-xs"
        />
      </div>
      <div className="w-32">
        <Input
          placeholder="Version"
          value={formState.newCollection.apiVersion}
          onChange={(e) => {
            const value = e.target.value;
            if (
              /^[0-9.]*$/.test(value) &&
              (value.match(/\./g) || []).length <= 2
            ) {
              setFormState((prev) => ({
                ...prev,
                newCollection: { ...prev.newCollection, apiVersion: value },
              }));
            }
          }}
          className="h-8 bg-slate-800/50 border-slate-700/50 text-xs"
        />
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCreateCollection}
        disabled={
          !formState.newCollection.name.trim() ||
          !formState.newCollection.apiVersion
        }
        className="h-8 w-8 text-xs font-medium text-emerald-400 bg-slate-800 border border-slate-700 roundeed-md hover:text-emerald-300"
      >
        <CheckCircle className="h-3 w-3" />
      </Button>
    </div>
  );

  // Collection-only mode render with improved layout
  if (mode === "collection-only") {
    return (
      <div
        className={cn(
          "border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-md",
          className
        )}
      >
        <div className="p-3">
          <HeaderSection
            title="Create Collection"
            subtitle="Create a new collection to organize your requests"
          />
          <CollectionCreationFields />
        </div>
      </div>
    );
  }

  // Save request mode render
  return (
    <div
      className={cn(
        "border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-md",
        className
      )}
    >
      <div className="p-3">
        <HeaderSection
          title="Save Request"
          subtitle="Choose a collection to save this request"
        />

        {/* Request Preview */}
        <RequestPreview request={pendingRequest} />

        {formState.isCreatingCollection ? (
          <CollectionCreationFields />
        ) : (
          <>
            {/* Consistent layout for request name and new collection button */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1">
                <Input
                  placeholder="Enter request name"
                  value={formState.requestName}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      requestName: e.target.value,
                    }))
                  }
                  className="h-7 text-xs bg-slate-800/50 border-slate-700/50"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setFormState((prev) => ({
                    ...prev,
                    isCreatingCollection: true,
                    newCollection: {
                      name: "",
                      description: "",
                      apiVersion: "",
                    },
                  }))
                }
                className="h-7 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                New Collection
              </Button>
            </div>

            {/* Collections List */}
            <CollectionsList
              collections={collections}
              requestName={formState.requestName}
              onSelect={handleSaveToCollection}
            />
          </>
        )}
      </div>
    </div>
  );
}

// Extracted components
const RequestPreview = ({ request }: { request: Partial<SavedRequest> }) => (
  <div className="mb-2 px-2 py-1.5 bg-slate-800/50 backdrop-blur-sm rounded-md border border-slate-700/50">
    <div className="flex items-center gap-2">
      <Badge
        className={cn(
          "h-5 px-1.5 text-xs font-mono",
          request.method === "GET" &&
            "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          request.method === "POST" &&
            "bg-blue-500/10 text-blue-400 border-blue-500/20",
          request.method === "PUT" &&
            "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
          request.method === "DELETE" &&
            "bg-red-500/10 text-red-400 border-red-500/20"
        )}
      >
        {request.method}
      </Badge>
      <span className="text-xs text-slate-400 truncate">{request.url}</span>
    </div>
  </div>
);

const CollectionsList = ({
  collections,
  requestName,
  onSelect,
}: {
  collections: Collection[];
  requestName: string;
  onSelect: (id: string) => void;
}) => (
  <div className="max-h-[180px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700/50 scrollbar-track-slate-800/30">
    <div className="space-y-0.5">
      {collections.map((collection) => (
        <CollectionItem
          key={collection.id}
          collection={collection}
          isDisabled={!requestName.trim()}
          onClick={() => onSelect(collection.id)}
        />
      ))}
    </div>
  </div>
);

const CollectionItem = ({
  collection,
  isDisabled,
  onClick,
}: {
  collection: Collection;
  isDisabled: boolean;
  onClick: () => void;
}) => (
  <Button
    variant="ghost"
    size="sm"
    onClick={onClick}
    disabled={isDisabled}
    className={cn(
      "w-full justify-start text-left h-8 px-2",
      "text-slate-300 hover:text-slate-200",
      "bg-slate-800/30 hover:bg-slate-700/50",
      "backdrop-blur-sm transition-all",
      "group border border-transparent hover:border-slate-700/50",
      isDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
    )}
  >
    <div className="flex items-center gap-2 w-full">
      <div className="p-1 rounded-md bg-slate-800/80 group-hover:bg-slate-700/80 transition-colors">
        <BoxesIcon className="h-3 w-3 text-slate-400 group-hover:text-slate-300" />
      </div>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-xs truncate">{collection.name}</span>
        <span className="text-[10px] text-slate-500">
          {collection.requests?.length || 0} requests
        </span>
      </div>
      <SendHorizonal className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 ml-auto transition-all group-hover:translate-x-0.5 group-hover:text-slate-300" />
    </div>
  </Button>
);
