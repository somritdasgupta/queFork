import { TabsContent } from "@/components/ui/tabs";
import { CodeEditor } from "@/components/shared/code-editor";
import { LoadingDots } from "@/components/shared/loading-dots";

interface ResponseContentProps {
  isLoading: boolean;
  formattedContent: string;
  contentType: string;
  editorRef: React.MutableRefObject<any>;
  editorInstanceRef: React.MutableRefObject<any>;
  isPrettyPrint: boolean;
}

export const ResponseContent = ({
  isLoading,
  formattedContent,
  contentType,
  editorRef,
  editorInstanceRef,
  isPrettyPrint,
}: ResponseContentProps) => (
  <TabsContent value="response" className="absolute inset-0 m-0">
    {isLoading ? (
      <LoadingDots />
    ) : (
      <div className="h-full">
        <CodeEditor
          value={formattedContent}
          language={contentType === "json" ? "json" : "text"}
          readOnly={true}
          onMount={(editor) => {
            editorRef.current = editor;
            editorInstanceRef.current = editor;
            setTimeout(() => editor.layout(), 0);
          }}
          options={{
            wordWrap: "on",
            wrappingStrategy: "advanced",
            wordWrapColumn: 80,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            folding: isPrettyPrint,
            renderWhitespace: isPrettyPrint ? "all" : "none",
            formatOnPaste: false,
            formatOnType: false,
          }}
        />
      </div>
    )}
  </TabsContent>
);
