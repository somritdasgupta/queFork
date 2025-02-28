import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { WrapTextIcon, Save, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { type TabItem } from "@/types/tabs";

interface TabHeaderProps {
  tabs: TabItem[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  contentType: string;
  isPrettyPrint: boolean;
  setIsPrettyPrint: (value: boolean) => void;
  copyStatus: { [key: string]: boolean };
  onSave: () => void;
  onCopy: () => void;
}

export const TabHeader = ({
  tabs,
  activeTab,
  setActiveTab,
  contentType,
  isPrettyPrint,
  setIsPrettyPrint,
  copyStatus,
  onSave,
  onCopy,
}: TabHeaderProps) => (
  <div className="bg-slate-900 border-b border-slate-700">
    <div className="flex items-center justify-between">
      <TabsList className="h-10 w-auto justify-start rounded-none bg-slate-900 p-0">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="h-10 rounded-none border-b-4 border-transparent font-medium text-xs text-slate-400 transition-colors px-3 sm:px-4 py-2 data-[state=active]:bg-transparent data-[state=active]:border-blue-400 data-[state=active]:text-blue-400 hover:text-slate-300"
          >
            <div className="flex items-center gap-2">
              {tab.icon}
              <span className="truncate max-w-[80px] sm:max-w-none">
                {tab.label}
              </span>
            </div>
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="flex items-center gap-2 px-2 h-10">
        {contentType === "json" && activeTab === "response" && (
          <div className="sm:flex items-center gap-2 pr-2 border-r border-slate-700">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPrettyPrint(!isPrettyPrint)}
              className={cn(
                "h-7 w-7 p-0",
                "hover:bg-slate-700/50 hover:text-slate-200",
                "active:bg-slate-600/50",
                "transition-colors"
              )}
            >
              <WrapTextIcon
                className={cn(
                  "h-4 w-4",
                  isPrettyPrint ? "text-blue-400" : "text-slate-400"
                )}
                strokeWidth={2}
              />
            </Button>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onSave}
          className="h-7 w-7 p-0 hover:bg-slate-700/50 hover:text-slate-200 active:bg-slate-600/50 transition-colors"
        >
          <Save className="h-4 w-4 text-slate-400" strokeWidth={2} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCopy}
          className="h-7 w-7 p-0 hover:bg-slate-700/50 hover:text-slate-200 active:bg-slate-600/50 transition-colors"
        >
          {copyStatus[activeTab] ? (
            <Check className="h-4 w-4 text-emerald-400" strokeWidth={2} />
          ) : (
            <Copy className="h-4 w-4 text-slate-400" strokeWidth={2} />
          )}
        </Button>
      </div>
    </div>
  </div>
);
