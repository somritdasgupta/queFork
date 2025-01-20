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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = () => {
    if (!isConnected || !message.trim()) return;

    try {
      let formattedMessage = message;
      if (messageFormat === "json") {
        formattedMessage = JSON.stringify(JSON.parse(message));
      }

      sendMessage(formattedMessage);
      setMessage("");
    } catch (error) {
      toast.error(
        messageFormat === "json"
          ? "Invalid JSON format"
          : "Failed to send message"
      );
    }
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
    <div className="relative w-full h-full min-h-[500px] bg-zinc-50 overflow-hidden font-mono text-sm"> {/* Added min-h-[500px] */}
      <div className="absolute top-0 left-0 right-0 z-50 border-b bg-zinc-100 rounded-t-xl">
        <div className="h-14 px-3 flex items-center gap-2 overflow-x-auto">
          <Select
            value={messageFormat}
            onValueChange={(value: "text" | "json") => setMessageFormat(value)}
          >
            <SelectTrigger className="w-24 h-8 bg-white border-zinc-200">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>

          <Badge
            variant="outline"
            className="h-8 border-zinc-200 bg-white whitespace-nowrap"
          >
            {messages.length}
          </Badge>

          <div className="flex items-center gap-2 ml-auto">
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
              className="h-8 px-2 hover:bg-zinc-200"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearMessages}
              className="h-8 px-2 hover:bg-zinc-200"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={exportMessages}
              className="h-8 px-2 hover:bg-zinc-200"
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

      <div
        className="absolute top-14 bottom-16 left-0 right-0 overflow-y-auto bg-white w-full"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgba(228, 228, 231, 0.2) 1px, transparent 1px)",
          backgroundSize: "100% 24px",
        }}
      >
        <div className="p-4">
          {messages.length === 0 ? (
            <div className="h-full min-h-[400px] flex items-center justify-center text-zinc-400">
              <div className="flex flex-col items-center gap-2">
                <MessageSquare className="h-8 w-8" />
                <p className="text-sm">No Messages</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={cn(
                    "group border-l-2 pl-3 py-1",
                    msg.type === "sent"
                      ? "border-l-blue-500 bg-blue-50/50"
                      : "border-l-green-500 bg-green-50/50"
                  )}
                >
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                    <span className="font-bold flex items-center">
                      {msg.type === "sent" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )}
                    </span>
                    <time>{new Date(msg.timestamp).toLocaleTimeString()}</time>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyMessage(msg.content)}
                      className="h-5 w-5 p-0 ml-auto opacity-0 group-hover:opacity-100 hover:bg-zinc-200 md:block hidden"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <pre className="whitespace-pre-wrap break-words text-zinc-800 text-xs md:text-sm">
                    {msg.content}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyMessage(msg.content)}
                    className="h-5 w-5 p-0 mt-1 hover:bg-zinc-200 md:hidden block"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 border-t bg-zinc-100 rounded-b-xl">
        <div className="h-16 p-3 flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                isConnected
                  ? messageFormat === "json"
                    ? 'Enter JSON: {"key": "value"}'
                    : "Type a command..."
                  : "Connect to start..."
              }
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && handleSend()
              }
              disabled={!isConnected}
              className="font-mono bg-white border-zinc-200 rounded-xl pr-16"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-zinc-200 px-2 py-0.5 rounded-full text-xs font-medium text-zinc-700">
              {messageFormat.toUpperCase()}
            </span>
          </div>
          <Button
            onClick={handleSend}
            disabled={!isConnected || !message.trim()}
            size="icon"
            className="shrink-0 bg-zinc-800 hover:bg-zinc-900 rounded-xl"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
