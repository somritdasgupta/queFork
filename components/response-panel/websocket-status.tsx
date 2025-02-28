import { Badge } from "@/components/ui/badge";
import { PlugZap2, Unplug } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWebSocket } from "@/components/websocket/websocket-context";

interface WebSocketStatusProps {
  url?: string;
}

export const WebSocketStatus = ({ url }: WebSocketStatusProps) => {
  const { isConnected } = useWebSocket();

  const getStatusMessage = () => {
    if (!url) return "Not connected";
    const formattedUrl = url.replace(/^wss?:\/\//, "");
    return isConnected
      ? `Connected to ${formattedUrl}`
      : `Disconnected from ${formattedUrl}`;
  };

  return (
    <Badge
      className={cn(
        "px-2 py-1 rounded-lg",
        isConnected
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          : "bg-orange-500/10 text-orange-400 border-orange-500/20"
      )}
    >
      {isConnected ? (
        <PlugZap2 className="h-3.5 w-3.5 mr-1.5" />
      ) : (
        <Unplug className="h-3.5 w-3.5 mr-1.5" />
      )}
      <span className="text-xs font-medium">{getStatusMessage()}</span>
    </Badge>
  );
};
