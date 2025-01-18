import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WebSocketState, WebSocketMessage } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  Send,
  Trash2,
  Upload,
  WifiOff,
  Activity,
  BarChart,
  Network,
  Gauge,
  Signal,
  Wifi,
  PlugZap2,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  LineChart,
} from "recharts";

interface WebSocketPanelProps {
  url: string;
  onUrlChange: (url: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface SavedMessage {
  name: string;
  content: string;
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

interface LatencyPoint {
  timestamp: number;
  value: number;
}

interface WebSocketHistoryItem {
  id: string;
  type: string;
  url: string;
  timestamp: string;
  protocols: string[];
  connectionDuration: number;
  messagesCount: {
    sent: number;
    received: number;
  };
  avgLatency: number | null;
  lastConnected: string;
}

export function WebSocketPanel({
  url,
  onUrlChange,
  isOpen,
  onClose,
}: WebSocketPanelProps) {
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    messages: [],
  });
  const [message, setMessage] = useState("");
  const [autoReconnect, setAutoReconnect] = useState(false);
  const [reconnectInterval, setReconnectInterval] = useState(5000);
  const [messageFormat, setMessageFormat] = useState<"text" | "json">("text");
  const [savedMessages, setSavedMessages] = useState<SavedMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");
  const [pingInterval, setPingInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastPingTime, setLastPingTime] = useState<number | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [stats, setStats] = useState<ConnectionStats>({
    latency: null,
    messagesSent: 0,
    messagesReceived: 0,
    lastActivity: "-",
    connectionDuration: 0,
    reconnectAttempts: 0,
    packetLoss: 0,
  });
  const [connectionStartTime, setConnectionStartTime] = useState<number | null>(
    null
  );
  const [protocols, setProtocols] = useState<string[]>([]);
  const [newProtocol, setNewProtocol] = useState("");
  const [latencyHistory, setLatencyHistory] = useState<LatencyPoint[]>([]);

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (ws.current) {
        ws.current.close();
      }
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      if (pingInterval) {
        clearInterval(pingInterval);
      }
    };
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [state.messages]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (state.isConnected && connectionStartTime) {
      timer = setInterval(() => {
        const duration = Math.floor((Date.now() - connectionStartTime) / 1000);
        setStats((prev) => ({
          ...prev,
          connectionDuration: duration,
        }));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [state.isConnected, connectionStartTime]);

  useEffect(() => {
    scrollToBottom();
  }, [state.messages]);

  // Add useEffect to handle incoming url changes
  useEffect(() => {
    if (url) {
      // Reset any existing connection
      if (ws.current) {
        ws.current.close();
      }
      // Update state as needed
      setConnectionStatus("disconnected");
      setStats((prev) => ({ ...prev, latency: null }));
      setLatencyHistory([]);
    }
  }, [url]);

  const startPingInterval = () => {
    if (pingInterval) clearInterval(pingInterval);
    const interval = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        const pingTimestamp = Date.now();
        setLastPingTime(pingTimestamp);
        try {
          ws.current.send(
            JSON.stringify({
              type: "ping",
              timestamp: pingTimestamp,
            })
          );

          // Set a timeout to handle case when no pong is received
          setTimeout(() => {
            if (lastPingTime === pingTimestamp) {
              setLatency(null);
              setStats((prev) => ({ ...prev, latency: null }));
            }
          }, 5000);
        } catch (error) {
          console.error("Failed to send ping:", error);
          setLatency(null);
          setStats((prev) => ({ ...prev, latency: null }));
        }
      }
    }, 1000);
    setPingInterval(interval);
  };

  const handleMessage = (event: MessageEvent) => {
    try {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        data = { type: "message", content: event.data };
      }

      if (data.type === "ping") {
        // Immediately respond to ping with pong
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(
            JSON.stringify({
              type: "pong",
              timestamp: data.timestamp,
            })
          );
        }
        return;
      }

      if (data.type === "pong") {
        const currentTime = Date.now();
        const currentLatency = Math.round(currentTime - data.timestamp);
        setLatency(currentLatency);

        const newLatencyPoint = {
          timestamp: currentTime,
          value: currentLatency,
        };

        setLatencyHistory((prev) => {
          const newHistory = [...prev, newLatencyPoint].slice(-60);
          return newHistory;
        });

        setStats((prev) => ({
          ...prev,
          latency: currentLatency,
          lastActivity: new Date().toISOString(),
        }));
        return;
      }
      if (data.type === "pong") {
        const currentTime = Date.now();
        const currentLatency = Math.round(currentTime - data.timestamp);
        setLatency(currentLatency);

        setLatencyHistory((prev) => {
          const newPoint = {
            timestamp: currentTime,
            value: currentLatency,
          };
          // Keep only the last 60 points (1 minute of data)
          const newHistory = [...prev, newPoint];
          if (newHistory.length > 60) {
            return newHistory.slice(-60);
          }
          return newHistory;
        });

        setStats((prev) => ({
          ...prev,
          latency: currentLatency,
          lastActivity: new Date().toISOString(),
        }));
        return;
      }
      const newMessage: WebSocketMessage = {
        type: "received",
        content: event.data,
        timestamp: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, newMessage],
      }));

      setStats((prev) => ({
        ...prev,
        messagesReceived: prev.messagesReceived + 1,
        lastActivity: new Date().toISOString(),
      }));
    } catch (error) {
      console.error("Failed to handle message:", error);
    }
  };

  const connect = () => {
    if (ws.current) {
      ws.current.close();
    }

    try {
      setConnectionStatus("connecting");
      ws.current = new WebSocket(url, protocols);
      ws.current.onmessage = handleMessage;

      ws.current.onopen = () => {
        setConnectionStartTime(Date.now());
        setState((prev) => ({ ...prev, isConnected: true }));
        setConnectionStatus("connected");
        startPingInterval();
        toast({
          title: "Connected",
          description: "WebSocket connection established successfully",
        });
      };

      ws.current.onclose = () => {
        setState((prev) => ({ ...prev, isConnected: false }));
        setConnectionStatus("disconnected");
        if (pingInterval) clearInterval(pingInterval);

        if (autoReconnect) {
          reconnectTimer.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.current.onerror = (error) => {
        setConnectionStatus("error");
        toast({
          title: "Connection Error",
          description: "Failed to establish WebSocket connection",
          variant: "destructive",
        });
      };
    } catch (error) {
      setConnectionStatus("error");
      toast({
        title: "Error",
        description: "Invalid WebSocket URL or connection failed",
        variant: "destructive",
      });
    }
  };

  const saveToHistory = () => {
    const historyItem: WebSocketHistoryItem = {
      id: crypto.randomUUID(),
      type: "websocket",
      url: url,
      timestamp: new Date().toISOString(),
      protocols: protocols,
      connectionDuration: stats.connectionDuration,
      messagesCount: {
        sent: stats.messagesSent,
        received: stats.messagesReceived,
      },
      avgLatency:
        latencyHistory.length > 0
          ? Math.round(
              latencyHistory.reduce((acc, curr) => acc + curr.value, 0) /
                latencyHistory.length
            )
          : null,
      lastConnected: stats.lastActivity,
    };

    // Get existing history
    const existingHistory = localStorage.getItem("apiHistory");
    const history = existingHistory ? JSON.parse(existingHistory) : [];

    // Add new item
    history.unshift(historyItem);

    // Save back to localStorage
    localStorage.setItem("apiHistory", JSON.stringify(history.slice(0, 100))); // Keep last 100 items
  };

  const disconnect = () => {
    if (ws.current) {
      saveToHistory(); // Save connection details when disconnecting
      ws.current.close();
    }
    setConnectionStartTime(null);
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
    }
    if (pingInterval) {
      clearInterval(pingInterval);
    }
  };

  const sendMessage = () => {
    if (ws.current?.readyState === WebSocket.OPEN && message.trim()) {
      try {
        let formattedMessage = message;
        if (messageFormat === "json") {
          formattedMessage = JSON.stringify(JSON.parse(message), null, 2);
        }

        ws.current.send(formattedMessage);
        const newMessage: WebSocketMessage = {
          type: "sent",
          content: formattedMessage,
          timestamp: new Date().toISOString(),
        };

        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, newMessage],
        }));

        setStats((prev) => ({
          ...prev,
          messagesSent: prev.messagesSent + 1,
          lastActivity: new Date().toISOString(),
        }));

        setMessage("");
        toast({
          title: "Message Sent",
          description: "WebSocket message sent successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description:
            messageFormat === "json"
              ? "Invalid JSON format"
              : "Failed to send message",
          variant: "destructive",
        });
      }
    }
  };

  const saveMessage = () => {
    if (message.trim()) {
      const newSavedMessage: SavedMessage = {
        name: `Message ${savedMessages.length + 1}`,
        content: message,
      };
      setSavedMessages([...savedMessages, newSavedMessage]);
      toast({
        title: "Message Saved",
        description: "Message template has been saved",
      });
    }
  };

  const clearMessages = () => {
    setState((prev) => ({ ...prev, messages: [] }));
  };

  const exportMessages = () => {
    const exportData = {
      messages: state.messages,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `websocket-messages-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied",
      description: "Message copied to clipboard",
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const addProtocol = () => {
    if (newProtocol && !protocols.includes(newProtocol)) {
      setProtocols([...protocols, newProtocol]);
      setNewProtocol("");
    }
  };

  const removeProtocol = (protocol: string) => {
    setProtocols(protocols.filter((p) => p !== protocol));
  };

  const StatsPanel = ({
    stats,
    latencyHistory,
  }: {
    stats: ConnectionStats;
    latencyHistory: LatencyPoint[];
  }) => (
    <div className="grid grid-cols-12 gap-4">
      {/* Connection Status Card */}
      <div className="col-span-12 lg:col-span-4">
        <div className="bg-card rounded-lg p-4 border">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Signal className="w-4 h-4" />
            Connection Status
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge
                variant={
                  connectionStatus === "connected" ? "default" : "destructive"
                }
                className="capitalize"
              >
                {connectionStatus}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Current Latency
              </span>
              <span className="font-mono text-sm">
                {stats.latency ? `${stats.latency}ms` : "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Uptime</span>
              <span className="font-mono text-sm">
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

      {/* Traffic Statistics Card */}
      <div className="col-span-12 lg:col-span-4">
        <div className="bg-card rounded-lg p-4 border">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Traffic Statistics
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Messages Sent
              </span>
              <span className="font-mono text-sm">{stats.messagesSent}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Messages Received
              </span>
              <span className="font-mono text-sm">
                {stats.messagesReceived}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Message Rate
              </span>
              <span className="font-mono text-sm">
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

      {/* Connection Health Card */}
      <div className="col-span-12 lg:col-span-4">
        <div className="bg-card rounded-lg p-4 border">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            Connection Health
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Reconnect Attempts
              </span>
              <span className="font-mono text-sm">
                {stats.reconnectAttempts}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Packet Loss</span>
              <span className="font-mono text-sm">{stats.packetLoss}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Last Activity
              </span>
              <span className="font-mono text-sm">
                {stats.lastActivity !== "-"
                  ? new Date(stats.lastActivity).toLocaleTimeString()
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Latency Chart */}
      <div className="col-span-12">
        <div className="bg-card rounded-lg p-4 border">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <BarChart className="w-4 h-4" />
            Latency History
          </h3>
          <div className="h-48 w-full">
            {" "}
            {/* Increased height */}
            <ResponsiveContainer
              width="100%"
              height="100%"
              className="bg-background"
            >
              {state.isConnected ? (
                <LineChart
                  data={latencyHistory}
                  margin={{ top: 15, right: 20, left: 10, bottom: 5 }}
                  key={state.isConnected ? "connected" : "disconnected"}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={true}
                    vertical={false}
                    stroke="rgba(255,255,255,0.1)"
                  />
                  <XAxis
                    dataKey="timestamp"
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    }
                    stroke="#888888"
                    height={20}
                    tick={{ fontSize: 10 }}
                    interval="preserveEnd"
                    minTickGap={30}
                    allowDataOverflow={true}
                  />
                  <YAxis
                    domain={[
                      (dataMin: number) => Math.max(0, dataMin * 0.9),
                      (dataMax: number) => dataMax * 1.1,
                    ]}
                    tickFormatter={(value) => `${value}ms`}
                    axisLine={false}
                    tickLine={false}
                    stroke="#888888"
                    width={40}
                    tick={{ fontSize: 10 }}
                    interval="preserveEnd"
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                      padding: "8px",
                    }}
                    labelFormatter={(timestamp) =>
                      new Date(Number(timestamp)).toLocaleTimeString()
                    }
                    formatter={(value) => [`${value}ms`, "Latency"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
                    connectNulls={true}
                  />
                </LineChart>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground gap-4">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 border-4 border-muted rounded-full animate-ping opacity-75"></div>
                    <div className="absolute inset-0 border-4 border-muted rounded-full animate-pulse"></div>
                    <PlugZap2 className="w-full h-full animate-pulse opacity-50" />
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm font-medium animate-pulse">
                      Waiting for Connection
                    </p>
                    <p className="text-xs text-muted-foreground opacity-75">
                      Connect to view real-time latency metrics
                    </p>
                  </div>
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  const ProtocolsPanel = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          value={newProtocol}
          onChange={(e) => setNewProtocol(e.target.value)}
          placeholder="Enter protocol (e.g., graphql-ws, mqtt)"
          className="flex-grow"
        />
        <Button onClick={addProtocol} disabled={!newProtocol.trim()}>
          Add Protocol
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {protocols.map((protocol) => (
          <div
            key={protocol}
            className="flex items-center justify-between p-3 bg-muted rounded-md border"
          >
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-sm">{protocol}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeProtocol(protocol)}
              className="h-8 w-8 p-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:top-[50%] top-[unset] bottom-0 sm:bottom-[unset] sm:translate-y-[-50%] translate-y-0 rounded-t-lg sm:rounded-lg sm:max-w-[1400px] h-[95vh] sm:h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <DialogTitle>WebSocket</DialogTitle>
          <DialogDescription>
            Monitor and test WebSocket connections with real-time analytics
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue="connection"
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="px-6 shrink-0">
            <TabsTrigger value="connection">Connection</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="protocols">Protocols</TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="flex-1 p-6 pt-2 h-full">
            <div className="flex flex-col h-full">
              <div className="flex gap-2 mb-4 shrink-0">
                <div className="relative flex-grow">
                  <Input
                    value={url}
                    onChange={(e) => onUrlChange(e.target.value)}
                    placeholder="WebSocket URL (ws:// or wss://)"
                    className="pr-24"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="auto-reconnect"
                        checked={autoReconnect}
                        onCheckedChange={setAutoReconnect}
                        className="data-[state=checked]:bg-green-500"
                      />
                      <Label htmlFor="auto-reconnect" className="text-xs">
                        Auto
                      </Label>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={state.isConnected ? disconnect : connect}
                  variant={state.isConnected ? "destructive" : "default"}
                  className="gap-2 w-32"
                >
                  {state.isConnected ? (
                    <>
                      <WifiOff className="w-4 h-4" /> Disconnect
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Connect
                    </>
                  )}
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="pb-6">
                  <StatsPanel stats={stats} latencyHistory={latencyHistory} />
                </div>
                <div className="h-4" />
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent
            value="messages"
            className="flex-1 flex flex-col p-6 pt-2 overflow-hidden"
          >
            <div className="flex-1 flex flex-col min-h-0">
              <div className="shrink-0 flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Label>Format:</Label>
                  <Select
                    value={messageFormat}
                    onValueChange={(value: "text" | "json") =>
                      setMessageFormat(value)
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Raw Text</SelectItem>
                      <SelectItem value="json">JSON (Validate)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={clearMessages}
                    variant="outline"
                    size="sm"
                    className="gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Clear
                  </Button>
                  <Button
                    onClick={exportMessages}
                    variant="outline"
                    size="sm"
                    className="gap-1"
                  >
                    <Download className="w-3 h-3" /> Export
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 border rounded-md min-h-0">
                <div className="p-4 space-y-2">
                  {state.messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg ${
                        msg.type === "sent"
                          ? "bg-blue-50 border-blue-100 ml-12"
                          : "bg-gray-50 border-gray-100 mr-12"
                      } border break-words relative group`}
                    >
                      <div className="text-xs text-gray-500 flex justify-between mb-1">
                        <span>
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="text-xs text-gray-400">
                          {msg.type === "sent" ? "Sent" : "Received"}
                        </span>
                      </div>
                      <pre className="text-sm whitespace-pre-wrap font-mono">
                        {msg.content}
                      </pre>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="shrink-0 flex gap-2 pt-4">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter message"
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  disabled={!state.isConnected}
                  className="flex-grow"
                />
                <Button
                  onClick={saveMessage}
                  variant="outline"
                  disabled={!message.trim()}
                  className="px-3"
                >
                  <Upload className="w-4 h-4" />
                </Button>
                <Button
                  onClick={sendMessage}
                  disabled={!state.isConnected}
                  className="px-6"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="protocols" className="p-6">
            <ProtocolsPanel />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
