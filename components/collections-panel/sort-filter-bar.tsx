import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Filter, SortAsc } from "lucide-react";

interface SortFilterBarProps {
  sortBy: "name" | "method" | "date";
  onSortChange: (sort: "name" | "method" | "date") => void;
  filterBy: string;
  onFilterChange: (filter: string) => void;
}

export function SortFilterBar({
  sortBy,
  onSortChange,
  filterBy,
  onFilterChange,
}: SortFilterBarProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          onSortChange(
            sortBy === "name" ? "date" : sortBy === "date" ? "method" : "name"
          )
        }
        className="flex-1 h-7 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800"
        title={`Sort by ${sortBy}`}
      >
        <SortAsc className="h-3.5 w-3.5 text-blue-400 mr-1.5" />
        <span className="capitalize">{sortBy}</span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-7 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800"
          >
            <Filter className="h-3.5 w-3.5 text-purple-400 mr-1.5" />
            <span>{filterBy || "All Methods"}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-32 bg-slate-800/90 border-slate-700 text-slate-400"
        >
          <DropdownMenuItem onClick={() => onFilterChange("")}>
            All Methods
          </DropdownMenuItem>
          {["GET", "POST", "PUT", "DELETE", "PATCH"].map((method) => (
            <DropdownMenuItem
              key={method}
              onClick={() => onFilterChange(method)}
            >
              {method}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
