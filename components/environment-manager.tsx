import React, { useState, useEffect } from "react";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KeyValueEditor } from "./key-value-editor";
import { Plus, Settings, Trash2, Edit2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "@/components/ui/use-toast";

interface Environment {
  id: string;
  name: string;
  variables: { key: string; value: string }[];
}

export function EnvironmentManager({
  environments,
  currentEnvironment,
  onEnvironmentChange,
  onEnvironmentsUpdate,
}: {
  environments: Environment[];
  currentEnvironment: Environment | null;
  onEnvironmentChange: (environmentId: string) => void;
  onEnvironmentsUpdate: (environments: Environment[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [newEnvironmentName, setNewEnvironmentName] = useState("");
  const [editingEnvironment, setEditingEnvironment] =
    useState<Environment | null>(null);

  useEffect(() => {
    if (environments.length === 0) {
      const defaultEnv = {
        id: "default",
        name: "Default",
        variables: [],
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

  const handleCreateEnvironment = () => {
    if (
      newEnvironmentName.trim() &&
      newEnvironmentName.toLowerCase() !== "default"
    ) {
      const newEnvironment = {
        id: uuidv4(),
        name: newEnvironmentName.trim(),
        variables: [],
      };
      onEnvironmentsUpdate([...environments, newEnvironment]);
      setNewEnvironmentName("");
    } else {
      toast({
        variant: "destructive",
        description: "Please enter a valid environment name (not 'Default')",
      });
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

        <DialogContent className="sm:top-[50%] top-[unset] bottom-0 sm:bottom-[unset] sm:translate-y-[-50%] translate-y-0 rounded-b-none sm:rounded-lg max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Manage Environments
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="flex gap-2">
              <Input
                placeholder="Environment name"
                value={newEnvironmentName}
                onChange={(e) => setNewEnvironmentName(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleCreateEnvironment}
                disabled={!newEnvironmentName.trim()}
                className="whitespace-nowrap"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Environment
              </Button>
            </div>

            <ScrollArea className="h-64 rounded-md border p-2">
              <div className="space-y-2">
                {environments.map((env) => (
                  <div
                    key={env.id}
                    className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2"
                  >
                    <span className="font-medium">{env.name}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => setEditingEnvironment(env)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (env.id !== "default") {
                            onEnvironmentsUpdate(
                              environments.filter((e) => e.id !== env.id)
                            );
                            if (currentEnvironment?.id === env.id) {
                              onEnvironmentChange("default");
                            }
                          }
                        }}
                        disabled={env.id === "default"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingEnvironment && (
        <Dialog
          open={!!editingEnvironment}
          onOpenChange={() => setEditingEnvironment(null)}
        >
          <DialogContent className="sm:top-[50%] top-[unset] bottom-0 sm:bottom-[unset] sm:translate-y-[-50%] translate-y-0 rounded-b-none sm:rounded-lg max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Edit: {editingEnvironment.name}
              </DialogTitle>
            </DialogHeader>

            <KeyValueEditor
              pairs={editingEnvironment.variables}
              onChange={(variables) => {
                setEditingEnvironment({
                  ...editingEnvironment,
                  variables: variables,
                });
              }}
              addButtonText="Add Variable"
            />

            <DialogFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingEnvironment(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onEnvironmentsUpdate(
                    environments.map((env) =>
                      env.id === editingEnvironment.id
                        ? { ...editingEnvironment }
                        : env
                    )
                  );
                  setEditingEnvironment(null);
                }}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
