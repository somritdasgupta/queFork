import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Key, Type, AlignLeft } from "lucide-react";
import { KeyValuePair } from "@/types";

interface KeyValueEditorProps {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  addButtonText?: string;
  showDescription?: boolean;
  presetKeys?: string[];
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
      {
        key: "",
        value: "",
        description: "",
        enabled: true,
        type: "",
        showSecrets: false,
      },
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
      <ScrollArea className="h-auto max-h-[210px] overflow-y-auto pr-4">
        <div className="space-y-3">
          {pairs.map((pair, index) => (
            <div key={index} className="group flex items-start gap-2 relative">
              <div className="absolute -left-6 top-3">
                <Checkbox
                  checked={pair.enabled !== false}
                  onCheckedChange={(checked) =>
                    updatePair(index, "enabled", !!checked)
                  }
                  className="h-4 w-4 text-slate-400 border-2 border-slate-300 data-[state=checked]:border-slate-900 data-[state=checked]:bg-slate-900"
                />
              </div>
              <div
                className="grid flex-1 gap-3"
                style={{
                  gridTemplateColumns: showDescription
                    ? "1fr 1fr 1fr"
                    : "1fr 1fr",
                }}
              >
                <div className="relative">
                  <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Key"
                    value={pair.key}
                    onChange={(e) => updatePair(index, "key", e.target.value)}
                    className="pl-9 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-medium transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-slate-900"
                  />
                </div>
                <div className="relative">
                  <Type className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Value"
                    value={pair.value}
                    onChange={(e) => updatePair(index, "value", e.target.value)}
                    className="pl-9 bg-slate-50 border-2 border-slate-200 rounded-lg font-mono text-sm transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-slate-900"
                  />
                </div>
                {showDescription && (
                  <div className="relative">
                    <AlignLeft className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Description"
                      value={pair.description || ""}
                      onChange={(e) =>
                        updatePair(index, "description", e.target.value)
                      }
                      className="pl-9 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-slate-900"
                    />
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removePair(index)}
                className="h-10 w-10 rounded-lg border-2 border-slate-200 hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition-colors"
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
        className="w-full bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-300 font-medium rounded-lg h-10 transition-colors"
      >
        <Plus className="mr-2 h-4 w-4" />
        {addButtonText}
      </Button>
    </div>
  );
}
