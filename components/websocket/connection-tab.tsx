"use client";

import React from "react";
import { Activity, Unplug, PlugZap2, Network } from "lucide-react";
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

  const rates = calculateRates();

  const statsCards = [
    {
      id: "sent",
      title: "Sent",
      icon: <PlugZap2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-500" />,
      value: stats.messagesSent.toLocaleString(),
      badge: (
        <Badge
          variant="secondary"
          className="text-[9px] md:text-[10px] h-4 bg-slate-800 text-emerald-500 border-slate-700"
        >
          ↑ Out
        </Badge>
      ),
      rate: `${rates.sentRate}/min`,
      color: "text-emerald-500",
      bgGradient: "from-emerald-500/10 to-transparent",
    },
    {
      id: "received",
      title: "Received",
      icon: <Unplug className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-500" />,
      value: stats.messagesReceived.toLocaleString(),
      badge: (
        <Badge
          variant="secondary"
          className="text-[9px] md:text-[10px] h-4 bg-slate-800 text-blue-500 border-slate-700"
        >
          ↓ In
        </Badge>
      ),
      rate: `${rates.receivedRate}/min`,
      color: "text-blue-500",
      bgGradient: "from-blue-500/10 to-transparent",
    },
  ];

  return (
    <motion.div
      className="h-full overflow-y-auto p-2 md:p-4 space-y-2 md:space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Connection Status Card */}
      <Card className="border-slate-700/50 bg-slate-900/50 overflow-hidden">
        <CardContent className="p-3 md:p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Network className="h-3.5 w-3.5 md:h-4 md:w-4 text-purple-500" />
              <span className="text-xs text-slate-400">Connection</span>
            </div>
            <Badge
              variant="secondary"
              className={cn(
                "text-[9px] md:text-[10px] px-2 h-4",
                "duration-1000",
                connectionStatus === "connected"
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : connectionStatus === "connecting"
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    : "bg-red-500/20 text-red-400 border-red-500/30"
              )}
            >
              {connectionStatus.toUpperCase()}
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="text-sm md:text-base font-semibold text-slate-200">
              {isConnected
                ? `${Math.floor(connectionTime! / 60)}m ${connectionTime! % 60}s`
                : "Disconnected"}
            </div>
            <div className="text-[10px] md:text-xs text-slate-500 truncate">
              {url}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 md:gap-4">
        {statsCards.map((card) => (
          <Card
            key={card.id}
            className="border-slate-700/50 bg-slate-900/50 overflow-hidden"
          >
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {card.icon}
                  <span className="text-xs text-slate-400">{card.title}</span>
                </div>
                {card.badge}
              </div>
              <motion.div
                className={cn(
                  "text-2xl md:text-3xl font-bold tracking-tight",
                  card.color
                )}
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                {card.value}
              </motion.div>
              <div className="mt-2 flex items-center justify-between text-[10px] md:text-xs">
                <span className="text-slate-400">Rate</span>
                <span className={card.color}>{card.rate}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Message Rate Card */}
      <Card className="border-slate-700/50 bg-slate-900/50 overflow-hidden">
        <CardContent className="p-3 md:p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 md:h-4 md:w-4 text-indigo-500" />
              <span className="text-xs text-slate-400">Message Rate</span>
            </div>
            {isConnected && (
              <Badge
                variant="secondary"
                className="text-[9px] md:text-[10px] h-4 bg-slate-800 text-indigo-500 border-slate-700"
              >
                Active
              </Badge>
            )}
          </div>
          <div className="space-y-3">
            <div
              className={cn(
                "text-2xl md:text-3xl font-bold tracking-tight",
                !isConnected ? "text-slate-500" : "text-indigo-500"
              )}
            >
              {rates.messagesPerMinute}
              <span className="text-sm md:text-base text-slate-400 ml-1">
                msg/min
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px] md:text-xs pt-2 border-t border-slate-700/50">
              <span className="text-slate-400">Total Messages</span>
              <span className="text-slate-300 font-medium">
                {(stats.messagesSent + stats.messagesReceived).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {!isConnected && stats.messagesSent + stats.messagesReceived > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 p-2 bg-slate-800/50 rounded-lg text-xs text-slate-400 text-center border border-slate-700/50"
        >
          Session ended • {stats.messagesSent + stats.messagesReceived} messages
          exchanged
        </motion.div>
      )}
    </motion.div>
  );
}
