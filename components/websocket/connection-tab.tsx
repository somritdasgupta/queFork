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

const StatCard = ({
  title,
  value,
  subValue,
  icon,
  color,
}: {
  title: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  color: string;
}) => (
  <Card
    className={cn(
      "border-slate-800 bg-slate-900/50 backdrop-blur-sm",
      "hover:bg-slate-900/70 transition-colors group"
    )}
  >
    <CardContent className="p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className={`text-${color}-500`}>{icon}</div>
        <span className="text-xs font-medium text-slate-400">{title}</span>
      </div>
      <div className="space-y-1">
        <div
          className={cn(
            "text-base font-bold tracking-tight",
            `text-${color}-500 group-hover:text-${color}-400 transition-colors`
          )}
        >
          {value}
        </div>
        {subValue && (
          <div className="text-[10px] text-slate-500 truncate">{subValue}</div>
        )}
      </div>
    </CardContent>
  </Card>
);

const MiniStatCard = ({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) => (
  <Card className="border-slate-800 bg-slate-900/50 group hover:bg-slate-900/70 transition-colors">
    <CardContent className="p-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`text-${color}-500`}>{icon}</div>
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <span
        className={cn(
          "text-xs font-medium",
          `text-${color}-500 group-hover:text-${color}-400 transition-colors`
        )}
      >
        {value}
      </span>
    </CardContent>
  </Card>
);

export function ConnectionTab() {
  const { isConnected, connectionStatus, stats, connectionTime, url } =
    useWebSocket();

  const calculateRates = () => {
    if (!isConnected || !connectionTime) {
      return {
        messagesPerMinute: 0,
        sentRate: 0,
        receivedRate: 0,
        totalRate: 0,
      };
    }

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

  const mainStats = [
    {
      title: "Status",
      value: isConnected
        ? `${Math.floor(connectionTime! / 60)}m ${connectionTime! % 60}s`
        : "Disconnected",
      subValue: url,
      icon: <Network className="h-3.5 w-3.5" />,
      color:
        connectionStatus === "connected"
          ? "yellow"
          : connectionStatus === "connecting"
            ? "emerald"
            : "red",
    },
    {
      title: "Messages",
      value: `${rates.messagesPerMinute}/min`,
      subValue: `${(stats.messagesSent + stats.messagesReceived).toLocaleString()} total`,
      icon: <Activity className="h-3.5 w-3.5" />,
      color: "blue",
    },
    {
      title: "Sent",
      value: stats.messagesSent.toLocaleString(),
      subValue: `${rates.sentRate}/min`,
      icon: <ArrowUpCircle className="h-3.5 w-3.5" />,
      color: "emerald",
    },
    {
      title: "Received",
      value: stats.messagesReceived.toLocaleString(),
      subValue: `${rates.receivedRate}/min`,
      icon: <ArrowDownCircle className="h-3.5 w-3.5" />,
      color: "purple",
    },
  ];

  const miniStats = [
    {
      label: "Uptime",
      value: isConnected ? `${Math.floor(connectionTime! / 60)}m` : "---",
      icon: <Clock className="h-3.5 w-3.5" />,
      color: "yellow",
    },
    {
      label: "Data",
      value: formatBytes(stats.bytesTransferred),
      icon: <Database className="h-3.5 w-3.5" />,
      color: "cyan",
    },
  ];

  return (
    <motion.div
      className="p-2 space-y-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="grid grid-cols-2 gap-2">
        {mainStats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {miniStats.map((stat) => (
          <MiniStatCard key={stat.label} {...stat} />
        ))}
      </div>
    </motion.div>
  );
}
