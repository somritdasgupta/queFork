import { useCallback, useMemo } from "react";
import { TabItem } from "@/types/tabs";
import {
  SquareChartGanttIcon,
  SquareCodeIcon,
  SquareAsteriskIcon,
  SquareActivityIcon,
  SquareFunctionIcon,
  SquarePlay,
  MessageSquare,
} from "lucide-react";
import React from "react";

interface UseTabPanelProps {
  isWebSocketMode: boolean;
}

export function useTabPanel({ isWebSocketMode }: UseTabPanelProps) {
  const tabs: TabItem[] = useMemo(
    () => [
      {
        id: "messages",
        label: "Messages",
        icon: React.createElement(MessageSquare, {
          className: "h-4 w-4",
          strokeWidth: 2,
          style: {
            stroke: "currentColor",
            fill: "yellow",
            fillOpacity: 0.2,
          },
        }),
        hidden: !isWebSocketMode,
      },
      {
        id: "params",
        label: "Query",
        icon: React.createElement(SquareChartGanttIcon, {
          className: "h-4 w-4",
          strokeWidth: 2,
          style: {
            stroke: "currentColor",
            fill: "yellow",
            fillOpacity: 0.2,
          },
        }),
        disabled: isWebSocketMode,
      },
      {
        id: "headers",
        label: "Headers",
        icon: React.createElement(SquareCodeIcon, {
          className: "h-4 w-4",
          strokeWidth: 2,
          style: {
            stroke: "currentColor",
            fill: "yellow",
            fillOpacity: 0.2,
          },
        }),
        disabled: isWebSocketMode,
      },
      {
        id: "auth",
        label: "Auth",
        icon: React.createElement(SquareAsteriskIcon, {
          className: "h-4 w-4",
          strokeWidth: 2,
          style: {
            stroke: "currentColor",
            fill: "yellow",
            fillOpacity: 0.2,
          },
        }),
        disabled: isWebSocketMode,
      },
      {
        id: "body",
        label: "Body",
        icon: React.createElement(SquareActivityIcon, {
          className: "h-4 w-4",
          strokeWidth: 2,
          style: {
            stroke: "currentColor",
            fill: "yellow",
            fillOpacity: 0.2,
          },
        }),
        disabled: isWebSocketMode,
      },
      {
        id: "pre-request",
        label: "Pre-request",
        icon: React.createElement(SquareFunctionIcon, {
          className: "h-4 w-4",
          strokeWidth: 2,
          style: {
            stroke: "currentColor",
            fill: "yellow",
            fillOpacity: 0.2,
          },
        }),
        disabled: isWebSocketMode,
      },
      {
        id: "tests",
        label: "Tests",
        icon: React.createElement(SquarePlay, {
          className: "h-4 w-4",
          strokeWidth: 2,
          style: {
            stroke: "currentColor",
            fill: "yellow",
            fillOpacity: 0.2,
          },
        }),
        disabled: isWebSocketMode,
      },
    ],
    [isWebSocketMode]
  );

  const setFocus = useCallback((id: string) => {
    const tabTrigger = document.querySelector(`[data-state][value="${id}"]`);
    if (tabTrigger instanceof HTMLElement) {
      tabTrigger.click();
    }
  }, []);

  return { tabs, setFocus };
}
