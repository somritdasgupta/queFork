import { TabsContent } from "@/components/ui/tabs";
import { CodeEditor } from "@/components/shared/code-editor";
import { languageConfigs, type CodeGenLanguage } from "@/utils/code-generators";
import { type RequestResponse } from "@/types";

interface CodeContentProps {
  response: RequestResponse | null;
  method: string;
  url: string;
  selectedLanguage: CodeGenLanguage;
}

export const CodeContent = ({
  response,
  method,
  url,
  selectedLanguage,
}: CodeContentProps) => {
  const getGeneratedCode = () => {
    if (!response) return "";

    const options = {
      url,
      method,
      headers: response.headers || {},
      body: response.body ? JSON.stringify(response.body, null, 2) : undefined,
    };

    try {
      return languageConfigs[selectedLanguage].generator(options);
    } catch (error) {
      console.error("Code generation error:", error);
      return "// Error generating code";
    }
  };

  return (
    <TabsContent value="code" className="absolute inset-0 m-0">
      <div className="h-full">
        <CodeEditor
          value={getGeneratedCode()}
          language={languageConfigs[selectedLanguage].highlight}
          readOnly={true}
        />
      </div>
    </TabsContent>
  );
};
