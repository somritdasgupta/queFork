import React, { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { css } from '@codemirror/lang-css';
import { python } from '@codemirror/lang-python';
import { sql } from '@codemirror/lang-sql';
import { EditorView } from '@codemirror/view';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  language?: string;
  minHeight?: string;
  readOnly?: boolean;
}

function getExtensions(language: string) {
  const lang = language.toLowerCase();
  switch (lang) {
    case 'javascript':
    case 'js':
      return [javascript()];
    case 'json':
      return [json()];
    case 'graphql':
      return [javascript()];
    case 'xml':
    case 'html':
    case 'markup':
    case 'soap':
      return [xml()];
    case 'css':
      return [css()];
    case 'python':
      return [python()];
    case 'sql':
      return [sql()];
    default:
      return [javascript()];
  }
}

// Custom theme matching the app's surface-sunken background
const editorTheme = EditorView.theme({
  '&': {
    fontSize: '11px',
    backgroundColor: 'hsl(var(--surface-sunken))',
  },
  '.cm-content': {
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    caretColor: 'hsl(var(--foreground))',
    lineHeight: '1.7',
    padding: '6px 0',
  },
  '.cm-line': {
    padding: '0 8px',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-gutters': {
    backgroundColor: 'hsl(var(--surface-sunken))',
    borderRight: '1px solid hsl(var(--border))',
    color: 'hsl(var(--muted-foreground) / 0.25)',
    fontSize: '10px',
    minWidth: '32px',
  },
  '.cm-gutterElement': {
    padding: '0 4px 0 8px !important',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'hsl(var(--accent) / 0.3)',
    color: 'hsl(var(--muted-foreground) / 0.5)',
  },
  '.cm-activeLine': {
    backgroundColor: 'hsl(var(--accent) / 0.08)',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'hsl(var(--primary) / 0.2) !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'hsl(var(--primary) / 0.3) !important',
  },
  '.cm-cursor': {
    borderLeftColor: 'hsl(var(--foreground))',
  },
  '.cm-placeholder': {
    color: 'hsl(var(--muted-foreground) / 0.25)',
    fontStyle: 'italic',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
  // Match the panel background for non-editing chrome
  '.cm-panels': {
    backgroundColor: 'hsl(var(--surface-sunken))',
  },
}, { dark: true });

export function CodeEditor({ value, onChange, placeholder = '', language = 'javascript', minHeight = '120px', readOnly = false }: Props) {
  const extensions = useMemo(() => [
    ...getExtensions(language),
    EditorView.lineWrapping,
  ], [language]);

  return (
    <div className="relative w-full bg-surface-sunken flex-1 flex flex-col min-h-0 overflow-hidden" style={{ minHeight }}>
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        theme={editorTheme}
        placeholder={placeholder}
        readOnly={readOnly}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: false,
          indentOnInput: true,
          tabSize: 2,
        }}
        className="flex-1 min-h-0 [&_.cm-editor]:h-full [&_.cm-scroller]:!overflow-auto"
        style={{ height: '100%' }}
      />
    </div>
  );
}
