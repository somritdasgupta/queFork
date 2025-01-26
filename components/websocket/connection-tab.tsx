"use client";

import React, { useState } from "react";
import { Signal, Activity, Unplug, PlugZap2, Network, Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWebSocket } from "./websocket-context";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StatsPanelProps {
  stats: {
    latency: number | null;
    messagesSent: number;
    messagesReceived: number;
    lastActivity: string;
    connectionDuration: number;
    reconnectAttempts: number;
    packetLoss: number;
  };
  latencyHistory: { timestamp: number; value: number }[];
  isConnected: boolean;
}

interface ConnectionStats {
  latency: number | null;
  messagesSent: number;
  messagesReceived: number;
  lastActivity: string;
  connectionDuration: number;
  reconnectAttempts: number;
  packetLoss: number;
}

export function ConnectionTab() {
  const {
    isConnected,
    connectionStatus,
    stats,
    connectionTime,
    url,
    connectionStartTime,
  } = useWebSocket();

  // Calculate rates and stats
  const calculateRates = () => {
    if (!isConnected || !connectionTime) return {
      messagesPerMinute: 0,
      sentRate: 0,
      receivedRate: 0,
      totalRate: 0
    };

    const timeInMinutes = connectionTime / 60;
    return {
      messagesPerMinute: ((stats.messagesSent + stats.messagesReceived) / timeInMinutes).toFixed(1),
      sentRate: (stats.messagesSent / timeInMinutes).toFixed(1),
      receivedRate: (stats.messagesReceived / timeInMinutes).toFixed(1),
      totalRate: ((stats.messagesSent + stats.messagesReceived) / timeInMinutes).toFixed(1)
    };
  };

  const rates = calculateRates();

  const statsCards = [
    {
      title: "Sent",
      icon: <PlugZap2 className="h-4 w-4 md:h-5 md:w-5 text-emerald-600" />,
      value: stats.messagesSent.toLocaleString(),
      badge: (
        <Badge variant="secondary" className="text-[10px] md:text-xs bg-emerald-50 text-emerald-600 border-emerald-100">
          ↑ Out
        </Badge>
      ),
      lastMessageTime: stats.lastMessageTime,
      valueClass: "text-3xl md:text-6xl font-bold text-emerald-600 tracking-tight",
    },
    {
      title: "Received",
      icon: <Unplug className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />,
      value: stats.messagesReceived.toLocaleString(),
      badge: (
        <Badge variant="secondary" className="text-[10px] md:text-xs bg-blue-50 text-blue-600 border-blue-100">
          ↓ In
        </Badge>
      ),
      lastMessageTime: stats.lastMessageTime,
      valueClass: "text-3xl md:text-6xl font-bold text-blue-600 tracking-tight",
    },
    {
      title: "Connection",
      icon: <Network className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />,
      value: isConnected ? `${Math.floor(connectionTime! / 60)}m ${connectionTime! % 60}s` : "Waiting for connection...",
      badge: (
        <Badge 
          variant="secondary" 
          className={cn(
            "px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs",
            connectionStatus === "connected" 
              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
              : connectionStatus === "connecting"
              ? "bg-amber-50 text-amber-600 border-amber-100"
              : "bg-red-50 text-red-600 border-red-100"
          )}
        >
          {connectionStatus.toUpperCase()}
        </Badge>
      ),
      valueClass: "text-xl md:text-2xl font-bold text-slate-700 mb-2",
      url: url,
      additionalInfo: (
        <div className="space-y-2">
          <div className="text-[10px] md:text-xs text-slate-500 mb-6 truncate">
            {url}
          </div>
          <div className="flex justify-between font-bold text-[10px] md:text-xs pt-2 border-t border-slate-100">
            <span className="text-slate-500">Total Messages:</span>
            <span className="text-slate-700 font-medium">
              {(stats.messagesSent + stats.messagesReceived).toLocaleString()}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: "Message Rate",
      icon: <Activity className="h-4 w-4 md:h-5 md:w-5 text-indigo-600" />,
      value: !isConnected ? '0' : rates.messagesPerMinute,
      badge: isConnected && (
        <Badge variant="secondary" className="text-[10px] md:text-xs bg-indigo-50 text-indigo-600 border-indigo-100">
          Active
        </Badge>
      ),
      valueClass: cn(
        "text-xl md:text-2xl font-bold tracking-tight mb-2",
        !isConnected ? "text-slate-400" : "text-indigo-600"
      ),
      suffix: <span className="text-sm md:text-base text-slate-500 ml-1">msg/min</span>,
      additionalInfo: (
        <div className="space-y-2">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] md:text-xs">
              <span className="text-slate-500">Out Rate:</span>
              <span className="text-emerald-600 font-medium">{rates.sentRate}/min</span>
            </div>
            <div className="flex justify-between text-[10px] md:text-xs">
              <span className="text-slate-500">In Rate:</span>
              <span className="text-blue-600 font-medium">{rates.receivedRate}/min</span>
            </div>
          </div>
          <div className="flex justify-between text-[10px] md:text-xs pt-2 border-t border-slate-100">
            <span className="text-slate-500">Last Minute:</span>
            <span className="text-slate-700 font-medium">{rates.messagesPerMinute} msgs</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <motion.div 
      className="h-full p-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className={cn(
        "grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4",
        !isConnected && "opacity-90" // Slightly dim when disconnected
      )}>
        {statsCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
          >
            <Card className={cn(
              "border-slate-200 overflow-hidden shadow-sm relative",
              !isConnected && "bg-slate-50/50" // Subtle background change when disconnected
            )}>
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-slate-50/50 via-transparent to-transparent"
                animate={{
                  opacity: [0.5, 0.3, 0.5],
                  scale: [1, 1.02, 1],
                }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              {/* Card content with animation overlays */}
              <CardContent className="p-3 md:p-6 relative z-10">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-2 md:mb-4">
                    <div className="flex items-center gap-2">
                      {card.icon}
                      <span className="text-xs md:text-sm font-medium text-slate-600">{card.title}</span>
                    </div>
                    {card.badge}
                  </div>
                  <div className="flex items-baseline">
                    <div className={card.valueClass}>
                      {card.value}
                    </div>
                    {card.suffix}
                  </div>
                  {card.additionalInfo}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      {!isConnected && stats.messagesSent + stats.messagesReceived > 0 && (
        <div className="mt-4 p-2 bg-slate-100/50 rounded-lg text-sm text-slate-500 text-center">
          Session ended • {stats.messagesSent + stats.messagesReceived} messages exchanged
        </div>
      )}
    </motion.div>
  );
}
