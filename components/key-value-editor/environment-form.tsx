import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Key,
  Type,
  PackagePlusIcon,
  Plus,
  AlertCircle,
  Search,
  SendHorizonal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Environment } from "@/types";

interface EnvironmentFormProps {
  environments: Environment[];
  selectedPair: { key: string; value: string; type: "text" | "secret" } | null;
  onClose: () => void;
  onEnvironmentsUpdate: (environments: Environment[]) => void;
  onEnvironmentSave: (environmentId: string) => void;
}

export const EnvironmentForm: React.FC<EnvironmentFormProps> = ({
  environments,
  selectedPair,
  onClose,
  onEnvironmentsUpdate,
  onEnvironmentSave,
}) => {
  const [environmentSearch, setEnvironmentSearch] = useState("");
  const [isCreatingEnv, setIsCreatingEnv] = useState(false);

  const hasExistingKey = useCallback(
    (env: Environment) => {
      return env.variables.some(
        (v) => v.key.toLowerCase() === selectedPair?.key.toLowerCase()
      );
    },
    [selectedPair]
  );

  const handleCreateNewEnv = useCallback(() => {
    if (!environmentSearch.trim()) return;

    const isDuplicateName = environments?.some(
      (env) => env.name.toLowerCase() === environmentSearch.trim().toLowerCase()
    );

    if (isDuplicateName) {
      toast.error("Environment with this name already exists");
      return;
    }

    const newEnvironment: Environment = {
      id: `env-${Math.random().toString(36).slice(2)}`,
      name: environmentSearch.trim(),
      variables: [],
      global: false,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    onEnvironmentsUpdate([...environments, newEnvironment]);
    setEnvironmentSearch("");
    setIsCreatingEnv(false);
    toast.success("Environment created");
  }, [environmentSearch, environments, onEnvironmentsUpdate]);

  const filteredEnvironments = !isCreatingEnv
    ? environments?.filter((env) =>
        env.name.toLowerCase().includes(environmentSearch.toLowerCase())
      )
    : [];

  return (
    <div className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-md">
      <div className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col">
            <h2 className="text-sm font-medium text-slate-200">
              Add to Environment
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose an environment to add this variable
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 hover:bg-slate-800/50 transition-colors"
          >
            <X className="h-3.5 w-3.5 text-slate-400" />
          </Button>
        </div>

        {/* Variable Preview */}
        <div className="mb-2 px-2 py-1.5 bg-slate-800/50 backdrop-blur-sm rounded-md border border-slate-700/50">
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <Key className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              <span className="font-medium text-slate-300 truncate">
                {selectedPair?.key}
              </span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0 ml-2">
              <Type className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-slate-400 font-mono truncate">
                {selectedPair?.value}
              </span>
            </div>
            <Badge
              variant="secondary"
              className="ml-auto text-[10px] h-4 bg-slate-900/50 backdrop-blur-sm border-slate-700/50 px-1"
            >
              {selectedPair?.type === "secret" ? "Secret" : "Text"}
            </Badge>
          </div>
        </div>

        {/* Combined Search and Create Environment UI */}
        <div className="relative mb-2 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              placeholder={isCreatingEnv ? "Enter environment name..." : "Search environments..."}
              value={environmentSearch}
              onChange={(e) => setEnvironmentSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isCreatingEnv && environmentSearch.trim()) {
                  handleCreateNewEnv();
                } else if (e.key === "Escape" && isCreatingEnv) {
                  setIsCreatingEnv(false);
                  setEnvironmentSearch("");
                }
              }}
              className="w-full bg-slate-800/50 backdrop-blur-sm text-xs rounded-md pl-7 pr-2 py-1.5
                border border-slate-700/50 focus:border-slate-600
                text-slate-300 placeholder:text-slate-500
                focus:outline-none focus:ring-1 focus:ring-slate-600/50
                transition-colors"
            />
          </div>
          {isCreatingEnv ? (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCreateNewEnv}
                disabled={!environmentSearch.trim()}
                className="h-7 px-2 text-xs font-medium text-emerald-400 hover:text-emerald-300 
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsCreatingEnv(false);
                  setEnvironmentSearch("");
                }}
                className="h-7 w-7 p-0"
              >
                <X className="h-3.5 w-3.5 text-slate-400" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCreatingEnv(true)}
              className="h-7 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              New
            </Button>
          )}
        </div>

        {/* Environments List */}
        <div className="max-h-[180px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700/50 scrollbar-track-slate-800/30">
          <div className="space-y-0.5">
            {filteredEnvironments?.map((env) => {
              const isDuplicate = hasExistingKey(env);

              return (
                <Button
                  key={env.id}
                  variant="ghost"
                  size="sm"
                  disabled={isDuplicate}
                  onClick={() => {
                    if (selectedPair && !isDuplicate) {
                      onEnvironmentSave(env.id);
                    }
                  }}
                  className={cn(
                    "w-full justify-start text-left h-8 px-2",
                    "text-slate-300 hover:text-slate-200",
                    "bg-slate-800/30 hover:bg-slate-700/50",
                    "backdrop-blur-sm transition-all",
                    "group border border-transparent hover:border-slate-700/50",
                    isDuplicate &&
                      "opacity-50 cursor-not-allowed hover:bg-transparent"
                  )}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div
                      className={cn(
                        "p-1 rounded-md transition-colors",
                        isDuplicate
                          ? "bg-slate-800/50"
                          : "bg-slate-800/80 group-hover:bg-slate-700/80"
                      )}
                    >
                      {isDuplicate ? (
                        <AlertCircle className="h-3 w-3 text-yellow-500" />
                      ) : (
                        <PackagePlusIcon className="h-3 w-3 text-slate-400 group-hover:text-slate-300" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className={cn(
                          "text-xs truncate",
                          env.global ? "text-blue-400" : "text-slate-300"
                        )}
                      >
                        {env.name}
                      </span>
                      {isDuplicate ? (
                        <span className="text-[10px] text-yellow-500 px-1.5 py-0.5 rounded-full bg-yellow-500/10">
                          Key exists
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">
                          {env.variables.length} vars
                        </span>
                      )}
                    </div>
                    <SendHorizonal className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 ml-auto transition-all group-hover:translate-x-0.5 group-hover:text-slate-300" />
                  </div>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
