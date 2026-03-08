import React, { useEffect, useState, useRef } from 'react';
import { Search } from 'lucide-react';

export interface CommandAction {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  category: string;
  action: () => void;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  actions: CommandAction[];
}

export function CommandPalette({ isOpen, onClose, actions }: Props) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) { setQuery(''); setSelectedIdx(0); }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = query
    ? actions.filter(a =>
        a.label.toLowerCase().includes(query.toLowerCase()) ||
        a.category.toLowerCase().includes(query.toLowerCase()) ||
        (a.description || '').toLowerCase().includes(query.toLowerCase())
      )
    : actions;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIdx]) {
      filtered[selectedIdx].action();
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const categories = Array.from(new Set(filtered.map(a => a.category)));
  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-background/60 backdrop-blur-md" />
      <div
        className="relative w-full max-w-[520px] mx-4 bg-card border border-border shadow-2xl overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search */}
        <div className="flex items-center gap-3 px-4 h-12 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIdx(0); }}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-[13px] font-bold text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="text-[9px] font-mono font-bold text-muted-foreground bg-surface-sunken border border-border px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[340px] overflow-y-auto">
          {categories.length === 0 && (
            <p className="text-[12px] text-muted-foreground text-center py-8 font-bold">No results found</p>
          )}
          {categories.map(cat => (
            <div key={cat}>
              <div className="px-4 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground/60 bg-surface-sunken border-b border-border">
                {cat}
              </div>
              {filtered.filter(a => a.category === cat).map(action => {
                flatIndex++;
                const idx = flatIndex;
                return (
                  <button
                    key={action.id}
                    onClick={() => { action.action(); onClose(); }}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                      idx === selectedIdx ? 'bg-accent' : 'hover:bg-accent/50'
                    }`}
                  >
                    {action.icon && <span className="text-muted-foreground shrink-0 w-4 h-4 flex items-center justify-center">{action.icon}</span>}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-foreground truncate">{action.label}</p>
                      {action.description && <p className="text-[10px] text-muted-foreground truncate">{action.description}</p>}
                    </div>
                    {action.shortcut && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        {action.shortcut.split('').filter(c => c !== ' ').map((k, i) => (
                          <kbd key={i} className="px-1 py-0.5 text-[9px] font-mono font-bold text-muted-foreground bg-surface-sunken border border-border min-w-[18px] text-center">
                            {k}
                          </kbd>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-border bg-surface-sunken">
          <span className="text-[9px] font-bold text-muted-foreground/60">↑↓ navigate</span>
          <span className="text-[9px] font-bold text-muted-foreground/60">↵ select</span>
          <span className="text-[9px] font-bold text-muted-foreground/60">esc close</span>
        </div>
      </div>
    </div>
  );
}
