"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Signal, Activity, Unplug, PlugZap2, Network } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWebSocket } from "./websocket-context";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { LockClosedIcon, LockOpen1Icon } from "@radix-ui/react-icons";

interface StatsPanelProps {
  stats: {
    latency: number | null;
    messagesSent: number;
    messagesReceived: number;
    lastActivity: string;
    connectionDuration: number;
    reconnectAttempts: number;
    packetLoss: number;
  };
  latencyHistory: { timestamp: number; value: number }[];
  isConnected: boolean;
}

interface ConnectionStats {
  latency: number | null;
  messagesSent: number;
  messagesReceived: number;
  lastActivity: string;
  connectionDuration: number;
  reconnectAttempts: number;
  packetLoss: number;
}

interface WebSocketConnectionConfig {
  protocols?: string[];
  clientId?: string;
}

interface ProtocolConfig {
  name: string;
  color: string;
  defaultUrl?: string;
  description?: string;
  urlPattern: RegExp;
  placeholder: string;
}

// Update the AVAILABLE_PROTOCOLS with more specific patterns
const AVAILABLE_PROTOCOLS: Record<string, ProtocolConfig> = {
  websocket: {
    name: "WS",
    color: "red",
    description: "Standard WebSocket Protocol",
    urlPattern: /^wss?:\/\/(?!.*(?:socket\.io)).*$/i,
    placeholder: "ws://localhost:8080 or wss://example.com",
  },
  socketio: {
    name: "Socket.IO",
    color: "blue",
    description: "Socket.IO Protocol",
    urlPattern: /(?:socket\.io|socketio)/i,
    placeholder: "ws://localhost:3000/socket.io",
  },
};

