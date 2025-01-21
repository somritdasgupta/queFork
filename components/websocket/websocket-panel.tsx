import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useWebSocket } from "./websocket-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConnectionTab } from "./connection-tab";
import { MessagesTab } from "./messages-tab";
import { MessageSquare, Network } from "lucide-react";
import { WebSocketProvider } from "./websocket-context";

interface WebSocketPanelProps {
  url: string;
  onUrlChange: (url: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function WebSocketPanel({
  url,
  onUrlChange,
  isOpen,
  onClose,
}: WebSocketPanelProps) {
  const [tab, setTab] = useState("connection");
  const { isConnected } = useWebSocket();

  // Add effect to handle websocket history item selection
  useEffect(() => {
    const handleWebSocketOpen = (event: CustomEvent) => {
      const { url, protocols, selectedProtocol } = event.detail;
      
      // Force URL update
      onUrlChange(url);
      
      // Set appropriate protocol tab and trigger ConnectionTab update
      if (selectedProtocol) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("setWebSocketProtocol", {
            detail: { protocol: selectedProtocol, url }
          }));
        }, 100);
      }
    };

    window.addEventListener("openWebSocket", handleWebSocketOpen as EventListener);
    return () => {
      window.removeEventListener("openWebSocket", handleWebSocketOpen as EventListener);
    };
  }, [onUrlChange]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:top-[50%] top-[unset] bottom-0 sm:bottom-[unset] sm:translate-y-[-50%] translate-y-0 rounded-t-lg sm:rounded-lg sm:max-w-[1500px] h-[86vh] sm:h-[86vh] flex flex-col p-0 overflow-hidden gap-0 bg-slate-50 font-sans">
        <DialogHeader className="p-6 pb-2 shrink-0 bg-white border-b border-slate-200">
          <DialogTitle className="text-slate-700">WebSocket</DialogTitle>
          <DialogDescription className="text-slate-500">
            Monitor and test WebSocket connections with real-time analytics
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue="connection"
          value={tab}
          onValueChange={(value) => setTab(value)}
          className="flex-1 flex flex-col overflow-hidden h-full"
        >
          <TabsList className="sticky top-0 z-10 py-6 w-full bg-white border-b border-slate-200 rounded-none shrink-0 flex sm:justify-start justify-center">
            <div className="flex gap-2 relative px-6 w-full">
              <TabsTrigger
                value="connection"
                className="w-full rounded-md data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all hover:bg-slate-100 font-medium flex items-center gap-2 text-slate-600"
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />
                Connection
              </TabsTrigger>
              <TabsTrigger
                value="messages"
                className="w-full rounded-md data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all hover:bg-slate-100 font-medium flex items-center gap-2 text-slate-600"
              >
                <MessageSquare className="w-4 h-4" />
                Messages
              </TabsTrigger>
            </div>
          </TabsList>

          <div className="flex-1 overflow-y-auto h-full">
            <TabsContent value="connection" className="h-full mt-0 border-0">
              <ConnectionTab />
            </TabsContent>

            <TabsContent value="messages" className="h-full mt-0 border-0">
              <MessagesTab />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export function WebSocketPanelWrapper(props: WebSocketPanelProps) {
  return (
    <WebSocketProvider>
      <WebSocketPanel {...props} />
    </WebSocketProvider>
  );
}
