import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function EnvironmentManager({
  environments,
  currentEnvironment,
  onEnvironmentChange,
  onEnvironmentsUpdate,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [newEnvironmentName, setNewEnvironmentName] = useState("");
  const [editingEnvironment, setEditingEnvironment] = useState(null);

  const handleCreateEnvironment = () => {
    if (newEnvironmentName.trim()) {
      const newEnvironment = {
        id: uuidv4(),
        name: newEnvironmentName.trim(),
        variables: [],
      };
      onEnvironmentsUpdate([...environments, newEnvironment]);
      setNewEnvironmentName("");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentEnvironment?.id || ""}
        onValueChange={onEnvironmentChange}
      >
        <SelectTrigger className="w-40 bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 hover:border-blue-200">
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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            size="icon"
            className="h-9 w-9 bg-black hover:bg-gray-800 text-white"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-md">
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
                    className="flex items-center justify-between rounded-lg bg-secondary/20 px-3 py-2"
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
                          if (env.name !== "Default") {
                            onEnvironmentsUpdate(
                              environments.filter((e) => e.id !== env.id)
                            );
                          }
                        }}
                        disabled={env.name === "Default"}
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Edit: {editingEnvironment.name}
              </DialogTitle>
            </DialogHeader>

            <KeyValueEditor
              pairs={editingEnvironment.variables}
              onChange={(variables) => {
                // Just update the local state, don't close the modal
                setEditingEnvironment({
                  ...editingEnvironment,
                  variables: variables,
                });
              }}
              addButtonText="Add Variable"
            />

            <DialogFooter className="flex justify-between space-x-2">
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
                  // Save the changes to the main state
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
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
