import { useContext } from "react";
import { WebSocketContext } from "../components/websocket/websocket-context";

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within WebSocketProvider");
  }
  return context;
};
