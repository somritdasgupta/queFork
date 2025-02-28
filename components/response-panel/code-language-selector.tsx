import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Search } from "lucide-react";
import { languageConfigs, type CodeGenLanguage } from "@/utils/code-generators";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

interface CodeLanguageSelectorProps {
  selectedLanguage: CodeGenLanguage;
  onLanguageChange: (language: CodeGenLanguage) => void;
}

export function CodeLanguageSelector({
  selectedLanguage,
  onLanguageChange,
}: CodeLanguageSelectorProps) {
  const [search, setSearch] = useState("");

  const filteredLanguages = useMemo(() => {
    return Object.entries(languageConfigs).filter(([_, config]) =>
      config.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex p-2 items-center gap-2 cursor-pointer hover:text-white transition-colors duration-200">
          <span className="font-medium sm:text-sm text-xs">
            {languageConfigs[selectedLanguage].name}
          </span>
          <ChevronDown className="h-3 w-3 text-slate-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-screen sm:w-[75vw] bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-lg rounded-none border-2 border-slate-700 overflow-hidden"
      >
        <div className="flex items-center gap-4 p-2">
          <div className="relative w-[40%]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
            <Input
              placeholder="Search language..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:h-8  rounded-full bg-slate-800/50 border-slate-700/50 pl-7 text-xs focus-visible:ring-slate-700"
            />
          </div>
          <ScrollArea 
            direction="horizontal" 
            className="w-[55%] [&::-webkit-scrollbar]:hidden [&_[data-radix-scroll-area-scrollbar]]:hidden no-scrollbar"
            style={{ scrollbarWidth: 'none' }}
          >
            <div className="inline-flex items-center gap-2 w-max">
              {filteredLanguages.map(([key, config]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => onLanguageChange(key as CodeGenLanguage)}
                  className={cn(
                    "flex-none shrink-0 transition-all duration-200",
                    "hover:bg-slate-800/50 focus:bg-slate-800/50",
                    "data-[highlighted]:bg-slate-800/50",
                    key === selectedLanguage ? "bg-slate-800/50 rounded-full" : "transparent"
                  )}
                >
                  <div className="flex items-center gap-2 py-1 px-2 bg-slate-800 rounded-full">
                    {config.icon &&
                      React.createElement(config.icon, {
                        className: cn(
                          "h-5 w-5 transition-colors duration-200 bg-slate-900 rounded-full p-0.5",
                          key === selectedLanguage
                            ? "text-blue-400"
                            : "text-slate-400"
                        ),
                      })}
                    <span
                      className={cn(
                        "transition-colors duration-200 whitespace-nowrap sm:text-sm text-xs",
                        key === selectedLanguage
                          ? "text-blue-400 font-medium"
                          : "text-slate-300"
                      )}
                    >
                      {config.name}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
