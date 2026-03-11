import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import type { WebSocketMessage } from "@/types/api";
import { Send, Trash2, Search } from "lucide-react";

export interface WebSocketPanelHandle {
  connect: () => void;
  disconnect: () => void;
  connected: boolean;
}

interface Props {
  url: string;
}

export const WebSocketPanel = forwardRef<WebSocketPanelHandle, Props>(
  ({ url }, ref) => {
    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState<WebSocketMessage[]>([]);
    const [input, setInput] = useState("");
    const [activeTab, setActiveTab] = useState<"communication" | "protocols">(
      "communication",
    );
    const [protocols, setProtocols] = useState("");
    const [autoReconnect, setAutoReconnect] = useState(false);
    const [closeInfo, setCloseInfo] = useState<{
      code: number;
      reason: string;
    } | null>(null);
    const [filter, setFilter] = useState("");
    const wsRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const reconnectRef = useRef(0);
    const intentionalCloseRef = useRef(false);

    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const connect = useCallback(() => {
      let wsUrl = url;
      if (!/^wss?:\/\//i.test(wsUrl)) {
        wsUrl = wsUrl.replace(/^https?:\/\//i, "");
        wsUrl = "wss://" + wsUrl;
      }
      intentionalCloseRef.current = false;
      setCloseInfo(null);
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
          reconnectRef.current = 0;
        };
        ws.onclose = (e) => {
          setConnected(false);
          setCloseInfo({ code: e.code, reason: e.reason || "" });
          if (
            !intentionalCloseRef.current &&
            autoReconnect &&
            reconnectRef.current < 5
          ) {
            reconnectRef.current++;
            setTimeout(
              () => connect(),
              Math.min(1000 * Math.pow(2, reconnectRef.current), 30000),
            );
          }
        };
        ws.onmessage = (e) => {
          const isBinary = e.data instanceof ArrayBuffer;
          const displayData = isBinary
            ? `[Binary: ${e.data.byteLength} bytes]`
            : e.data;
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              type: "received",
              data: displayData,
              timestamp: Date.now(),
              binary: isBinary,
            },
          ]);
        };
        ws.onerror = () => setConnected(false);
        wsRef.current = ws;
      } catch {
        setConnected(false);
      }
    }, [url, protocols, autoReconnect]);

    const disconnect = useCallback(() => {
      intentionalCloseRef.current = true;
      wsRef.current?.close(1000, "Client disconnect");
      wsRef.current = null;
      setConnected(false);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        connect,
        disconnect,
        connected,
      }),
      [connect, disconnect, connected],
    );

    const send = () => {
      if (!input.trim() || !wsRef.current) return;
      wsRef.current.send(input);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: "sent",
          data: input,
          timestamp: Date.now(),
        },
      ]);
      setInput("");
    };

    return (
      <div className="flex flex-col h-full">
        {/* Tabs: Communication / Protocols */}
        <div className="flex items-center border-b border-border">
          {(["communication", "protocols"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-3 py-1.5 text-[11px] font-bold capitalize border-b-2 transition-colors ${
                activeTab === t
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "communication" ? "Communication" : "Protocols"}
            </button>
          ))}
          {connected && (
            <span className="flex items-center gap-1 ml-2 text-[10px] text-status-success font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
              Connected
            </span>
          )}
          {messages.length > 0 && (
            <div className="ml-auto flex items-center gap-1 mr-2">
              <div className="flex items-center gap-1 border border-border rounded px-1.5 h-5">
                <Search className="h-2.5 w-2.5 text-muted-foreground" />
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter…"
                  className="w-16 text-[10px] font-mono bg-transparent focus:outline-none placeholder:text-muted-foreground/40"
                  aria-label="Filter messages"
                />
              </div>
              <button
                onClick={() => {
                  setMessages([]);
                  setFilter("");
                }}
                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                title="Clear"
                aria-label="Clear messages"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {activeTab === "communication" ? (
          <>
            <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px] p-2 space-y-1.5">
              {messages
                .filter(
                  (m) =>
                    !filter ||
                    m.data.toLowerCase().includes(filter.toLowerCase()),
                )
                .map((msg) => (
                  <div
                    key={msg.id}
                    className={`group relative flex flex-col gap-0.5 max-w-[85%] px-3 py-2 rounded-lg text-[11px] font-mono transition-colors ${
                      msg.type === "sent"
                        ? "ml-auto bg-primary/10 border border-primary/20"
                        : "mr-auto bg-surface-sunken border border-border"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className={`text-[8px] font-extrabold uppercase tracking-wider ${msg.type === "sent" ? "text-primary" : "text-status-success"}`}
                      >
                        {msg.type === "sent" ? "↑ SENT" : "↓ RECV"}
                      </span>
                      <span className="text-[8px] text-muted-foreground/50 font-bold ml-auto">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="font-mono text-[11px] text-foreground whitespace-pre-wrap break-all leading-relaxed">
                      {msg.data}
                    </pre>
                  </div>
                ))}
              <div ref={messagesEndRef} />
              {messages.length === 0 && (
                <p className="text-[11px] text-muted-foreground/60 text-center py-8">
                  {connected
                    ? "Connected — send a message below."
                    : "Connect to start messaging."}
                </p>
              )}
              {!connected && closeInfo && (
                <div className="px-3 py-1.5 text-[10px] text-muted-foreground rounded-md bg-muted/30 border border-border">
                  Closed · code{" "}
                  <span className="font-mono font-bold">{closeInfo.code}</span>
                  {closeInfo.reason && <> · {closeInfo.reason}</>}
                  {autoReconnect &&
                    reconnectRef.current > 0 &&
                    reconnectRef.current < 5 && (
                      <span className="ml-2 text-amber-500 font-bold">
                        Reconnecting ({reconnectRef.current}/5)…
                      </span>
                    )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 p-2 border-t border-border bg-surface-sunken/30">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                aria-label="WebSocket message"
                placeholder="Type a message..."
                disabled={!connected}
                className="flex-1 h-8 px-3 text-[11px] font-mono bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40 disabled:opacity-40 transition-colors"
              />
              <button
                onClick={send}
                disabled={!connected || !input.trim()}
                className="h-8 px-3 bg-primary text-primary-foreground text-[11px] font-bold rounded-md hover:bg-primary/90 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                title="Send message"
                aria-label="Send message"
              >
                <Send className="h-3 w-3" />
                <span className="text-[9px] font-extrabold uppercase tracking-wide">
                  Send
                </span>
              </button>
            </div>
          </>
        ) : (
          <div className="p-3 space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Sub-protocols (comma-separated)
              </label>
              <input
                value={protocols}
                onChange={(e) => setProtocols(e.target.value)}
                placeholder="e.g. graphql-ws, mqtt"
                className="w-full h-7 px-2 text-[11px] font-mono bg-background border border-border focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
              />
              <p className="text-[10px] text-muted-foreground/60">
                Set protocols before connecting.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Auto-reconnect
              </label>
              <button
                onClick={() => setAutoReconnect((v) => !v)}
                className={`w-8 h-4 rounded-full transition-colors relative ${
                  autoReconnect ? "bg-primary" : "bg-muted"
                }`}
                title="Toggle auto-reconnect"
                aria-label="Toggle auto-reconnect"
              >
                <span
                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                    autoReconnect ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
            {autoReconnect && (
              <p className="text-[10px] text-muted-foreground/60">
                Reconnects up to 5 times with exponential backoff.
              </p>
            )}
          </div>
        )}
      </div>
    );
  },
);

WebSocketPanel.displayName = "WebSocketPanel";
