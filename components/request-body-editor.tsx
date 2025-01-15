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
    >
      <TabsList className="w-full justify-center items-center rounded-md bg-blue-50 px-0">
        <TabsTrigger
          value="json"
          className="w-full data-[state=active]:bg-white rounded-md border-2 border-transparent px-4 py-2 font-medium text-gray-500 hover:text-gray-700 data-[state=active]:border-violet-500 data-[state=active]:text-white data-[state=active]:bg-slate-700"
        >
          JSON
        </TabsTrigger>
        <TabsTrigger
          value="form-data"
          className="w-full data-[state=active]:bg-white rounded-md border-2 border-transparent px-4 py-2 font-medium text-gray-500 hover:text-gray-700 data-[state=active]:border-violet-500 data-[state=active]:text-white data-[state=active]:bg-slate-700"
        >
          Form Data
        </TabsTrigger>
        <TabsTrigger
          value="x-www-form-urlencoded"
          className="w-full data-[state=active]:bg-white rounded-md border-2 border-transparent px-4 py-2 font-medium text-gray-500 hover:text-gray-700 data-[state=active]:border-violet-500 data-[state=active]:text-white data-[state=active]:bg-slate-700"
        >
          Encoded
        </TabsTrigger>
        <TabsTrigger
          value="raw"
          className="w-full data-[state=active]:bg-white rounded-md border-2 border-transparent px-4 py-2 font-medium text-gray-500 hover:text-gray-700 data-[state=active]:border-violet-500 data-[state=active]:text-white data-[state=active]:bg-slate-700"
        >
          Raw
        </TabsTrigger>
      </TabsList>
      <div className="mt-4">
        <TabsContent value="none" className="m-0">
          <div className="text-sm text-gray-500">
            This request does not have a body
          </div>
        </TabsContent>
        <TabsContent value="json" className="m-0">
          <Textarea
            value={
              typeof body.content === "string"
                ? body.content
                : JSON.stringify(body.content, null, 2)
            }
            onChange={(e) => onChange({ ...body, content: e.target.value })}
            className="font-mono"
            placeholder="Enter JSON body"
            rows={6}
          />
        </TabsContent>
        <TabsContent value="form-data" className="m-0">
          <KeyValueEditor
            pairs={Array.isArray(body.content) ? body.content : []}
            onChange={(pairs) => onChange({ ...body, content: pairs })}
            addButtonText="Add Form Field"
            showDescription={true}
          />
        </TabsContent>
        <TabsContent value="x-www-form-urlencoded" className="m-0">
          <KeyValueEditor
            pairs={Array.isArray(body.content) ? body.content : []}
            onChange={(pairs) => onChange({ ...body, content: pairs })}
            addButtonText="Add Parameter"
          />
        </TabsContent>
        <TabsContent value="raw" className="m-0">
          <Textarea
            value={typeof body.content === "string" ? body.content : ""}
            onChange={(e) => onChange({ ...body, content: e.target.value })}
            className="font-mono"
            placeholder="Enter raw body"
            rows={6}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}
