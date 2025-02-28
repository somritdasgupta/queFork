import { useState, useRef, useEffect } from "react";
import { Collection, SavedRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DeleteConfirmation } from "./delete-confirmation";

interface RequestItemProps {
  request: SavedRequest;
  collection: Collection;
  onUpdateCollections?: (collections: Collection[]) => void;
  onSelectRequest: (request: SavedRequest) => void;
  onDeleteRequest: (collectionId: string, requestId: string) => void;
  setDeleteConfirm: (
    confirm: {
      id: string;
      type: "collection" | "request";
      parentId?: string;
    } | null
  ) => void;
  deleteConfirm: {
    id: string;
    type: "collection" | "request";
    parentId?: string;
  } | null;
  navigableElements: React.MutableRefObject<any[]>;
}

export function RequestItem({
  request,
  collection,
  onUpdateCollections,
  onSelectRequest,
  onDeleteRequest,
  setDeleteConfirm,
  deleteConfirm,
}: RequestItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(request.name || request.url);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleRename = (newName: string) => {
    if (!newName.trim() || newName === request.name) {
      setIsEditing(false);
      setEditName(request.name || request.url);
      return;
    }

    if (onUpdateCollections) {
      const updatedCollections = (collections: Collection[]) =>
        collections.map((c) =>
          c.id === collection.id
            ? {
                ...c,
                requests: c.requests.map((r) =>
                  r.id === request.id ? { ...r, name: newName.trim() } : r
                ),
                lastModified: new Date().toISOString(),
              }
            : c
        );

      onUpdateCollections(updatedCollections([])); // Pass empty array as initial value
    }

    setIsEditing(false);
    setEditName(newName.trim());
    toast.success("Request renamed");
  };

  useEffect(() => {
    setEditName(request.name || request.url);
  }, [request.name, request.url]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  return (
    <div className="group border-t border-slate-700/50 outline-none focus:bg-slate-900/25">
      <div className="flex items-center gap-2 px-4 py-2 hover:bg-slate-900/25 transition-colors justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 text-xs font-mono border",
              request.method === "GET" &&
                "text-emerald-400 border-emerald-500/20",
              request.method === "POST" && "text-blue-400 border-blue-500/20",
              request.method === "PUT" &&
                "text-yellow-400 border-yellow-500/20",
              request.method === "DELETE" && "text-red-400 border-red-500/20",
              request.method === "PATCH" &&
                "text-purple-400 border-purple-500/20"
            )}
          >
            {request.method}
          </Badge>

          <div
            className="flex-1 min-w-0"
            onClick={() => !isEditing && onSelectRequest(request)}
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
            onClick={() => setIsEditing(true)}
            className="h-7 w-7 p-0 hover:bg-slate-800"
          >
            <Pencil className="h-3 w-3 text-blue-400" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setDeleteConfirm({
                id: request.id,
                type: "request",
                parentId: collection.id,
              })
            }
            className="h-7 w-7 p-0 hover:bg-slate-800"
          >
            <Trash2 className="h-3 w-3 text-red-400" />
          </Button>
        </div>
      </div>
      {deleteConfirm?.id === request.id && deleteConfirm.type === "request" && (
        <DeleteConfirmation
          type="request"
          onCancel={(e) => {
            e.stopPropagation();
            setDeleteConfirm(null);
          }}
          onConfirm={(e) => {
            e.stopPropagation();
            onDeleteRequest(collection.id, request.id);
          }}
        />
      )}
    </div>
  );
}
