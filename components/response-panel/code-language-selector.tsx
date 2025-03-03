import React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { languageConfigs, type CodeGenLanguage } from "@/utils/code-generators";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CodeLanguageSelectorProps {
  selectedLanguage: CodeGenLanguage;
  onLanguageChange: (language: CodeGenLanguage) => void;
}

export function CodeLanguageSelector({
  selectedLanguage,
  onLanguageChange,
}: CodeLanguageSelectorProps) {
  const languages = Object.entries(languageConfigs);

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
        className="w-screen sm:w-[75vw] bg-slate-900/60 rounded-none backdrop-blur-xl border-slate-700/70 border-2 overflow-hidden"
      >
        <div className="p-2">
          <ScrollArea direction="horizontal" className="h-6">
            <div className="inline-flex items-center gap-1.5">
              {languages.map(([key, config]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => onLanguageChange(key as CodeGenLanguage)}
                  className={cn(
                    "flex-none shrink-0 transition-all duration-200 p-0",
                    "hover:bg-slate-800/50 focus:bg-slate-800/50",
                    "data-[highlighted]:bg-slate-800/50",
                    key === selectedLanguage
                      ? "bg-slate-800/50 rounded-md"
                      : "transparent"
                  )}
                >
                  <div className="flex items-center gap-1.5 h-6 px-2 bg-slate-800 rounded-md">
                    {config.icon &&
                      React.createElement(config.icon, {
                        className: cn(
                          "h-3 w-3 transition-colors duration-200 bg-slate-900 rounded-md p-0.5",
                          key === selectedLanguage
                            ? "text-blue-400"
                            : "text-slate-400"
                        ),
                      })}
                    <span
                      className={cn(
                        "transition-colors duration-200 whitespace-nowrap text-xs",
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
