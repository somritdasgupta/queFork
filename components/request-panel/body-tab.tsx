import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Editor } from "@monaco-editor/react";
import {
  FileJson,
  FormInput,
  FileCode,
  FileText,
  WrapTextIcon,
  SquareCodeIcon,
  Eraser,
  Info,
  CheckCircle,
  FileIcon,
  AlertCircle,
  type Icon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KeyValueEditor } from "@/components/key-value-editor";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ContentType, KeyValuePair, Environment, RequestBody } from "@/types";
import {
  contentTypeOptions,
  getIconForContentType,
} from "@/lib/content-type-utils";
import { CodeEditor } from "@/components/shared/code-editor";
import {
  readFileAsBase64,
  getAcceptedFileTypes,
  isValidFileType,
  formatFileSize,
  type BinaryFileData,
} from "@/lib/binary-utils";

// Update EditorType to be more specific
type EditorType = "none" | "text" | "json" | "form" | "binary";

interface ContentTypeOption {
  value: ContentType;
  label: string;
  category: string;
  editor: EditorType;
}

interface BodyTabProps {
  body: RequestBody;
  onChange: (body: RequestBody) => void;
  environments?: Environment[];
  currentEnvironment?: Environment | null;
  onEnvironmentChange?: (environmentId: string) => void;
  onEnvironmentsUpdate?: (environments: Environment[]) => void;
  onAddToEnvironment?: (key: string, value: string) => void;
  headers: KeyValuePair[];
  onHeadersChange: (headers: KeyValuePair[]) => void;
}

// Add this content type config with consistent styling
const CONTENT_TYPE_CONFIG = {
  selectedBg: "bg-blue-500/10",
  color: "blue",
} as const;

const CONTENT_TYPE_TIPS: Record<
  EditorType,
  {
    title: string;
    description: string;
    concepts: { title: string; description: string }[];
    integration: { title: string; description: string }[];
  }
> = {
  none: {
    title: "Request without Body",
    description:
      "Some HTTP methods like GET and DELETE typically don't require a request body. The request parameters are instead passed through URL parameters or headers.",
    concepts: [
      {
        title: "URL Parameters",
        description:
          "Use query parameters (?key=value) for filtering, pagination, and search operations",
      },
      {
        title: "Headers Only",
        description:
          "Authentication, caching directives, and other metadata are handled via headers",
      },
      {
        title: "Idempotency",
        description:
          "GET requests are cacheable and can be repeated without side effects",
      },
    ],
    integration: [
      {
        title: "Cache Control",
        description:
          "Set appropriate cache headers to optimize subsequent requests",
      },
      {
        title: "Authentication",
        description: "Use Authorization header or API keys for secure access",
      },
      {
        title: "Response Handling",
        description:
          "Expect JSON responses with status codes indicating success/failure",
      },
    ],
  },
  json: {
    title: "JSON Request Body",
    description:
      "JSON is the standard format for API requests, allowing structured data transmission with support for nested objects and arrays.",
    concepts: [
      {
        title: "Data Structure",
        description:
          "Organize data hierarchically using objects and arrays for complex relationships",
      },
      {
        title: "Type Safety",
        description:
          "JSON supports strings, numbers, booleans, null, objects, and arrays",
      },
      {
        title: "Content Negotiation",
        description:
          "Uses application/json Content-Type header for proper server handling",
      },
    ],
    integration: [
      {
        title: "Request Processing",
        description:
          "Server automatically parses JSON into native data structures",
      },
      {
        title: "Error Handling",
        description: "Invalid JSON results in 400 Bad Request responses",
      },
      {
        title: "Response Correlation",
        description:
          "Response typically mirrors request structure for CRUD operations",
      },
    ],
  },
  form: {
    title: "Form Data Request",
    description:
      "Form data enables file uploads and mimics HTML form submissions. Supports both multipart/form-data and x-www-form-urlencoded formats.",
    concepts: [
      {
        title: "Field Types",
        description:
          "Supports text fields, files, and complex data through structured naming",
      },
      {
        title: "Encoding Types",
        description:
          "Choose between multipart/form-data for files and x-www-form-urlencoded for simple data",
      },
      {
        title: "Browser Compatibility",
        description:
          "Natural integration with HTML forms and JavaScript FormData API",
      },
    ],
    integration: [
      {
        title: "File Handling",
        description:
          "Server processes uploaded files and form fields separately",
      },
      {
        title: "Size Limits",
        description:
          "Consider server upload limits and chunked transfer encoding",
      },
      {
        title: "Field Validation",
        description: "Server validates both field names and content types",
      },
    ],
  },
  text: {
    title: "Plain Text Request",
    description:
      "Raw text requests are useful for custom formats, logs, or simple data transfer where parsing overhead isn't needed.",
    concepts: [
      {
        title: "Content Format",
        description:
          "Sends unstructured text data without specific formatting requirements",
      },
      {
        title: "Encoding",
        description:
          "Uses UTF-8 encoding by default for universal compatibility",
      },
      {
        title: "Processing",
        description:
          "Server handles raw text directly without automatic parsing",
      },
    ],
    integration: [
      {
        title: "Content Handling",
        description: "Server reads body as raw text stream",
      },
      {
        title: "Transformation",
        description: "Text can be processed or parsed server-side as needed",
      },
      {
        title: "Response Format",
        description: "Response format may differ based on server processing",
      },
    ],
  },
  binary: {
    title: "Binary Request",
    description:
      "Binary requests handle raw file uploads and streaming data. Useful for direct file transfers and media uploads.",
    concepts: [
      {
        title: "Content Format",
        description: "Sends raw binary data without encoding or transformation",
      },
      {
        title: "Transfer Mode",
        description: "Supports both direct and chunked transfer encoding",
      },
      {
        title: "Content Types",
        description: "Uses specific MIME types to indicate file format",
      },
    ],
    integration: [
      {
        title: "Stream Processing",
        description: "Server handles data as binary stream for efficiency",
      },
      {
        title: "File Operations",
        description: "Server can directly save or process binary content",
      },
      {
        title: "Size Handling",
        description: "Consider content-length limits and timeout settings",
      },
    ],
  },
};

