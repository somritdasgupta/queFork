import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Trash2, Send, Plus, X } from 'lucide-react';

interface SocketEvent {
  id: string;
  direction: 'sent' | 'received';
  event: string;
  data: string;
  timestamp: number;
}

export interface SocketIOPanelHandle {
  connect: () => void;
  disconnect: () => void;
  connected: boolean;
}

interface Props {
  url: string;
}

export const SocketIOPanel = forwardRef<SocketIOPanelHandle, Props>(({ url }, ref) => {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<SocketEvent[]>([]);
  const [emitEvent, setEmitEvent] = useState('message');
  const [emitData, setEmitData] = useState('');
  const [listeners, setListeners] = useState<string[]>(['message', 'connect', 'disconnect']);
  const [newListener, setNewListener] = useState('');
  const [activeTab, setActiveTab] = useState<'communication' | 'listeners'>('communication');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const connect = useCallback(() => {
    setConnected(true);
    setEvents(prev => [...prev, {
      id: crypto.randomUUID(), direction: 'received', event: 'connect', data: 'Connected to server', timestamp: Date.now(),
    }]);
  }, []);

  const disconnect = useCallback(() => {
    setConnected(false);
    setEvents(prev => [...prev, {
      id: crypto.randomUUID(), direction: 'received', event: 'disconnect', data: 'Disconnected', timestamp: Date.now(),
    }]);
  }, []);

  useImperativeHandle(ref, () => ({
    connect,
    disconnect,
    connected,
  }), [connect, disconnect, connected]);

  const emit = () => {
    if (!emitEvent.trim()) return;
    setEvents(prev => [...prev, {
      id: crypto.randomUUID(), direction: 'sent', event: emitEvent, data: emitData || '(no data)', timestamp: Date.now(),
    }]);
    setEmitData('');
  };

  const addListener = () => {
    if (!newListener.trim() || listeners.includes(newListener.trim())) return;
    setListeners(prev => [...prev, newListener.trim()]);
    setNewListener('');
  };

  const removeListener = (l: string) => setListeners(prev => prev.filter(x => x !== l));

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex items-center border-b border-border">
        {(['communication', 'listeners'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-3 py-1.5 text-[11px] font-bold capitalize border-b-2 transition-colors ${
              activeTab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
        {connected && (
          <span className="flex items-center gap-1 ml-2 text-[10px] text-status-success font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
            Connected
          </span>
        )}
        {events.length > 0 && (
          <button onClick={() => setEvents([])} className="ml-auto mr-2 p-1 text-muted-foreground hover:text-destructive transition-colors" title="Clear">
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {activeTab === 'communication' ? (
        <>
          <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px]">
            {events.map(evt => (
              <div key={evt.id} className="flex items-start gap-2 px-3 py-1.5 border-b border-border hover:bg-accent/30 transition-colors">
                <span className={`text-[9px] font-bold shrink-0 mt-0.5 ${evt.direction === 'sent' ? 'text-method-post' : 'text-status-success'}`}>
                  {evt.direction === 'sent' ? '↑' : '↓'}
                </span>
                <span className="text-[10px] font-bold text-primary shrink-0">{evt.event}</span>
                <pre className="flex-1 font-mono text-[11px] text-foreground whitespace-pre-wrap break-all">{evt.data}</pre>
                <span className="text-[9px] text-muted-foreground font-bold shrink-0">
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
            <div ref={endRef} />
            {events.length === 0 && (
              <p className="text-[11px] text-muted-foreground/60 text-center py-8">
                {connected ? 'Connected — emit an event.' : 'Connect to start.'}
              </p>
            )}
          </div>
          <div className="flex gap-0 border-t border-border">
            <input
              value={emitEvent}
              onChange={(e) => setEmitEvent(e.target.value)}
              placeholder="Event"
              disabled={!connected}
              className="w-24 h-8 px-2 text-[11px] font-bold bg-surface-sunken border-r border-border focus:outline-none placeholder:text-muted-foreground/40 disabled:opacity-40"
            />
            <input
              value={emitData}
              onChange={(e) => setEmitData(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && emit()}
              placeholder="Data (JSON or text)"
              disabled={!connected}
              className="flex-1 h-8 px-2 text-[11px] font-mono bg-background border-r border-border focus:outline-none placeholder:text-muted-foreground/40 disabled:opacity-40"
            />
            <button
              onClick={emit}
              disabled={!connected || !emitEvent.trim()}
              className="px-3 h-8 bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              <Send className="h-3 w-3" />
            </button>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="flex gap-1">
            <input
              value={newListener}
              onChange={(e) => setNewListener(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addListener()}
              placeholder="Event name..."
              className="flex-1 h-7 px-2 text-[11px] font-mono bg-background border border-border focus:outline-none placeholder:text-muted-foreground/40"
            />
            <button onClick={addListener} className="px-2 h-7 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-px">
            {listeners.map(l => (
              <div key={l} className="flex items-center justify-between px-2 py-1 bg-surface-sunken border border-border">
                <span className="text-[11px] font-mono font-bold text-foreground">{l}</span>
                <button onClick={() => removeListener(l)} className="p-0.5 text-muted-foreground hover:text-destructive transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

SocketIOPanel.displayName = 'SocketIOPanel';
