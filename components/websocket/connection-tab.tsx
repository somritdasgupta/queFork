"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  LineChart,
} from "recharts";
import {
  Signal,
  Activity,
  Gauge,
  BarChart,
  Unplug,
  PlugZap2,
  ArrowUpDown,
  Network,
  MessageSquare,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWebSocket } from "./websocket-context";
import { cn } from "@/lib/utils"; // Add this import

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

const StatsPanel = ({
  stats,
  latencyHistory,
  isConnected,
}: StatsPanelProps) => (
  <div className="grid grid-cols-12 gap-4">
    {/* Connection Status */}
    <div className="col-span-12 lg:col-span-4">
      <div className="bg-card rounded-lg p-4 border">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <Signal className="w-4 h-4" /> Connection Status
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Status</span>
            <span>{isConnected ? "Connected" : "Disconnected"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Current Latency</span>
            <span>{stats?.latency ? `${stats.latency}ms` : "N/A"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Uptime</span>
            <span>
              {stats.connectionDuration > 0
                ? `${Math.floor(stats.connectionDuration / 60)}m ${
                    stats.connectionDuration % 60
                  }s`
                : "N/A"}
            </span>
          </div>
        </div>
      </div>
    </div>

    {/* Traffic Statistics */}
    <div className="col-span-12 lg:col-span-4">
      <div className="bg-card rounded-lg p-4 border">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Traffic Statistics
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Messages Sent</span>
            <span>{stats.messagesSent}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Messages Received</span>
            <span>{stats.messagesReceived}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Message Rate</span>
            <span>
              {Math.round(
                ((stats.messagesSent + stats.messagesReceived) /
                  (stats.connectionDuration || 1)) *
                  60
              )}{" "}
              msg/min
            </span>
          </div>
        </div>
      </div>
    </div>

    {/* Connection Health */}
    <div className="col-span-12 lg:col-span-4">
      <div className="bg-card rounded-lg p-4 border">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <Gauge className="w-4 h-4" /> Connection Health
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Reconnect Attempts</span>
            <span>{stats.reconnectAttempts}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Packet Loss</span>
            <span>{stats.packetLoss}%</span>
          </div>
        </div>
      </div>
    </div>

    {/* Latency History */}
    <div className="col-span-12">
      <div className="bg-card rounded-lg p-4 border">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <BarChart className="w-4 h-4" /> Latency History
        </h3>
        <div className="h-[36vh] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {isConnected ? (
              <LineChart
                data={latencyHistory}
                margin={{ top: 15, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal
                  vertical={false}
                />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  }
                />
                <YAxis
                  domain={[0, "auto"]}
                  tickFormatter={(value) => `${value}ms`}
                />
                <Tooltip
                  labelFormatter={(value) =>
                    new Date(value).toLocaleTimeString()
                  }
                />
                <Line type="monotone" dataKey="value" stroke="#8884d8" />
              </LineChart>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <span>Connect to view latency history</span>
              </div>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  </div>
);

interface ConnectionStats {
  latency: number | null;
  messagesSent: number;
  messagesReceived: number;
  lastActivity: string;
  connectionDuration: number;
  reconnectAttempts: number;
  packetLoss: number;
}

interface ProtocolConfig {
  name: string;
  color: string;
  defaultUrl?: string;
  description?: string;
  urlPattern: RegExp;
  placeholder: string;
}

const AVAILABLE_PROTOCOLS: Record<string, ProtocolConfig> = {
  websocket: {
    name: "WebSocket",
    color: "blue",
    description: "Standard WebSocket Protocol",
    urlPattern: /^wss?:\/\/.*/,
    placeholder: "ws://localhost:8080 or wss://example.com",
  },
  mqtt: {
    name: "MQTT",
    color: "green",
    description: "Message Queue Telemetry Transport",
    urlPattern: /.*(mqtt|mosquitto).*/i,
    placeholder: "ws://broker.mqtt.com:8080 or wss://test.mosquitto.org:8081",
  },
  "graphql-ws": {
    name: "GraphQL",
    color: "purple",
    description: "GraphQL over WebSocket",
    urlPattern: /.*(graphql|gql|hasura).*/i,
    placeholder: "wss://your-graphql-endpoint/graphql",
  },
  socketio: {
    name: "Socket.IO",
    color: "yellow",
    description: "Socket.IO Protocol",
    urlPattern: /.*(socket\.io|io).*/i,
    placeholder: "ws://localhost:3000/socket.io or wss://socket.example.com",
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
    latencyHistory,
    connectionTime,
    currentLatency,
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
      connect(
        selectedProtocol !== "websocket" ? [selectedProtocol] : undefined
      );
    }
  };

  // Add URL detection handler
  const handleUrlChange = (newUrl: string) => {
    onUrlChange(newUrl);

    // Auto-detect protocol from URL
    if (newUrl) {
      for (const [protocol, config] of Object.entries(AVAILABLE_PROTOCOLS)) {
        if (config.urlPattern.test(newUrl)) {
          setSelectedProtocol(protocol as keyof typeof AVAILABLE_PROTOCOLS);
          break;
        }
      }
    }
  };

  // Get current placeholder text
  const getUrlPlaceholder = () => {
    return (
      AVAILABLE_PROTOCOLS[selectedProtocol]?.placeholder ||
      "Enter WebSocket URL"
    );
  };

  return (
    <div className="h-full overflow-y-auto space-y-4 p-4 pb-20 bg-slate-950">
      {/* Connection Controls */}
      <div className="sticky top-0 z-10 bg-slate-950 pb-2">
        <Card className="p-4 bg-slate-900 border-slate-800">
          <div className="space-y-4">
            {/* Protocol Selection */}
            <div className="flex gap-1 md:gap-1.5 flex-wrap">
              {Object.entries(AVAILABLE_PROTOCOLS).map(([key, protocol]) => (
                <Button
                  key={key}
                  variant={selectedProtocol === key ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    handleProtocolSelect(
                      key as keyof typeof AVAILABLE_PROTOCOLS
                    )
                  }
                  className={cn(
                    "rounded-full text-[10px] md:text-sm py-0.5 md:py-2 px-1.5 md:px-3 h-6 md:h-auto min-w-0 bg-slate-900 text-slate-200 flex items-center gap-1.5",
                    selectedProtocol === key
                      ? "bg-slate-800 text-slate-200"
                      : "border-slate-700 text-slate-200 hover:bg-slate-800/80"
                  )}
                >
                  <div
                    className={`w-2 h-2 rounded-full`}
                    style={{ backgroundColor: protocol.color }}
                  />
                  {protocol.name}
                </Button>
              ))}
            </div>

            {/* Connection Input */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder={getUrlPlaceholder()}
                  className="bg-slate-950 border-slate-800 text-slate-200 pr-24"
                />
                <Badge
                  variant="secondary"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-800 text-slate-400"
                >
                  {AVAILABLE_PROTOCOLS[selectedProtocol].name}
                </Badge>
              </div>
              <Button
                onClick={handleConnect}
                variant={isConnected ? "destructive" : "default"}
                className={cn(
                  "gap-2",
                  isConnected
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200"
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

            {/* Optional: Add Protocol Description */}
            {url && (
              <div className="text-xs text-slate-400">
                {AVAILABLE_PROTOCOLS[selectedProtocol].description}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Main Stats Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Connection Status */}
        <Card className="p-6 bg-slate-900 border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium flex items-center gap-2 text-slate-200">
              <Signal className="h-4 w-4" /> Connection Status
            </h3>
            <Badge variant={isConnected ? "default" : "destructive"}>
              {connectionStatus.toUpperCase()}
            </Badge>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-slate-400">Uptime</span>
              <span className="font-mono text-slate-200">
                {(connectionTime ?? 0) > 0
                  ? `${Math.floor((connectionTime ?? 0) / 60)}m ${
                      (connectionTime ?? 0) % 60
                    }s`
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Reconnections</span>
              <span className="font-mono text-slate-200">
                {stats.reconnectAttempts}
              </span>
            </div>
            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-reconnect" className="text-slate-200">
                  Auto Reconnect
                </Label>
                <Switch
                  id="auto-reconnect"
                  checked={autoReconnect}
                  onCheckedChange={setAutoReconnect}
                  className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-700"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Message Statistics */}
        <Card className="p-6 bg-slate-900 border-slate-800">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2 text-slate-200">
            <Activity className="h-4 w-4" /> Message Statistics
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-accent/50 p-3 rounded-lg bg-slate-800">
                <div className="text-2xl font-bold text-slate-200">
                  {stats.messagesSent}
                </div>
                <div className="text-xs text-slate-400">Sent</div>
              </div>
              <div className="bg-accent/50 p-3 rounded-lg bg-slate-800">
                <div className="text-2xl font-bold text-slate-200">
                  {stats.messagesReceived}
                </div>
                <div className="text-xs text-slate-400">Received</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Messages</span>
                <span className="font-mono text-slate-200">
                  {stats.messagesSent + stats.messagesReceived}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Latency</span>
                <span className="font-mono text-slate-200">
                  {currentLatency ? `${currentLatency}ms` : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Add Latency Monitor */}
        {isConnected && (
          <Card className="md:col-span-2 p-6 bg-slate-900 border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium flex items-center gap-2 text-slate-200">
                <Activity className="h-4 w-4" /> Real-time Latency
              </h3>
              <span className="text-sm font-mono text-slate-200">
                {currentLatency ? `${currentLatency}ms` : "N/A"}
              </span>
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={latencyHistory}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    opacity={0.2}
                    stroke="rgb(51 65 85)"
                  />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) =>
                      new Date(value).toLocaleTimeString()
                    }
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={(value) => `${value}ms`}
                    domain={[
                      0,
                      (dataMax: number) => Math.max(50, dataMax * 1.2),
                    ]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid rgb(51 65 85)",
                      color: "#e2e8f0",
                    }}
                    labelFormatter={(value) =>
                      new Date(value).toLocaleTimeString()
                    }
                    formatter={(value: number) => [`${value}ms`, "Latency"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {/* Latency Chart - Only show when connected and has data */}
      {isConnected && latencyHistory.length > 0 && (
        <Card className="p-6 bg-slate-900 border-slate-800">
          <div>
            <h3 className="text-sm font-medium mb-4 text-slate-200">
              Connection Latency
            </h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={latencyHistory}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    opacity={0.2}
                    stroke="rgb(51 65 85)"
                  />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) =>
                      new Date(value).toLocaleTimeString()
                    }
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={(value) => `${value}ms`}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}ms`, "Latency"]}
                    labelFormatter={(label) =>
                      new Date(label).toLocaleTimeString()
                    }
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid rgb(51 65 85)",
                      color: "#e2e8f0",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
