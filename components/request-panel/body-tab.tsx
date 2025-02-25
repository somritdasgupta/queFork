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
import { KeyValueEditor } from "../key-value-editor";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ContentType, KeyValuePair, Environment, RequestBody } from "@/types";
import {
  contentTypeOptions,
  getIconForContentType,
  type EditorType,
} from "@/lib/content-type-utils";
import { CodeEditor } from "@/components/request-panel/shared/code-editor";
import {
  readFileAsBase64,
  getAcceptedFileTypes,
  isValidFileType,
  formatFileSize,
  type BinaryFileData,
} from "@/lib/binary-utils";

// Remove the local EditorType definition since we're importing it

const getEditorType = (contentType: ContentType): EditorType => {
  switch (contentType) {
    case "application/json":
      return "json";
    case "multipart/form-data":
      return "form";
    case "application/octet-stream":
      return "binary";
    case "none":
      return "none";
    default:
      return "text";
  }
};

interface ContentTypeOption {
  value: ContentType;
  label: string;
  category: string;
  editor: "none" | "form" | "text" | "json" | "binary";
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
    examples: { code: string; description: string }[];
    bestPractices: string[];
    common: { title: string; description: string }[];
  }
> = {
  none: {
    title: "Working with URL Parameters",
    examples: [
      {
        code: "GET /api/users?role=admin&status=active",
        description: "Filter users by role and status",
      },
      {
        code: "GET /api/posts?page=1&limit=10&sort=date",
        description: "Paginate and sort results",
      },
    ],
    bestPractices: [
      "Use clear parameter names that reflect their purpose",
      "Keep URLs under 2000 characters to ensure compatibility",
      "URL encode parameter values to handle special characters",
    ],
    common: [
      {
        title: "Authentication",
        description:
          "Use Authorization header instead of URL parameters for tokens",
      },
      {
        title: "Caching",
        description:
          "Include cache-busting parameters when needed (e.g., timestamp)",
      },
    ],
  },
  json: {
    title: "Working with JSON Payloads",
    examples: [
      {
        code: `{
  "user": {
    "name": "John Doe",
    "email": "john@example.com",
    "roles": ["admin"]
  }
}`,
        description: "Create or update user data",
      },
      {
        code: `{
  "filters": {
    "status": ["active", "pending"],
    "date": { "from": "2024-01-01" }
  }
}`,
        description: "Complex query with nested filters",
      },
    ],
    bestPractices: [
      "Use camelCase for property names",
      "Include only necessary fields to reduce payload size",
      "Validate JSON structure before sending",
    ],
    common: [
      {
        title: "Nested Objects",
        description:
          "Group related data into nested objects for better organization",
      },
      {
        title: "Arrays",
        description:
          "Use arrays for lists of similar items or batch operations",
      },
    ],
  },
  form: {
    title: "Working with Form Data",
    examples: [
      {
        code: "file: user_avatar.jpg\nname: John Doe\nrole: admin",
        description: "Upload user profile with avatar",
      },
      {
        code: "files[]: doc1.pdf\nfiles[]: doc2.pdf\ntype: report",
        description: "Multiple file upload with metadata",
      },
    ],
    bestPractices: [
      "Set appropriate enctype for file uploads",
      "Use array notation [] for multiple files",
      "Include Content-Disposition headers for files",
    ],
    common: [
      {
        title: "File Uploads",
        description:
          "Use multipart/form-data for files, x-www-form-urlencoded for simple data",
      },
      {
        title: "Field Names",
        description:
          "Use clear, consistent naming for form fields to match backend expectations",
      },
    ],
  },
  text: {
    title: "Working with Text-Based Formats",
    examples: [
      {
        code: `<?xml version="1.0" encoding="UTF-8"?>
<user>
  <name>John Doe</name>
  <roles>
    <role>admin</role>
  </roles>
</user>`,
        description: "XML: User data with nested elements",
      },
      {
        code: `name,email,role
john,john@example.com,admin
jane,jane@example.com,user`,
        description: "CSV: Simple tabular data format",
      },
      {
        code: `user:
  name: John Doe
  roles:
    - admin
    - editor
settings:
  theme: dark`,
        description: "YAML: Configuration data with nested structure",
      },
    ],
    bestPractices: [
      "XML: Use proper entity encoding for special characters",
      "CSV: Include headers row for self-documenting data",
      "YAML: Maintain consistent indentation (2 spaces recommended)",
      "Set correct Content-Type header for server processing",
      "Validate document structure before sending",
    ],
    common: [
      {
        title: "XML Documents",
        description:
          "Use namespaces to avoid element name conflicts, include XML declaration",
      },
      {
        title: "CSV Data",
        description:
          "Quote fields containing commas, specify delimiter in Content-Type if not comma",
      },
      {
        title: "YAML Config",
        description:
          "Avoid tabs, use --- to separate documents, anchor refs with & and *",
      },
    ],
  },
  binary: {
    title: "Working with Binary Data",
    examples: [
      {
        code: "Content-Type: application/pdf\nContent-Length: 1048576",
        description: "Upload PDF document",
      },
      {
        code: "Content-Type: image/jpeg\nContent-Length: 524288",
        description: "Upload JPEG image",
      },
    ],
    bestPractices: [
      "Set accurate Content-Type header",
      "Include Content-Length for better upload handling",
      "Consider chunked transfer for large files",
    ],
    common: [
      {
        title: "File Types",
        description: "Verify file type matches Content-Type header",
      },
      {
        title: "Size Limits",
        description: "Check server upload limits before sending large files",
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

  const contentTypeOption = useMemo(() => {
    const option = contentTypeOptions.data.find(
      (opt) => opt.value === selectedContentType
    );
    return option || null;
  }, [selectedContentType]);

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

  const editorType = contentTypeOption?.editor || "none";

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <div className="sticky top-0 z-10 bg-slate-950 border-b border-slate-800/60">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center py-1.5 px-2 bg-slate-900 border-y border-slate-800 text-slate-300 hover:text-slate-200">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4">
                    {getIconForContentType(selectedContentType)}
                  </div>
                  <span className="font-medium text-xs">
                    {contentTypeOption?.label || "Select type"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 rounded-md bg-slate-800 px-2 py-1">
                  <span className="text-xs text-slate-400">
                  {navigator.platform.toLowerCase().includes('mac') ? '⌘K' : 'Ctrl+K'}
                  </span>
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="bottom"
            className="w-screen sm:w-[75vw] bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-lg rounded-none border-2 border-slate-700 overflow-hidden"
          >
            <div className="p-1 flex flex-wrap gap-1">
              {contentTypeOptions.data.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleContentTypeChange(option.value)}
                  className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs flex-1",
                  option.value === selectedContentType
                  ? "bg-blue-500/10 hover:bg-slate-800 text-blue-400"
                  : "text-slate-300 hover:bg-slate-800"
                  )}
                >
                  <div className="w-3.5 h-3.5">
                    {getIconForContentType(option.value)}
                  </div>
                  <span className="font-medium">{option.label}</span>
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Edge-to-edge content area */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {editorType === "none" ? (
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
                    onChange={(pairs: KeyValuePair[]) =>
                      onChange({ ...body, content: pairs })
                    }
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

      {editorType !== "none" && (
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
      {/* Compact Tips Section */}
      <div className="border-t border-slate-800">
        <div className="p-3">
          <div className="flex flex-col space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-blue-500/10">
                <Info className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <h3 className="text-xs font-medium text-slate-200">
                {CONTENT_TYPE_TIPS[contentTypeOption?.editor || "none"].title}
              </h3>
            </div>

            {/* Examples and Best Practices in Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Examples */}
              <div className="space-y-2">
                {CONTENT_TYPE_TIPS[
                  contentTypeOption?.editor || "none"
                ].examples.map((example, i) => (
                  <div
                    key={i}
                    className="bg-slate-800/40 rounded border border-slate-700/40 text-xs"
                  >
                    <div className="p-2 font-mono text-slate-300 bg-slate-800/60">
                      {example.code}
                    </div>
                    <div className="px-2 py-1.5 text-slate-400 text-[11px]">
                      {example.description}
                    </div>
                  </div>
                ))}
              </div>

              {/* Best Practices and Common Scenarios */}
              <div className="space-y-2">
                {CONTENT_TYPE_TIPS[
                  contentTypeOption?.editor || "none"
                ].bestPractices.map((practice, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-[11px] text-slate-300 bg-slate-800/40 px-2 py-1.5 rounded"
                  >
                    <div className="w-1 h-1 rounded-full bg-blue-400 flex-shrink-0" />
                    {practice}
                  </div>
                ))}
                {CONTENT_TYPE_TIPS[
                  contentTypeOption?.editor || "none"
                ].common.map((item, i) => (
                  <div
                    key={i}
                    className="bg-slate-800/40 rounded border border-slate-700/40 p-2"
                  >
                    <div className="flex items-baseline gap-2">
                      <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5" />
                      <div>
                        <h5 className="text-[11px] font-medium text-slate-300">
                          {item.title}
                        </h5>
                        <p className="text-[11px] text-slate-400 mt-0.5">
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
