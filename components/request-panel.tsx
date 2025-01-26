import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { KeyValueEditor } from "./key-value-editor";
import { AuthSection } from "./auth-section";
import { KeyValuePair, RequestBody, Environment } from "@/types"; // Add Environment import
import {
  SearchCode,
  List,
  FileJson,
  FormInput,
  Link,
  FileText,
  KeyRound,
  Search,
  Network,
  MessageSquare,
  PlugZap2,
} from "lucide-react";
import { Textarea } from "./ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ConnectionTab } from "./websocket/connection-tab";
import { useWebSocket } from "./websocket/websocket-context";
import { AnimatePresence, motion } from "framer-motion";

const containerVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
};

const switchVariants = {
  initial: { scale: 0.8, opacity: 0, y: 20 },
  animate: { 
    scale: 1, 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" }
  },
  exit: { 
    scale: 0.8, 
    opacity: 0, 
    y: -20,
    transition: { duration: 0.2 }
  }
};

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
  isWebSocketMode: boolean;
  environments?: Environment[];
  currentEnvironment?: Environment | null;
  onEnvironmentChange?: (environmentId: string) => void;
  onEnvironmentsUpdate?: (environments: Environment[]) => void;
  onAddToEnvironment?: (key: string, value: string) => void;
}

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  hidden?: boolean;
}

