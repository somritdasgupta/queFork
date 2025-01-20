import React, { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Network, Signal, Send } from "lucide-react";
import { toast } from "sonner"; // Change this import
import { useWebSocket } from "./websocket-context";

const PROTOCOL_CONFIGS = {
  "graphql-ws": {
    name: "GraphQL",
    description: "GraphQL over WebSocket",
    defaultUrl: "wss://realtime-chat.hasura.app/v1/graphql",
    placeholder: "Enter GraphQL subscription or query",
    messageTemplate: {
      subscription: `subscription {
  messages {
    id
    text
  }
}`,
      query: `query {
  users {
    id
    name
  }
}`
    }
  },
  "mqtt": {
    name: "MQTT",
    description: "Message Queue Telemetry Transport",
    defaultUrl: "wss://test.mosquitto.org:8081",
    placeholder: "Enter topic to subscribe/publish",
    messageTemplate: {
      subscribe: "test/topic",
      publish: "Hello MQTT!"
    }
  }
};

export function ProtocolsTab() {
  const { activeProtocols, connect, disconnect, sendMessage, isConnected, url, onUrlChange } = useWebSocket();
  const [selectedProtocol, setSelectedProtocol] = useState<keyof typeof PROTOCOL_CONFIGS | null>(null);
  const [message, setMessage] = useState("");
  const [isAttemptingConnection, setIsAttemptingConnection] = useState(false);

  // Add protocol state persistence
  useEffect(() => {
    // Try to restore previously selected protocol
    const lastProtocol = localStorage.getItem('lastSelectedProtocol');
    if (lastProtocol && PROTOCOL_CONFIGS[lastProtocol as keyof typeof PROTOCOL_CONFIGS]) {
      setSelectedProtocol(lastProtocol as keyof typeof PROTOCOL_CONFIGS);
      const defaultUrl = PROTOCOL_CONFIGS[lastProtocol as keyof typeof PROTOCOL_CONFIGS].defaultUrl;
      onUrlChange(defaultUrl);
    }
  }, []);

  const handleProtocolSelect = (protocol: keyof typeof PROTOCOL_CONFIGS) => {
    setSelectedProtocol(protocol);
    localStorage.setItem('lastSelectedProtocol', protocol);
    const defaultUrl = PROTOCOL_CONFIGS[protocol]?.defaultUrl || "";
    onUrlChange(defaultUrl);
    const template = PROTOCOL_CONFIGS[protocol]?.messageTemplate;
    setMessage('subscription' in template ? template.subscription : template.subscribe || "");
  };

  const handleConnect = async () => {
    if (!selectedProtocol || !url || isAttemptingConnection) return;

    try {
      setIsAttemptingConnection(true);

      if (isConnected) {
        await disconnect();
      }

      // Small delay to ensure disconnect completes
      await new Promise(resolve => setTimeout(resolve, 500));

      // Initialize connection with selected protocol
      connect([selectedProtocol]);
      toast(`Connecting to ${url} with ${PROTOCOL_CONFIGS[selectedProtocol].name}...`);

    } catch (error) {
      toast.error("Connection failed. Please check the URL and try again.");
    } finally {
      setIsAttemptingConnection(false);
    }
  };

  // Reset attempting state when connection status changes
  useEffect(() => {
    if (isConnected) {
      setIsAttemptingConnection(false);
    }
  }, [isConnected]);

  const handleSendMessage = () => {
    if (!message.trim() || !selectedProtocol) return;

    try {
      switch (selectedProtocol) {
        case "graphql-ws":
          sendMessage(JSON.stringify({
            type: "start",
            id: Date.now().toString(),
            payload: { query: message }
          }));
          break;

        case "mqtt":
          sendMessage(JSON.stringify({
            type: message.startsWith("subscribe") ? "subscribe" : "publish",
            topic: message.split(" ")[1],
            payload: message.split(" ").slice(2).join(" ")
          }));
          break;

        default:
          sendMessage(message);
      }
      toast("Message sent"); // Remove .success
    } catch (error) {
      toast("Failed to send message"); // Remove .error
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* Protocol Selection */}
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(PROTOCOL_CONFIGS).map(([key, config]) => (
            <Button
              key={key}
              variant={selectedProtocol === key ? "default" : "outline"}
              className="h-auto p-4 flex flex-col items-start gap-2"
              onClick={() => handleProtocolSelect(key as keyof typeof PROTOCOL_CONFIGS)}
            >
              <div className="font-bold">{config.name}</div>
              <div className="text-sm text-muted-foreground">{config.description}</div>
            </Button>
          ))}
        </div>

        {/* Connection Details */}
        {selectedProtocol && (
          <div className="space-y-4 border p-4 rounded-lg bg-background">
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder="WebSocket URL"
                className="flex-1"
              />
              <Button 
                onClick={handleConnect} 
                disabled={!url || isAttemptingConnection}
                className="min-w-[100px]"
              >
                {isAttemptingConnection ? (
                  "Connecting..."
                ) : isConnected ? (
                  "Connected"
                ) : (
                  "Connect"
                )}
              </Button>
            </div>

            {/* Message Templates */}
            {isConnected && (
              <div className="space-y-4">
                <Tabs defaultValue="templates">
                  <TabsList>
                    <TabsTrigger value="templates">Quick Actions</TabsTrigger>
                    <TabsTrigger value="custom">Custom Message</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="templates">
                    <div className="grid gap-2">
                      {selectedProtocol === "mqtt" && (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => sendMessage(JSON.stringify({
                              type: "subscribe",
                              topic: "test/topic"
                            }))}
                          >
                            Subscribe to test/topic
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => sendMessage(JSON.stringify({
                              type: "publish",
                              topic: "test/topic",
                              payload: "Hello MQTT!"
                            }))}
                          >
                            Publish to test/topic
                          </Button>
                        </>
                      )}
                      
                      {selectedProtocol === "graphql-ws" && (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => sendMessage(JSON.stringify({
                              type: "start",
                              id: Date.now().toString(),
                              payload: { 
                                query: PROTOCOL_CONFIGS["graphql-ws"].messageTemplate.subscription 
                              }
                            }))}
                          >
                            Start Subscription
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => sendMessage(JSON.stringify({
                              type: "start",
                              id: Date.now().toString(),
                              payload: { 
                                query: PROTOCOL_CONFIGS["graphql-ws"].messageTemplate.query 
                              }
                            }))}
                          >
                            Send Query
                          </Button>
                        </>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="custom">
                    <div className="space-y-2">
                      <textarea
                        className="w-full min-h-[200px] p-4 rounded-lg border font-mono"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={PROTOCOL_CONFIGS[selectedProtocol].placeholder}
                      />
                      <Button 
                        className="w-full" 
                        onClick={handleSendMessage}
                        disabled={!message.trim()}
                      >
                        <Send className="w-4 h-4 mr-2" /> Send Message
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
