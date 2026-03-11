import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  Trash2,
  Pause,
  Play,
  ArrowDown,
  Filter,
  Clock,
  Wifi,
  WifiOff,
  RotateCcw,
} from "lucide-react";

interface SSEEvent {
  id: string;
  type: string;
  data: string;
  timestamp: number;
  size: number;
}

export interface SSEPanelHandle {
  connect: () => void;
  disconnect: () => void;
  connected: boolean;
}

interface Props {
  url: string;
  headers?: Record<string, string>;
}

export const SSEPanel = forwardRef<SSEPanelHandle, Props>(
  ({ url, headers }, ref) => {
    const [connected, setConnected] = useState(false);
    const [events, setEvents] = useState<SSEEvent[]>([]);
    const [eventFilter, setEventFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [autoScroll, setAutoScroll] = useState(true);
    const [paused, setPaused] = useState(false);
    const [reconnectCount, setReconnectCount] = useState(0);
    const [autoReconnect, setAutoReconnect] = useState(true);
    const [maxReconnects, setMaxReconnects] = useState(5);
    const [connectedAt, setConnectedAt] = useState<number | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<SSEEvent | null>(null);
    const sourceRef = useRef<EventSource | null>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const pausedRef = useRef(false);
    const bufferRef = useRef<SSEEvent[]>([]);

    useEffect(() => {
      pausedRef.current = paused;
    }, [paused]);

    useEffect(() => {
      if (autoScroll && !paused)
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [events, autoScroll, paused]);

    const abortRef = useRef<AbortController | null>(null);

    const addEvent = useCallback((evt: SSEEvent) => {
      const MAX_EVENTS = 1000;
      if (pausedRef.current) {
        bufferRef.current.push(evt);
        if (bufferRef.current.length > MAX_EVENTS) {
          bufferRef.current = bufferRef.current.slice(-MAX_EVENTS);
        }
      } else {
        setEvents((prev) => {
          const merged = [...prev, evt, ...bufferRef.current.splice(0)];
          return merged.length > MAX_EVENTS
            ? merged.slice(-MAX_EVENTS)
            : merged;
        });
      }
    }, []);

    const connect = useCallback(() => {
      if (!url) return;
      const hasHeaders =
        headers && Object.keys(headers).filter((k) => k.trim()).length > 0;

      if (hasHeaders) {
        // Use fetch-based SSE for custom headers (auth, etc.)
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        fetch(url, { headers, signal: ctrl.signal })
          .then((res) => {
            if (!res.ok || !res.body) {
              setConnected(false);
              return;
            }
            setConnected(true);
            setConnectedAt(Date.now());
            setReconnectCount(0);
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            const read = (): void => {
              reader
                .read()
                .then(({ done, value }) => {
                  if (done) {
                    setConnected(false);
                    setConnectedAt(null);
                    return;
                  }
                  buffer += decoder.decode(value, { stream: true });
                  const parts = buffer.split("\n\n");
                  buffer = parts.pop() || "";
                  for (const part of parts) {
                    const dataLines = part
                      .split("\n")
                      .filter((l) => l.startsWith("data:"))
                      .map((l) => l.slice(5).trim());
                    if (dataLines.length) {
                      const data = dataLines.join("\n");
                      addEvent({
                        id: crypto.randomUUID(),
                        type: "message",
                        data,
                        timestamp: Date.now(),
                        size: new Blob([data]).size,
                      });
                    }
                  }
                  read();
                })
                .catch(() => {
                  setConnected(false);
                  setConnectedAt(null);
                });
            };
            read();
          })
          .catch(() => {
            setConnected(false);
            setConnectedAt(null);
            if (autoReconnect && reconnectCount < maxReconnects) {
              setReconnectCount((prev) => prev + 1);
              setTimeout(
                () => connect(),
                Math.min(1000 * Math.pow(2, reconnectCount), 30000),
              );
            }
          });
      } else {
        // Standard EventSource (no custom headers)
        try {
          const source = new EventSource(url);
          source.onopen = () => {
            setConnected(true);
            setConnectedAt(Date.now());
            setReconnectCount(0);
          };
          source.onmessage = (e) => {
            addEvent({
              id: crypto.randomUUID(),
              type: e.type || "message",
              data: e.data,
              timestamp: Date.now(),
              size: new Blob([e.data]).size,
            });
          };
          source.onerror = () => {
            setConnected(false);
            setConnectedAt(null);
            source.close();
            if (autoReconnect && reconnectCount < maxReconnects) {
              setReconnectCount((prev) => prev + 1);
              setTimeout(
                () => connect(),
                Math.min(1000 * Math.pow(2, reconnectCount), 30000),
              );
            }
          };
          sourceRef.current = source;
        } catch {
          setConnected(false);
          setConnectedAt(null);
        }
      }
    }, [url, headers, autoReconnect, reconnectCount, maxReconnects, addEvent]);

    const disconnect = useCallback(() => {
      sourceRef.current?.close();
      sourceRef.current = null;
      abortRef.current?.abort();
      abortRef.current = null;
      setConnected(false);
      setConnectedAt(null);
    }, []);

    const resume = () => {
      setPaused(false);
      setEvents((prev) => [...prev, ...bufferRef.current.splice(0)]);
    };

    useImperativeHandle(
      ref,
      () => ({
        connect,
        disconnect,
        connected,
      }),
      [connect, disconnect, connected],
    );

    const eventTypes = [...new Set(events.map((e) => e.type))];

    const filtered = events.filter((e) => {
      if (typeFilter && e.type !== typeFilter) return false;
      if (
        eventFilter &&
        !e.data.toLowerCase().includes(eventFilter.toLowerCase()) &&
        !e.type.toLowerCase().includes(eventFilter.toLowerCase())
      )
        return false;
      return true;
    });

    const totalSize = events.reduce((s, e) => s + e.size, 0);
    const formatSize = (b: number) =>
      b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} KB`;
    const uptime = connectedAt
      ? Math.round((Date.now() - connectedAt) / 1000)
      : 0;
    const formatUptime = (s: number) =>
      s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;

    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Stats bar */}
        <div className="flex items-center gap-3 px-3 py-1 border-b border-border bg-surface-sunken shrink-0">
          <div className="flex items-center gap-1.5">
            {connected ? (
              <span className="flex items-center gap-1 text-[9px] text-status-success font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground font-bold">
                <WifiOff className="h-2.5 w-2.5" /> Disconnected
              </span>
            )}
          </div>
          <span className="text-[9px] text-muted-foreground font-bold">
            {events.length} events
          </span>
          <span className="text-[9px] text-muted-foreground font-bold">
            {formatSize(totalSize)}
          </span>
          {connected && (
            <span className="text-[9px] text-muted-foreground font-bold">
              <Clock className="h-2.5 w-2.5 inline mr-0.5" />
              {formatUptime(uptime)}
            </span>
          )}
          {reconnectCount > 0 && (
            <span className="text-[9px] text-method-put font-bold">
              <RotateCcw className="h-2.5 w-2.5 inline mr-0.5" />×
              {reconnectCount}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            <label className="flex items-center gap-1 text-[9px] text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={autoReconnect}
                onChange={(e) => setAutoReconnect(e.target.checked)}
                className="w-2.5 h-2.5 accent-primary"
                aria-label="Toggle auto reconnect"
              />
              Auto-reconnect
            </label>
            <label className="flex items-center gap-1 text-[9px] text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="w-2.5 h-2.5 accent-primary"
                aria-label="Toggle auto scroll"
              />
              <ArrowDown className="h-2.5 w-2.5" />
            </label>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 px-3 py-1 border-b border-border shrink-0">
          <Filter className="h-3 w-3 text-muted-foreground shrink-0" />
          {eventTypes.length > 0 && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              title="Filter by event type"
              aria-label="Filter by event type"
              className="h-5 px-1 text-[9px] font-bold bg-surface-sunken border border-border text-foreground focus:outline-none"
            >
              <option value="">All types</option>
              {eventTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
          <input
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            aria-label="Search events"
            placeholder="Search events..."
            className="flex-1 h-5 px-2 text-[9px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary placeholder:text-muted-foreground/30"
          />
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => (paused ? resume() : setPaused(true))}
              className={`p-1 transition-colors ${paused ? "text-method-put" : "text-muted-foreground hover:text-foreground"}`}
              title={
                paused
                  ? `Resume (${bufferRef.current.length} buffered)`
                  : "Pause"
              }
              aria-label={paused ? "Resume event stream" : "Pause event stream"}
            >
              {paused ? (
                <Play className="h-3 w-3" />
              ) : (
                <Pause className="h-3 w-3" />
              )}
            </button>
            {events.length > 0 && (
              <button
                onClick={() => {
                  setEvents([]);
                  setSelectedEvent(null);
                }}
                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                title="Clear"
                aria-label="Clear events"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {paused && bufferRef.current.length > 0 && (
          <div className="px-3 py-1 bg-method-put/10 border-b border-border">
            <p className="text-[9px] font-bold text-method-put">
              {bufferRef.current.length} events buffered —{" "}
              <button onClick={resume} className="underline">
                Resume
              </button>
            </p>
          </div>
        )}

        {/* Events + detail split */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          <div
            className={`${selectedEvent ? "w-1/2 border-r border-border" : "flex-1"} overflow-y-auto`}
          >
            {filtered.map((evt) => (
              <button
                key={evt.id}
                onClick={() => setSelectedEvent(evt)}
                className={`w-full flex items-start gap-2 px-3 py-1.5 border-b border-border transition-colors text-left ${selectedEvent?.id === evt.id ? "bg-accent" : "hover:bg-accent/30"}`}
              >
                <span className="text-[8px] font-extrabold text-method-post shrink-0 mt-0.5 bg-method-post/10 px-1 py-0.5">
                  {evt.type}
                </span>
                <pre className="flex-1 font-mono text-[10px] text-foreground whitespace-pre-wrap break-all line-clamp-2">
                  {evt.data}
                </pre>
                <div className="flex flex-col items-end shrink-0 gap-0.5">
                  <span className="text-[8px] text-muted-foreground/40 font-mono">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-[8px] text-muted-foreground/30 font-mono">
                    {formatSize(evt.size)}
                  </span>
                </div>
              </button>
            ))}
            <div ref={endRef} />
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Wifi className="h-6 w-6 text-muted-foreground/15" />
                <p className="text-[10px] text-muted-foreground/40 font-bold">
                  {connected
                    ? "Listening for events…"
                    : "Connect to start receiving events."}
                </p>
                {!connected && eventFilter && (
                  <p className="text-[9px] text-muted-foreground/30">
                    No events match filter.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Detail pane */}
          {selectedEvent && (
            <div className="w-1/2 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1 border-b border-border bg-surface-sunken shrink-0">
                <span className="text-[9px] font-bold text-muted-foreground">
                  Event Detail
                </span>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-[9px] font-bold text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>
              <div className="px-3 py-2 space-y-2 border-b border-border bg-surface-sunken">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-extrabold text-muted-foreground uppercase">
                    Type
                  </span>
                  <span className="text-[10px] font-bold text-method-post">
                    {selectedEvent.type}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-extrabold text-muted-foreground uppercase">
                    Time
                  </span>
                  <span className="text-[10px] font-mono text-foreground">
                    {new Date(selectedEvent.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-extrabold text-muted-foreground uppercase">
                    Size
                  </span>
                  <span className="text-[10px] font-mono text-foreground">
                    {formatSize(selectedEvent.size)}
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <pre className="p-3 font-mono text-[10px] text-foreground whitespace-pre-wrap break-all">
                  {(() => {
                    try {
                      return JSON.stringify(
                        JSON.parse(selectedEvent.data),
                        null,
                        2,
                      );
                    } catch {
                      return selectedEvent.data;
                    }
                  })()}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);

SSEPanel.displayName = "SSEPanel";
