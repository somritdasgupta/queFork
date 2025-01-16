"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { KeyValuePair } from "@/types";

interface KeyValueEditorProps {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  addButtonText?: string;
  showDescription?: boolean;
}

export function KeyValueEditor({
  pairs,
  onChange,
  addButtonText = "Add Item",
  showDescription = false,
}: KeyValueEditorProps) {
  const addPair = () => {
    onChange([
      ...pairs,
      { key: "", value: "", description: "", enabled: true },
    ]);
  };

  const removePair = (index: number) => {
    const newPairs = [...pairs];
    newPairs.splice(index, 1);
    onChange(newPairs);
  };

  const updatePair = (
    index: number,
    field: keyof KeyValuePair,
    value: string | boolean
  ) => {
    const newPairs = [...pairs];
    newPairs[index] = { ...newPairs[index], [field]: value };
    onChange(newPairs);
  };

  return (
    <div className="space-y-4">
      <ScrollArea className="h-auto max-h-[210px] pr-4 overflow-y-auto">
        <div className="space-y-2">
          {pairs.map((pair, index) => (
            <div key={index} className="flex items-start gap-2">
              <Checkbox
                checked={pair.enabled !== false}
                onCheckedChange={(checked) =>
                  updatePair(index, "enabled", !!checked)
                }
                className="mt-3"
              />
              <div
                className="grid flex-1 gap-2"
                style={{
                  gridTemplateColumns: showDescription
                    ? "1fr 1fr 1fr"
                    : "1fr 1fr",
                }}
              >
                <Input
                  placeholder="Key"
                  value={pair.key}
                  onChange={(e) => updatePair(index, "key", e.target.value)}
                  className="bg-blue-50 border-blue-100 border-4 font-bold"
                />
                <Input
                  placeholder="Value"
                  value={pair.value}
                  onChange={(e) => updatePair(index, "value", e.target.value)}
                  className="bg-blue-50 border-blue-100 border-2 font-mono"
                />
                {showDescription && (
                  <Input
                    placeholder="Description"
                    value={pair.description || ""}
                    onChange={(e) =>
                      updatePair(index, "description", e.target.value)
                    }
                    className="border-blue-100 border-2 bg-blue-50 font-medium"
                  />
                )}
              </div>
              <Button
                variant="default"
                size="icon"
                onClick={() => removePair(index)}
                className="bg-blue-50 text-gray-500 border-2 border-blue-100 hover:text-red-500 hover:bg-blue-100"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
      <Button
        variant="outline"
        onClick={addPair}
        className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
      >
        <Plus className="mr-2 h-4 w-4" />
        {addButtonText}
      </Button>
    </div>
  );
}