export function ConnectionTab() {
  const {
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    url,
    onUrlChange,
    stats,
    connectionTime,
    currentLatency,
    sendMessage,
  } = useWebSocket();

  const [selectedProtocol, setSelectedProtocol] =
    useState<keyof typeof AVAILABLE_PROTOCOLS>("websocket");

  const handleProtocolSelect = (protocol: keyof typeof AVAILABLE_PROTOCOLS) => {
    setSelectedProtocol(protocol);
    const config = AVAILABLE_PROTOCOLS[protocol];
    if (config.defaultUrl) {
      onUrlChange(config.defaultUrl);
    }
  };

  const [autoReconnect, setAutoReconnect] = useState(false);

  // Auto reconnect effect
  useEffect(() => {
    let reconnectTimer: NodeJS.Timeout;
    if (autoReconnect && !isConnected && url) {
      reconnectTimer = setTimeout(() => connect(), 3000);
    }
    return () => clearTimeout(reconnectTimer);
  }, [autoReconnect, isConnected, url, connect]);

  const handleConnect = () => {
    if (isConnected) {
      disconnect();
    } else {
      const protocols =
        selectedProtocol !== "websocket" ? [selectedProtocol] : [];
      connect(protocols);
    }
  };

  // Add URL detection handler
  const [isProtocolChanging, setIsProtocolChanging] = useState(false);
  const [detectedProtocol, setDetectedProtocol] = useState<string | null>(null);

  // Add debounce function
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Update the protocol detection function
  const detectProtocol = (url: string): keyof typeof AVAILABLE_PROTOCOLS => {
    // Don't change protocol if no URL
    if (!url) return selectedProtocol;

    // Check each protocol's pattern against the URL
    for (const [protocol, config] of Object.entries(AVAILABLE_PROTOCOLS)) {
      if (config.urlPattern.test(url.toLowerCase())) {
        return protocol as keyof typeof AVAILABLE_PROTOCOLS;
      }
    }

    // Default to websocket if no specific protocol is detected
    return "websocket";
  };

  // Update handleUrlChange with immediate protocol detection
  const handleUrlChange = (newUrl: string) => {
    if (isConnected) return;

    onUrlChange(newUrl);

    // Detecting protocol immediately here
    const detectedProtocol = detectProtocol(newUrl);

    if (detectedProtocol !== selectedProtocol) {
      setDetectedProtocol(detectedProtocol);
      setIsProtocolChanging(true);
      setTimeout(() => {
        setSelectedProtocol(detectedProtocol);
        setIsProtocolChanging(false);
        setDetectedProtocol(null);
      }, 300);
    }
  };

  // Update paste handler with immediate protocol detection
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (isConnected) return;

    const pastedUrl = e.clipboardData.getData("text");
    const detectedProtocol = detectProtocol(pastedUrl);

    if (detectedProtocol !== selectedProtocol) {
      setSelectedProtocol(detectedProtocol);
    }
  };
  const getUrlPlaceholder = () => {
    return (
      AVAILABLE_PROTOCOLS[selectedProtocol]?.placeholder ||
      "Enter WebSocket URL"
    );
  };

  const renderProtocolButton = (key: string, protocol: ProtocolConfig) => (
    <motion.div
      key={key}
      layout
      initial={{ opacity: 1 }}
      animate={{
        opacity: isConnected ? 0.5 : 1,
        scale: selectedProtocol === key ? 1.05 : 1,
      }}
      transition={{ duration: 0.2 }}
    >
      <Button
        variant={selectedProtocol === key ? "default" : "outline"}
        size="sm"
        onClick={() =>
          !isConnected &&
          handleProtocolSelect(key as keyof typeof AVAILABLE_PROTOCOLS)
        }
        disabled={isConnected}
        className={cn(
          "rounded-lg text-xs py-1.5 px-3 h-8 min-w-0 relative",
          selectedProtocol === key
            ? "bg-slate-900 text-white hover:bg-slate-800"
            : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100",
          isConnected && "opacity-50 cursor-not-allowed"
        )}
      >
        <AnimatePresence>
          {detectedProtocol === key && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 bg-emerald-500/20 rounded-full"
            />
          )}
        </AnimatePresence>
        <div className="flex items-center gap-2">
          <div
            className={`w-1.5 h-1.5 rounded-full`}
            style={{ backgroundColor: protocol.color }}
          />
          {protocol.name}
        </div>
      </Button>
    </motion.div>
  );

  // Update the connection input render function
  const renderConnectionInput = () => (
    <div className="flex gap-2">
      <div className="flex-1 relative">
        <Input
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          onPaste={handlePaste}
          placeholder={getUrlPlaceholder()}
          disabled={isConnected}
          className={cn(
            "bg-white border-slate-200 text-slate-700 pr-24 h-9 text-sm",
            isConnected && "cursor-not-allowed opacity-90"
          )}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-xs">
            <AnimatePresence mode="wait">
              <motion.span
                key={selectedProtocol}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {AVAILABLE_PROTOCOLS[selectedProtocol].name}
              </motion.span>
            </AnimatePresence>
          </Badge>
          {isConnected ? (
            <LockClosedIcon className="w-4 h-4 text-slate-400" />
          ) : (
            <LockOpen1Icon className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>
      <Button
        onClick={handleConnect}
        variant={isConnected ? "destructive" : "default"}
        className={cn(
          "gap-2 px-4 h-9",
          isConnected
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-slate-900 hover:bg-slate-800 text-white"
        )}
        disabled={!url || connectionStatus === "connecting"}
      >
        {connectionStatus === "connecting" ? (
          <span className="animate-pulse">...</span>
        ) : isConnected ? (
          <>
            <Unplug className="h-4 w-4" />
          </>
        ) : (
          <>
            <PlugZap2 className="h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );

  // function to format latency display...
  const formatLatency = (latency: number | null) => {
    if (latency === null) return "N/A";
    if (latency < 1) return "<1ms";
    return `${Math.round(latency)}ms`;
  };
  const renderLatencyStats = () => (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-slate-600">Current Latency</span>
        <span
          className={cn(
            "font-medium",
            !isConnected
              ? "text-slate-400"
              : currentLatency === null
              ? "text-slate-400"
              : currentLatency > 200
              ? "text-red-600"
              : currentLatency > 100
              ? "text-amber-600"
              : "text-emerald-600"
          )}
        >
          {!isConnected
            ? "Not Connected"
            : currentLatency === null
            ? "Measuring..."
            : `${Math.round(currentLatency)}ms`}
        </span>
      </div>

      {isConnected && currentLatency !== null && (
        <>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Min/Max</span>
            <span className="font-medium">
              {stats.minLatency === Infinity
                ? "-"
                : `${Math.round(stats.minLatency)}ms`}{" "}
              /
              {stats.maxLatency === 0
                ? "-"
                : `${Math.round(stats.maxLatency)}ms`}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Average</span>
            <span className="font-medium">
              {stats.averageLatency === 0
                ? "-"
                : `${Math.round(stats.averageLatency)}ms`}
            </span>
          </div>
        </>
      )}
    </div>
  );

  const renderMessageStats = () => (
    <Card className="bg-white border-slate-200">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-medium text-slate-700">Statistics</h3>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-slate-700">
                {stats.messagesSent}
              </div>
              <div className="text-sm text-slate-500">Sent</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-slate-700">
                {stats.messagesReceived}
              </div>
              <div className="text-sm text-slate-500">Received</div>
            </div>
          </div>
          <div className="space-y-2">
            {renderLatencyStats()}
            <div className="flex justify-between">
              <span className="text-slate-600">Total Messages</span>
              <span className="font-mono text-slate-700">
                {stats.messagesSent + stats.messagesReceived}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Add effect to handle protocol selection from history
  useEffect(() => {
    const handleSetProtocol = (event: CustomEvent) => {
      const { protocol, url } = event.detail;
      setSelectedProtocol(protocol as keyof typeof AVAILABLE_PROTOCOLS);
      if (url) {
        handleUrlChange(url);
      }
    };

    window.addEventListener(
      "setWebSocketProtocol",
      handleSetProtocol as EventListener
    );
    return () => {
      window.removeEventListener(
        "setWebSocketProtocol",
        handleSetProtocol as EventListener
      );
    };
  }, []);

  return (
    <div className="h-full overflow-y-auto space-y-4 p-4 bg-white">
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="py-2 px-4 border-b border-slate-200/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-purple-500" />
              <h3 className="text-sm font-medium text-slate-700">WebSocket Connection</h3>
            </div>
            {isConnected && (
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-600 border-emerald-200">
                Connected
              </Badge>
            )}
          </div>
        </CardHeader>

        <div className="p-4 space-y-4">
          {/* Protocol Selection */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-slate-700">Protocol</div>
            <motion.div layout className="flex gap-1.5 flex-wrap">
              {Object.entries(AVAILABLE_PROTOCOLS).map(([key, protocol]) => (
                <motion.div key={key} layout>
                  <Button
                    variant={selectedProtocol === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => !isConnected && handleProtocolSelect(key as keyof typeof AVAILABLE_PROTOCOLS)}
                    disabled={isConnected}
                    className={cn(
                      "rounded-lg text-xs py-1.5 px-3 h-8 min-w-0 relative",
                      selectedProtocol === key
                        ? "bg-slate-900 text-white hover:bg-slate-800"
                        : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100",
                      isConnected && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: protocol.color }} />
                      {protocol.name}
                    </div>
                  </Button>
                </motion.div>
              ))}
            </motion.div>

            {/* Connection Input */}
            {renderConnectionInput()}
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Connection Status */}
            <Card className="bg-white border-slate-200">
              <CardHeader className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <Signal className="h-4 w-4 text-slate-500" />
                  <h3 className="text-sm font-medium text-slate-700">Status</h3>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Status</span>
                    <Badge variant={isConnected ? "outline" : "destructive"} className="text-xs">
                      {connectionStatus.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Uptime</span>
                    <span className="font-mono text-slate-700">
                      {(connectionTime ?? 0) > 0
                        ? `${Math.floor((connectionTime ?? 0) / 60)}m ${(connectionTime ?? 0) % 60}s`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-reconnect" className="text-sm text-slate-700">
                        Auto Reconnect
                      </Label>
                      <Switch
                        id="auto-reconnect"
                        checked={autoReconnect}
                        onCheckedChange={setAutoReconnect}
                        className="data-[state=checked]:bg-slate-900 data-[state=unchecked]:bg-slate-200"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Message Stats */}
            {renderMessageStats()}
          </div>
        </div>
      </Card>
    </div>
  );
}
