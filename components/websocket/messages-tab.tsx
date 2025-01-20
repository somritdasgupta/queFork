"use client";

import { useState, useRef, useEffect } from "react";
import { useWebSocket } from "./websocket-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Download,
  Trash2,
  Copy,
  MessageSquare,
  ArrowDown,
  ArrowUp,
  Unplug,
  Upload,
  Clock,
  PlugZap2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
  type: "sent" | "received";
  content: string;
  timestamp: string;
}

export function MessagesTab() {
  const {
    isConnected,
    messages,
    sendMessage,
    clearMessages,
    setMessagesBulk,
    disconnect,
  } = useWebSocket();

  const [message, setMessage] = useState("");
  const [messageFormat, setMessageFormat] = useState<"text" | "json">("text");
  const [expandedMessage, setExpandedMessage] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Add auto-format detection
  const detectMessageFormat = (content: string) => {
    try {
      JSON.parse(content);
      return "json";
    } catch {
      return "text";
    }
  };

  // Update message change handler
  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMessage = e.target.value;
    setMessage(newMessage);
    // Auto-detect format when typing
    if (newMessage.trim()) {
      setMessageFormat(detectMessageFormat(newMessage));
    }
  };

  // Update handleSend to accept any valid JSON
  const handleSend = () => {
    if (!isConnected || !message.trim()) return;

    try {
      let formattedMessage = message.trim();
      
      if (messageFormat === "json") {
        try {
          // Just validate that it's valid JSON, but keep the original structure
          JSON.parse(formattedMessage);
        } catch (e) {
          toast.error("Invalid JSON format", {
            description: (
              <div className="mt-2 space-y-2">
                <div className="font-medium text-xs">Example JSON formats:</div>
                <code className="bg-slate-900 px-2 py-1 rounded text-xs block">
                  {"{ \"key\": \"value\" }"}
                </code>
                <code className="bg-slate-900 px-2 py-1 rounded text-xs block">
                  {"{ \"array\": [1, 2, 3] }"}
                </code>
                <code className="bg-slate-900 px-2 py-1 rounded text-xs block">
                  {"{ \"nested\": { \"key\": \"value\" }"}
                </code>
              </div>
            ),
            duration: 5000,
          });
          return;
        }
      }

      sendMessage(formattedMessage);
      setMessage("");
      
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  // Update message format placeholder
  const getMessagePlaceholder = () => {
    if (!isConnected) return "Connect to start...";
    
    return messageFormat === "json" 
      ? '{ "any": "valid JSON" }'
      : "Type a message...";
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  const exportMessages = () => {
    const exportData = messages.map((msg) => ({
      ...msg,
      timestamp: new Date(msg.timestamp).toISOString(),
    }));

    const data = JSON.stringify(exportData, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `websocket-messages-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Messages exported");
  };

  const importMessages = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedMessages = JSON.parse(e.target?.result as string);
        if (
          Array.isArray(importedMessages) &&
          importedMessages.every(
            (msg) => msg.type && msg.content && msg.timestamp
          )
        ) {
          setMessagesBulk(importedMessages);
          toast.success(`Imported ${importedMessages.length} messages`);
        } else {
          toast.error("Invalid message format in file");
        }
      } catch (error) {
        toast.error("Failed to parse import file");
      }
    };
    reader.readAsText(file);
    event.target.value = ""; 
  };

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden font-mono text-sm">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 border-b border-slate-800 bg-slate-900">
        <div className="h-14 px-3 flex items-center gap-2 overflow-x-auto">
          <Select
            value={messageFormat}
            onValueChange={(value: "text" | "json") => setMessageFormat(value)}
          >
            <SelectTrigger className="w-24 h-8 bg-slate-950 border-slate-800 text-slate-200">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="text" className="text-slate-200">Text</SelectItem>
              <SelectItem value="json" className="text-slate-200">JSON</SelectItem>
            </SelectContent>
          </Select>

          <Badge variant="outline" className="h-8 border-slate-800 bg-slate-950 text-slate-400">
            {messages.length} messages
          </Badge>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 ml-auto">
            <input type="file" id="import-messages" className="hidden" accept=".json" onChange={importMessages} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => document.getElementById("import-messages")?.click()}
              className="h-8 px-2 hover:bg-slate-800 text-slate-200"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearMessages}
              className="h-8 px-2 hover:bg-slate-800 text-slate-200"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={exportMessages}
              className="h-8 px-2 hover:bg-slate-800 text-slate-200"
            >
              <Download className="h-4 w-4" />
            </Button>
            {isConnected && (
              <Button
                variant="destructive"
                size="sm"
                onClick={disconnect}
                className="h-8 px-2"
              >
                <Unplug className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area - Updated with inline expanding messages */}
      <div className="absolute top-14 bottom-16 left-0 right-0 overflow-y-auto w-full bg-slate-950 text-slate-200 
        [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-700 
        [&::-webkit-scrollbar-track]:bg-slate-900"
      >
        <div className="divide-y divide-slate-800">
          {messages.length === 0 ? (
            <div className="h-full min-h-[400px] flex items-center justify-center text-slate-500">
              <div className="flex flex-col items-center gap-2">
                <MessageSquare className="h-8 w-8" />
                <p className="text-sm font-mono">No Messages</p>
              </div>
            </div>
          ) : (
            <div>
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={cn(
                    "group transition-all duration-200",
                    expandedMessage === index && "bg-slate-900"
                  )}
                >
                  {/* Message Row */}
                  <div
                    onClick={() => setExpandedMessage(expandedMessage === index ? null : index)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 hover:bg-slate-900/50 transition-colors cursor-pointer"
                    )}
                  >
                    {/* Message Direction Indicator */}
                    {msg.content.startsWith('Connected to') ? (
                      <div className="text-emerald-500 shrink-0">
                        <PlugZap2 className="h-4 w-4" />
                      </div>
                    ) : msg.content.startsWith('Disconnected from') ? (
                      <div className="text-amber-500 shrink-0">
                        <Unplug className="h-4 w-4" />
                      </div>
                    ) : msg.content.startsWith('Connection error') ? (
                      <div className="text-red-500 shrink-0">
                        <XCircle className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className={cn(
                        "shrink-0",
                        msg.type === "sent" ? "text-blue-500" : "text-emerald-500"
                      )}>
                        {msg.type === "sent" ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )}
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="hidden md:block text-xs font-mono text-slate-400 tabular-nums min-w-[90px]">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </div>

                    {/* Mobile timestamp icon */}
                    <Clock className="md:hidden h-4 w-4 text-slate-400" />

                    {/* Message Content */}
                    <div className="flex-1 font-mono text-sm text-slate-200 overflow-x-auto">
                      <code className="px-1">{msg.content}</code>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyMessage(msg.content);
                        }}
                        className="h-7 w-7 p-0 hover:bg-slate-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Copy className="h-4 w-4 text-slate-400" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Details - Shows inline */}
                  {expandedMessage === index && (
                    <div className="px-4 py-2 bg-slate-900/50 border-t border-slate-800 text-xs space-y-2 animate-in slide-in-from-top duration-150">
                      <div className="flex items-center justify-between text-slate-400">
                        <div>Type: {msg.type}</div>
                        <time className="font-mono">
                          {new Date(msg.timestamp).toLocaleString()}
                        </time>
                      </div>
                      {msg.content.startsWith('{') && (
                        <div className="mt-2 bg-slate-950 rounded p-2 overflow-x-auto">
                          <pre className="text-slate-300">
                            {JSON.stringify(JSON.parse(msg.content), null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area - Removed tooltip */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-900">
        <div className="h-16 p-3 flex items-center gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
            <Input
              value={message}
              onChange={handleMessageChange}
              placeholder={getMessagePlaceholder()}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              disabled={!isConnected}
              className="pl-7 font-mono bg-slate-950 border-slate-800 rounded pr-12
                text-slate-200 placeholder:text-slate-600 focus-visible:ring-1 
                focus-visible:ring-slate-800 focus-visible:ring-offset-0"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[11px] font-medium",
                messageFormat === "json" 
                  ? "bg-blue-500/10 text-blue-400" 
                  : "bg-slate-900 text-slate-400"
              )}>
                {messageFormat.toUpperCase()}
              </span>
            </div>
          </div>
          <Button
            onClick={handleSend}
            disabled={!isConnected || !message.trim()}
            size="icon"
            className="shrink-0 bg-slate-900 hover:bg-slate-800 rounded 
              text-slate-200 disabled:bg-slate-900 disabled:text-slate-700 border border-slate-800"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
