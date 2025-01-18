"use client";

import { useEffect } from "react";

const WebSocketHandler: React.FC = () => {
  useEffect(() => {
    const ws = new WebSocket("your-websocket-url");

    ws.onmessage = (event) => {
      // Handle's those incoming messages
      console.log("Received:", event.data);
    };

    return () => {
      ws.close(); // Cleans up on unmount
    };
  }, []);

  return null;
};

export default WebSocketHandler;
