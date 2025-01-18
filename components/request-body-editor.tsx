"use client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { KeyValueEditor } from "./key-value-editor";
import { Textarea } from "@/components/ui/textarea";
import { RequestBody } from "@/types";

interface RequestBodyEditorProps {
  body: RequestBody;
  onChange: (body: RequestBody) => void;
}
export function RequestBodyEditor({ body, onChange }: RequestBodyEditorProps) {
  return (
    <Tabs
      value={body.type}
      onValueChange={(value: any) => onChange({ type: value, content: "" })}
      className="w-full space-y-6"
    >
      <TabsList className="grid grid-cols-4 overflow-x-auto whitespace-nowrap h-auto min-h-[2rem] items-center rounded-lg border-2 border-blue-100 bg-blue-50 px-1 text-gray-700 shadow-inner w-full">
        <TabsTrigger
          value="json"
          className="flex-1 inline-flex items-center justify-center gap-0.5 sm:gap-1 rounded-md px-1 sm:px-2 py-2 text-[10px] xs:text-xs sm:text-sm font-semibold transition-all hover:bg-gray-100 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
        >
          <svg
            className="hidden sm:block h-3 w-3 sm:h-4 sm:w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          JSON
        </TabsTrigger>
        <TabsTrigger
          value="form-data"
          className="flex-1 inline-flex items-center justify-center gap-0.5 sm:gap-1 rounded-md px-1 sm:px-2 py-2 text-[10px] xs:text-xs sm:text-sm font-medium transition-all hover:bg-gray-100 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
        >
          <svg
            className="hidden sm:block h-3 w-3 sm:h-4 sm:w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
            />
          </svg>
          Form Data
        </TabsTrigger>
        <TabsTrigger
          value="x-www-form-urlencoded"
          className="flex-1 inline-flex items-center justify-center gap-0.5 sm:gap-1 rounded-md px-1 sm:px-2 py-2 text-[10px] xs:text-xs sm:text-sm font-medium transition-all hover:bg-gray-100 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
        >
          <svg
            className="hidden sm:block h-3 w-3 sm:h-4 sm:w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
          URL Encoded
        </TabsTrigger>
        <TabsTrigger
          value="raw"
          className="flex-1 inline-flex items-center justify-center gap-0.5 sm:gap-1 rounded-md px-1 sm:px-2 py-2 text-[10px] xs:text-xs sm:text-sm font-medium transition-all hover:bg-gray-100 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
        >
          <svg
            className="hidden sm:block h-3 w-3 sm:h-4 sm:w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          Raw
        </TabsTrigger>
      </TabsList>

      <div className="mt-4">
        <TabsContent
          value="none"
          className="rounded-lg border border-gray-200 p-4"
        >
          <div className="flex items-center justify-center text-sm text-gray-500">
            <svg
              className="mr-2 h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            This request does not have a body
          </div>
        </TabsContent>
        <TabsContent value="json" className="mt-0">
          <Textarea
            value={
              typeof body.content === "string"
                ? body.content
                : JSON.stringify(body.content, null, 2)
            }
            onChange={(e) => onChange({ ...body, content: e.target.value })}
            className="min-h-[200px] rounded-lg border border-gray-200 font-mono text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Enter JSON body"
          />
        </TabsContent>
        <TabsContent value="form-data" className="mt-0">
          <div className="rounded-lg border border-gray-200 p-4">
            <KeyValueEditor
              pairs={Array.isArray(body.content) ? body.content : []}
              onChange={(pairs) => onChange({ ...body, content: pairs })}
              addButtonText="Add Form Field"
              showDescription={true}
            />
          </div>
        </TabsContent>
        <TabsContent value="x-www-form-urlencoded" className="mt-0">
          <div className="rounded-lg border border-gray-200 p-4">
            <KeyValueEditor
              pairs={Array.isArray(body.content) ? body.content : []}
              onChange={(pairs) => onChange({ ...body, content: pairs })}
              addButtonText="Add Parameter"
            />
          </div>
        </TabsContent>
        <TabsContent value="raw" className="mt-0">
          <Textarea
            value={typeof body.content === "string" ? body.content : ""}
            onChange={(e) => onChange({ ...body, content: e.target.value })}
            className="min-h-[200px] rounded-lg border border-gray-200 font-mono text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Enter raw body"
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}
