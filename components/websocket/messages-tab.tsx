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
  Unplug,
  Upload,
  Clock,
  PlugZap2,
  XCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  Settings2,
  SendHorizonal,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SelectDropdown } from "./select-dropdown";
import { formatDistance } from "date-fns";
import { CodeEditor } from "@/components/request-panel/shared/code-editor";

// Update the Message interface to make size optional since we'll calculate it
interface Message {
  type: "sent" | "received";
  content: string;
  timestamp: string;
  size?: number; // Make size optional
  protocol?: string;
  encoding?: string;
  messageType?: string;
  statusCode?: number;
  compressed?: boolean;
  retryCount?: number;
  sequenceId?: number;
}

const MESSAGE_STYLES = {
  sent: {
    bg: "hover:bg-emerald-900/20",
    activeBg: "bg-emerald-900/30",
    icon: "text-emerald-500",
    text: "text-emerald-400",
    border: "border-emerald-800/30",
  },
  received: {
    bg: "hover:bg-blue-900/20",
    activeBg: "bg-blue-900/30",
    icon: "text-blue-500",
    text: "text-blue-400",
    border: "border-blue-800/30",
  },
  connected: {
    bg: "hover:bg-yellow-900/20",
    activeBg: "bg-yellow-900/30",
    icon: "text-yellow-500",
    text: "text-yellow-500",
    border: "border-yellow-800/30",
  },
  disconnected: {
    bg: "hover:bg-orange-900/20",
    activeBg: "bg-orange-900/30",
    icon: "text-orange-500",
    text: "text-orange-500",
    border: "border-orange-800/30",
  },
  error: {
    bg: "hover:bg-red-900/20",
    activeBg: "bg-red-900/30",
    icon: "text-red-500",
    text: "text-red-500",
    border: "border-red-800/30",
  },
};

// Update getMessageSize to be more robust
const getMessageSize = (content: string | undefined) => {
  if (!content) return 0;
  return new Blob([content]).size;
};

const detectMessageType = (content: string) => {
  try {
    JSON.parse(content);
    return "JSON";
  } catch {
    return "Plain Text";
  }
};

