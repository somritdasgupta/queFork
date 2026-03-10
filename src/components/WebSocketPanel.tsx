import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import type { WebSocketMessage } from "@/types/api";
import { Send, Trash2 } from "lucide-react";

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
    const wsRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const connect = useCallback(() => {
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
        ws.onopen = () => setConnected(true);
        ws.onclose = () => setConnected(false);
        ws.onmessage = (e) => {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              type: "received",
              data: e.data,
              timestamp: Date.now(),
            },
          ]);
        };
        ws.onerror = () => setConnected(false);
        wsRef.current = ws;
      } catch {
        setConnected(false);
      }
    }, [url, protocols]);

    const disconnect = useCallback(() => {
      wsRef.current?.close();
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
            <button
              onClick={() => setMessages([])}
              className="ml-auto mr-2 p-1 text-muted-foreground hover:text-destructive transition-colors"
              title="Clear"
              aria-label="Clear messages"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>

        {activeTab === "communication" ? (
          <>
            <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px]">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className="flex items-start gap-2 px-3 py-1.5 border-b border-border hover:bg-accent/30 transition-colors"
                >
                  <span
                    className={`text-[9px] font-bold shrink-0 mt-0.5 ${msg.type === "sent" ? "text-method-post" : "text-status-success"}`}
                  >
                    {msg.type === "sent" ? "↑ SENT" : "↓ RECV"}
                  </span>
                  <pre className="flex-1 font-mono text-[11px] text-foreground whitespace-pre-wrap break-all">
                    {msg.data}
                  </pre>
                  <span className="text-[9px] text-muted-foreground font-bold shrink-0">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
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
            </div>
            <div className="flex gap-0 border-t border-border">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                aria-label="WebSocket message"
                placeholder="Message..."
                disabled={!connected}
                className="flex-1 h-8 px-3 text-[11px] font-mono bg-background border-r border-border focus:outline-none placeholder:text-muted-foreground/40 disabled:opacity-40"
              />
              <button
                onClick={send}
                disabled={!connected || !input.trim()}
                className="px-3 h-8 bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 disabled:opacity-40 transition-colors"
                title="Send message"
                aria-label="Send message"
              >
                <Send className="h-3 w-3" />
              </button>
            </div>
          </>
        ) : (
          <div className="p-3 space-y-2">
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
        )}
      </div>
    );
  },
);

WebSocketPanel.displayName = "WebSocketPanel";
