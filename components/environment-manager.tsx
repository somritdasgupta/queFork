import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KeyValueEditor } from "./key-value-editor";
import {
  Plus,
  Settings,
  Trash2,
  Edit2,
  Download,
  Upload,
  Copy,
  Eye,
  EyeOff,
  HelpCircle,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Environment } from "@/types";

interface EnvironmentVariable {
  key: string;
  value: string;
  type: "text" | "secret";
  enabled: boolean;
}

interface EnvironmentManagerProps {
  environments: Environment[];
  currentEnvironment: Environment | null;
  onEnvironmentChange: (environmentId: string) => void;
  onEnvironmentsUpdate: (environments: Environment[]) => void;
  className?: string;
}

export interface EnvironmentManagerRef {
  getMergedEnvironmentVariables: () => EnvironmentVariable[];
}

const EnvironmentHelp = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="ghost" size="sm" className="h-8 w-8">
        <HelpCircle className="h-4 w-4" />
      </Button>
    </DialogTrigger>
    <DialogContent className="sm:top-[50%] top-[unset] bottom-0 sm:bottom-[unset] sm:translate-y-[-50%] translate-y-0 rounded-t-lg sm:rounded-lg">
      <DialogHeader>
        <DialogTitle>Using Environment Variables</DialogTitle>
        <DialogDescription>
          Learn how to use environment variables in your requests
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <h4 className="font-medium">Usage</h4>
          <p className="text-sm text-slate-500">
            Use{" "}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded">
              {"{{variable_name}}"}
            </code>{" "}
            to reference variables in:
          </p>
          <ul className="list-disc list-inside text-sm text-slate-500 mt-2 space-y-1">
            <li>URL</li>
            <li>Headers</li>
            <li>Query Parameters</li>
            <li>Body</li>
          </ul>
        </div>
        <div>
          <h4 className="font-medium">Example</h4>
          <pre className="bg-gray-100 p-2 rounded text-sm mt-2">
            <code>https://{"{{base_url}}"}/api/users</code>
          </pre>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

export const EnvironmentManager = forwardRef<
  EnvironmentManagerRef,
  EnvironmentManagerProps
