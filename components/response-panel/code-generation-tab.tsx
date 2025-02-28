import { languageConfigs, type CodeGenLanguage } from "@/utils/code-generators";
import { useTheme } from "next-themes";
import Editor from "@monaco-editor/react";

interface CodeGenerationTabProps {
  getGeneratedCode: () => string;
  selectedLanguage: CodeGenLanguage;
  setSelectedLanguage: (language: CodeGenLanguage) => void;
}

export function CodeGenerationTab({
  getGeneratedCode,
  selectedLanguage,
}: CodeGenerationTabProps) {
  const { theme } = useTheme();
  const code = getGeneratedCode()?.trim() || "// No code generated yet";

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={languageConfigs[selectedLanguage].highlight}
        theme={theme === "dark" ? "vs-dark" : "light"}
        value={code}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 12,
          fontFamily: "var(--font-mono)",
          lineNumbers: "off",
          folding: true,
          wordWrap: "on",
          automaticLayout: true,
          scrollBeyondLastLine: false,
          tabSize: 2,
          padding: { top: 8, bottom: 8 },
        }}
      />
    </div>
  );
}