export function RequestPanel({
  isWebSocketMode,
  environments,
  currentEnvironment,
  onEnvironmentChange,
  onEnvironmentsUpdate,
  onAddToEnvironment,
  ...props
}: RequestPanelProps) {
  const { isConnected, stats, messages } = useWebSocket();

  // Update visibility logic for WebSocket content
  const showWebSocketContent = isWebSocketMode && (
    isConnected || stats.messagesSent > 0 || stats.messagesReceived > 0
  );

  const bodyTabs = ["json", "form-data", "x-www-form-urlencoded", "raw"];

  const getBodyIcon = (type: string) => {
    switch (type) {
      case "json":
        return <FileJson className="h-4 w-4" />;
      case "form-data":
        return <FormInput className="h-4 w-4" />;
      case "x-www-form-urlencoded":
        return <Link className="h-4 w-4" />;
      case "raw":
        return <FileText className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const tabs: TabItem[] = [
    {
      id: "messages",
      label: "Messages",
      icon: <MessageSquare className="h-4 w-4" />,
      hidden: !isWebSocketMode,
    },
    {
      id: "params",
      label: "Query",
      icon: <SearchCode className="h-4 w-4 text-emerald-500" />,
      disabled: isWebSocketMode,
    },
    {
      id: "headers",
      label: "Headers",
      icon: <List className="h-4 w-4 text-blue-500" />,
      disabled: isWebSocketMode,
    },
    {
      id: "auth",
      label: "Auth",
      icon: <KeyRound className="h-4 w-4 text-red-500" />,
      disabled: isWebSocketMode,
    },
    ...bodyTabs.map((type) => ({
      id: `body-${type}`,
      label:
        type === "form-data"
          ? "Form"
          : type === "x-www-form-urlencoded"
          ? "URL"
          : type.charAt(0).toUpperCase() + type.slice(1),
      icon: getBodyIcon(type),
      disabled: isWebSocketMode,
    })),
  ];

  return (
    <div className="h-full flex flex-col rounded-lg">
      <AnimatePresence mode="wait">
        {!isWebSocketMode ? (
          <motion.div
            key="http-mode"
            variants={containerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1"
          >
            <Tabs defaultValue="params" className="flex-1 px-2 py-3 rounded-lg">
              <div className="rounded-lg border border-slate-200/30 bg-gradient-to-b from-white/60 via-slate-50/50 to-white/60 shadow-inner backdrop-blur-[8px]">
                <div className="overflow-x-auto -mx-1 px-1 jelly-scroll rounded-lg">
                  <TabsList className="flex gap-2 md:grid md:grid-cols-7 items-center rounded-lg bg-slate-50 px-1 text-gray-700 shadow-inner w-max md:w-full motion-safe:transform-gpu">
                    {tabs.map(
                      (tab) =>
                        !tab.hidden && (
                          <TabsTrigger
                            key={tab.id}
                            value={tab.id}
                            className="flex-none md:flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-3 md:px-2 py-2 text-xs font-semibold transition-all hover:bg-gray-200 data-[state=active]:bg-slate-900 data-[state=active]:text-slate-400 data-[state=active]:shadow-sm min-w-[80px]"
                            disabled={tab.disabled}
                          >
                            {tab.icon}
                            {tab.label}
                          </TabsTrigger>
                        )
                    )}
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
                            <h3 className="text-sm font-medium text-slate-700">
                              Query Parameters
                            </h3>
                          </div>
                          <Badge
                            variant="secondary"
                            className="text-xs bg-slate-100"
                          >
                            {
                              props.params.filter((p) => p.enabled && p.key)
                                .length
                            }{" "}
                            Active
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-2 panel-content">
                        <KeyValueEditor
                          pairs={props.params}
                          onChange={props.onParamsChange}
                          addButtonText="Add Query Parameter"
                          environments={environments}
                          currentEnvironment={currentEnvironment}
                          onEnvironmentChange={onEnvironmentChange}
                          onEnvironmentsUpdate={onEnvironmentsUpdate}
                          onAddToEnvironment={onAddToEnvironment}
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
                            <h3 className="text-sm font-medium text-slate-700">
                              Request Headers
                            </h3>
                          </div>
                          <Badge
                            variant="secondary"
                            className="text-xs bg-slate-100"
                          >
                            {
                              props.headers.filter((h) => h.enabled && h.key)
                                .length
                            }{" "}
                            Active
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-2 panel-content">
                        <KeyValueEditor
                          pairs={props.headers}
                          onChange={props.onHeadersChange}
                          addButtonText="Add Header"
                          presetKeys={commonHeaders}
                          environments={environments}
                          currentEnvironment={currentEnvironment}
                          onEnvironmentChange={onEnvironmentChange}
                          onEnvironmentsUpdate={onEnvironmentsUpdate}
                          onAddToEnvironment={onAddToEnvironment}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                  {bodyTabs.map((type) => (
                    <TabsContent
                      key={type}
                      value={`body-${type}`}
                      className="m-0 min-h-0"
                    >
                      <Card className="min-h-0 vercel-panel">
                        <CardHeader className="py-2 px-4 border-b-2 border-slate-200/40 panel-content">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={
                                  type === "json"
                                    ? "text-yellow-500"
                                    : type === "form-data"
                                    ? "text-purple-500"
                                    : type === "x-www-form-urlencoded"
                                    ? "text-cyan-500"
                                    : "text-gray-500"
                                }
                              >
                                {getBodyIcon(type)}
                              </span>
                              <h3 className="text-sm font-medium text-slate-700">
                                {type === "form-data"
                                  ? "Form Data"
                                  : type === "x-www-form-urlencoded"
                                  ? "URL Encoded"
                                  : type.charAt(0).toUpperCase() +
                                    type.slice(1)}{" "}
                                Body
                              </h3>
                            </div>
                            {(type === "form-data" ||
                              type === "x-www-form-urlencoded") && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-slate-100"
                              >
                                {(
                                  props.body.content as KeyValuePair[]
                                )?.filter?.((p) => p.enabled && p.key)
                                  ?.length || 0}{" "}
                                Fields
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2 panel-content">
                          <RequestBodyContent
                            type={type as RequestBody["type"]}
                            body={props.body}
                            onChange={props.onBodyChange}
                            environments={environments}
                            currentEnvironment={currentEnvironment}
                            onEnvironmentChange={onEnvironmentChange}
                            onEnvironmentsUpdate={onEnvironmentsUpdate}
                            onAddToEnvironment={onAddToEnvironment}
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
                            <h3 className="text-sm font-medium text-slate-700">
                              Authentication
                            </h3>
                          </div>
                          <Badge
                            variant="secondary"
                            className="text-xs bg-slate-100"
                          >
                            {props.auth.type !== "none"
                              ? props.auth.type.toUpperCase()
                              : "NONE"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-2 panel-content">
                        <AuthSection
                          auth={props.auth}
                          onChange={props.onAuthChange}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>
          </motion.div>
        ) : (
          <motion.div
            key="websocket-mode"
            variants={containerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 px-2 py-3"
          >
            <AnimatePresence mode="wait">
              {showWebSocketContent ? (
                <motion.div
                  key="connected"
                  variants={switchVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <ConnectionTab />
                </motion.div>
              ) : (
                <motion.div
                  key="empty-state"
                  variants={switchVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="h-full flex flex-col items-center justify-center text-center bg-gradient-to-b from-white/60 via-slate-50/50 to-white/60"
                >
                  <div className="space-y-6">
                        <div className="mx-auto flex justify-center items-center w-16 h-16 bg-gradient-to-b from-slate-100/80 via-white/60 to-slate-50/80 rounded-2xl shadow-inner border-2 border-slate-200/30 backdrop-blur-sm">
                          <PlugZap2 className="h-8 w-8 text-blue-500/80" />
                        </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-slate-800">
                        WebSocket Mode
                      </h3>
                      <p className="text-sm text-slate-500 max-w-sm">
                        Enter a WebSocket URL to establish a connection and
                        start sending and receiving messages in real-time.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="text-xs text-slate-400">
                        Connection details will appear here
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const commonHeaders = [
  "Accept",
  "Content-Type",
  "Authorization",
  "User-Agent",
  "Accept-Language",
  "Cache-Control",
];

function RequestBodyContent({
  type,
  body,
  onChange,
  environments,
  currentEnvironment,
  onEnvironmentChange,
  onEnvironmentsUpdate,
  onAddToEnvironment,
}: {
  type: RequestBody["type"];
  body: RequestBody;
  onChange: (body: RequestBody) => void;
  environments?: Environment[];
  currentEnvironment?: Environment | null;
  onEnvironmentChange?: (environmentId: string) => void;
  onEnvironmentsUpdate?: (environments: Environment[]) => void;
  onAddToEnvironment?: (key: string, value: string) => void;
}) {
  const [params, setParams] = useState<KeyValuePair[]>([
    { key: "", value: "", type: "text", showSecrets: false },
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
      pairs={
        params.length === 0
          ? [{ key: "", value: "", type: "text", showSecrets: false }]
          : params
      }
      onChange={onParamsChange}
      addButtonText={type === "form-data" ? "Add Form Field" : "Add Parameter"}
      showDescription={type === "form-data"}
      environments={environments}
      currentEnvironment={currentEnvironment}
      onEnvironmentChange={onEnvironmentChange}
      onEnvironmentsUpdate={onEnvironmentsUpdate}
      onAddToEnvironment={onAddToEnvironment}
    />
  );
}
