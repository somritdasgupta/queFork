import { languageConfigs, type CodeGenLanguage } from "@/utils/code-generators";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface CodeGenerationTabProps {
  getGeneratedCode: () => string;
  selectedLanguage: CodeGenLanguage;
  setSelectedLanguage: (language: CodeGenLanguage) => void;
}

export function CodeGenerationTab({
  getGeneratedCode,
  selectedLanguage,
}: CodeGenerationTabProps) {
  const code = getGeneratedCode()?.trim() || "// No code generated yet";

  return (
    <div className="h-full w-full">
      <ScrollArea className="h-full">
        <div className="px-2">
          <div className="relative overflow-hidden">
            <div className="w-full">
              <div className="flex-1 overflow-hidden">
                <SyntaxHighlighter
                  language={languageConfigs[selectedLanguage].highlight}
                  style={{
                    ...vscDarkPlus,
                    'pre[class*="language-"]': {
                      margin: 0,
                      background: "rgb(15 23 42 / 0.3)",
                      fontSize: "11px",
                      lineHeight: "20px",
                      whiteSpace: "pre-wrap",
                      wordWrap: "break-word",
                    },
                    'code[class*="language-"]': {
                      fontFamily: "var(--font-mono)",
                      textAlign: "left",
                      whiteSpace: "pre-wrap",
                      wordSpacing: "normal",
                      tabSize: 2,
                      wordBreak: "break-word",
                      lineHeight: "20px",
                    },
                  }}
                  customStyle={{
                    margin: 0,
                    padding: "1rem",
                    background: "transparent",
                    fontSize: "11px",
                    lineHeight: "20px",
                  }}
                  showLineNumbers={false}
                  wrapLongLines={true}
                >
                  {code}
                </SyntaxHighlighter>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
