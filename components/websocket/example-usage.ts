// Example usage:

import { useWebSocket } from "./websocket-context";

// 1. Basic WebSocket
const basicExample = () => {
  const { connect, sendMessage } = useWebSocket();
  
  // Connect without any protocol
  connect();
  
  // Send a simple message
  sendMessage("Hello Echo Server!");
};

// 2. GraphQL WebSocket
const graphqlExample = () => {
  const { connect, sendMessage } = useWebSocket();
  
  // Connect with GraphQL protocol
  connect(["graphql-ws"]);
  
  // Initialize connection
  sendMessage(JSON.stringify({
    type: "connection_init",
    payload: {}
  }));
  
  // Send subscription
  sendMessage(JSON.stringify({
    type: "subscribe",
    id: "1",
    payload: {
      query: "subscription { messages { id text } }"
    }
  }));
};

// 3. MQTT Example
const mqttExample = () => {
  const { connect, sendMessage } = useWebSocket();
  
  // Connect with MQTT protocol
  connect(["mqtt"]);
  
  // Subscribe to a topic
  sendMessage(JSON.stringify({
    type: "subscribe",
    topic: "test/topic"
  }));
  
  // Publish to topic
  sendMessage(JSON.stringify({
    type: "publish",
    topic: "test/topic",
    payload: "Hello MQTT World!"
  }));
};