interface FilePreview extends Omit<BinaryFileData, "content"> {}

export function BodyTab({
  body,
  onChange,
  environments,
  currentEnvironment,
  onEnvironmentChange,
  onEnvironmentsUpdate,
  onAddToEnvironment,
  headers,
  onHeadersChange,
}: BodyTabProps) {
  const [selectedContentType, setSelectedContentType] = useState<ContentType>(
    body.type
  );
  const [isValidJson, setIsValidJson] = useState(true);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const editorRef = useRef<any>(null);
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);

  const contentTypeOption = Object.values(contentTypeOptions)
    .flat()
    .find((opt) => opt.value === selectedContentType);

  const handleContentTypeChange = (newType: ContentType) => {
    setSelectedContentType(newType);
    // Only clear content if not switching between binary-compatible types
    if (
      contentTypeOption?.editor === "binary" ||
      (Object.values(contentTypeOptions)
        .flat()
        .find((opt) => opt.value === newType)?.editor === "binary" &&
        body.content instanceof File)
    ) {
      // Preserve the file content when switching between binary-compatible types
      onChange({ type: newType, content: body.content });
    } else {
      onChange({ type: newType, content: "" });
    }
  };

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      const newValue = value || "";

      if (contentTypeOption?.editor === "json") {
        try {
          JSON.parse(newValue);
          setIsValidJson(true);
          setJsonError(null);
        } catch (e) {
          setIsValidJson(false);
          setJsonError((e as Error).message);
        }
      }

      onChange({ type: selectedContentType, content: newValue });
    },
    [contentTypeOption?.editor, onChange, selectedContentType]
  );

  const handleFormatJson = () => {
    if (editorRef.current && contentTypeOption?.editor === "json") {
      try {
        const value = editorRef.current.getValue();
        const formatted = JSON.stringify(JSON.parse(value), null, 2);
        editorRef.current.setValue(formatted);
        setIsValidJson(true);
        setJsonError(null);
      } catch (e) {
        toast.error("Invalid JSON - cannot format");
      }
    }
  };

  const handleOverrideContentType = () => {
    const updatedHeaders = [...headers];
    const contentTypeHeaderIndex = updatedHeaders.findIndex(
      (h) => h.key.toLowerCase() === "content-type"
    );

    const newHeader = {
      key: "Content-Type",
      value: selectedContentType,
      enabled: true,
      type: "text",
      showSecrets: false,
    };

    if (contentTypeHeaderIndex !== -1) {
      updatedHeaders[contentTypeHeaderIndex] = newHeader;
    } else {
      updatedHeaders.push(newHeader);
    }

    onHeadersChange(updatedHeaders);
    toast.success("Content-Type header updated");
  };

  // Add editor mount handler
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  // Add this new handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isValidFileType(file)) {
      toast.error("Invalid file type");
      return;
    }

    try {
      // Store file directly
      setFilePreview({
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        lastModified: file.lastModified,
      });

      // Update body with the File object
      onChange({
        type: selectedContentType,
        content: file,
      });
    } catch (error) {
      toast.error("Failed to process file");
      console.error("File processing error:", error);
    }
  };

  // Add useEffect to restore file preview from body content
  useEffect(() => {
    if (
      body.content &&
      (body.content instanceof File ||
        (typeof body.content === "object" && "name" in body.content))
    ) {
      // Restore file preview from body content
      setFilePreview({
        name: body.content.name,
        size: body.content.size,
        type: body.content.type || "application/octet-stream",
        lastModified: body.content.lastModified,
      });
    } else {
      // Clear file preview if no file in body content
      setFilePreview(null);
    }
  }, [body.content]);

  // Add file removal handler
  const handleFileRemove = () => {
    setFilePreview(null);
    onChange({ type: selectedContentType, content: "" });
  };

  // Add this helper for the binary preview section
  const renderFileTypeInfo = () => (
    <div className="text-xs text-slate-400 mt-2">
      <span className="font-medium">Accepted files:</span>
      <span className="ml-1">
        PDF, JSON, TXT, CSV, XML, Images (JPG, PNG, GIF), ZIP, YAML
      </span>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <div className="sticky top-0 z-10 bg-slate-950 border-b border-slate-800/60">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex w-full items-center h-9 sm:h-12 gap-2 px-3 
              bg-slate-900 border border-slate-800 hover:border-slate-700
              text-slate-300 hover:text-slate-200 rounded-none
              transition-all duration-200 group"
            >
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 flex items-center justify-center">
                  {getIconForContentType(selectedContentType)}
                </div>
                <span className="font-medium text-xs">
                  {contentTypeOption?.label || "Select type"}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="z-50 w-screen sm:w-[75vw] bg-slate-900 border border-slate-700/50 shadow-lg rounded-none border-2 border-slate-700/50 overflow-hidden"
          >
            <ScrollArea
              direction="horizontal"
              className="w-full [&::-webkit-scrollbar]:hidden [&_[data-radix-scroll-area-scrollbar]]:hidden no-scrollbar px-2"
              style={{ scrollbarWidth: "none" }}
            >
              <div className="flex items-center gap-2">
                {Object.values(contentTypeOptions)
                  .flat()
                  .map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => handleContentTypeChange(option.value)}
                      className="flex-none transition-all duration-200 rounded-full"
                    >
                      <div
                        className={cn(
                          "flex w-full items-center gap-1.5 py-1 px-2.5 rounded-full",
                          option.value === selectedContentType
                            ? CONTENT_TYPE_CONFIG.selectedBg
                            : "bg-slate-800"
                        )}
                      >
                        <div
                          className={cn(
                            "w-3.5 h-3.5 flex items-center justify-center",
                            option.value === selectedContentType
                              ? `text-${CONTENT_TYPE_CONFIG.color}-400`
                              : "text-slate-400"
                          )}
                        >
                          {getIconForContentType(option.value)}
                        </div>
                        <span
                          className={cn(
                            "text-[11px] font-medium",
                            option.value === selectedContentType
                              ? `text-${CONTENT_TYPE_CONFIG.color}-400`
                              : "text-slate-300"
                          )}
                        >
                          {option.label}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
              </div>
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Edge-to-edge content area */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {contentTypeOption?.editor === "none" ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full flex items-center justify-center p-8"
            >
              <div className="text-center max-w-sm mx-auto px-4">
                <div className="inline-flex items-center justify-center p-3 rounded-lg bg-gradient-to-b from-slate-800/50 to-slate-900/50 border border-slate-800/60 mb-4">
                  <FileText
                    className="h-6 w-6 text-slate-400"
                    strokeWidth={1.5}
                    style={{
                      stroke: "currentColor",
                      fill: "#1e293b",
                      fillOpacity: 0.2,
                    }}
                  />
                </div>
                <h3 className="text-sm font-medium text-slate-200 mb-1">
                  No Body Content
                </h3>
                <p className="text-xs text-slate-400">
                  This request doesn't require a body. Select a content type if
                  you need to send data.
                </p>
              </div>
            </motion.div>
          ) : (
            <>
              {contentTypeOption?.editor === "form" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  <KeyValueEditor
                    pairs={Array.isArray(body.content) ? body.content : []}
                    onChange={(pairs) => onChange({ ...body, content: pairs })}
                    addButtonText={
                      selectedContentType === "multipart/form-data"
                        ? "Add Form Field"
                        : "Add Parameter"
                    }
                    showDescription={
                      selectedContentType === "multipart/form-data"
                    }
                    environments={environments}
                    currentEnvironment={currentEnvironment}
                    onEnvironmentChange={onEnvironmentChange}
                    onEnvironmentsUpdate={onEnvironmentsUpdate}
                    onAddToEnvironment={onAddToEnvironment}
                    expandedItemId={expandedItemId}
                    onExpandedChange={setExpandedItemId}
                    className="rounded-none border-none"
                  />
                </motion.div>
              )}

              {contentTypeOption?.editor &&
                ["json", "text"].includes(contentTypeOption.editor) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full"
                  >
                    <CodeEditor
                      value={
                        typeof body.content === "string" ? body.content : ""
                      }
                      onChange={handleEditorChange}
                      language={
                        contentTypeOption.editor === "json"
                          ? "json"
                          : "plaintext"
                      }
                      onMount={handleEditorDidMount}
                      height="30vh"
                    />
                  </motion.div>
                )}

              {contentTypeOption?.editor === "binary" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex items-center justify-center bg-slate-900/50 p-8"
                >
                  <div className="max-w-md w-full">
                    {!filePreview ? (
                      <div
                        className="p-8 rounded-xl bg-gradient-to-b from-slate-800/50 to-slate-900/50 
                        border-2 border-dashed border-slate-700/60 hover:border-slate-600/60
                        transition-colors duration-200"
                      >
                        <div className="text-center">
                          <Input
                            type="file"
                            onChange={handleFileChange}
                            accept={getAcceptedFileTypes()}
                            className="hidden"
                            id="file-upload"
                          />
                          <label
                            htmlFor="file-upload"
                            className="cursor-pointer flex flex-col items-center group"
                          >
                            <div
                              className="p-4 rounded-xl bg-slate-800/50 group-hover:bg-slate-700/50 
                              transition-colors duration-200 mb-4"
                            >
                              <FileText className="h-12 w-12 text-slate-400 group-hover:text-slate-300" />
                            </div>
                            <span className="text-sm text-slate-300 group-hover:text-slate-200">
                              Click to select a file
                            </span>
                            <span className="text-xs text-slate-500 mt-1 group-hover:text-slate-400">
                              or drag and drop
                            </span>
                          </label>
                          {renderFileTypeInfo()}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-800/40 rounded-xl border border-slate-700/40">
                        <div className="p-4 border-b border-slate-700/40">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-slate-800">
                              <FileIcon className="h-8 w-8 text-slate-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium text-slate-200 truncate">
                                {filePreview.name}
                              </h3>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-slate-400">
                                  {formatFileSize(filePreview.size)}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {filePreview.type}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="px-4 py-3 flex items-center justify-between">
                          <span className="text-xs text-slate-400">
                            Last modified:{" "}
                            {new Date(
                              filePreview.lastModified
                            ).toLocaleString()}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleFileRemove}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Remove file
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </div>

      {contentTypeOption?.editor !== "none" && (
        <div
          className={cn(
            "border-t border-slate-800/60",
            contentTypeOption?.editor === "json"
              ? isValidJson
                ? "bg-slate-900 border-y-4"
                : "bg-red-900/40 border-y-4"
              : "bg-slate-900 border-y-4"
          )}
        >
          <div className="flex items-center justify-between h-9">
            {/* Status Section - more compact */}
            <div className="flex items-center gap-2 px-2">
              <div className="flex items-center gap-2 min-w-0 flex-shrink">
                {contentTypeOption?.editor === "json" && (
                  <div
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs",
                      isValidJson
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : "bg-red-950 text-red-400 border border-red-800"
                    )}
                  >
                    {isValidJson ? (
                      <CheckCircle className="h-3 w-3 flex-shrink-0" />
                    ) : (
                      <Info className="h-3 w-3 flex-shrink-0" />
                    )}
                    <span className="font-medium truncate max-w-[150px] sm:max-w-[300px]">
                      {isValidJson ? "Valid JSON" : jsonError}
                    </span>
                  </div>
                )}
                {body.content && typeof body.content === "string" && (
                  <div
                    className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md 
                    bg-blue-950 border border-blue-800"
                  >
                    <span className="text-[11px] text-blue-400 whitespace-nowrap">
                      {new Blob([body.content]).size} bytes
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons - more compact */}
            <div className="flex items-center divide-x divide-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOverrideContentType}
                className={cn(
                  "h-9 px-3 rounded-none text-slate-400 hover:text-slate-300 text-xs",
                  contentTypeOption?.editor === "json"
                    ? isValidJson
                      ? "hover:bg-emerald-900/40"
                      : "hover:bg-red-900/40"
                    : "hover:bg-slate-900"
                )}
                title="Set Content-Type Header"
              >
                <SquareCodeIcon className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Set Header</span>
              </Button>

              {contentTypeOption?.editor === "json" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFormatJson}
                  className={cn(
                    "h-9 px-3 rounded-none text-slate-400 hover:text-slate-300 text-xs",
                    isValidJson
                      ? "hover:bg-emerald-900/40"
                      : "hover:bg-red-900/40"
                  )}
                  title="Format JSON"
                >
                  <WrapTextIcon className="h-3.5 w-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">Format</span>
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  onChange({ type: selectedContentType, content: "" })
                }
                className={cn(
                  "h-9 px-3 rounded-none text-slate-400 hover:text-slate-300 text-xs",
                  contentTypeOption?.editor === "json"
                    ? isValidJson
                      ? "hover:bg-emerald-900/40"
                      : "hover:bg-red-900/40"
                    : "hover:bg-slate-900"
                )}
                title="Clear Content"
              >
                <Eraser className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Modern Tips Section */}
      <div className="border-t border-slate-800">
        <div className="p-4 space-y-4 ">
          {/* Title & Description */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-blue-500/10">
                <Info className="w-4 h-4 text-blue-400" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-medium text-slate-200">
                  {CONTENT_TYPE_TIPS[contentTypeOption?.editor || "none"].title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {
                    CONTENT_TYPE_TIPS[contentTypeOption?.editor || "none"]
                      .description
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-2 gap-4">
            {/* Core Concepts Column */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Core Concepts
              </h4>
              <div className="space-y-2">
                {CONTENT_TYPE_TIPS[
                  contentTypeOption?.editor || "none"
                ].concepts.map((concept, index) => (
                  <div
                    key={index}
                    className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800/70 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-blue-500 mt-1.5" />
                      <div>
                        <h5 className="text-xs font-medium text-slate-300">
                          {concept.title}
                        </h5>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                          {concept.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Integration Column */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Integration Details
              </h4>
              <div className="space-y-2">
                {CONTENT_TYPE_TIPS[
                  contentTypeOption?.editor || "none"
                ].integration.map((item, index) => (
                  <div
                    key={index}
                    className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800/70 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5" />
                      <div>
                        <h5 className="text-xs font-medium text-slate-300">
                          {item.title}
                        </h5>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
