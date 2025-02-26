import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, Unplug, PlugZap2, SendHorizonal } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const pulseVariants = {
  idle: {
    opacity: [0.5, 1, 0.5],
    transition: {
      repeat: Infinity,
      duration: 2,
      ease: "easeInOut",
    },
  },
};

const loadingOverlayVariants = {
  hidden: { opacity: 0, x: "-100%" },
  visible: {
    opacity: 1,
    x: "100%",
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

interface ActionButtonProps {
  urlType: "websocket" | "http";
  isConnected?: boolean;
  connectionStatus?: "disconnected" | "connecting" | "connected" | "error";
  isLoading?: boolean;
  isValidUrl: boolean;
  url: string;
  onWebSocketAction: () => void; // This will now receive either connect or disconnect handler
  onSendRequest: () => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function ActionButton({
  urlType,
  isConnected,
  connectionStatus,
  isLoading,
  isValidUrl,
  url,
  onWebSocketAction,
  onSendRequest,
  onConnect,
  onDisconnect,
}: ActionButtonProps) {
  const getButtonContent = () => {
    if (urlType === "websocket" && connectionStatus === "connecting") {
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <motion.div
            className="absolute inset-0 bg-blue-500/10"
            variants={loadingOverlayVariants}
            initial="hidden"
            animate="visible"
          />
        </div>
      );
    }

    if (urlType === "websocket") {
      return isConnected ? (
        <motion.div
          variants={pulseVariants}
          animate="idle"
          className="relative"
        >
          <Unplug className="h-4 w-4" />
        </motion.div>
      ) : (
        <PlugZap2 className="h-4 w-4" />
      );
    }

    return (
      <SendHorizonal
        className="h-4 w-4 transition-transform duration-200 text-blue-400"
        strokeWidth={2}
      />
    );
  };

  const isDisabled =
    !isValidUrl ||
    (urlType === "websocket" ? connectionStatus === "connecting" : isLoading);

  const getTooltipText = () => {
    if (urlType === "websocket") {
      switch (connectionStatus) {
        case "connecting":
          return "Connecting...";
        case "connected":
          return "Disconnect WebSocket";
        case "error":
          return "Connection Error - Click to retry";
        default:
          return "Connect WebSocket";
      }
    }
    return isLoading ? "Sending request..." : "Send Request";
  };

  const handleClick = () => {
    if (urlType === "websocket") {
      if (isConnected) {
        onDisconnect?.();
      } else {
        onConnect?.();
      }
    } else {
      onSendRequest();
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleClick}
            disabled={isDisabled || !url} // Add URL check here
            className={cn(
              "px-2 h-8 transition-all relative border-2 border-slate-800 rounded-lg",
              urlType === "websocket"
                ? isConnected
                  ? "text-white after:absolute after:inset-0"
                  : "bg-slate-900 hover:bg-slate-700 text-slate-400"
                : isLoading
                  ? "bg-slate-900 text-slate-400 cursor-not-allowed overflow-hidden"
                  : "bg-slate-900 hover:bg-slate-800 text-slate-400",
              (!isValidUrl || isLoading) && "opacity-50 cursor-not-allowed",
              "backdrop-blur-sm",
              connectionStatus === "error" && "border-red-500/50",
              connectionStatus === "connecting" && "animate-pulse"
            )}
          >
            {getButtonContent()}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {!url ? "Please enter a URL" : getTooltipText()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
