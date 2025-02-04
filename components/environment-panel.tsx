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
  Trash2,
  Edit2,
  Download,
  Upload,
  Copy,
  X,
  BoxIcon,
  Check,
} from "lucide-react";
import { KeyValueEditor } from "./key-value-editor";
import { Environment, EnvironmentVariable, KeyValuePair } from "@/types";
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

const DynamicAccordion = dynamic(
  () => import("@/components/ui/accordion").then((mod) => mod.Accordion),
  {
    ssr: false,
  }
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

export const EnvironmentPanel = forwardRef<
  EnvironmentPanelRef,
  EnvironmentPanelProps
>(({ environments, currentEnvironment, onEnvironmentsUpdate }, ref) => {
  const [newEnvironmentName, setNewEnvironmentName] = useState("");
  const [editingEnvironment, setEditingEnvironment] =
    useState<Environment | null>(null);
  const [search, setSearch] = useState("");
  const [expandedEnv, setExpandedEnv] = useState<string | null>(null);
  const navigableElements = useRef<NavigableElement[]>([]);
  const [expandedEnvironments, setExpandedEnvironments] = useState<Set<string>>(
    new Set()
  );
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [pendingVariable, setPendingVariable] = useState<{
    key: string;
    value: string;
    type: "text" | "secret";
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    type: "environment";
  } | null>(null);

  useEffect(() => {
    const handleShowSaveForm = (e: CustomEvent) => {
      // Set both states immediately and synchronously
      setPendingVariable(e.detail);
      setShowSaveForm(true);
    };

    window.addEventListener(
      "showEnvironmentSaveForm",
      handleShowSaveForm as EventListener
    );
    return () => {
      window.removeEventListener(
        "showEnvironmentSaveForm",
        handleShowSaveForm as EventListener
      );
    };
  }, []); // Remove expandedEnvironments dependency

  useEffect(() => {
    const handleEnvironmentSaveAction = (e: CustomEvent) => {
      const { key, value, type, useFirstEmptyRow } = e.detail;

      // Find the target environment
      const targetEnvironment = currentEnvironment || environments[0];
      if (!targetEnvironment) {
        toast.error("No environment selected");
        return;
      }

      // Function to add variable to environment
      const addVariableToEnvironment = (env: Environment) => {
        const updatedEnvironments = environments.map((e) => {
          if (e.id === env.id) {
            let updatedVariables = [...e.variables];

            if (useFirstEmptyRow) {
              // Find first empty row
              const emptyIndex = updatedVariables.findIndex(
                (v) => !v.key && !v.value
              );

              if (emptyIndex !== -1) {
                // Update existing empty row
                updatedVariables[emptyIndex] = {
                  key,
                  value,
                  type: type || "text",
                  enabled: true,
                };
              } else {
                // No empty row found, add new one
                updatedVariables.push({
                  key,
                  value,
                  type: type || "text",
                  enabled: true,
                });
              }
            } else {
              // Legacy behavior - always add new row
              updatedVariables.push({
                key,
                value,
                type: type || "text",
                enabled: true,
              });
            }

            return {
              ...e,
              variables: updatedVariables,
              lastModified: new Date().toISOString(),
            };
          }
          return e;
        });

        onEnvironmentsUpdate(updatedEnvironments);
        setPendingVariable(null);
        setShowSaveForm(false);
        toast.success("Variable added to environment");
      };

      // If we're showing the form, save the pending variable
      if (e.detail.showForm) {
        setPendingVariable({ key, value, type: type || "text" });
        setShowSaveForm(true);
      } else {
        // Direct save to current/default environment
        addVariableToEnvironment(targetEnvironment);
      }
    };

    window.addEventListener(
      "environmentSaveAction",
      handleEnvironmentSaveAction as EventListener
    );
    return () => {
      window.removeEventListener(
        "environmentSaveAction",
        handleEnvironmentSaveAction as EventListener
      );
    };
  }, [environments, currentEnvironment, onEnvironmentsUpdate]);

  const handleSaveToEnvironment = (environmentId: string) => {
    if (!pendingVariable) return;

    const targetEnv = environments.find((env) => env.id === environmentId);
    if (!targetEnv) return;

    const updatedEnvironments = environments.map((env) => {
      if (env.id === environmentId) {
        let updatedVariables = [...env.variables];

        // Find first empty row
        const emptyIndex = updatedVariables.findIndex(
          (v) => !v.key && !v.value
        );

        if (emptyIndex !== -1) {
          // Update existing empty row
          updatedVariables[emptyIndex] = {
            key: pendingVariable.key,
            value: pendingVariable.value,
            type: pendingVariable.type,
            enabled: true,
          };
        } else {
          // No empty row found, add new one
          updatedVariables.push({
            key: pendingVariable.key,
            value: pendingVariable.value,
            type: pendingVariable.type,
            enabled: true,
          });
        }

        return {
          ...env,
          variables: updatedVariables,
          lastModified: new Date().toISOString(),
        };
      }
      return env;
    });

    onEnvironmentsUpdate(updatedEnvironments);
    setPendingVariable(null);
    setShowSaveForm(false);
    toast.success("Variable added to environment");
  };

  const handleDeleteEnvironment = (id: string) => {
    const env = environments.find((e) => e.id === id);
    if (env && !env.global) {
      if (deleteConfirm?.id === id && deleteConfirm.type === "environment") {
        // Clean up navigable elements
        navigableElements.current = navigableElements.current.filter(
          (el) => el.id !== id
        );
        onEnvironmentsUpdate(environments.filter((e) => e.id !== id));
        toast.success("Environment deleted");
        setDeleteConfirm(null);

        // Focus next available environment
        const nextElement = navigableElements.current[0];
        if (nextElement) {
          setFocus(nextElement.id);
        }
      } else {
        setDeleteConfirm({ id, type: "environment" });
      }
    }
  };

  const { setFocus } = useKeyboardNavigation(
    navigableElements.current,
    (direction, currentId) => {
      const currentElement = navigableElements.current.find(
        (el) => el.id === currentId
      );
      if (!currentElement) return;

      let nextId: string | undefined;

      switch (direction) {
        case "down":
          nextId = navigableElements.current.find(
            (el) =>
              el.type === "environment" &&
              navigableElements.current.indexOf(el) >
                navigableElements.current.indexOf(currentElement)
          )?.id;
          break;
        case "up":
          const reversedElements = [...navigableElements.current].reverse();
          nextId = reversedElements.find(
            (el) =>
              el.type === "environment" &&
              navigableElements.current.indexOf(el) <
                navigableElements.current.indexOf(currentElement)
          )?.id;
          break;
        case "right":
          // Expand environment if collapsed
          if (currentElement.type === "environment") {
            setExpandedEnvironments((prev) => {
              const next = new Set(prev);
              next.add(currentElement.id);
              return next;
            });
            setExpandedEnv(currentElement.id);
          }
          break;
        case "left":
          // Collapse environment
          if (currentElement.type === "environment") {
            setExpandedEnvironments((prev) => {
              const next = new Set(prev);
              next.delete(currentElement.id);
              return next;
            });
            setExpandedEnv(null);
          }
          break;
      }

      if (nextId) {
        setFocus(nextId);
        // Scroll element into view
        const element = navigableElements.current.find(
          (el) => el.id === nextId
        );
        element?.ref.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    },
    (id) => {
      // Handle environment selection
      const element = navigableElements.current.find((el) => el.id === id);
      if (element?.type === "environment") {
        setEditingEnvironment(
          environments.find((env) => env.id === id) || null
        );
      }
    },
    (id) => {
      handleDeleteEnvironment(id);
    }
  );

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

  // Add check to close editing mode if save form needs to be shown
  useEffect(() => {
    if (showSaveForm && pendingVariable) {
      setEditingEnvironment(null);
    }
  }, [showSaveForm, pendingVariable]);

  const renderDeleteConfirmation = (id: string) => (
    <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50 border-t border-slate-700/50">
      <span className="text-xs text-slate-400">Delete environment?</span>
      <div className="flex items-center gap-1 ml-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteConfirm(null);
          }}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4 text-slate-400" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteEnvironment(id);
          }}
          className="h-6 w-6 p-0"
        >
          <Check className="h-4 w-4 text-emerald-400" />
        </Button>
      </div>
    </div>
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

        <ScrollArea direction="vertical" className="flex-1">
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
    <div className="h-full flex flex-col bg-slate-950" suppressHydrationWarning>
      {showSaveForm && pendingVariable && (
        <div className="bg-slate-900/70">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-300">
                Save to Environment
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPendingVariable(null);
                  setShowSaveForm(false);
                }}
                className="h-7 w-7 p-0"
              >
                <X className="h-4 w-4 text-slate-400" />
              </Button>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-400 mb-2">
                Select Environment
              </div>
              <div className="space-y-1">
                {environments.map((env) => (
                  <Button
                    key={env.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSaveToEnvironment(env.id)}
                    className="w-full justify-start text-left h-8 px-3 text-slate-300 hover:text-slate-200 hover:bg-slate-800"
                  >
                    <BoxIcon className="h-4 w-4 mr-2 text-slate-400" />
                    {env.name}
                    {env.global && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        Global
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="sticky top-0 z-10 bg-slate-900">
        <Input
          placeholder="Search environments"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 rounded-none bg-slate-900 border-1 border-t border-slate-700 focus-visible:ring-0 focus-visible:ring-offset-0 pl-3 text-slate-300 placeholder:text-slate-500 sm:text-base text-xs"
        />
        <div className="flex w-full">
          <Input
            placeholder="Add new environment"
            value={newEnvironmentName}
            onChange={(e) => setNewEnvironmentName(e.target.value)}
            className="h-12 w-full rounded-none bg-slate-900/50 border-2 border-slate-700 focus-visible:ring-0 focus-visible:ring-offset-0 pl-3 text-slate-300 placeholder:text-slate-500 sm:text-base text-xs"
          />
          <div className="flex">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCreateEnvironment}
              disabled={!newEnvironmentName.trim()}
              className="h-12 w-12 rounded-none border-2 border-slate-700/50 bg-slate-900 hover:bg-slate-900/50 text-blue-400 hover:text-blue-300 disabled:border-slate-600 disabled:text-slate-500"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleImportEnvironment}
              className="h-12 w-12 rounded-none border-2 border-slate-700 bg-slate-900/50 hover:bg-slate-900/50 text-emerald-400 hover:text-emerald-300"
            >
              <Upload className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <ScrollArea
        direction="vertical"
        className="flex-1 overflow-hidden bg-slate-900/75"
      >
        <DynamicAccordion
          type="multiple"
          value={Array.from(expandedEnvironments)}
          onValueChange={(value) => {
            setExpandedEnvironments(new Set(value));
            setExpandedEnv(value[value.length - 1]);
          }}
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
              {deleteConfirm?.id === env.id && renderDeleteConfirmation(env.id)}
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
                  className="border-0 shadow-none h-full" // Remove any borders/shadows and added full height
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </DynamicAccordion>
      </ScrollArea>{" "}
    </div>
  );
});

EnvironmentPanel.displayName = "EnvironmentPanel";
