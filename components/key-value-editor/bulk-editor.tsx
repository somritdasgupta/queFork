import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Hash, ListPlus, BracketsIcon, Braces } from "lucide-react";

interface BulkEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export const BulkEditor: React.FC<BulkEditorProps> = ({
  content,
  onChange,
}) => {
  const placeholderGuide = [
    "→ Simple Format:",
    "api_key: your-secret-key",
    "base_url: https://api.example.com",
    "content_type: application/json",
    "",
    "→ JSON Format (for complex values):",
    "{",
    '  "key": "auth_token",',
    '  "value": "Bearer xyz..."',
    "}",
  ].join("\n");

  return (
    <div className="flex flex-col h-[34vh] bg-gradient-to-b from-slate-900/90 to-slate-900/50 backdrop-blur-md">
      <div className="flex-none border-b border-slate-700/50">
        <div className="px-3 py-2 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ListPlus className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-medium text-slate-200">
              Bulk Editor
            </span>
          </div>

          <div className="flex items-center gap-3 px-2 bg-slate-800/50 rounded-md border border-slate-700/50">
            <div className="flex items-center gap-1.5">
              <Hash className="h-3 w-3 text-yellow-500/90" />
              <span className="text-[10px] text-slate-400">disable line</span>
            </div>
            <div className="w-px h-3 bg-slate-700/50" />
            <div className="flex items-center gap-1.5">
              <Braces className="h-3 w-3 text-purple-400/90" />
              <span className="text-[10px] text-slate-400">JSON format</span>
            </div>
          </div>
        </div>
      </div>

      <Textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholderGuide}
        className={cn(
          "flex-1 w-full min-h-0",
          "bg-slate-800/20 backdrop-blur-sm",
          "text-slate-400 placeholder:text-slate-400/50",
          "focus:outline-none focus:ring-0",
          "border-0",
          "font-mono text-xs leading-relaxed",
          "resize-none rounded-none p-2",
          "scrollbar-thin scrollbar-thumb-slate-700/50 scrollbar-track-transparent"
        )}
        spellCheck="false"
        autoComplete="off"
        autoCorrect="off"
      />
    </div>
  );
};
