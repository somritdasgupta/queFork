import { Badge } from "@/components/ui/badge";
import { BoxesIcon } from "lucide-react";
import { Collection } from "@/types";

interface CollectionHeaderProps {
  collection: Collection;
  onAction: (action: string) => void;
}

export function CollectionHeader({ collection }: CollectionHeaderProps) {
  return (
    <div className="flex items-center w-full">
      <div className="flex items-center gap-2 min-w-0">
        <BoxesIcon className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
        <span className="text-xs font-medium text-slate-400 truncate">
          {collection.name}
        </span>
        {collection.apiVersion && (
          <Badge className="text-[10px] h-4 px-1 bg-blue-500/10 text-blue-400 border-blue-500/20">
            v{collection.apiVersion}
          </Badge>
        )}
        <Badge
          variant="outline"
          className="text-[10px] h-4 px-1 bg-slate-800/50 text-slate-400 border-slate-700"
        >
          {collection.requests?.length || 0}
        </Badge>
      </div>
    </div>
  );
}
