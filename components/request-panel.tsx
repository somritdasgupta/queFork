import { useRef, useState, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useWebSocket } from "./websocket/websocket-context";
import { ConnectionTab } from "./request-panel/connection-tab";
import { QueryTab } from "./request-panel/query-tab";
import { HeadersTab } from "./request-panel/headers-tab";
import { BodyTab } from "./request-panel/body-tab";
import { AuthTab } from "./request-panel/auth-tab";
import { PreRequestTab } from "./request-panel/pre-request-tab";
import { TestsTab } from "./request-panel/tests-tab";
import { useTabPanel } from "@/hooks/use-tab-panel";
import { RequestPanelProps } from "@/types";
import { toast } from "sonner";
import { TbBeta } from "react-icons/tb";

const containerVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const switchVariants = {
  initial: { scale: 0.8, opacity: 0, y: 20 },
  animate: {
    scale: 1,
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: {
    scale: 0.8,
    opacity: 0,
    y: -20,
    transition: { duration: 0.2 },
  },
};

export function RequestPanel({
  headers,
  params,
  body,
  auth,
  isWebSocketMode,
  environments,
  currentEnvironment,
  onEnvironmentChange,
  onEnvironmentsUpdate,
  onAddToEnvironment,
  onHeadersChange,
  onParamsChange,
  onBodyChange,
  onAuthChange,
}: RequestPanelProps) {
  const { isConnected, stats } = useWebSocket();
  const showWebSocketContent =
    isWebSocketMode &&
    (isConnected || stats.messagesSent > 0 || stats.messagesReceived > 0);

  const navigableElements = useRef<HTMLElement[]>([]);
  const { tabs, setFocus } = useTabPanel({ isWebSocketMode });

  // Add state to control active tab
  const [activeTab, setActiveTab] = useState("params");

  // Handler for header source redirects
  const handleHeaderSourceRedirect = ({
    tab,
    type,
  }: {
    tab: string;
    type?: string;
  }) => {
    // Convert tab names to match the actual tab values
    const tabValue =
      tab === "auth" ? "auth" : tab === "body" ? "body" : "headers";

    // Update the active tab state
    setActiveTab(tabValue);
    // Handle auth type synchronization
    if (tab === "auth" && type) {
      // Preserve existing auth values while switching type
      const authValues = {
        bearer: { token: auth.token },
        basic: { username: auth.username, password: auth.password },
        apiKey: { key: auth.key, headerName: auth.headerName },
      };

      // Get the current values for the auth type
      const currentValues = authValues[type as keyof typeof authValues] || {};

      onAuthChange({
        ...auth, // Keep existing auth state
        ...currentValues, // Keep type-specific values
        type, // Set new type
      });
    }
    // Handle body type synchronization
    else if (tab === "body" && type) {
      const newContent = type.includes("form")
        ? Array.isArray(body.content)
          ? body.content
          : []
        : typeof body.content === "string"
          ? body.content
          : "";

      onBodyChange({
        ...body, // Keep existing body state
        type: type as any,
        content: newContent,
      });
    }

    // Show feedback with proper type info
    const tabLabel = tabs.find((t) => t.id === tabValue)?.label || tabValue;
    const typeLabel = type ? ` (${type})` : "";
    toast.success(`Switched to ${tabLabel}${typeLabel}`);
  };

  const handleRequestChange = useCallback(
    (newRequest: any) => {
      console.log("Request change triggered:", newRequest);

      if (newRequest) {
        // Handle headers update
        if (Array.isArray(newRequest.headers)) {
          console.log("Headers changed:", newRequest.headers);
          onHeadersChange([...newRequest.headers]);
        }

        // Handle params update
        if (Array.isArray(newRequest.params)) {
          console.log("Params changed:", newRequest.params);
          onParamsChange([...newRequest.params]);
        }

        // Handle body update
        if (newRequest.body) {
          console.log("Body changed:", newRequest.body);
          // Create a new object to ensure UI updates
          onBodyChange({ ...newRequest.body });
        }

        // Handle auth update
        if (newRequest.auth) {
          console.log("Auth changed:", newRequest.auth);
          // Create a new object to ensure UI updates
          onAuthChange({ ...newRequest.auth });
        }
      }
    },
    [onHeadersChange, onParamsChange, onBodyChange, onAuthChange]
  );

  return (
    <div className="h-full flex flex-col bg-slate-900 overflow-hidden">
      <AnimatePresence mode="wait">
        {!isWebSocketMode ? (
          <motion.div
            key="http-mode"
            variants={containerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 overflow-hidden flex flex-col"
          >
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              defaultValue="params"
              className="flex-1 flex flex-col h-full overflow-hidden"
            >
              {/* Tab Headers - Now sticky */}
              <div className="sticky top-0 z-10 bg-slate-950 border-b border-slate-700">
                <TabsList className="flex overflow-x-auto h-8 w-full justify-start bg-slate-900/70 rounded-none p-0">
                  {tabs.map(
                    (tab) =>
                      !tab.hidden && (
                        <TabsTrigger
                          key={tab.id}
                          value={tab.id}
                          ref={(el) => {
                            if (el) navigableElements.current.push(el);
                          }}
                          className={cn(
                            "flex-1 h-8 rounded-none border-b-4 border-transparent px-4 py-2",
                            "font-medium text-xs text-slate-400",
                            "data-[state=active]:border-blue-400",
                            "data-[state=active]:text-blue-400",
                            "data-[state=active]:bg-slate-800",
                            "hover:text-slate-300",
                            "hover:bg-slate-800",
                            "transition-colors",
                            tab.disabled && "opacity-50 cursor-not-allowed"
                          )}
                          disabled={tab.disabled}
                        >
                          <div className="flex items-center justify-center gap-2">
                            {tab.icon}
                            <span>{tab.label}</span>
                            {(tab.id === "pre-request" ||
                              tab.id === "tests") && (
                              <span className="inline-flex items-center justify-center px-1 text-[8px] font-medium bg-amber-500/10 text-amber-500 rounded">
                                beta
                              </span>
                            )}
                          </div>
                        </TabsTrigger>
                      )
                  )}
                </TabsList>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="h-full">
                    <TabsContent value="params" className="m-0 min-h-0 p-0">
                      <QueryTab
                        params={params}
                        onParamsChange={onParamsChange}
                        environments={environments}
                        currentEnvironment={currentEnvironment}
                        onEnvironmentChange={onEnvironmentChange}
                        onEnvironmentsUpdate={onEnvironmentsUpdate}
                        onAddToEnvironment={onAddToEnvironment}
                      />
                    </TabsContent>

                    <TabsContent value="headers" className="m-0 min-h-0 p-0">
                      <HeadersTab
                        headers={headers}
                        onHeadersChange={onHeadersChange}
                        environments={environments}
                        currentEnvironment={currentEnvironment}
                        onEnvironmentChange={onEnvironmentChange}
                        onEnvironmentsUpdate={onEnvironmentsUpdate}
                        onAddToEnvironment={onAddToEnvironment}
                        auth={auth}
                        body={body}
                        onSourceRedirect={handleHeaderSourceRedirect}
                      />
                    </TabsContent>

                    <TabsContent value="body" className="m-0 min-h-0 p-0">
                      <BodyTab
                        body={body}
                        onChange={onBodyChange}
                        headers={headers}
                        onHeadersChange={onHeadersChange}
                        environments={environments}
                        currentEnvironment={currentEnvironment}
                        onEnvironmentChange={onEnvironmentChange}
                        onEnvironmentsUpdate={onEnvironmentsUpdate}
                        onAddToEnvironment={onAddToEnvironment}
                      />
                    </TabsContent>

                    <TabsContent value="auth" className="m-0 min-h-0 p-0">
                      <AuthTab auth={auth} onAuthChange={onAuthChange} />
                    </TabsContent>

                    <TabsContent
                      value="pre-request"
                      className="m-0 min-h-0 p-0"
                    >
                      <PreRequestTab
                        script={
                          (window as any).__ACTIVE_REQUEST__
                            ?.preRequestScript || ""
                        }
                        logs={
                          (window as any).__ACTIVE_REQUEST__?.scriptLogs || []
                        }
                        onChange={(script) => {
                          if ((window as any).__ACTIVE_REQUEST__) {
                            (
                              window as any
                            ).__ACTIVE_REQUEST__.preRequestScript = script;
                          }
                        }}
                        request={{
                          headers,
                          params,
                          body,
                          auth,
                        }}
                        onRequestChange={handleRequestChange}
                      />
                    </TabsContent>

                    <TabsContent value="tests" className="m-0 min-h-0 p-0">
                      <TestsTab
                        script={
                          (window as any).__ACTIVE_REQUEST__?.testScript || ""
                        }
                        results={
                          (window as any).__ACTIVE_REQUEST__?.testResults || []
                        }
                        onChange={(script) => {
                          if ((window as any).__ACTIVE_REQUEST__) {
                            (window as any).__ACTIVE_REQUEST__.testScript =
                              script;
                          }
                        }}
                      />
                    </TabsContent>
                  </div>
                </ScrollArea>
              </div>
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
              <motion.div
                key="connected"
                variants={switchVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="h-full overflow-auto"
              >
                <ConnectionTab />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
