"use client";

import React, { useState } from "react";
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
import { MessageSquare } from "lucide-react";
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:top-[50%] top-[unset] bottom-0 sm:bottom-[unset] sm:translate-y-[-50%] translate-y-0 rounded-t-lg sm:rounded-lg sm:max-w-[1500px] h-[95vh] sm:h-[90vh] flex flex-col p-0 overflow-hidden gap-0"
      >
        <DialogHeader className="p-6 pb-2 shrink-0">
          <DialogTitle>WebSocket</DialogTitle>
          <DialogDescription>
            Monitor and test WebSocket connections with real-time analytics
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue="connection"
          value={tab}
          onValueChange={(value) => setTab(value)}
          className="flex-1 flex flex-col overflow-hidden h-full"
        >
          <TabsList className="sticky top-0 z-10 py-6 w-full bg-blue-100 rounded-none shrink-0 flex sm:justify-start justify-center">
            <div className="flex gap-2 relative px-6 w-full">
              <TabsTrigger
                value="connection"
                className="w-full rounded-md data-[state=active]:bg-slate-900 data-[state=active]:text-slate-100 data-[state=active]:shadow-sm transition-all hover:bg-muted/60 font-medium flex items-center gap-2"
              >
                <div
                  className={`w-3 h-2 rounded-full ${
                    isConnected
                      ? "bg-blue-500 animate-pulse"
                      : "bg-red-500"
                  }`}
                />
                Connection
              </TabsTrigger>
              <TabsTrigger
                value="messages"
                className="w-full rounded-md data-[state=active]:bg-slate-900 data-[state=active]:text-slate-100 data-[state=active]:shadow-sm transition-all hover:bg-muted/60 font-medium flex items-center gap-2"
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
