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
}

export function CodeEditor({
  value = "",
  onChange,
  language = "javascript",
  height = "100%",
  readOnly = false,
  className = "",
  onMount,
}: CodeEditorProps) {
  useTheme();

  const editorOptions: editor.IStandaloneEditorConstructionOptions = {
    readOnly,
    minimap: { enabled: false },
    fontSize: 12,
    lineNumbers: "on",
    folding: true,
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
    lineNumbersMinChars: 3,
    lineDecorationsWidth: 0,
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: "on",
    autoClosingBrackets: "always",
    autoClosingQuotes: "always",
    autoSurround: "languageDefined",
    autoClosingOvertype: "auto",
    autoClosingDelete: "auto",
    // Add these options for clipboard support
    contextmenu: true,
    quickSuggestions: false,
    // Enable clipboard permissions
    ariaLabel: "code editor",
    copyWithSyntaxHighlighting: true,
    // Enable mouse support for better copy/paste experience
    mouseWheelZoom: true,
    multiCursorModifier: "alt",
    // Add selection clipboard support
    selectionClipboard: true,
  };

  return (
    <Editor
      height={height}
      defaultLanguage={language}
      value={value}
      onChange={onChange}
      theme="vs-dark"
      options={editorOptions}
      className={`[&_.monaco-editor]:!bg-slate-900 [&_.monaco-editor_.monaco-scrollable-element_.monaco-editor-background]:!bg-slate-900 ${className}`}
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
  );
}
