import { Environment } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PackagePlus, PackagePlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NetworkStatusIndicator } from "@/app/components/NetworkStatusIndicator";
import { cn } from "@/lib/utils";

interface EnvironmentSelectorProps {
  environments: Environment[];
  currentEnvironment: Environment | null;
  onEnvironmentChange: (environmentId: string) => void;
  className?: string;
  hasExtension?: boolean;
  interceptorEnabled?: boolean;
}

export function EnvironmentSelector({
  environments,
  currentEnvironment,
  onEnvironmentChange,
  className,
  hasExtension = false,
  interceptorEnabled,
}: EnvironmentSelectorProps) {
  return (
    <div>
      <Select
        value={currentEnvironment?.id || "none"}
        onValueChange={onEnvironmentChange}
      >
        <SelectTrigger
          className={cn(
            "bg-slate-900/80 backdrop-blur-sm border-slate-700/50",
            "hover:bg-slate-800/80 transition-colors",
            className
          )}
        >
          <SelectValue>
            {currentEnvironment ? (
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "font-medium text-xs",
                      currentEnvironment.global
                        ? "text-blue-400"
                        : "text-slate-300"
                    )}
                  >
                    {currentEnvironment.name}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {currentEnvironment.variables.length} vars
                  </span>
                </div>
                {hasExtension && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] px-1.5 h-4",
                      interceptorEnabled
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : "bg-slate-800 text-slate-400 border-slate-700/50"
                    )}
                  >
                    {interceptorEnabled ? "interceptor" : "open"}
                  </Badge>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-400">
                <PackagePlusIcon className="h-3.5 w-3.5" />
                <span className="text-xs">No Environment</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px] bg-slate-900/95 backdrop-blur-sm border-slate-700/50">
          <SelectItem value="none" className="group">
            <div className="flex items-center gap-2 text-slate-400">
              <PackagePlusIcon className="h-3.5 w-3.5" />
              <span className="text-xs">No Environment</span>
            </div>
          </SelectItem>
          {environments.map((env) => (
            <SelectItem key={env.id} value={env.id} className="group">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <PackagePlusIcon className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-300" />
                  <span
                    className={cn(
                      "text-xs",
                      env.global ? "text-blue-400" : "text-slate-300"
                    )}
                  >
                    {env.name}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {env.variables.length} vars
                  </span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
