import React, { useState } from 'react';
import type { Environment } from '@/types/api';
import { createEmptyEnvironment } from '@/types/api';
import { KeyValueEditor } from './KeyValueEditor';
import { Plus, Trash2, ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  environments: Environment[];
  onChange: (envs: Environment[]) => void;
}

export function EnvironmentPanel({ environments, onChange }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);

  const addEnvironment = () => {
    const env = createEmptyEnvironment();
    onChange([...environments, env]);
    setExpandedId(env.id);
    setEditingName(env.id);
    toast.success('Environment created');
  };

  const removeEnvironment = (id: string) => {
    onChange(environments.filter(e => e.id !== id));
    toast.success('Environment removed');
  };

  const setActive = (id: string) => {
    onChange(environments.map(e => ({ ...e, isActive: e.id === id })));
  };

  const updateEnv = (id: string, updates: Partial<Environment>) => {
    onChange(environments.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <h3 className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/40">Environments</h3>
        <button onClick={addEnvironment} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors">
          <Plus className="h-3 w-3" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {environments.map(env => (
          <div key={env.id} className="border-b border-border">
            <div className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-accent/50 transition-colors group">
              <button onClick={() => setExpandedId(expandedId === env.id ? null : env.id)} className="text-muted-foreground shrink-0">
                {expandedId === env.id ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
              </button>
              <button
                onClick={() => setActive(env.id)}
                className={`w-2 h-2 rounded-full border-[1.5px] shrink-0 transition-colors ${
                  env.isActive ? 'bg-status-success border-status-success' : 'border-muted-foreground/30 hover:border-muted-foreground'
                }`}
              />
              {editingName === env.id ? (
                <input
                  autoFocus
                  value={env.name}
                  onChange={(e) => updateEnv(env.id, { name: e.target.value })}
                  onBlur={() => setEditingName(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingName(null)}
                  className="flex-1 text-[10px] font-bold bg-transparent focus:outline-none border-b border-primary min-w-0"
                />
              ) : (
                <span
                  onDoubleClick={() => setEditingName(env.id)}
                  className={`flex-1 text-[10px] font-bold truncate cursor-default min-w-0 ${env.isActive ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  {env.name}
                </span>
              )}
              {env.isActive && <span className="text-[8px] font-bold text-status-success uppercase shrink-0">●</span>}
              <div className="flex items-center gap-0 shrink-0">
                <button onClick={() => setEditingName(env.id)} className="p-0.5 text-muted-foreground hover:text-foreground" title="Rename">
                  <Pencil className="h-2.5 w-2.5" />
                </button>
                <button onClick={() => removeEnvironment(env.id)} className="p-0.5 text-muted-foreground hover:text-destructive" title="Delete">
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
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
        {environments.length === 0 && (
          <div className="flex flex-col items-center py-6 gap-1">
            <p className="text-[9px] text-muted-foreground/30 font-bold">No environments</p>
            <button onClick={addEnvironment} className="text-[9px] font-bold text-primary hover:text-primary/80 transition-colors">Create one</button>
          </div>
        )}
      </div>
    </div>
  );
}