>(
  (
    {
      environments,
      currentEnvironment,
      onEnvironmentChange,
      onEnvironmentsUpdate,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [newEnvironmentName, setNewEnvironmentName] = useState("");
    const [editingEnvironment, setEditingEnvironment] =
      useState<Environment | null>(null);

    const createDefaultEnvironment = () => {
      const defaultEnv: Environment = {
        id: "default",
        name: "Default",
        variables: [],
        global: true,
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      };
      onEnvironmentsUpdate([defaultEnv]);
      onEnvironmentChange(defaultEnv.id);
    };

    const getMergedEnvironmentVariables = () => {
      const globalEnv = environments.find((env) => env.global);
      const currentEnv = environments.find(
        (env) => env.id === currentEnvironment?.id
      );

      const mergedVariables = [...(globalEnv?.variables || [])];

      if (currentEnv && !currentEnv.global) {
        currentEnv.variables.forEach((variable) => {
          const index = mergedVariables.findIndex(
            (v) => v.key === variable.key
          );
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

    const handleCreateEnvironment = () => {
      if (
        newEnvironmentName.trim() &&
        newEnvironmentName.toLowerCase() !== "default"
      ) {
        const newEnvironment: Environment = {
          id: uuidv4(),
          name: newEnvironmentName.trim(),
          variables: [], // Variables array is empty
          global: false,
          created: new Date().toISOString(),
          lastModified: new Date().toISOString(),
        };

        const updatedEnvironments = [...environments, newEnvironment];
        handleEnvironmentsUpdate(updatedEnvironments);
        setNewEnvironmentName("");
        setIsOpen(false);
      }
    };

    const handleDuplicateEnvironment = (env: Environment) => {
      const duplicate: Environment = {
        ...env,
        id: uuidv4(),
        name: `${env.name} (Copy)`,
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        global: false,
      };
      onEnvironmentsUpdate([...environments, duplicate]);
      toast.success("Environment duplicated");
    };

    const handleExportEnvironment = (env: Environment) => {
      const dataStr = JSON.stringify(env, null, 2);
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(
        dataStr
      )}`;
      const exportFileDefaultName = `${env.name.toLowerCase()}-environment.json`;

      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", exportFileDefaultName);
      linkElement.click();
    };

    const handleImportEnvironment = async () => {
      try {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json";

        input.onchange = async (e: Event) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const text = await file.text();
            const imported: Environment = JSON.parse(text);
            const newEnv: Environment = {
              ...imported,
              id: uuidv4(),
              created: new Date().toISOString(),
              lastModified: new Date().toISOString(),
              global: false,
            };
            onEnvironmentsUpdate([...environments, newEnv]);
            toast.success("Environment imported");
          }
        };

        input.click();
      } catch (error) {
        toast.error("Failed to import environment");
      }
    };

    const handleDeleteEnvironment = (envId: string) => {
      if (!confirm("Are you sure you want to delete this environment?")) return;

      const updatedEnvironments = environments.filter((e) => e.id !== envId);
      onEnvironmentsUpdate(updatedEnvironments);

      if (currentEnvironment?.id === envId) {
        onEnvironmentChange(updatedEnvironments[0]?.id || "");
      }

      toast.success("Environment deleted");
    };

    const handleEnvironmentsUpdate = (updatedEnvironments: Environment[]) => {
      // Save to localStorage first
      localStorage.setItem(
        "que-environments",
        JSON.stringify(updatedEnvironments)
      );
      // Then update state through callback
      onEnvironmentsUpdate(updatedEnvironments);
    };

    const handleSaveEnvironment = () => {
      if (editingEnvironment) {
        const updatedEnvironments = environments.map((env) =>
          env.id === editingEnvironment.id
            ? {
                ...editingEnvironment,
                lastModified: new Date().toISOString(),
                variables: editingEnvironment.variables.filter(
                  (v) => v.key.trim() !== ""
                ),
              }
            : env
        );
        handleEnvironmentsUpdate(updatedEnvironments);
        setEditingEnvironment(null);
        toast.success("Environment updated");
      }
    };

    return (
      <div className="flex items-center gap-2 max-w-full">
        <div className="flex-shrink sm:w-40 w-full">
          <Select
            value={currentEnvironment?.id || ""}
            onValueChange={onEnvironmentChange}
          >
            <SelectTrigger className="w-full bg-slate-900 font-medium text-slate-400 hover:border-slate-700 rounded-lg">
              <SelectValue placeholder="Environments" />
            </SelectTrigger>
            <SelectContent className="rounded-lg border border-slate-300 bg-slate-50">
              {environments.map((env) => (
                <SelectItem key={env.id} value={env.id}>
                  {env.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              size="icon"
              className="h-10 w-12 flex-shrink-0 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:top-[50%] top-[unset] bottom-0 sm:bottom-[unset] sm:translate-y-[-50%] translate-y-0 rounded-t-lg sm:rounded-lg">
            <DialogHeader>
              <DialogTitle>Manage Environments</DialogTitle>
              <DialogDescription>
                Create and manage your API environments
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:top-[50%] top-[unset] bottom-0 sm:bottom-[unset] sm:translate-y-[-50%] translate-y-0 rounded-t-lg sm:rounded-lg">
                    <DialogHeader>
                      <DialogTitle>Using Environment Manager</DialogTitle>
                      <DialogDescription>
                        Learn how to use and manage environment on queFork
                      </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-4 pr-4">
                        <div>
                          <h4 className="font-medium">Environment Types</h4>
                          <div className="space-y-2 mt-2">
                            <div>
                              <p className="text-sm font-medium text-slate-700">
                                Default (Global) Environment
                              </p>
                              <p className="text-sm text-slate-500">
                                • Variables defined here are available across
                                all environments
                                <br />
                                • Cannot be deleted
                                <br />• Useful for shared configuration like
                                base URLs
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-700">
                                Custom Environments
                              </p>
                              <p className="text-sm text-slate-500">
                                • Environment-specific variables
                                <br />
                                • Override global variables if same key exists
                                <br />• Useful for dev/staging/prod
                                configurations
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium">Import Format</h4>
                          <p className="text-sm text-slate-500 mb-2">
                            JSON structure for importing environments:
                          </p>
                          <pre className="bg-gray-100 p-2 rounded text-sm">
                            <code>{`{
              "name": "Environment Name",
              "description": "Optional description",
              "variables": [
              {
                "key": "text_variable",
                "value": "text_value",
                "type": "text",
                "enabled": true
              },
              {
                "key": "secret_variable",
                "value": "secret_value",
                "type": "secret",
                "enabled": true
              }
              ]
            }`}</code>
                          </pre>
                        </div>

                        <div>
                          <h4 className="font-medium">Usage</h4>
                          <p className="text-sm text-slate-500">
                            Use{" "}
                            <code className="bg-gray-100 px-1.5 py-0.5 rounded">
                              {"{{variable_name}}"}
                            </code>{" "}
                            to reference variables in:
                          </p>
                          <ul className="list-disc list-inside text-sm text-slate-500 mt-2 space-y-1">
                            <li>URL</li>
                            <li>Headers</li>
                            <li>Query Parameters</li>
                            <li>Body</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium">Examples</h4>
                          <div className="space-y-3 mt-2">
                            <div>
                              <p className="text-sm text-slate-500">
                                URL with base URL and version:
                              </p>
                              <pre className="bg-gray-100 p-2 rounded text-sm">
                                <code>
                                  https://{"{{base_url}}"}/api/{"{{version}}"}
                                  /users
                                </code>
                              </pre>
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">
                                Headers with authentication:
                              </p>
                              <pre className="bg-gray-100 p-2 rounded text-sm">
                                <code>
                                  Authorization: Bearer {"{{auth_token}}"}
                                </code>
                              </pre>
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">
                                Query parameters:
                              </p>
                              <pre className="bg-gray-100 p-2 rounded text-sm">
                                <code>
                                  /api/search?key={"{{api_key}}"}&limit=
                                  {"{{page_size}}"}
                                </code>
                              </pre>
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">
                                Request body:
                              </p>
                              <pre className="bg-gray-100 p-2 rounded text-sm">
                                <code>{`{
                    "apiKey": "{{api_key}}",
                    "webhook": "{{webhook_url}}",
                    "environment": "{{env_name}}"
                    }`}</code>
                              </pre>
                            </div>
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleImportEnvironment}
                  className="rounded-lg"
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <Input
                  placeholder="Environment name"
                  value={newEnvironmentName}
                  onChange={(e) => setNewEnvironmentName(e.target.value)}
                  className="rounded-lg"
                />
                <Button
                  onClick={handleCreateEnvironment}
                  disabled={!newEnvironmentName.trim()}
                  className="rounded-lg"
                >
                  <Plus className="h-4 w-4 text-slate-400" />
                </Button>
              </div>

              <ScrollArea className="h-[400px] rounded-lg border border-slate-300">
                <div className="p-4 space-y-4">
                  {environments.map((env) => (
                    <div
                      key={env.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-300"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700">
                          {env.name}
                        </span>
                        {env.global && (
                          <Badge variant="secondary">Global</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicateEnvironment(env)}
                          className="rounded-lg"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExportEnvironment(env)}
                          className="rounded-lg"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingEnvironment(env)}
                          className="rounded-lg"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {!env.global && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 rounded-lg"
                            onClick={() => handleDeleteEnvironment(env.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>

        {editingEnvironment && (
          <Dialog
            open={!!editingEnvironment}
            onOpenChange={() => setEditingEnvironment(null)}
          >
            <DialogContent className="sm:top-[50%] top-[unset] bottom-0 sm:bottom-[unset] sm:translate-y-[-50%] translate-y-0 rounded-t-lg sm:rounded-lg">
              <DialogHeader>
                <DialogTitle>Variables ({editingEnvironment.name})</DialogTitle>
              </DialogHeader>

              <div className="py-4">
                <KeyValueEditor
                  pairs={
                    editingEnvironment.variables.length === 0
                      ? [
                          {
                            key: "",
                            value: "",
                            type: "text",
                            enabled: true,
                            showSecrets: false,
                          },
                        ]
                      : editingEnvironment.variables.map((v) => ({
                          ...v,
                          showSecrets: false,
                        }))
                  }
                  onChange={(variables) =>
                    setEditingEnvironment({
                      ...editingEnvironment,
                      variables:
                        variables.length === 0
                          ? [
                              {
                                key: "",
                                value: "",
                                type: "text",
                                enabled: true,
                              },
                            ]
                          : variables.map(({ key, value, enabled }) => ({
                              key,
                              value,
                              type: "text" as const,
                              enabled: enabled ?? true,
                            })),
                    })
                  }
                />
              </div>

              <DialogFooter>
                <Button
                  onClick={handleSaveEnvironment}
                  className="text-slate-400"
                >
                  Save changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }
);

EnvironmentManager.displayName = "EnvironmentManager";
