import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Network, Signal, Plus, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const COMMON_PROTOCOLS = [
  {
    name: "graphql-ws",
    description: "GraphQL over WebSocket protocol",
  },
  {
    name: "mqtt",
    description: "Message Queuing Telemetry Transport",
  },
  {
    name: "wss",
    description: "WebSocket Secure Protocol",
  },
  {
    name: "soap",
    description: "Simple Object Access Protocol",
  },
];

export function ProtocolsTab() {
  const [protocols, setProtocols] = useState<string[]>([]);
  const [newProtocol, setNewProtocol] = useState("");

  const addProtocol = () => {
    if (newProtocol.trim() && !protocols.includes(newProtocol.trim())) {
      setProtocols([...protocols, newProtocol.trim()]);
      setNewProtocol("");
      toast({
        title: "Protocol Added",
        description: `${newProtocol.trim()} has been added to active protocols.`,
      });
    }
  };

  const removeProtocol = (protocol: string) => {
    setProtocols(protocols.filter((p) => p !== protocol));
    toast({
      title: "Protocol Removed",
      description: `${protocol} has been removed from active protocols.`,
    });
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-0">
        {/* Protocol Management */}
        <div className="bg-card rounded-lg border shadow-sm">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Network className="w-5 h-5 text-primary" /> Protocol Management
              </h3>
              <Badge variant="outline" className="font-mono">
                {protocols.length} Active
              </Badge>
            </div>

            {/* Common Protocols */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {COMMON_PROTOCOLS.map((protocol) => (
                <button
                  key={protocol.name}
                  onClick={() => {
                    if (!protocols.includes(protocol.name)) {
                      setProtocols([...protocols, protocol.name]);
                      toast({
                        title: "Protocol Added",
                        description: `${protocol.name} has been added.`,
                      });
                    }
                  }}
                  disabled={protocols.includes(protocol.name)}
                  className={`p-3 rounded-lg border transition-all duration-200 text-left
                    ${
                      protocols.includes(protocol.name)
                        ? "bg-primary/10 border-primary/20"
                        : "hover:border-primary hover:bg-accent"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <Signal className="w-4 h-4 text-primary" />
                    <span className="font-medium">{protocol.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {protocol.description}
                  </p>
                </button>
              ))}
            </div>

            {/* Add Custom Protocol */}
            <div className="flex gap-3 mt-6">
              <div className="flex-1">
                <Input
                  value={newProtocol}
                  onChange={(e) => setNewProtocol(e.target.value)}
                  placeholder="Add custom protocol (e.g., mqtt, stomp, wamp)"
                  className="font-mono"
                  onKeyDown={(e) => e.key === "Enter" && addProtocol()}
                />
              </div>
              <Button
                onClick={addProtocol}
                disabled={!newProtocol.trim() || protocols.includes(newProtocol.trim())}
                className="gap-2"
              >
                <Plus className="w-4 h-4" /> Add Protocol
              </Button>
            </div>
          </div>
        </div>

        {/* Active Protocols */}
        {protocols.length > 0 && (
          <div className="bg-card rounded-lg border shadow-sm">
            <div className="p-6">
              <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                <Signal className="w-4 h-4" /> Active Protocols
              </h4>
              <div className="space-y-2">
                {protocols.map((protocol) => (
                  <div
                    key={protocol}
                    className="group flex items-center justify-between p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-md">
                        <Signal className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-mono font-medium">{protocol}</p>
                        {COMMON_PROTOCOLS.find((p) => p.name === protocol)?.description && (
                          <p className="text-xs text-muted-foreground">
                            {COMMON_PROTOCOLS.find((p) => p.name === protocol)?.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeProtocol(protocol)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
