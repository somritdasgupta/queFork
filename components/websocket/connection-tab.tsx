"use client";

import React from "react";
import {
  Activity,
  Network,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  Database,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWebSocket } from "./websocket-context";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function ConnectionTab() {
  const { isConnected, connectionStatus, stats, connectionTime, url } =
    useWebSocket();

  // Calculate rates and stats
  const calculateRates = () => {
    if (!isConnected || !connectionTime)
      return {
        messagesPerMinute: 0,
        sentRate: 0,
        receivedRate: 0,
        totalRate: 0,
      };

    const timeInMinutes = connectionTime / 60;
    return {
      messagesPerMinute: (
        (stats.messagesSent + stats.messagesReceived) /
        timeInMinutes
      ).toFixed(1),
      sentRate: (stats.messagesSent / timeInMinutes).toFixed(1),
      receivedRate: (stats.messagesReceived / timeInMinutes).toFixed(1),
      totalRate: (
        (stats.messagesSent + stats.messagesReceived) /
        timeInMinutes
      ).toFixed(1),
    };
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const rates = calculateRates();

  const statsCards = [
    {
      id: "connection",
      title: "Status",
      value: isConnected
        ? `${Math.floor(connectionTime! / 60)}m ${connectionTime! % 60}s`
        : "Disconnected",
      icon: <Network className="h-4 w-4" />,
      color:
        connectionStatus === "connected"
          ? "yellow"
          : connectionStatus === "connecting"
            ? "emerald"
            : "red",
      subValue: url,
    },
    {
      id: "messages",
      title: "Rate",
      value: `${rates.messagesPerMinute}/min`,
      icon: <Activity className="h-4 w-4" />,
      subValue: `${(stats.messagesSent + stats.messagesReceived).toLocaleString()} total`,
      color: "cyan",
    },
    {
      id: "sent",
      title: "Sent",
      value: stats.messagesSent.toLocaleString(),
      icon: <ArrowUpCircle className="h-4 w-4" />,
      subValue: `${rates.sentRate}/min`,
      color: "emerald",
    },
    {
      id: "received",
      title: "Received",
      value: stats.messagesReceived.toLocaleString(),
      icon: <ArrowDownCircle className="h-4 w-4" />,
      subValue: `${rates.receivedRate}/min`,
      color: "blue",
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-2 gap-3 p-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {statsCards.map((card) => (
        <Card
          key={card.id}
          className={cn(
            "border-slate-800 bg-slate-900/50",
            "hover:bg-slate-900/70 transition-colors",
            "overflow-hidden"
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`text-${card.color}-500`}>{card.icon}</div>
                <span className="text-xs font-medium text-slate-400">
                  {card.title}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <div
                className={cn(
                  "text-lg font-bold tracking-tight",
                  `text-${card.color}-500`
                )}
              >
                {card.value}
              </div>
              {card.subValue && (
                <div className="text-[10px] text-slate-500 truncate">
                  {card.subValue}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Additional stats in smaller cards */}
      <div className="col-span-2 grid grid-cols-2 gap-3">
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-yellow-500" />
              <span className="text-xs text-slate-400">Uptime</span>
            </div>
            <span className="text-xs font-medium text-purple-400">
              {isConnected ? `${Math.floor(connectionTime! / 60)}m` : "---"}
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-cyan-500" />
              <span className="text-xs text-slate-400">Data</span>
            </div>
            <span className="text-xs font-bold text-cyan-400">
              {formatBytes(stats.bytesTransferred)}
            </span>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
