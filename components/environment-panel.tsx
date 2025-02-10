"use client";

import React, {
  useState,
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Upload, 
  Search,
  Copy,
  Download,
  Trash2,
  BoxIcon 
} from "lucide-react";
import { KeyValueEditor } from "./key-value-editor";
import { Environment, EnvironmentVariable } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { NavigableElement, useKeyboardNavigation } from "./keyboard-navigation";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const DynamicAccordion = dynamic(
  () => import("@/components/ui/accordion").then((mod) => mod.Accordion),
  { ssr: false }
);

interface EnvironmentPanelProps {
  environments: Environment[];
  currentEnvironment: Environment | null;
  onEnvironmentChange: (environmentId: string) => void;
  onEnvironmentsUpdate: (environments: Environment[]) => void;
}

export interface EnvironmentPanelRef {
  getMergedEnvironmentVariables: () => EnvironmentVariable[];
}

export const EnvironmentPanel = forwardRef<EnvironmentPanelRef, EnvironmentPanelProps>(
  ({ environments, currentEnvironment, onEnvironmentChange, onEnvironmentsUpdate }, ref) => {
    const [newEnvironmentName, setNewEnvironmentName] = useState("");
    const [editingEnvironment, setEditingEnvironment] = useState<Environment | null>(null);
    const [localEditingVariables, setLocalEditingVariables] = useState<EnvironmentVariable[]>([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [search, setSearch] = useState("");
    const navigableElements = useRef<NavigableElement[]>([]);
    const [expandedEnvironments, setExpandedEnvironments] = useState<Set<string>>(new Set());

    const [localVariables, setLocalVariables] = useState<{
      [envId: string]: EnvironmentVariable[];
    }>({});
    const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set());

    useEffect(() => {
      if (editingEnvironment) {
        setLocalEditingVariables(editingEnvironment.variables);
        setHasUnsavedChanges(false);
      }
    }, [editingEnvironment]);

    useEffect(() => {
      const newLocalVars: { [envId: string]: EnvironmentVariable[] } = {};
      environments.forEach((env) => {
        if (!localVariables[env.id]) {
          newLocalVars[env.id] = env.variables;
        }
      });
      setLocalVariables((prev) => ({ ...prev, ...newLocalVars }));
    }, [environments]);

    const handleCreateEnvironment = () => {
      if (!newEnvironmentName.trim() || newEnvironmentName.toLowerCase() === "default") return;

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

    const handleExportEnvironment = (env: Environment) => {
      const dataStr = JSON.stringify(env, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      saveAs(blob, `${env.name.toLowerCase()}-environment.json`);
      toast.success("Environment exported successfully");
    };

    const handleDeleteEnvironment = (id: string) => {
      const env = environments.find((e) => e.id === id);
      if (env && !env.global) {
        onEnvironmentsUpdate(environments.filter((e) => e.id !== id));
        toast.success("Environment deleted");
      }
    };

    const handleSaveEnvironment = () => {
      if (!editingEnvironment) return;

      const updatedEnvironments = environments.map((env) =>
        env.id === editingEnvironment.id
          ? {
              ...editingEnvironment,
              variables: localEditingVariables,
              lastModified: new Date().toISOString(),
            }
          : env
      );

      onEnvironmentsUpdate(updatedEnvironments);
      setHasUnsavedChanges(false);
      toast.success("Environment saved successfully");
    };

    const handleCloseEditor = () => {
      if (hasUnsavedChanges) {
        if (window.confirm("You have unsaved changes. Are you sure you want to exit?")) {
          setEditingEnvironment(null);
        }
      } else {
        setEditingEnvironment(null);
      }
    };

    const countValidVariables = (variables: EnvironmentVariable[]) => {
      return variables.filter((v) => v.key.trim() && v.value.trim()).length;
    };

    const filteredEnvironments = environments.filter((env) =>
      env.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleLocalChange = (envId: string, pairs: any[]) => {
      setLocalVariables((prev) => ({
        ...prev,
        [envId]: pairs.map((p) => ({
          key: p.key,
          value: p.value,
          type: p.type as "text" | "secret",
          enabled: p.enabled ?? true,
        })),
      }));
      setUnsavedChanges((prev) => new Set(prev).add(envId));
    };

    const handleSaveEnvironmentChanges = (envId: string) => {
      const updatedEnvironments = environments.map((env) =>
        env.id === envId
          ? {
              ...env,
              variables: localVariables[envId],
              lastModified: new Date().toISOString(),
            }
          : env
      );
      onEnvironmentsUpdate(updatedEnvironments);
      setUnsavedChanges((prev) => {
        const next = new Set(prev);
        next.delete(envId);
        return next;
      });
      toast.success("Changes saved");
    };

    if (editingEnvironment) {
      return (
        <div className="h-full flex flex-col bg-slate-800">
          <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700">
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseEditor}
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
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="text-yellow-400 border-yellow-400/20">
                    Unsaved changes
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveEnvironment}
                  disabled={!hasUnsavedChanges}
                  className={cn(
                    "h-8",
                    hasUnsavedChanges
                      ? "border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                      : "border-slate-700 text-slate-500"
                  )}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>

          <ScrollArea direction="vertical" className="flex-1">
            <KeyValueEditor
              pairs={localEditingVariables.map((v) => ({
                ...v,
                id: v.key || uuidv4(),
                description: "",
                type: v.type || "text",
                showSecrets: false,
              }))}
              onChange={(pairs) => {
                setLocalEditingVariables(
                  pairs.map((p) => ({
                    key: p.key,
                    value: p.value,
                    type: p.type as "text" | "secret",
                    enabled: p.enabled ?? true,
                  }))
                );
                setHasUnsavedChanges(true);
              }}
              requireUniqueKeys={true}
              isEnvironmentEditor={true}
              preventFirstItemDeletion={true}
              autoSave={false}
            />
          </ScrollArea>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col bg-slate-900/50" suppressHydrationWarning>
        <div className="p-2 space-y-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                placeholder="Search environments"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-900 text-sm rounded-md pl-8 pr-4 py-1.5
                  border border-slate-800 focus:border-slate-700
                  text-slate-300 placeholder:text-slate-500
                  focus:outline-none focus:ring-1 focus:ring-slate-700"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              placeholder="Add new environment"
              value={newEnvironmentName}
              onChange={(e) => setNewEnvironmentName(e.target.value)}
              className="flex-1 bg-slate-900 text-sm rounded-md px-3 py-1.5
                border border-slate-800 focus:border-slate-700
                text-slate-300 placeholder:text-slate-500
                focus:outline-none focus:ring-1 focus:ring-slate-700"
            />
            <button
              onClick={handleCreateEnvironment}
              disabled={!newEnvironmentName.trim()}
              className={cn(
                "p-2 hover:bg-slate-800 rounded-md text-slate-400 border border-slate-800",
                !newEnvironmentName.trim() && "opacity-50 cursor-not-allowed"
              )}
              title="Create environment"
            >
              <Plus className="h-4 w-4 text-emerald-400" />
            </button>
            <button
              onClick={handleImportEnvironment}
              className="p-2 hover:bg-slate-800 rounded-md text-slate-400 border border-slate-800"
              title="Import environment"
            >
              <Upload className="h-4 w-4 text-yellow-400" />
            </button>
          </div>
        </div>

        <ScrollArea direction="vertical" className="flex-1 overflow-hidden bg-slate-900/75">
          <DynamicAccordion
            type="multiple"
            value={Array.from(expandedEnvironments)}
            onValueChange={(value) => setExpandedEnvironments(new Set(value))}
          >
            {filteredEnvironments.map((env) => (
              <AccordionItem
                key={env.id}
                value={env.id}
                ref={(el) => {
                  if (el) {
                    navigableElements.current.push({
                      id: env.id,
                      ref: el,
                      type: "environment",
                    });
                  }
                }}
                className="border-b border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <AccordionTrigger className="flex-1 px-4 text-slate-500 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-400">
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
                  </AccordionTrigger>
                  <div className="flex items-center gap-1 px-4">
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
                          handleDeleteEnvironment(env.id);
                        }}
                        className="h-8 w-8 hover:bg-slate-800 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <AccordionContent className="border-t border-slate-700 bg-slate-900/50 p-0">
                  <div className="flex flex-col">
                    <KeyValueEditor
                      pairs={(localVariables[env.id] || []).map((v) => ({
                        ...v,
                        id: v.key || uuidv4(),
                        description: "",
                        type: v.type || "text",
                        showSecrets: false,
                      }))}
                      onChange={(pairs) => handleLocalChange(env.id, pairs)}
                      requireUniqueKeys={true}
                      isEnvironmentEditor={true}
                      preventFirstItemDeletion={true}
                      autoSave={false}
                      isMobile={true}
                      className="border-0 shadow-none h-full"
                    />
                    {unsavedChanges.has(env.id) && (
                      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-t border-slate-700">
                        <Badge 
                          variant="outline" 
                          className="text-xs h-5 text-yellow-400 border-yellow-400/20 bg-yellow-400/5"
                        >
                          Unsaved changes
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSaveEnvironmentChanges(env.id)}
                          className="h-7 px-3 text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                        >
                          Save Changes
                        </Button>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </DynamicAccordion>
        </ScrollArea>
      </div>
    );
  }
);

EnvironmentPanel.displayName = "EnvironmentPanel";
