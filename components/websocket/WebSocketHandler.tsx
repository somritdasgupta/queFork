"use client";

import { useEffect } from "react";

const WebSocketHandler: React.FC = () => {
  useEffect(() => {
    const ws = new WebSocket("your-websocket-url");

    ws.onmessage = (event) => {
      console.log("Received:", event.data);
    };
  }, []);

  return null;
};

export default WebSocketHandler;
