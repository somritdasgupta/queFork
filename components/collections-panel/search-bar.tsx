import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search collections..."
        className="w-full bg-slate-900 text-xs rounded-md pl-7 pr-2 py-1.5
          border border-slate-800 focus:border-slate-700
          text-slate-300 placeholder:text-slate-500
          focus:outline-none focus:ring-1 focus:ring-slate-700"
      />
    </div>
  );
}
