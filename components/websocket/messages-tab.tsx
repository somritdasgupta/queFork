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
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
  type: "sent" | "received";
  content: string;
  timestamp: string;
}

// Update message style definitions to match REST panel theme
const MESSAGE_STYLES = {
  sent: {
    bg: "hover:bg-blue-900/20",
    activeBg: "bg-blue-900/30",
    icon: "text-blue-500",
    text: "text-blue-400",
    border: "border-blue-800/50",
  },
  received: {
    bg: "hover:bg-emerald-900/20",
    activeBg: "bg-emerald-900/30",
    icon: "text-emerald-500",
    text: "text-emerald-500",
    border: "border-emerald-800/50",
  },
  connected: {
    bg: "hover:bg-yellow-900/20",
    activeBg: "bg-yellow-900/30",
    icon: "text-yellow-500",
    text: "text-yellow-400",
    border: "border-yellow-800/50",
  },
  disconnected: {
    bg: "hover:bg-orange-900/20",
    activeBg: "bg-orange-900/30",
    icon: "text-orange-500",
    text: "text-orange-400",
    border: "border-orange-800/50",
  },
  error: {
    bg: "hover:bg-red-900/20",
    activeBg: "bg-red-900/30",
    icon: "text-red-500",
    text: "text-red-400",
    border: "border-red-800/50",
  },
};

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
                  {'{ "key": "value" }'}
                </code>
                <code className="bg-slate-900 px-2 py-1 rounded text-xs block">
                  {'{ "array": [1, 2, 3] }'}
                </code>
                <code className="bg-slate-900 px-2 py-1 rounded text-xs block">
                  {'{ "nested": { "key": "value" }'}
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

  // Add helper function to safely parse and format JSON
  const formatJsonMessage = (content: string) => {
    try {
      // First check if the content is already a string representation of JSON
      const parsed = JSON.parse(content);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      // If parsing fails, return the original content
      return content;
    }
  };

  // Add helper function to check if content is valid JSON
  const isJsonString = (content: string) => {
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  };

  // Add helper to determine message type and styles
  const getMessageStyle = (msg: Message) => {
    if (msg.content.startsWith("Connected to")) {
      return MESSAGE_STYLES.connected;
    }
    if (msg.content.startsWith("Disconnected from")) {
      return MESSAGE_STYLES.disconnected;
    }
    if (msg.content.startsWith("Connection error")) {
      return MESSAGE_STYLES.error;
    }
    return MESSAGE_STYLES[msg.type];
  };

  return (
    <div className="relative w-full h-full bg-slate-900/90 overflow-hidden">
      {/* Header - Match REST header style */}
      <div className="absolute top-0 left-0 right-0 z-50 border-b border-slate-700 bg-slate-800/50">
        <div className="h-14 px-3 flex items-center gap-2 overflow-x-auto">
          <Select
            value={messageFormat}
            onValueChange={(value: "text" | "json") => setMessageFormat(value)}
          >
            <SelectTrigger className="w-24 h-8 bg-slate-900 border-slate-700 text-slate-400 font-medium">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="text" className="text-slate-400">
                Text
              </SelectItem>
              <SelectItem value="json" className="text-slate-400">
                JSON
              </SelectItem>
            </SelectContent>
          </Select>

          <Badge
            variant="outline"
            className="h-8 border-slate-700 bg-slate-900 text-slate-400 font-medium"
          >
            {messages.length}
          </Badge>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 ml-auto">
            <input
              type="file"
              id="import-messages"
              className="hidden"
              accept=".json"
              onChange={importMessages}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                document.getElementById("import-messages")?.click()
              }
              className="h-8 px-2 hover:bg-slate-800 text-slate-400"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearMessages}
              className="h-8 px-2 hover:bg-slate-800 text-slate-400"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={exportMessages}
              className="h-8 px-2 hover:bg-slate-800 text-slate-400"
            >
              <Download className="h-4 w-4" />
            </Button>
            {isConnected && (
              <Button
                variant="destructive"
                size="sm"
                onClick={disconnect}
                className="h-8 px-2 bg-red-500/20 hover:bg-red-500/30 text-red-400"
              >
                <Unplug className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area - Match REST content style */}
      <div
        className="absolute top-14 bottom-16 left-0 right-0 overflow-y-auto w-full bg-slate-900/90 text-slate-300
        [&::-webkit-scrollbar]:w-2 
        [&::-webkit-scrollbar-thumb]:bg-slate-700 
        [&::-webkit-scrollbar-track]:bg-slate-800/50"
      >
        <div className="divide-y divide-slate-700/50">
          {messages.length === 0 ? (
            <div className="h-full min-h-[400px] flex items-center justify-center text-slate-500">
              <div className="flex flex-col items-center gap-2">
                <MessageSquare className="h-6 w-6 md:h-8 md:w-8" />
                <p className="text-xs md:text-sm font-medium">No Messages</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {messages.map((msg, index) => {
                const style = getMessageStyle(msg);
                return (
                  <div
                    key={index}
                    className={cn(
                      "group transition-all duration-200",
                      expandedMessage === index ? style.activeBg : style.bg
                    )}
                  >
                    <div
                      onClick={() =>
                        setExpandedMessage(
                          expandedMessage === index ? null : index
                        )
                      }
                      className="flex items-center gap-3 px-3 md:px-4 py-2 transition-colors cursor-pointer"
                    >
                      <div className={cn("shrink-0", style.icon)}>
                        {msg.content.startsWith("Connected") ? (
                          <PlugZap2 className="h-4 w-4" />
                        ) : msg.content.startsWith("Disconnected") ? (
                          <Unplug className="h-4 w-4" />
                        ) : msg.content.startsWith("Connection error") ||
                          msg.content.startsWith("Failed") ? (
                          <XCircle className="h-4 w-4" />
                        ) : msg.type === "sent" ? (
                          <ArrowUpCircle className="h-4 w-4" />
                        ) : (
                          <ArrowDownCircle className="h-4 w-4" />
                        )}
                      </div>

                      <div className="hidden md:block text-[11px] md:text-xs text-slate-500 min-w-[90px] font-normal">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </div>

                      <Clock className="md:hidden h-3.5 w-3.5 text-slate-500" />

                      <div className="flex-1 text-xs md:text-sm font-normal">
                        <div className={cn("px-1", style.text)}>
                          {msg.content}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyMessage(msg.content);
                          }}
                          className="h-6 w-6 md:h-7 md:w-7 p-0 hover:bg-slate-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Copy className="h-3.5 w-3.5 md:h-4 md:w-4 text-slate-400" />
                        </Button>
                      </div>
                    </div>

                    {expandedMessage === index && (
                      <div
                        className={cn(
                          "px-3 md:px-4 py-2 text-[11px] md:text-xs space-y-2",
                          style.activeBg,
                          style.border
                        )}
                      >
                        <div className="flex items-center justify-between text-slate-400">
                          <div className="font-medium">Type: {msg.type}</div>
                          <time className="text-slate-500 font-normal">
                            {new Date(msg.timestamp).toLocaleString()}
                          </time>
                        </div>
                        {isJsonString(msg.content) && (
                          <div className="mt-2 bg-slate-900/50 rounded p-2 overflow-x-auto border border-slate-700/50">
                            <pre className="text-sm text-blue-400 font-normal">
                              {formatJsonMessage(msg.content)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 border-t border-slate-700 bg-slate-800/50">
        <div className="h-16 p-3 flex items-center gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs md:text-sm font-medium">
              $
            </span>
            <Input
              value={message}
              onChange={handleMessageChange}
              placeholder={getMessagePlaceholder()}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && handleSend()
              }
              disabled={!isConnected}
              className="pl-7 bg-slate-900 border-slate-700 rounded pr-12
                text-xs md:text-sm text-slate-300 font-normal placeholder:text-slate-600 
                focus-visible:ring-1 focus-visible:ring-slate-700 
                focus-visible:ring-offset-0"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] md:text-[11px] font-medium",
                  messageFormat === "json"
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "bg-slate-800 text-slate-400 border border-slate-700"
                )}
              >
                {messageFormat.toUpperCase()}
              </span>
            </div>
          </div>
          <Button
            onClick={handleSend}
            disabled={!isConnected || !message.trim()}
            size="icon"
            className="shrink-0 bg-slate-900 hover:bg-slate-800 rounded 
              text-slate-400 disabled:bg-slate-900/50 disabled:text-slate-600 border border-slate-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
