"use client";

import { useEffect } from "react";

const WebSocketHandler: React.FC = () => {
  useEffect(() => {
    const ws = new WebSocket("your-websocket-url");

    ws.onmessage = (event) => {
      console.log("Received:", event.data);
    };

    // Remove ws.close() to keep the connection open
    return () => {
      // ws.close(); // Cleans up on unmount
    };
  }, []);

  return null;
};

export default WebSocketHandler;
