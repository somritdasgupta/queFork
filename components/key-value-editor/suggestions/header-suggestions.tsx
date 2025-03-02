import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { useState } from "react";
import { commonHeaders } from "./commonHeaders";

export function HeaderSuggestions({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (header: string) => void;
}) {
  const [searchValue, setSearchValue] = useState(value);

  const filteredHeaders = commonHeaders.filter((header) =>
    header.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <div className="flex flex-col">
      <div className="p-1.5 border-b border-slate-700/50">
        <div className="relative">
          <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full bg-slate-800/50 text-xs pl-7 pr-2 py-1 rounded border border-slate-700/50 focus:outline-none focus:border-slate-600 text-slate-200 placeholder:text-slate-500"
            placeholder="Search headers..."
            autoFocus
          />
        </div>
      </div>
      <div className="overflow-y-auto max-h-[160px] scrollbar-thin scrollbar-thumb-slate-600 py-1">
        {filteredHeaders.length > 0 ? (
          filteredHeaders.map((header) => (
            <div
              key={header}
              onClick={() => onSelect(header)}
              className="px-2 py-1.5 text-xs text-slate-200 hover:bg-slate-800/70 cursor-pointer"
            >
              {header}
            </div>
          ))
        ) : (
          <div className="px-2 py-1.5 text-xs text-slate-400 text-center">
            No headers found
          </div>
        )}
      </div>
    </div>
  );
}
