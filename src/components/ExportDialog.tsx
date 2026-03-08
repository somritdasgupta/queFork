import React, { useState } from 'react';
import type { RequestConfig } from '@/types/api';
import { exportToCurl, exportToJavaScript, exportToPython, exportToTypeScript, exportToGo, exportToJava, exportToDart, exportToRuby, exportToPhp, exportToRust, exportToBash, exportToPowerShell, exportToCSharp, exportToSwift } from '@/lib/curl-parser';
import { SyntaxHighlighter } from './SyntaxHighlighter';
import { Copy, Check, Terminal, FileCode, Code, Download, X, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  request: RequestConfig;
  isOpen: boolean;
  onClose: () => void;
}

type ExportTab = 'curl' | 'javascript' | 'typescript' | 'python' | 'go' | 'java' | 'dart' | 'ruby' | 'php' | 'rust' | 'bash' | 'powershell' | 'csharp' | 'swift';

const exportTabs: { key: ExportTab; label: string; ext: string; lang: string }[] = [
  { key: 'curl', label: 'cURL', ext: 'sh', lang: 'shell' },
  { key: 'bash', label: 'Bash', ext: 'sh', lang: 'shell' },
  { key: 'powershell', label: 'PowerShell', ext: 'ps1', lang: 'shell' },
  { key: 'javascript', label: 'JavaScript', ext: 'js', lang: 'javascript' },
  { key: 'typescript', label: 'TypeScript', ext: 'ts', lang: 'javascript' },
  { key: 'python', label: 'Python', ext: 'py', lang: 'python' },
  { key: 'go', label: 'Go', ext: 'go', lang: 'go' },
  { key: 'java', label: 'Java', ext: 'java', lang: 'java' },
  { key: 'csharp', label: 'C#', ext: 'cs', lang: 'csharp' },
  { key: 'dart', label: 'Dart', ext: 'dart', lang: 'dart' },
  { key: 'ruby', label: 'Ruby', ext: 'rb', lang: 'ruby' },
  { key: 'php', label: 'PHP', ext: 'php', lang: 'php' },
  { key: 'rust', label: 'Rust', ext: 'rs', lang: 'rust' },
  { key: 'swift', label: 'Swift', ext: 'swift', lang: 'swift' },
];

const exportFns: Record<ExportTab, (r: RequestConfig) => string> = {
  curl: exportToCurl,
  javascript: exportToJavaScript,
  typescript: exportToTypeScript,
  python: exportToPython,
  go: exportToGo,
  java: exportToJava,
  dart: exportToDart,
  ruby: exportToRuby,
  php: exportToPhp,
  rust: exportToRust,
  bash: exportToBash,
  powershell: exportToPowerShell,
  csharp: exportToCSharp,
  swift: exportToSwift,
};

export function ExportDialog({ request, isOpen, onClose }: Props) {
  const [tab, setTab] = useState<ExportTab>('curl');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentTab = exportTabs.find(t => t.key === tab)!;
  const code = exportFns[tab](request);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success('Copied to clipboard');
  };

  const downloadFile = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `request.${currentTab.ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" />
      <div className="relative w-full max-w-3xl mx-4 bg-card shadow-2xl border border-border overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface-elevated">
          <div className="flex items-center gap-2">
            <Download className="h-3.5 w-3.5 text-primary" />
            <h3 className="text-[12px] font-black">Export Request</h3>
            <span className="text-[9px] font-bold text-muted-foreground/50 ml-1">{exportTabs.length} languages</span>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Language tabs — scrollable row */}
        <div className="flex gap-0 border-b border-border overflow-x-auto scrollbar-none">
          {exportTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold transition-colors whitespace-nowrap shrink-0 ${
                tab === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Code block with syntax highlighting */}
        <div className="relative">
          <SyntaxHighlighter code={code} language={currentTab.lang} maxHeight="400px" />
          <button
            onClick={copy}
            className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 text-[9px] font-bold bg-surface-elevated/90 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? <Check className="h-2.5 w-2.5 text-status-success" /> : <Copy className="h-2.5 w-2.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-4 py-2.5 border-t border-border bg-surface-elevated">
          <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-wider">
            {code.split('\n').length} lines · {currentTab.label} · .{currentTab.ext}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadFile}
              className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground border border-border transition-colors"
            >
              <Download className="h-3 w-3" />
              Download .{currentTab.ext}
            </button>
            <button
              onClick={copy}
              className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
