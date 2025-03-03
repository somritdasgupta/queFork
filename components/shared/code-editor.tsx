import { Editor } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { editor } from "monaco-editor";

interface CodeEditorProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  language?: string;
  height?: string;
  readOnly?: boolean;
  className?: string;
  onMount?: (editor: editor.IStandaloneCodeEditor) => void;
  options?: Partial<editor.IStandaloneEditorConstructionOptions>;
  showLineNumbers?: boolean;
}

export function CodeEditor({
  value = "",
  onChange,
  language = "javascript",
  height = "100%",
  readOnly = false,
  className = "",
  onMount,
  options = {},
  showLineNumbers = true,
}: CodeEditorProps) {
  useTheme();

  const editorOptions: editor.IStandaloneEditorConstructionOptions = {
    readOnly,
    minimap: { enabled: false },
    fontSize: 12,
    lineNumbers: showLineNumbers ? "on" : "off",
    glyphMargin: showLineNumbers,
    folding: showLineNumbers,
    foldingStrategy: "indentation",
    formatOnPaste: true,
    formatOnType: true,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    wordWrap: "on",
    autoIndent: "advanced",
    wrappingIndent: "deepIndent",
    renderWhitespace: "all",
    guides: {
      indentation: true,
      bracketPairs: true,
      highlightActiveIndentation: true,
      bracketPairsHorizontal: true,
    },
    lineNumbersMinChars: 1,
    lineDecorationsWidth: showLineNumbers ? 5 : 0,
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: "on",
    autoClosingBrackets: "always",
    autoClosingQuotes: "always",
    autoSurround: "languageDefined",
    autoClosingOvertype: "auto",
    autoClosingDelete: "auto",
    contextmenu: true,
    quickSuggestions: false,
    ariaLabel: "code editor",
    copyWithSyntaxHighlighting: true,
    mouseWheelZoom: true,
    multiCursorModifier: "alt",
    selectionClipboard: true,
    ...options,
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-900 to-slate-950 p-[1px]">
      <Editor
        height={height}
        defaultLanguage={language}
        value={value}
        onChange={onChange}
        theme="vs-dark"
        options={editorOptions}
        className={`backdrop-blur-md 
          [&_.monaco-editor]:!bg-slate-900/50 
          [&_.monaco-editor_.monaco-scrollable-element_.monaco-editor-background]:!bg-slate-900/50 
          [&_.margin-view-overlays]:!bg-slate-900/70
          [&_.margin-view-overlays_.line-numbers]:!w-[15px] 
          [&_.margin-view-overlays_.line-numbers]:!pl-0 
          [&_.monaco-editor]:border 
          [&_.monaco-editor]:border-slate-700/30 
          ${className}`}
        beforeMount={(monaco) => {
          monaco.editor.addKeybindingRule({
            keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC,
            command: "editor.action.clipboardCopyAction",
          });
          monaco.editor.addKeybindingRule({
            keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV,
            command: "editor.action.clipboardPasteAction",
          });
          monaco.editor.addKeybindingRule({
            keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX,
            command: "editor.action.clipboardCutAction",
          });

          monaco.editor.defineTheme("customTheme", {
            base: "vs-dark",
            inherit: true,
            rules: [{ token: "", background: "1e293b" }],
            colors: {
              "editor.background": "#0f172a",
            },
          });
          monaco.editor.setTheme("customTheme");
        }}
        onMount={(editor, monaco) => {
          editor.createContextKey("editorTextFocus", true);

          if (onMount) {
            onMount(editor);
          }
        }}
      />
    </div>
  );
}
