import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import type { WebSocketMessage } from "@/types/api";
import { io, Socket } from "socket.io-client";
import {
  Send,
  Trash2,
  Plus,
  X,
  Copy,
  Download,
  Filter,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

export interface RealtimePanelHandle {
  connect: () => void;
  disconnect: () => void;
  connected: boolean;
}

interface Props {
  url: string;
}

type RealtimeMode = "websocket" | "socketio";
type MessageFormat = "text" | "json" | "binary";

interface UnifiedMessage {
  id: string;
  direction: "sent" | "received";
  event?: string; // Socket.IO event name
  data: string;
  timestamp: number;
  size: number;
  format: MessageFormat;
}

export const RealtimePanel = forwardRef<RealtimePanelHandle, Props>(
  ({ url }, ref) => {
    const [mode, setMode] = useState<RealtimeMode>("websocket");
    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState<UnifiedMessage[]>([]);
    const [input, setInput] = useState("");
    const [filter, setFilter] = useState("");
    const [showFilter, setShowFilter] = useState(false);
    const [autoScroll, setAutoScroll] = useState(true);
    const [selectedMsg, setSelectedMsg] = useState<UnifiedMessage | null>(null);

    // WebSocket-specific
    const [protocols, setProtocols] = useState("");
    const wsRef = useRef<WebSocket | null>(null);

    // Socket.IO-specific
    const [emitEvent, setEmitEvent] = useState("message");
    const [listeners, setListeners] = useState<string[]>(["message"]);
    const [newListener, setNewListener] = useState("");
    const [ioTransport, setIoTransport] = useState<"polling" | "websocket">(
      "websocket",
    );
    const [ioPath, setIoPath] = useState("/socket.io");
    const [ioNamespace, setIoNamespace] = useState("/");
    const [ioVersion, setIoVersion] = useState<"3" | "4">("4");
    const socketRef = useRef<Socket | null>(null);

    const [activeTab, setActiveTab] = useState<"messages" | "config">(
      "messages",
    );
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const connectionTimeRef = useRef<number | null>(null);

    useEffect(() => {
      if (autoScroll)
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, autoScroll]);

    const addMessage = useCallback(
      (msg: Omit<UnifiedMessage, "id" | "timestamp" | "size">) => {
        const dataStr =
          typeof msg.data === "string" ? msg.data : JSON.stringify(msg.data);
        setMessages((prev) => [
          ...prev,
          {
            ...msg,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            size: new Blob([dataStr]).size,
            data: dataStr,
          },
        ]);
      },
      [],
    );

    const detectFormat = (data: string): MessageFormat => {
      try {
        JSON.parse(data);
        return "json";
      } catch {
        return "text";
      }
    };

    // ── WebSocket ──────────────────────────────────────────────
    const wsConnect = useCallback(() => {
      let wsUrl = url;
      if (!/^wss?:\/\//i.test(wsUrl)) {
        wsUrl = wsUrl.replace(/^https?:\/\//i, "");
        wsUrl = "wss://" + wsUrl;
      }
      try {
        const protoList = protocols
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);
        const ws = protoList.length
          ? new WebSocket(wsUrl, protoList)
          : new WebSocket(wsUrl);
        ws.binaryType = "arraybuffer";
        ws.onopen = () => {
          setConnected(true);
          connectionTimeRef.current = Date.now();
          addMessage({
            direction: "received",
            data: `Connected to ${wsUrl}`,
            format: "text",
          });
        };
        ws.onclose = (e) => {
          setConnected(false);
          addMessage({
            direction: "received",
            data: `Disconnected (code: ${e.code}, reason: ${e.reason || "none"})`,
            format: "text",
          });
          connectionTimeRef.current = null;
        };
        ws.onmessage = (e) => {
          const isBinary = e.data instanceof ArrayBuffer;
          const data = isBinary
            ? `[Binary: ${e.data.byteLength} bytes]`
            : e.data;
          addMessage({
            direction: "received",
            data,
            format: isBinary ? "text" : detectFormat(data),
          });
        };
        ws.onerror = () => {
          addMessage({
            direction: "received",
            data: "Connection error",
            format: "text",
          });
        };
        wsRef.current = ws;
      } catch (err: any) {
        toast.error(`WebSocket error: ${err.message}`);
      }
    }, [url, protocols, addMessage]);

    const wsDisconnect = useCallback(() => {
      wsRef.current?.close(1000, "Client disconnect");
      wsRef.current = null;
    }, []);

    const wsSend = useCallback(() => {
      if (
        !input.trim() ||
        !wsRef.current ||
        wsRef.current.readyState !== WebSocket.OPEN
      )
        return;
      wsRef.current.send(input);
      addMessage({
        direction: "sent",
        data: input,
        format: detectFormat(input),
      });
      setInput("");
    }, [input, addMessage]);

    // ── Socket.IO ──────────────────────────────────────────────
    const ioConnect = useCallback(() => {
      let ioUrl = url;
      if (/^wss?:\/\//i.test(ioUrl)) {
        ioUrl = ioUrl
          .replace(/^wss:\/\//i, "https://")
          .replace(/^ws:\/\//i, "http://");
      }
      if (!/^https?:\/\//i.test(ioUrl)) {
        ioUrl = "https://" + ioUrl;
      }
      try {
        const ns = ioNamespace.trim() || "/";
        const connectUrl = ns === "/" ? ioUrl : ioUrl.replace(/\/$/, "") + ns;
        const socket = io(connectUrl, {
          transports: [ioTransport === "polling" ? "polling" : "websocket"],
          path: ioPath,
          reconnection: true,
          reconnectionAttempts: 3,
          timeout: 10000,
          ...(ioVersion === "3" ? { allowEIO3: true } : {}),
        });

        socket.on("connect", () => {
          setConnected(true);
          connectionTimeRef.current = Date.now();
          addMessage({
            direction: "received",
            event: "connect",
            data: `Connected (id: ${socket.id})`,
            format: "text",
          });
        });

        socket.on("disconnect", (reason) => {
          setConnected(false);
          connectionTimeRef.current = null;
          addMessage({
            direction: "received",
            event: "disconnect",
            data: `Disconnected: ${reason}`,
            format: "text",
          });
        });

        socket.on("connect_error", (err) => {
          addMessage({
            direction: "received",
            event: "error",
            data: `Connection error: ${err.message}`,
            format: "text",
          });
        });

        // Subscribe to all current listeners
        listeners.forEach((eventName) => {
          socket.on(eventName, (data: any) => {
            const dataStr =
              typeof data === "string" ? data : JSON.stringify(data, null, 2);
            addMessage({
              direction: "received",
              event: eventName,
              data: dataStr,
              format: detectFormat(dataStr),
            });
          });
        });

        socketRef.current = socket;
      } catch (err: any) {
        toast.error(`Socket.IO error: ${err.message}`);
      }
    }, [url, ioTransport, ioPath, ioNamespace, listeners, addMessage]);

    const ioDisconnect = useCallback(() => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    }, []);

    const ioEmit = useCallback(() => {
      if (!emitEvent.trim() || !socketRef.current?.connected) return;
      let parsedData: any = input;
      try {
        parsedData = JSON.parse(input);
      } catch {
        parsedData = input;
      }
      socketRef.current.emit(emitEvent, parsedData, (ack: any) => {
        const ackStr = typeof ack === "string" ? ack : JSON.stringify(ack);
        addMessage({
          direction: "received",
          event: `${emitEvent}:ack`,
          data: ackStr ?? "(empty ack)",
          format: detectFormat(ackStr ?? ""),
        });
      });
      addMessage({
        direction: "sent",
        event: emitEvent,
        data: input || "(no data)",
        format: detectFormat(input),
      });
      setInput("");
    }, [emitEvent, input, addMessage]);

    // Add/remove listeners dynamically
    const addListener = useCallback(() => {
      if (!newListener.trim() || listeners.includes(newListener.trim())) return;
      const eventName = newListener.trim();
      setListeners((prev) => [...prev, eventName]);
      // If already connected, subscribe live
      if (socketRef.current?.connected) {
        socketRef.current.on(eventName, (data: any) => {
          const dataStr =
            typeof data === "string" ? data : JSON.stringify(data, null, 2);
          addMessage({
            direction: "received",
            event: eventName,
            data: dataStr,
            format: detectFormat(dataStr),
          });
        });
      }
      setNewListener("");
    }, [newListener, listeners, addMessage]);

    const removeListener = useCallback((name: string) => {
      setListeners((prev) => prev.filter((x) => x !== name));
      socketRef.current?.off(name);
    }, []);

    // ── Unified connect/disconnect ─────────────────────────────
    const connect = useCallback(() => {
      if (mode === "websocket") wsConnect();
      else ioConnect();
    }, [mode, wsConnect, ioConnect]);

    const disconnect = useCallback(() => {
      if (mode === "websocket") wsDisconnect();
      else ioDisconnect();
    }, [mode, wsDisconnect, ioDisconnect]);

    useImperativeHandle(ref, () => ({ connect, disconnect, connected }), [
      connect,
      disconnect,
      connected,
    ]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        wsRef.current?.close();
        socketRef.current?.disconnect();
      };
    }, []);

    const handleSend = () => {
      if (mode === "websocket") wsSend();
      else ioEmit();
    };

    const clearMessages = () => setMessages([]);

    const exportMessages = () => {
      const data = JSON.stringify(messages, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `realtime-${mode}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported messages");
    };

    const copyMessage = (msg: UnifiedMessage) => {
      navigator.clipboard.writeText(msg.data);
      toast.success("Copied");
    };

    const filteredMessages = filter
      ? messages.filter(
          (m) =>
            m.data.toLowerCase().includes(filter.toLowerCase()) ||
            m.event?.toLowerCase().includes(filter.toLowerCase()),
        )
      : messages;

    const totalSent = messages.filter((m) => m.direction === "sent").length;
    const totalRecv = messages.filter((m) => m.direction === "received").length;
    const totalSize = messages.reduce((s, m) => s + m.size, 0);

    const formatSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      return `${(bytes / 1024).toFixed(1)} KB`;
    };

    const connectionDuration = connectionTimeRef.current
      ? Math.floor((Date.now() - connectionTimeRef.current) / 1000)
      : 0;

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center border-b border-border shrink-0">
          {/* Mode toggle */}
          <div className="flex items-center border-r border-border shrink-0">
            <button
              onClick={() => {
                if (!connected) setMode("websocket");
              }}
              className={`px-2.5 py-1.5 text-[10px] font-bold transition-colors ${mode === "websocket" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"} ${connected ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              WS
            </button>
            <button
              onClick={() => {
                if (!connected) setMode("socketio");
              }}
              className={`px-2.5 py-1.5 text-[10px] font-bold transition-colors ${mode === "socketio" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"} ${connected ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              IO
            </button>
          </div>

          {/* Tabs */}
          <button
            onClick={() => setActiveTab("messages")}
            className={`px-3 py-1.5 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "messages" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Messages
            {messages.length > 0 && (
              <span className="ml-1 text-[9px] text-muted-foreground/40">
                {messages.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("config")}
            className={`px-3 py-1.5 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "config" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Config
          </button>

          {/* Status */}
          {connected && (
            <span className="flex items-center gap-1 ml-1 text-[9px] text-status-success font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
              {mode === "websocket" ? "WS" : "IO"}
            </span>
          )}

          <div className="flex-1" />

          {/* Actions */}
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`p-1.5 transition-colors ${showFilter ? "text-primary" : "text-muted-foreground/40 hover:text-foreground"}`}
            title="Filter"
            aria-label="Toggle message filter"
          >
            <Filter className="h-3 w-3" />
          </button>
          {messages.length > 0 && (
            <>
              <button
                onClick={exportMessages}
                className="p-1.5 text-muted-foreground/40 hover:text-foreground transition-colors"
                title="Export"
                aria-label="Export messages"
              >
                <Download className="h-3 w-3" />
              </button>
              <button
                onClick={clearMessages}
                className="p-1.5 text-muted-foreground/40 hover:text-destructive transition-colors"
                title="Clear"
                aria-label="Clear messages"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}
        </div>

        {/* Stats bar */}
        {messages.length > 0 && (
          <div className="flex items-center gap-3 px-3 py-0.5 border-b border-border bg-surface-sunken text-[9px] font-bold text-muted-foreground/40 shrink-0">
            <span>↑ {totalSent}</span>
            <span>↓ {totalRecv}</span>
            <span>{formatSize(totalSize)}</span>
            {connected && connectionDuration > 0 && (
              <span>
                <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                {connectionDuration}s
              </span>
            )}
          </div>
        )}

        {/* Filter bar */}
        {showFilter && (
          <div className="flex items-center border-b border-border bg-surface-sunken px-3 h-[28px] shrink-0">
            <Filter className="h-2.5 w-2.5 text-muted-foreground/40 mr-2 shrink-0" />
            <input
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter messages"
              placeholder="Filter messages..."
              className="flex-1 text-[10px] font-mono bg-transparent focus:outline-none placeholder:text-muted-foreground/20"
            />
            {filter && (
              <button
                onClick={() => setFilter("")}
                className="p-0.5 text-muted-foreground hover:text-foreground"
                title="Clear filter"
                aria-label="Clear filter"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        )}

        {activeTab === "messages" ? (
          <>
            {/* Messages list */}
            <div className="flex-1 overflow-y-auto min-h-[200px]">
              {filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() =>
                    setSelectedMsg(selectedMsg?.id === msg.id ? null : msg)
                  }
                  className={`flex items-start gap-2 px-3 py-1.5 border-b border-border cursor-pointer transition-colors ${selectedMsg?.id === msg.id ? "bg-accent/40" : "hover:bg-accent/20"}`}
                >
                  <span
                    className={`text-[9px] font-bold shrink-0 mt-0.5 ${msg.direction === "sent" ? "text-method-post" : "text-status-success"}`}
                  >
                    {msg.direction === "sent" ? "↑" : "↓"}
                  </span>
                  {msg.event && (
                    <span className="text-[9px] font-bold text-primary shrink-0 mt-0.5">
                      {msg.event}
                    </span>
                  )}
                  <pre className="flex-1 font-mono text-[10px] text-foreground whitespace-pre-wrap break-all line-clamp-3">
                    {msg.data}
                  </pre>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[8px] text-muted-foreground/30 font-bold">
                      {formatSize(msg.size)}
                    </span>
                    <span className="text-[8px] text-muted-foreground/30 font-bold">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyMessage(msg);
                      }}
                      className="p-0.5 text-muted-foreground/20 hover:text-foreground transition-colors"
                      title="Copy message"
                      aria-label="Copy message"
                    >
                      <Copy className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
              {filteredMessages.length === 0 && (
                <p className="text-[11px] text-muted-foreground/30 text-center py-8 font-bold">
                  {filter
                    ? "No matching messages."
                    : connected
                      ? `Connected — ${mode === "websocket" ? "send a message" : "emit an event"} below.`
                      : "Connect to start real-time communication."}
                </p>
              )}
            </div>

            {/* Selected message detail */}
            {selectedMsg && (
              <div className="border-t border-border bg-surface-sunken shrink-0 max-h-[150px] overflow-auto">
                <div className="flex items-center justify-between px-3 py-1 border-b border-border">
                  <span className="text-[9px] font-bold text-muted-foreground/40">
                    {selectedMsg.direction === "sent" ? "SENT" : "RECEIVED"}
                    {selectedMsg.event && ` · ${selectedMsg.event}`}
                    {" · "}
                    {formatSize(selectedMsg.size)}
                    {" · "}
                    {new Date(selectedMsg.timestamp).toLocaleTimeString()}
                  </span>
                  <button
                    onClick={() => setSelectedMsg(null)}
                    className="p-0.5 text-muted-foreground hover:text-foreground"
                    title="Close message details"
                    aria-label="Close message details"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
                <pre className="px-3 py-2 font-mono text-[10px] text-foreground whitespace-pre-wrap break-all">
                  {selectedMsg.data}
                </pre>
              </div>
            )}

            {/* Input area */}
            <div className="flex gap-0 border-t border-border shrink-0">
              {mode === "socketio" && (
                <input
                  value={emitEvent}
                  onChange={(e) => setEmitEvent(e.target.value)}
                  aria-label="Socket.IO event name"
                  placeholder="event"
                  disabled={!connected}
                  className="w-20 h-8 px-2 text-[10px] font-bold bg-surface-sunken border-r border-border focus:outline-none placeholder:text-muted-foreground/20 disabled:opacity-30"
                />
              )}
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                aria-label={
                  mode === "websocket"
                    ? "WebSocket message"
                    : "Socket.IO payload"
                }
                placeholder={
                  mode === "websocket" ? "Message..." : "Data (JSON or text)..."
                }
                disabled={!connected}
                className="flex-1 h-8 px-3 text-[11px] font-mono bg-background border-r border-border focus:outline-none placeholder:text-muted-foreground/20 disabled:opacity-30"
              />
              <button
                onClick={handleSend}
                disabled={!connected || (!input.trim() && mode === "websocket")}
                className="px-3 h-8 bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 disabled:opacity-30 transition-colors"
                title="Send message"
                aria-label="Send message"
              >
                <Send className="h-3 w-3" />
              </button>
            </div>
          </>
        ) : (
          /* Config tab */
          <div className="flex-1 overflow-y-auto">
            {mode === "websocket" ? (
              <div className="p-3 space-y-3">
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-wider block mb-1">
                    Sub-protocols
                  </label>
                  <input
                    value={protocols}
                    onChange={(e) => setProtocols(e.target.value)}
                    placeholder="e.g. graphql-ws, mqtt"
                    disabled={connected}
                    className="w-full h-7 px-2 text-[11px] font-mono bg-background border border-border focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/20 disabled:opacity-40"
                  />
                  <p className="text-[9px] text-muted-foreground/30 mt-1">
                    Comma-separated. Set before connecting.
                  </p>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-wider block mb-1">
                    Auto-scroll
                  </label>
                  <button
                    onClick={() => setAutoScroll(!autoScroll)}
                    className={`px-2 py-1 text-[10px] font-bold transition-colors ${autoScroll ? "text-primary bg-primary/10" : "text-muted-foreground bg-surface-sunken"}`}
                  >
                    {autoScroll ? "ON" : "OFF"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 space-y-3">
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-wider block mb-1">
                    Client Version
                  </label>
                  <div className="flex gap-0 border border-border w-fit">
                    {(["3", "4"] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setIoVersion(v)}
                        disabled={connected}
                        className={`px-3 py-1 text-[10px] font-bold transition-colors ${ioVersion === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"} disabled:opacity-40`}
                      >
                        v{v}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-muted-foreground/30 mt-1">
                    Match your server's Socket.IO version
                  </p>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-wider block mb-1">
                    Transport
                  </label>
                  <div className="flex gap-0 border border-border w-fit">
                    {(["websocket", "polling"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setIoTransport(t)}
                        disabled={connected}
                        className={`px-3 py-1 text-[10px] font-bold transition-colors capitalize ${ioTransport === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"} disabled:opacity-40`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-wider block mb-1">
                    Path
                  </label>
                  <input
                    value={ioPath}
                    onChange={(e) => setIoPath(e.target.value)}
                    placeholder="/socket.io"
                    disabled={connected}
                    className="w-full h-7 px-2 text-[11px] font-mono bg-background border border-border focus:outline-none placeholder:text-muted-foreground/20 disabled:opacity-40"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-wider block mb-1">
                    Namespace
                  </label>
                  <input
                    value={ioNamespace}
                    onChange={(e) => setIoNamespace(e.target.value)}
                    placeholder="/"
                    disabled={connected}
                    className="w-full h-7 px-2 text-[11px] font-mono bg-background border border-border focus:outline-none placeholder:text-muted-foreground/20 disabled:opacity-40"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-wider block mb-1">
                    Event Listeners
                  </label>
                  <div className="flex gap-1 mb-2">
                    <input
                      value={newListener}
                      onChange={(e) => setNewListener(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addListener()}
                      placeholder="Event name..."
                      className="flex-1 h-7 px-2 text-[11px] font-mono bg-background border border-border focus:outline-none placeholder:text-muted-foreground/20"
                    />
                    <button
                      onClick={addListener}
                      className="px-2 h-7 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      title="Add event listener"
                      aria-label="Add event listener"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="space-y-px">
                    {listeners.map((l) => (
                      <div
                        key={l}
                        className="flex items-center justify-between px-2 py-1 bg-surface-sunken border border-border"
                      >
                        <span className="text-[10px] font-mono font-bold text-foreground">
                          {l}
                        </span>
                        <button
                          onClick={() => removeListener(l)}
                          className="p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                          title={`Remove listener ${l}`}
                          aria-label={`Remove listener ${l}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-wider block mb-1">
                    Auto-scroll
                  </label>
                  <button
                    onClick={() => setAutoScroll(!autoScroll)}
                    className={`px-2 py-1 text-[10px] font-bold transition-colors ${autoScroll ? "text-primary bg-primary/10" : "text-muted-foreground bg-surface-sunken"}`}
                  >
                    {autoScroll ? "ON" : "OFF"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
);

RealtimePanel.displayName = "RealtimePanel";
