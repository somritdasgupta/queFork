import { Environment } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PackagePlus } from "lucide-react";
import { NetworkStatusIndicator } from "@/app/components/NetworkStatusIndicator";

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
    <div className={className}>
      <Select
        value={currentEnvironment?.id || "none"}
        onValueChange={onEnvironmentChange}
      >
        <SelectTrigger className={className}>
          <SelectValue>
            {currentEnvironment ? (
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-2 text-sm font-mono font-black tracking-tighter">
                  <span
                    className={
                      currentEnvironment.global
                        ? "text-blue-400"
                        : "text-yellow-400"
                    }
                  >
                    {currentEnvironment.name}
                  </span>
                </div>
                {hasExtension && interceptorEnabled && (
                  <div className="flex items-center gap-1 px-2 text-xs text-green-400 bg-green-900/20 rounded-full">
                    interceptor
                  </div>
                )}
                <NetworkStatusIndicator />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-400">
                <PackagePlus className="h-4 w-4" />
                <span className="text-xs">No Environment</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px] bg-slate-900 border border-slate-700">
          <SelectItem value="none">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">No Environment</span>
            </div>
          </SelectItem>
          {environments.map((env) => (
            <SelectItem key={env.id} value={env.id}>
              <div className="flex items-center gap-2">
                <span
                  className={env.global ? "text-blue-400" : "text-slate-200"}
                >
                  {env.name}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasExtension && (
        <div
          className={`absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${interceptorEnabled ? "bg-green-500" : "bg-red-500"}`}
          title={`Interceptor ${interceptorEnabled ? "enabled" : "disabled"}`}
        />
      )}
    </div>
  );
}
