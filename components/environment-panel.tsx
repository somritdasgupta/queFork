import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, Download, Upload, Copy } from "lucide-react";
import { KeyValueEditor } from "./key-value-editor";
import { Environment, EnvironmentVariable, KeyValuePair } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface EnvironmentPanelProps {
  environments: Environment[];
  currentEnvironment: Environment | null;
  onEnvironmentChange: (environmentId: string) => void;
  onEnvironmentsUpdate: (environments: Environment[]) => void;
}

export interface EnvironmentPanelRef {
  getMergedEnvironmentVariables: () => EnvironmentVariable[];
}

export const EnvironmentPanel = forwardRef<
  EnvironmentPanelRef,
  EnvironmentPanelProps
>(({ environments, currentEnvironment, onEnvironmentsUpdate }, ref) => {
  const [newEnvironmentName, setNewEnvironmentName] = useState("");
  const [editingEnvironment, setEditingEnvironment] =
    useState<Environment | null>(null);
  const [search, setSearch] = useState("");
  const [expandedEnv, setExpandedEnv] = useState<string | null>(null);

  const handleCreateEnvironment = () => {
    if (
      !newEnvironmentName.trim() ||
      newEnvironmentName.toLowerCase() === "default"
    )
      return;

    const newEnvironment: Environment = {
      id: uuidv4(),
      name: newEnvironmentName.trim(),
      variables: [],
      global: false,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    onEnvironmentsUpdate([...environments, newEnvironment]);
    setNewEnvironmentName("");
    setEditingEnvironment(newEnvironment);
  };

  const getMergedEnvironmentVariables = () => {
    const globalEnv = environments.find((env) => env.global);
    const currentEnv = environments.find(
      (env) => env.id === currentEnvironment?.id
    );

    const mergedVariables = [...(globalEnv?.variables || [])];

    if (currentEnv && !currentEnv.global) {
      currentEnv.variables.forEach((variable) => {
        const index = mergedVariables.findIndex((v) => v.key === variable.key);
        if (index !== -1) {
          mergedVariables[index] = variable;
        } else {
          mergedVariables.push(variable);
        }
      });
    }

    return mergedVariables;
  };

  useImperativeHandle(ref, () => ({
    getMergedEnvironmentVariables,
  }));

  const handleImportEnvironment = async () => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,.env";

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        if (file.name.endsWith(".env")) {
          const text = await file.text();
          const envVars = text
            .split("\n")
            .filter((line) => line.trim() && !line.startsWith("#"))
            .map((line) => {
              const [key, ...valueParts] = line.split("=");
              return {
                key: key.trim(),
                value: valueParts.join("=").trim(),
                type: "text" as const,
                enabled: true,
              };
            });

          const newEnv: Environment = {
            id: uuidv4(),
            name: file.name.replace(".env", ""),
            variables: envVars,
            created: new Date().toISOString(),
            lastModified: new Date().toISOString(),
          };
          onEnvironmentsUpdate([...environments, newEnv]);
        } else {
          const text = await file.text();
          const imported = JSON.parse(text);
          onEnvironmentsUpdate([
            ...environments,
            {
              ...imported,
              id: uuidv4(),
              created: new Date().toISOString(),
              lastModified: new Date().toISOString(),
            },
          ]);
        }
        toast.success("Environment imported successfully");
      };
      input.click();
    } catch (error) {
      toast.error("Failed to import environment");
    }
  };

  const handleExportEnvironment = (env: Environment) => {
    const dataStr = JSON.stringify(env, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    saveAs(blob, `${env.name.toLowerCase()}-environment.json`);
    toast.success("Environment exported successfully");
  };

  const handleDuplicateEnvironment = (env: Environment) => {
    const duplicate: Environment = {
      ...env,
      id: uuidv4(),
      name: `${env.name} (Copy)`,
      global: false,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };
    onEnvironmentsUpdate([...environments, duplicate]);
    toast.success("Environment duplicated");
  };

  const countValidVariables = (variables: EnvironmentVariable[]) => {
    return variables.filter((v) => v.key.trim() && v.value.trim()).length;
  };

  const handleKeyValueChange = (env: Environment, pairs: KeyValuePair[]) => {
    // Filter out empty pairs except the last one
    const validPairs = pairs
      .slice(0, -1)
      .filter((p) => p.key.trim() && p.value.trim());

    // Always keep the last pair for UI purposes
    const lastPair = pairs[pairs.length - 1];
    const finalPairs = [...validPairs];
    if (lastPair) {
      finalPairs.push(lastPair);
    }

    const updatedEnv = {
      ...env,
      variables: finalPairs.map((p) => ({
        key: p.key,
        value: p.value,
        type: p.type as "text" | "secret",
        enabled: p.enabled ?? true,
      })),
      lastModified: new Date().toISOString(),
    };

    const updatedEnvironments = environments.map((e) =>
      e.id === env.id ? updatedEnv : e
    );
    onEnvironmentsUpdate(updatedEnvironments);

    // Dispatch event for real-time updates
    window.dispatchEvent(new CustomEvent("environmentUpdated"));
  };

  const filteredEnvironments = environments.filter((env) =>
    env.name.toLowerCase().includes(search.toLowerCase())
  );

  if (editingEnvironment) {
    return (
      <div className="h-full flex flex-col bg-slate-800">
        <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700">
          <div className="flex items-center p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingEnvironment(null)}
              className="h-8 w-8"
            >
              ←
            </Button>
            <span className="text-sm font-medium text-slate-300">
              {editingEnvironment.name}
            </span>
            {editingEnvironment.global && (
              <Badge variant="secondary" className="ml-2 text-xs">
                Global
              </Badge>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-0">
            <KeyValueEditor
              pairs={editingEnvironment.variables.map((v) => ({
                ...v,
                type: v.type || "text",
                showSecrets: false,
                id: `env-${v.key}`,
                description: "",
              }))}
              onChange={(pairs) => {
                const updatedEnv = {
                  ...editingEnvironment,
                  variables: pairs.map((p) => ({
                    key: p.key,
                    value: p.value,
                    type: p.type as "text" | "secret",
                    enabled: p.enabled ?? true,
                  })),
                  lastModified: new Date().toISOString(),
                };

                setEditingEnvironment(updatedEnv);
                const updatedEnvironments = environments.map((env) =>
                  env.id === editingEnvironment.id ? updatedEnv : env
                );
                onEnvironmentsUpdate(updatedEnvironments);
              }}
              requireUniqueKeys={true}
              isEnvironmentEditor={true}
              preventFirstItemDeletion={true}
              autoSave={true}
            />
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-800">
      <div className="sticky top-0 z-10 bg-slate-900">
        <div className="flex w-full">
          <Input
            placeholder="Add new environment"
            value={newEnvironmentName}
            onChange={(e) => setNewEnvironmentName(e.target.value)}
            className="h-10 w-full rounded-none bg-slate-900 border-2 border-slate-700 focus-visible:ring-0 focus-visible:ring-offset-0 pl-3 text-slate-300 placeholder:text-slate-500 sm:text-base text-xs"
          />
          <div className="flex">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleImportEnvironment}
              className="h-10 w-10 rounded-none border-2 border-l-0 border-slate-700 bg-slate-900 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCreateEnvironment}
              disabled={!newEnvironmentName.trim()}
              className="h-10 w-10 rounded-none border-2 border-l-0 border-slate-700 bg-slate-900 hover:bg-slate-800 text-blue-400 hover:text-blue-300 disabled:text-slate-500"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Input
          placeholder="Search environments"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 rounded-none bg-slate-900 border-2 border-t-0 border-slate-700 focus-visible:ring-0 focus-visible:ring-offset-0 pl-3 text-slate-300 placeholder:text-slate-500 sm:text-base text-xs"
        />
      </div>

      <ScrollArea className="flex-1">
        <Accordion
          type="single"
          collapsible
          value={expandedEnv || undefined}
          onValueChange={(value) => setExpandedEnv(value)}
        >
          {filteredEnvironments.map((env) => (
            <AccordionItem
              key={env.id}
              value={env.id}
              className="border-b border-slate-700"
            >
              <AccordionTrigger className="px-4 text-slate-500 hover:bg-slate-700/50 transition-colors">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-300">
                      {env.name}
                    </span>
                    {env.global && (
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4 px-1 bg-slate-800 text-slate-400 border-slate-600"
                      >
                        Global
                      </Badge>
                    )}
                    <span className="text-xs text-slate-500">
                      ({countValidVariables(env.variables)})
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateEnvironment(env);
                      }}
                      className="h-8 w-8 hover:bg-slate-800 text-blue-400 hover:text-blue-300"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportEnvironment(env);
                      }}
                      className="h-8 w-8 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {!env.global && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            confirm(
                              "Are you sure you want to delete this environment?"
                            )
                          ) {
                            onEnvironmentsUpdate(
                              environments.filter((e) => e.id !== env.id)
                            );
                            toast.success("Environment deleted");
                          }
                        }}
                        className="h-8 w-8 hover:bg-slate-800 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="border-t border-slate-700 bg-slate-900/50 p-0">
                <KeyValueEditor
                  pairs={env.variables.map((v) => ({
                    ...v,
                    type: v.type || "text",
                    showSecrets: false,
                    id: `env-${v.key}`,
                    description: "",
                  }))}
                  onChange={(pairs) => handleKeyValueChange(env, pairs)}
                  requireUniqueKeys={true}
                  isEnvironmentEditor={true}
                  preventFirstItemDeletion={true}
                  autoSave={true}
                  isMobile={true} // Force mobile UI
                  className="border-0 shadow-none" // Remove any borders/shadows
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollArea>
    </div>
  );
});

EnvironmentPanel.displayName = "EnvironmentPanel";