export function MessagesTab() {
  const {
    isConnected,
    messages,
    sendMessage,
    clearMessages,
    setMessagesBulk,
    disconnect,
    url,
  } = useWebSocket();

  const getStatusMessage = () => {
    if (!url) return null;

    const formattedUrl = url.replace(/^wss?:\/\//, "");
    if (isConnected) {
      return `Connected to ${formattedUrl}`;
    }
    return `Disconnected from ${formattedUrl}`;
  };

  const [message, setMessage] = useState("");
  const [messageFormat, setMessageFormat] = useState<"text" | "json">("text");
  const [expandedMessage, setExpandedMessage] = useState<number | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isEditingJson, setIsEditingJson] = useState(false);

  useEffect(() => {
    if (messagesEndRef.current && shouldAutoScroll) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, shouldAutoScroll]);

  useEffect(() => {
    setShouldAutoScroll(expandedMessage === null);
  }, [expandedMessage]);

  const detectMessageFormat = (content: string) => {
    try {
      JSON.parse(content);
      return "json";
    } catch {
      return "text";
    }
  };

  const handleMessageChange = (newValue: string | undefined) => {
    setMessage(newValue || "");
  };

  const handleSend = () => {
    if (!isConnected || !message.trim()) return;

    try {
      let formattedMessage = message.trim();

      // If in JSON mode, validate the JSON
      if (messageFormat === "json") {
        JSON.parse(formattedMessage); // This will throw if invalid
      }

      sendMessage(formattedMessage);
      setMessage("");
      setIsEditingJson(false); // Reset to normal input after sending
      setMessageFormat("text"); // Reset format to text
    } catch (error) {
      toast.error(
        messageFormat === "json" ? "Invalid JSON" : "Failed to send message"
      );
    }
  };

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
            (msg) =>
              msg.type &&
              msg.content &&
              msg.timestamp &&
              // Add size check
              (msg.size || typeof msg.content === "string")
          )
        ) {
          // Ensure size property exists for each message
          const messagesWithSize = importedMessages.map((msg) => ({
            ...msg,
            size: msg.size || getMessageSize(msg.content),
          }));
          setMessagesBulk(messagesWithSize);
          toast.success(`Imported ${messagesWithSize.length} messages`);
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

  const formatJsonMessage = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return content;
    }
  };

  const isJsonString = (content: string) => {
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  };

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

  const handleMessageClick = (index: number) => {
    setExpandedMessage(expandedMessage === index ? null : index);
  };

  // Update renderExpandedMessage for better mobile responsiveness
  const renderExpandedMessage = (msg: Message, index: number) => {
    const style = getMessageStyle(msg);
    const msgSize = getMessageSize(msg.content);

    return (
      <div
        className={cn(
          "px-2 py-2 text-[11px] space-y-2",
          style.activeBg,
          style.border,
          "border-t"
        )}
      >
        {/* Message Details Grid - Updated for mobile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
          {/* Left Column - Basic Info */}
          <div className="space-y-2 bg-slate-900/30 rounded-lg p-2 border border-slate-800/50">
            <div className="font-medium text-slate-400">Message Details</div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Type</span>
                <span className={style.text}>{msg.type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Size</span>
                <span className={style.text}>
                  {msgSize > 1024
                    ? `${(msgSize / 1024).toFixed(1)} KB`
                    : `${msgSize} B`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Format</span>
                <span className={style.text}>
                  {detectMessageType(msg.content)}
                </span>
              </div>
            </div>
          </div>

          {/* Middle and Right columns remain the same but with improved responsive classes */}
          <div className="space-y-2 bg-slate-900/30 rounded-lg p-2 border border-slate-800/50">
            <div className="font-medium text-slate-400">Protocol Info</div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Protocol</span>
                <span className={style.text}>WebSocket</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Encoding</span>
                <span className={style.text}>UTF-8</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Message ID</span>
                <span className={style.text}>#{index + 1}</span>
              </div>
            </div>
          </div>

          {/* Right Column - Timing */}
          <div className="space-y-2 bg-slate-900/30 rounded-lg p-2 border border-slate-800/50">
            <div className="font-medium text-slate-400">Timing</div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Time</span>
                <span className={style.text}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Date</span>
                <span className={style.text}>
                  {new Date(msg.timestamp).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Age</span>
                <span className={style.text}>
                  {formatDistance(new Date(msg.timestamp), new Date(), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Preview for JSON - Updated for mobile */}
        {isJsonString(msg.content) && (
          <div className="mt-2 space-y-2 bg-slate-900/30 rounded-lg p-2 border border-slate-800/50">
            <div className="font-medium text-slate-400">Content Preview</div>
            <div className="bg-slate-900/50 rounded p-2 overflow-x-auto max-h-[200px] md:max-h-[400px]">
              <pre
                className={cn(
                  "text-xs font-mono whitespace-pre-wrap break-words",
                  style.text
                )}
              >
                {formatJsonMessage(msg.content)}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleFormatToggle = () => {
    const newFormat = messageFormat === "json" ? "text" : "json";
    setMessageFormat(newFormat);
    setIsEditingJson(newFormat === "json");
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className={cn("flex-1 overflow-y-auto min-h-0", "bg-slate-900/50")}>
        <div className="divide-y divide-slate-800/50">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="max-w-sm mx-auto p-8 text-center">
                <div className="space-y-6">
                  {/* Icon Container */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-radial from-blue-500/20 to-transparent blur-xl" />
                    <div className="relative bg-slate-800/50 w-16 h-16 mx-auto rounded-2xl border border-slate-700/50 flex items-center justify-center shadow-xl">
                      <MessageSquare
                        className="h-8 w-8 text-blue-400"
                        strokeWidth={1.5}
                      />
                    </div>
                  </div>

                  {/* Text Content */}
                  <div className="space-y-2">
                    <p className="text-sm leading-relaxed text-slate-400 max-w-[280px] mx-auto">
                      Connect to a WebSocket endpoint to start sending and
                      receiving messages in real-time
                    </p>
                  </div>

                  {/* Connection Status */}
                  <div className="pt-4 border-t border-slate-800">
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <div className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
                      <span className="text-slate-400">
                        Waiting for connection...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/50">
              {messages.map((msg, index) => {
                const isConnectionMessage =
                  msg.content.startsWith("Connected to") ||
                  msg.content.startsWith("Disconnected from");
                const style = getMessageStyle(msg);
                const currentMsgSize = getMessageSize(msg.content);
                return (
                  <div
                    key={index}
                    className={cn(
                      "group transition-all duration-200",
                      expandedMessage === index ? style.activeBg : style.bg
                    )}
                  >
                    <div
                      onClick={() => handleMessageClick(index)}
                      className="flex items-center gap-3 px-3 py-2 transition-colors cursor-pointer"
                    >
                      <div className={cn("shrink-0", style.icon)}>
                        {isConnectionMessage ? (
                          msg.content.startsWith("Connected") ? (
                            <PlugZap2 className="h-4 w-4" />
                          ) : (
                            <Unplug className="h-4 w-4" />
                          )
                        ) : msg.type === "sent" ? (
                          <ArrowUpCircle className="h-4 w-4" />
                        ) : (
                          <ArrowDownCircle className="h-4 w-4" />
                        )}
                      </div>

                      <div className="text-xs text-slate-500 min-w-[75px] font-medium tracking-tight">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </div>

                      <div className="flex-1">
                        <div
                          className={cn(
                            "text-xs font-medium font-mono tracking-tight",
                            style.text
                          )}
                        >
                          {msg.content}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyMessage(msg.content);
                        }}
                        className="h-7 w-7 p-0 hover:bg-slate-800/50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Copy className="h-3.5 w-3.5 text-slate-400" />
                      </Button>
                    </div>

                    {expandedMessage === index &&
                      renderExpandedMessage(
                        { ...msg, size: currentMsgSize },
                        index
                      )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div
          className={cn(
            "p-2 flex items-center gap-2",
            isEditingJson ? "h-48" : "h-10"
          )}
        >
          <div className="flex-1 relative">
            {!isEditingJson ? (
              <>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs md:text-sm font-medium">
                  $
                </span>
                <Input
                  value={message}
                  onChange={(e) => handleMessageChange(e.target.value)}
                  placeholder={getMessagePlaceholder()}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleSend()
                  }
                  disabled={!isConnected}
                  className={cn(
                    "pl-7 rounded-lg pr-24 text-xs md:text-sm font-normal h-8",
                    "focus-visible:ring-1 focus-visible:ring-zinc-700 focus-visible:ring-offset-0",
                    "bg-slate-900/50 border-zinc-800 text-zinc-300 placeholder:text-zinc-600"
                  )}
                />
              </>
            ) : (
              <div className="h-40 rounded-lg overflow-hidden border border-blue-800/30">
                <CodeEditor
                  value={message}
                  onChange={handleMessageChange}
                  language="json"
                  height="100%"
                  className="rounded-lg"
                />
              </div>
            )}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleFormatToggle}
                className={cn(
                  "h-4 px-2 text-[10px] font-semibold transition-colors",
                  messageFormat === "json"
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30"
                    : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700"
                )}
              >
                {messageFormat.toUpperCase()}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleSend}
              disabled={!isConnected || !message.trim()}
              size="icon"
              className="shrink-0 h-8 w-10 bg-slate-900/50 hover:bg-zinc-900 rounded-lg
                text-zinc-400 disabled:bg-slate-900/50/50 disabled:text-zinc-600 border border-zinc-800"
            >
              <SendHorizonal className="h-4 w-4" />
            </Button>

            <SelectDropdown
              trigger={
                <Button
                  size="icon"
                  variant="outline"
                  className="shrink-0 h-8 w-10 bg-slate-900/50 hover:bg-zinc-900 rounded-lg
                    text-zinc-400 border border-zinc-800"
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              }
              items={[
                {
                  label: "Import Messages",
                  icon: Upload,
                  onClick: () =>
                    document.getElementById("import-messages")?.click(),
                },
                {
                  label: "Export Messages",
                  icon: Download,
                  onClick: exportMessages,
                },
                {
                  label: "Clear Messages",
                  icon: Trash2,
                  onClick: clearMessages,
                },
                ...(isConnected
                  ? [
                      {
                        label: "Disconnect",
                        icon: Unplug,
                        onClick: disconnect,
                        className: "text-red-400",
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        </div>
      </div>
      <input
        type="file"
        id="import-messages"
        className="hidden"
        accept=".json"
        onChange={importMessages}
      />
    </div>
  );
}
