import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
    <DialogContent className="sm:top-[50%] top-[unset] bottom-0 sm:bottom-[unset] sm:translate-y-[-50%] translate-y-0 rounded-b-none sm:rounded-lgd">
      <DialogHeader>
        <DialogTitle>Using Environment Variables</DialogTitle>
        <DialogDescription>
          Learn how to use environment variables in your requests
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <h4 className="font-medium">Usage</h4>
          <p className="text-sm text-gray-500">
            Use{" "}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded">
              {"{{variable_name}}"}
            </code>{" "}
            to reference variables in:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-500 mt-2 space-y-1">
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

    // Initialize with default environment
    useEffect(() => {
      if (environments.length === 0) {
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
      } else if (!currentEnvironment) {
        onEnvironmentChange(environments[0].id);
      }
    }, [
      environments,
      currentEnvironment,
      onEnvironmentsUpdate,
      onEnvironmentChange,
    ]);

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

    useEffect(() => {
      // Load saved environments first
      const savedEnvironments = localStorage.getItem("que-environments");
      if (savedEnvironments) {
        try {
          const parsedEnvironments = JSON.parse(savedEnvironments);
          // Validate the loaded environments
          const validEnvironments = parsedEnvironments.map((env: Environment) => ({
            ...env,
            variables: Array.isArray(env.variables) ? env.variables.filter(v => v.key.trim() !== '') : [],
            lastModified: env.lastModified || new Date().toISOString()
          }));
          onEnvironmentsUpdate(validEnvironments);
    
          // Set current environment
          if (validEnvironments.length > 0) {
            onEnvironmentChange(validEnvironments[0].id);
          }
        } catch (error) {
          console.error("Error loading environments:", error);
          createDefaultEnvironment();
        }
      } else {
        createDefaultEnvironment();
      }
    }, []);

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
      if (newEnvironmentName.trim() && newEnvironmentName.toLowerCase() !== "default") {
        const newEnvironment: Environment = {
          id: uuidv4(),
          name: newEnvironmentName.trim(),
          variables: [], // Variables array is empty
          global: false,
          created: new Date().toISOString(),
          lastModified: new Date().toISOString(),
        };
        onEnvironmentsUpdate([...environments, newEnvironment]);
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
      
      const updatedEnvironments = environments.filter(e => e.id !== envId);
      onEnvironmentsUpdate(updatedEnvironments);
      
      if (currentEnvironment?.id === envId) {
        onEnvironmentChange(updatedEnvironments[0]?.id || "");
      }
      
      toast.success("Environment deleted");
    };

    const handleEnvironmentsUpdate = (updatedEnvironments: Environment[]) => {
      onEnvironmentsUpdate(updatedEnvironments);
      // Ensure the environments are properly stringified and saved
      localStorage.setItem(
        "que-environments",
        JSON.stringify(updatedEnvironments.map(env => ({
          ...env,
          variables: env.variables.filter(v => v.key.trim() !== ''), // Only save valid variables
          lastModified: new Date().toISOString()
        })))
      );
    
      // Update current environment if it was deleted
      if (
        currentEnvironment &&
        !updatedEnvironments.find((env) => env.id === currentEnvironment.id)
      ) {
        const firstEnv = updatedEnvironments[0] || null;
        onEnvironmentChange(firstEnv?.id || "");
      }
    };

    return (
      <div className="flex items-center gap-2 max-w-full">
        <div className="flex-shrink sm:w-40 w-full">
          <Select
            value={currentEnvironment?.id || ""}
            onValueChange={onEnvironmentChange}
          >
            <SelectTrigger className="w-full border-2 border-blue-200 bg-blue-50 font-medium text-blue-700 hover:bg-gray-200 hover:border-blue-200">
              <SelectValue placeholder="Select env" />
            </SelectTrigger>
            <SelectContent>
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
              className="h-10 w-12 flex-shrink-0 bg-black hover:bg-gray-800 text-white"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:top-[50%] top-[unset] bottom-0 sm:bottom-[unset] sm:translate-y-[-50%] translate-y-0 rounded-b-none sm:rounded-lgd">
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
                  <DialogContent className="sm:top-[50%] top-[unset] bottom-0 sm:bottom-[unset] sm:translate-y-[-50%] translate-y-0 rounded-b-none sm:rounded-lg">
                    <DialogHeader>
                      <DialogTitle>Using Environment Manager</DialogTitle>
                      <DialogDescription>
                        Learn how to use and manage environment on queFork
                      </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4 pr-4">
                        <div>
                          <h4 className="font-medium">Environment Types</h4>
                          <div className="space-y-2 mt-2">
                            <div>
                              <p className="text-sm font-medium text-gray-700">
                                Default (Global) Environment
                              </p>
                              <p className="text-sm text-gray-500">
                                • Variables defined here are available across
                                all environments
                                <br />
                                • Cannot be deleted
                                <br />• Useful for shared configuration like
                                base URLs
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">
                                Custom Environments
                              </p>
                              <p className="text-sm text-gray-500">
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
                          <p className="text-sm text-gray-500 mb-2">
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
                          <p className="text-sm text-gray-500">
                            Use{" "}
                            <code className="bg-gray-100 px-1.5 py-0.5 rounded">
                              {"{{variable_name}}"}
                            </code>{" "}
                            to reference variables in:
                          </p>
                          <ul className="list-disc list-inside text-sm text-gray-500 mt-2 space-y-1">
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
                              <p className="text-sm text-gray-500">
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
                              <p className="text-sm text-gray-500">
                                Headers with authentication:
                              </p>
                              <pre className="bg-gray-100 p-2 rounded text-sm">
                                <code>
                                  Authorization: Bearer {"{{auth_token}}"}
                                </code>
                              </pre>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">
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
                              <p className="text-sm text-gray-500">
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
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <Input
                  placeholder="Environment name"
                  value={newEnvironmentName}
                  onChange={(e) => setNewEnvironmentName(e.target.value)}
                />
                <Button
                  onClick={handleCreateEnvironment}
                  disabled={!newEnvironmentName.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="h-[400px] rounded-md border">
                <div className="p-4 space-y-4">
                  {environments.map((env) => (
                    <div
                      key={env.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{env.name}</span>
                        {env.global && (
                          <Badge variant="secondary">Global</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicateEnvironment(env)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExportEnvironment(env)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingEnvironment(env)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {!env.global && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
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
            <DialogContent className="sm:top-[50%] top-[unset] bottom-0 sm:bottom-[unset] sm:translate-y-[-50%] translate-y-0 rounded-b-none sm:rounded-lg">
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
                  onClick={() => {
                    const updatedEnvironments = environments.map((env) =>
                      env.id === editingEnvironment.id
                        ? {
                            ...editingEnvironment,
                            lastModified: new Date().toISOString(),
                            variables: editingEnvironment.variables.filter(v => v.key.trim() !== ''), // Add this filter
                          }
                        : env
                    );
                    handleEnvironmentsUpdate(updatedEnvironments);
                    setEditingEnvironment(null);
                    localStorage.setItem('que-environments', JSON.stringify(updatedEnvironments)); // Add this line
                    toast.success("Environment updated");
                  }}
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