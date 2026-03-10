import React, { useState, useRef, useEffect, useCallback } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  variables: { key: string; value: string }[];
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function EnvAutocompleteInput({ value, onChange, variables, placeholder, className = '', onKeyDown }: Props) {
  const [suggestions, setSuggestions] = useState<{ key: string; value: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [cursorPos, setCursorPos] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const findVariableContext = useCallback((text: string, cursor: number): { prefix: string; start: number } | null => {
    // Look backwards from cursor for {{
    const before = text.slice(0, cursor);
    const lastOpen = before.lastIndexOf('{{');
    if (lastOpen === -1) return null;
    const afterOpen = before.slice(lastOpen + 2);
    // If there's a }} between {{ and cursor, no context
    if (afterOpen.includes('}}')) return null;
    return { prefix: afterOpen, start: lastOpen };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const cursor = e.target.selectionStart || 0;
    onChange(newValue);
    setCursorPos(cursor);

    const ctx = findVariableContext(newValue, cursor);
    if (ctx && variables.length > 0) {
      const filtered = variables.filter(v => v.key.toLowerCase().startsWith(ctx.prefix.toLowerCase()));
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedIdx(0);
    } else {
      setShowSuggestions(false);
    }
  };

  const applySuggestion = (varKey: string) => {
    const cursor = inputRef.current?.selectionStart || cursorPos;
    const ctx = findVariableContext(value, cursor);
    if (!ctx) return;
    const before = value.slice(0, ctx.start);
    const after = value.slice(cursor);
    const replacement = `{{${varKey}}}`;
    const newValue = before + replacement + after;
    onChange(newValue);
    setShowSuggestions(false);
    // Focus and set cursor after replacement
    setTimeout(() => {
      if (inputRef.current) {
        const pos = before.length + replacement.length;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, suggestions.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (suggestions[selectedIdx]) { e.preventDefault(); applySuggestion(suggestions[selectedIdx].key); return; }
      }
      if (e.key === 'Escape') { e.preventDefault(); setShowSuggestions(false); return; }
    }
    onKeyDown?.(e);
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Highlight {{variables}} in displayed value
  const renderHighlightedValue = () => {
    if (!value.includes('{{')) return null;
    const parts = value.split(/({{[^}]*}})/g);
    return (
      <div className="absolute inset-0 flex items-center px-[inherit] pointer-events-none text-transparent" aria-hidden>
        {parts.map((part, i) => 
          part.startsWith('{{') && part.endsWith('}}')
            ? <span key={i} className="text-primary font-bold bg-primary/10 rounded-sm px-0.5">{part}</span>
            : <span key={i}>{part}</span>
        )}
      </div>
    );
  };

  return (
    <div className="relative flex-1 min-w-0">
      <input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full ${className}`}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
      />
      {showSuggestions && (
        <div ref={dropdownRef} className="absolute top-full left-0 right-0 z-[60] mt-0.5 bg-card border border-border shadow-lg max-h-[160px] overflow-y-auto">
          {suggestions.map((v, i) => (
            <button key={v.key} onClick={() => applySuggestion(v.key)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left transition-colors ${i === selectedIdx ? 'bg-accent' : 'hover:bg-accent/50'}`}>
              <span className="text-[10px] font-bold text-primary font-mono">{`{{${v.key}}}`}</span>
              <span className="text-[9px] text-muted-foreground font-mono truncate max-w-[100px] ml-2">{v.value}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
