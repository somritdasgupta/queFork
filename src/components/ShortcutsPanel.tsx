import React from 'react';
import { X } from 'lucide-react';

interface ShortcutItem {
  label: string;
  keys: string[];
  category: string;
}

const SHORTCUTS: ShortcutItem[] = [
  // General
  { label: 'Send Request', keys: ['⌘', '↵'], category: 'General' },
  { label: 'New Request', keys: ['⌘', 'N'], category: 'General' },
  { label: 'Close Tab', keys: ['⌘', 'W'], category: 'General' },
  { label: 'Command Palette', keys: ['⌘', 'K'], category: 'General' },
  { label: 'Save to Collection', keys: ['⌘', 'S'], category: 'General' },
  // Navigation
  { label: 'Toggle Sidebar', keys: ['⌘', 'B'], category: 'Navigation' },
  { label: 'Toggle Theme', keys: ['⌘', 'D'], category: 'Navigation' },
  { label: 'Next Tab', keys: ['⌘', '⇧', ']'], category: 'Navigation' },
  { label: 'Previous Tab', keys: ['⌘', '⇧', '['], category: 'Navigation' },
  { label: 'Search Tabs', keys: ['⌘', '⇧', 'F'], category: 'Navigation' },
  { label: 'Toggle Split Direction', keys: ['⌘', '\\'], category: 'Navigation' },
  // Request editing
  { label: 'Import cURL', keys: ['⌘', 'I'], category: 'Request' },
  { label: 'Export Request', keys: ['⌘', 'E'], category: 'Request' },
  { label: 'Toggle Proxy', keys: ['⌘', 'P'], category: 'Request' },
  { label: 'Add Pair', keys: ['⌘', '⇧', 'A'], category: 'Request' },
  // Tabs
  { label: 'Params Tab', keys: ['⌘', '1'], category: 'Panels' },
  { label: 'Headers Tab', keys: ['⌘', '2'], category: 'Panels' },
  { label: 'Body Tab', keys: ['⌘', '3'], category: 'Panels' },
  { label: 'Auth Tab', keys: ['⌘', '4'], category: 'Panels' },
  { label: 'Tests Tab', keys: ['⌘', '7'], category: 'Panels' },
  { label: 'Flow Tab', keys: ['⌘', '8'], category: 'Panels' },
  // Protocols
  { label: 'REST Protocol', keys: ['⌘', '⇧', '1'], category: 'Protocols' },
  { label: 'GraphQL Protocol', keys: ['⌘', '⇧', '2'], category: 'Protocols' },
  { label: 'WebSocket Protocol', keys: ['⌘', '⇧', '3'], category: 'Protocols' },
  // Other
  { label: 'Close Dialog', keys: ['ESC'], category: 'Other' },
  { label: 'Focus URL Bar', keys: ['⌘', 'L'], category: 'Other' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsPanel({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  const categories = Array.from(new Set(SHORTCUTS.map(s => s.category)));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-background/60 backdrop-blur-md" />
      <div className="relative w-full max-w-[440px] mx-4 bg-card border border-border shadow-2xl overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 h-10 border-b border-border">
          <h3 className="text-[12px] font-black text-foreground">Keyboard Shortcuts</h3>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="max-h-[500px] overflow-y-auto">
          {categories.map(cat => (
            <div key={cat}>
              <div className="px-4 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground/60 bg-surface-sunken border-b border-border">
                {cat}
              </div>
              {SHORTCUTS.filter(s => s.category === cat).map(s => (
                <div key={s.label} className="flex items-center justify-between px-4 py-2 border-b border-border">
                  <span className="text-[12px] font-bold text-foreground">{s.label}</span>
                  <div className="flex items-center gap-1">
                    {s.keys.map((k, i) => (
                      <kbd key={i} className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-muted-foreground bg-surface-sunken border border-border min-w-[20px] text-center">
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
