import React, { useState, useRef, useEffect } from "react";
import type { Environment } from "@/types/api";
import { createEmptyEnvironment } from "@/types/api";
import { KeyValueEditor } from "./KeyValueEditor";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Pencil,
  Search,
  X,
  Copy,
  Download,
  Upload,
  EllipsisVertical,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  environments: Environment[];
  onChange: (envs: Environment[]) => void;
}

export function EnvironmentPanel({ environments, onChange }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuId, setMobileMenuId] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  // Close dropdown menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-menu-dropdown]")) {
        setMobileMenuId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addEnvironment = () => {
    const env = createEmptyEnvironment();
    onChange([...environments, env]);
    setExpandedId(env.id);
    setEditingName(env.id);
    toast.success("Environment created");
  };

  const removeEnvironment = (id: string) => {
    onChange(environments.filter((e) => e.id !== id));
    toast.success("Environment removed");
  };

  const setActive = (id: string) => {
    onChange(environments.map((e) => ({ ...e, isActive: e.id === id })));
  };

  const updateEnv = (id: string, updates: Partial<Environment>) => {
    onChange(environments.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  };

  const duplicateEnvironment = (env: Environment) => {
    const dup: Environment = {
      ...structuredClone(env),
      id: crypto.randomUUID(),
      name: `${env.name} (copy)`,
      isActive: false,
    };
    onChange([...environments, dup]);
    toast.success("Environment duplicated");
  };

  const exportEnvironment = (env: Environment) => {
    const blob = new Blob([JSON.stringify(env, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${env.name.replace(/[^a-z0-9]/gi, "_")}.env.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Environment exported");
  };

  const handleImportEnv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (data && data.name && Array.isArray(data.variables)) {
          const env: Environment = {
            id: crypto.randomUUID(),
            name: data.name,
            variables: data.variables,
            isActive: false,
          };
          onChange([...environments, env]);
          toast.success(`Imported "${env.name}"`);
        } else {
          toast.error("Invalid environment file");
        }
      } catch {
        toast.error("Failed to parse file");
      }
    };
    reader.readAsText(file);
    if (importRef.current) importRef.current.value = "";
  };

  const filtered = searchQuery
    ? environments.filter(
        (e) =>
          e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.variables.some(
            (v) =>
              v.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
              v.value.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
      )
    : environments;

  return (
    <div className="flex flex-col h-full">
      <input
        ref={importRef}
        type="file"
        accept=".json"
        className="hidden"
        aria-label="Import environment file"
        onChange={handleImportEnv}
      />
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-elevated">
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-muted-foreground/50" />
          <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60">
            Environments
          </h3>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            title={showSearch ? "Close search" : "Search environments"}
            onClick={() => {
              setShowSearch(!showSearch);
              if (showSearch) setSearchQuery("");
            }}
            className={`p-1 rounded-md transition-all ${showSearch ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
          >
            <Search className="h-3.5 w-3.5" />
          </button>
          <button
            title="Import environment"
            onClick={() => importRef.current?.click()}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          >
            <Upload className="h-3.5 w-3.5" />
          </button>
          <button
            title="Add environment"
            onClick={addEnvironment}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {showSearch && (
        <div className="px-3 py-1.5 border-b border-border bg-surface-sunken">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/40" />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by name, key, value..."
              aria-label="Search environments"
              className="w-full text-[10px] font-medium bg-transparent pl-6 pr-6 py-1 focus:outline-none border border-border rounded-md text-foreground placeholder:text-muted-foreground/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((env) => (
          <div key={env.id} className="border-b border-border">
            <div className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-accent/50 transition-colors group">
              <button
                title="Toggle details"
                onClick={() =>
                  setExpandedId(expandedId === env.id ? null : env.id)
                }
                className="text-muted-foreground shrink-0"
              >
                {expandedId === env.id ? (
                  <ChevronDown className="h-2.5 w-2.5" />
                ) : (
                  <ChevronRight className="h-2.5 w-2.5" />
                )}
              </button>
              <button
                title="Set active environment"
                onClick={() => setActive(env.id)}
                className={`w-2 h-2 rounded-full border-[1.5px] shrink-0 transition-colors ${
                  env.isActive
                    ? "bg-status-success border-status-success"
                    : "border-muted-foreground/30 hover:border-muted-foreground"
                }`}
              />
              {editingName === env.id ? (
                <input
                  autoFocus
                  title="Environment name"
                  value={env.name}
                  onChange={(e) => updateEnv(env.id, { name: e.target.value })}
                  onFocus={(e) => e.target.select()}
                  onBlur={() => setEditingName(null)}
                  onKeyDown={(e) => e.key === "Enter" && setEditingName(null)}
                  className="flex-1 text-[10px] font-bold bg-transparent focus:outline-none border-b border-primary min-w-0"
                />
              ) : (
                <span
                  onDoubleClick={() => setEditingName(env.id)}
                  className={`flex-1 text-[10px] font-bold truncate cursor-default min-w-0 ${env.isActive ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {env.name}
                </span>
              )}
              {env.isActive && (
                <span className="text-[8px] font-bold text-status-success uppercase shrink-0">
                  ●
                </span>
              )}
              {isMobile ? (
                <div className="relative shrink-0" data-menu-dropdown>
                  <button
                    onClick={() =>
                      setMobileMenuId(mobileMenuId === env.id ? null : env.id)
                    }
                    className="p-0.5 text-muted-foreground hover:text-foreground rounded"
                    title="More actions"
                    aria-label="More actions"
                  >
                    <EllipsisVertical className="h-3 w-3" />
                  </button>
                  {mobileMenuId === env.id && (
                    <div className="absolute right-0 top-full mt-1 z-30 bg-card border border-border rounded-md shadow-lg py-0.5 min-w-[120px]">
                      <button
                        onClick={() => {
                          setEditingName(env.id);
                          setMobileMenuId(null);
                        }}
                        className="w-full text-left px-3 py-1.5 text-[9px] font-bold text-foreground/80 hover:bg-accent flex items-center gap-2"
                      >
                        <Pencil className="h-2.5 w-2.5" /> Rename
                      </button>
                      <button
                        onClick={() => {
                          duplicateEnvironment(env);
                          setMobileMenuId(null);
                        }}
                        className="w-full text-left px-3 py-1.5 text-[9px] font-bold text-foreground/80 hover:bg-accent flex items-center gap-2"
                      >
                        <Copy className="h-2.5 w-2.5" /> Duplicate
                      </button>
                      <button
                        onClick={() => {
                          exportEnvironment(env);
                          setMobileMenuId(null);
                        }}
                        className="w-full text-left px-3 py-1.5 text-[9px] font-bold text-foreground/80 hover:bg-accent flex items-center gap-2"
                      >
                        <Download className="h-2.5 w-2.5" /> Export
                      </button>
                      <button
                        onClick={() => {
                          removeEnvironment(env.id);
                          setMobileMenuId(null);
                        }}
                        className="w-full text-left px-3 py-1.5 text-[9px] font-bold text-destructive hover:bg-accent flex items-center gap-2"
                      >
                        <Trash2 className="h-2.5 w-2.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-0 shrink-0">
                  <button
                    onClick={() => setEditingName(env.id)}
                    className="p-0.5 text-muted-foreground hover:text-foreground"
                    title="Rename"
                  >
                    <Pencil className="h-2.5 w-2.5" />
                  </button>
                  <button
                    onClick={() => duplicateEnvironment(env)}
                    className="p-0.5 text-muted-foreground hover:text-foreground"
                    title="Duplicate"
                  >
                    <Copy className="h-2.5 w-2.5" />
                  </button>
                  <button
                    onClick={() => exportEnvironment(env)}
                    className="p-0.5 text-muted-foreground hover:text-foreground"
                    title="Export"
                  >
                    <Download className="h-2.5 w-2.5" />
                  </button>
                  <button
                    onClick={() => removeEnvironment(env.id)}
                    className="p-0.5 text-muted-foreground hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              )}
            </div>
            {expandedId === env.id && (
              <div className="overflow-x-auto">
                <KeyValueEditor
                  pairs={env.variables}
                  onChange={(variables) => updateEnv(env.id, { variables })}
                  keyPlaceholder="Variable"
                  valuePlaceholder="Value"
                  showDescription={false}
                  compact
                />
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && environments.length > 0 && (
          <p className="text-[9px] text-muted-foreground/30 font-bold py-4 text-center italic">
            No matches
          </p>
        )}
        {environments.length === 0 && (
          <div className="flex flex-col items-center py-6 gap-1">
            <p className="text-[9px] text-muted-foreground/30 font-bold">
              No environments
            </p>
            <button
              onClick={addEnvironment}
              className="text-[9px] font-bold text-primary hover:text-primary/80 transition-colors"
            >
              Create one
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
