import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { KeyValueEditor } from "./key-value-editor";
import { AuthSection } from "./auth-section";
import { KeyValuePair, RequestBody } from "@/types";
import { SearchCode, List, FileJson, FormInput, Link, FileText, KeyRound, Search } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { Badge } from "@/components/ui/badge";

interface RequestPanelProps {
  headers: KeyValuePair[];
  params: KeyValuePair[];
  body: RequestBody;
  auth: {
    type: "none" | "bearer" | "basic" | "apiKey";
    token?: string;
    username?: string;
    password?: string;
    key?: string;
  };
  onHeadersChange: (headers: KeyValuePair[]) => void;
  onParamsChange: (params: KeyValuePair[]) => void;
  onBodyChange: (body: RequestBody) => void;
  onAuthChange: (auth: any) => void;
}

export function RequestPanel({
  headers,
  params,
  body,
  auth,
  onHeadersChange,
  onParamsChange,
  onBodyChange,
  onAuthChange,
}: RequestPanelProps) {
  const bodyTabs = ["json", "form-data", "x-www-form-urlencoded", "raw"];

  const getBodyIcon = (type: string) => {
    switch(type) {
      case 'json':
        return <FileJson className="h-4 w-4" />;
      case 'form-data':
        return <FormInput className="h-4 w-4" />;
      case 'x-www-form-urlencoded':
        return <Link className="h-4 w-4" />;
      case 'raw':
        return <FileText className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="params" className="flex-1 px-2 py-3 rounded-lg">
        <div className="rounded-lg border border-slate-200/30 bg-gradient-to-b from-white/60 via-slate-50/50 to-white/60 shadow-inner backdrop-blur-[8px]">
          <div className="overflow-x-auto -mx-1 px-1 jelly-scroll rounded-lg">
            <TabsList className="flex md:grid md:grid-cols-7 items-center rounded-lg bg-slate-50 px-1 text-gray-700 shadow-inner w-max md:w-full motion-safe:transform-gpu">
              <TabsTrigger
                value="params"
                className="flex-none md:flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 md:px-2 py-2 text-xs font-semibold transition-all hover:bg-gray-200 data-[state=active]:bg-slate-900 data-[state=active]:text-slate-400 data-[state=active]:shadow-sm min-w-[80px]"
              >
                <SearchCode className="h-4 w-4 text-emerald-500" />
                Query
              </TabsTrigger>
              <TabsTrigger
                value="headers"
                className="flex-none md:flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 md:px-2 py-2 text-xs font-semibold transition-all hover:bg-gray-200 data-[state=active]:bg-slate-900 data-[state=active]:text-slate-400 data-[state=active]:shadow-sm min-w-[80px]"
              >
                <List className="h-4 w-4 text-blue-500" />
                Headers
              </TabsTrigger>
              {bodyTabs.map((type) => (
                <TabsTrigger
                  key={type}
                  value={`body-${type}`}
                  className="flex-none md:flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 md:px-2 py-2 text-xs font-semibold transition-all hover:bg-gray-200 data-[state=active]:bg-slate-900 data-[state=active]:text-slate-400 data-[state=active]:shadow-sm min-w-[80px]"
                  onClick={() => onBodyChange({ type: type as RequestBody['type'], content: "" })}
                >
                  <span className={
                    type === 'json' ? 'text-yellow-500' :
                    type === 'form-data' ? 'text-purple-500' :
                    type === 'x-www-form-urlencoded' ? 'text-cyan-500' :
                    'text-gray-500'
                  }>
                    {getBodyIcon(type)}
                  </span>
                  {type === "form-data" ? "Form" : 
                   type === "x-www-form-urlencoded" ? "URL" :
                   type.charAt(0).toUpperCase() + type.slice(1)}
                </TabsTrigger>
              ))}
              <TabsTrigger
                value="auth"
                className="flex-none md:flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 md:px-2 py-2 text-xs font-semibold transition-all hover:bg-gray-200 data-[state=active]:bg-slate-900 data-[state=active]:text-slate-400 data-[state=active]:shadow-sm min-w-[80px]"
              >
                <KeyRound className="h-4 w-4 text-red-500" />
                Auth
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="py-4">
            <TabsContent value="params" className="m-0 min-h-0">
              <Card className="min-h-0 vercel-panel">
                <CardHeader className="py-2 px-4 border-b-2 border-slate-200/40 panel-content">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SearchCode className="h-4 w-4 text-emerald-500" />
                      <h3 className="text-sm font-medium text-slate-700">Query Parameters</h3>
                    </div>
                    <Badge variant="secondary" className="text-xs bg-slate-100">
                      {params.filter(p => p.enabled && p.key).length} Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-2 panel-content">
                  <KeyValueEditor
                    pairs={params}
                    onChange={onParamsChange}
                    addButtonText="Add Query Parameter"
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="headers" className="m-0 min-h-0">
              <Card className="min-h-0 vercel-panel">
                <CardHeader className="py-2 px-4 border-b-2 border-slate-200/40 panel-content">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <List className="h-4 w-4 text-blue-500" />
                      <h3 className="text-sm font-medium text-slate-700">Request Headers</h3>
                    </div>
                    <Badge variant="secondary" className="text-xs bg-slate-100">
                      {headers.filter(h => h.enabled && h.key).length} Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-2 panel-content">
                  <KeyValueEditor
                    pairs={headers}
                    onChange={onHeadersChange}
                    addButtonText="Add Header"
                    presetKeys={commonHeaders}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            {bodyTabs.map((type) => (
              <TabsContent key={type} value={`body-${type}`} className="m-0 min-h-0">
                <Card className="min-h-0 vercel-panel">
                  <CardHeader className="py-2 px-4 border-b-2 border-slate-200/40 panel-content">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={
                          type === 'json' ? 'text-yellow-500' :
                          type === 'form-data' ? 'text-purple-500' :
                          type === 'x-www-form-urlencoded' ? 'text-cyan-500' :
                          'text-gray-500'
                        }>
                          {getBodyIcon(type)}
                        </span>
                        <h3 className="text-sm font-medium text-slate-700">
                          {type === "form-data" ? "Form Data" :
                           type === "x-www-form-urlencoded" ? "URL Encoded" :
                           type.charAt(0).toUpperCase() + type.slice(1)} Body
                        </h3>
                      </div>
                      {(type === "form-data" || type === "x-www-form-urlencoded") && (
                        <Badge variant="secondary" className="text-xs bg-slate-100">
                          {(body.content as KeyValuePair[])?.filter?.(p => p.enabled && p.key)?.length || 0} Fields
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2 panel-content">
                    <RequestBodyContent 
                      type={type as RequestBody['type']}
                      body={body}
                      onChange={onBodyChange}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
            <TabsContent value="auth" className="m-0 min-h-0">
              <Card className="min-h-0 vercel-panel">
                <CardHeader className="py-2 px-4 border-b-2 border-slate-200/40 panel-content">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-red-500" />
                      <h3 className="text-sm font-medium text-slate-700">Authentication</h3>
                    </div>
                    <Badge variant="secondary" className="text-xs bg-slate-100">
                      {auth.type !== 'none' ? auth.type.toUpperCase() : 'NONE'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-2 panel-content">
                  <AuthSection auth={auth} onChange={onAuthChange} />
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

const commonHeaders = [
  "Accept",
  "Content-Type",
  "Authorization",
  "User-Agent",
  "Accept-Language",
  "Cache-Control"
];

function RequestBodyContent({ type, body, onChange }: { type: RequestBody['type'], body: RequestBody, onChange: (body: RequestBody) => void }) {
  const [params, setParams] = useState<KeyValuePair[]>([
    { key: "", value: "", type: "text", showSecrets: false }
  ]);

  function onParamsChange(pairs: KeyValuePair[]): void {
    setParams(pairs);
    onChange({ ...body, content: pairs });
  }

  if (type === "json" || type === "raw") {
    return (
      <Textarea
        value={
          typeof body.content === "string"
            ? body.content
            : JSON.stringify(body.content, null, 2)
        }
        onChange={(e) => onChange({ ...body, content: e.target.value })}
        className="min-h-[200px] rounded-lg text-sm shadow-sm bg-slate-50 border-2 border-slate-200 focus:border-slate-900 focus:ring-slate-900 font-mono"
        placeholder={`Enter ${type.toUpperCase()} body`}
      />
    );
  }

  return (
    <KeyValueEditor
      pairs={params.length === 0 ? [{ key: "", value: "", type: "text", showSecrets: false }] : params}
      onChange={onParamsChange}
      addButtonText={type === "form-data" ? "Add Form Field" : "Add Parameter"}
      showDescription={type === "form-data"}
    />
  );
}
