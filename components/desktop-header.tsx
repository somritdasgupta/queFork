import React from "react";
import { EnvironmentSelector } from "@/components/environment-selector";
import { UrlBar } from "@/components/url-bar";
import { Environment } from "@/types";
import { ActionButton } from "./url-bar/action-button";
import { MethodSelector } from "./url-bar/method-selector";

interface DesktopHeaderProps {
  hasExtension: boolean;
  interceptorEnabled: boolean;
  toggleInterceptor: () => void;
  environments: Environment[];
  currentEnvironment: Environment | null;
  onEnvironmentChange: (environmentId: string) => void;
  urlBarProps: any;
}

export function DesktopHeader({
  hasExtension,
  interceptorEnabled,
  toggleInterceptor,
  environments,
  currentEnvironment,
  onEnvironmentChange,
  urlBarProps,
}: DesktopHeaderProps) {
  return (
    <div className="w-full flex flex-col 3xl:flex-row items-stretch gap-2 px-4 py-2">
      <div className="flex gap-2 3xl:w-[280px] shrink-0">
        <div className="flex items-center gap-2 w-full">
          {hasExtension && (
            <button
              onClick={toggleInterceptor}
              className={`hidden md:flex h-8 w-8 items-center justify-center rounded-lg transition-colors border ${
                interceptorEnabled
                  ? "bg-slate-900 hover:border-blue-900 border-slate-800 border-2 text-slate-300"
                  : "bg-slate-900 hover:border-blue-900 border-slate-800 border-2 text-slate-500"
              }`}
              title={`Interceptor ${interceptorEnabled ? "enabled" : "disabled"}`}
            >
              <img
                src="/icons/icon192.png"
                alt="queFork"
                className={`w-6 h-6 transition-all ${
                  interceptorEnabled
                    ? "opacity-100 animate-pulse duration-1200 easeIn"
                    : "opacity-100 grayscale"
                }`}
              />
            </button>
          )}
          <div className="flex-1">
            <EnvironmentSelector
              environments={environments}
              currentEnvironment={currentEnvironment}
              onEnvironmentChange={onEnvironmentChange}
              hasExtension={hasExtension}
              interceptorEnabled={interceptorEnabled}
              className="h-8 w-full bg-slate-900 hover:bg-slate-800 border-2 border-slate-800
                text-slate-300 rounded-lg transition-colors"
            />
          </div>
        </div>
      </div>
      <div className="w-full flex flex-1 gap-2">
        <MethodSelector
          method={urlBarProps.method}
          onMethodChange={urlBarProps.onMethodChange}
          isMobile={false}
          isWebSocketMode={urlBarProps.isWebSocketMode}
        />
        <UrlBar {...urlBarProps} />
        <ActionButton
          urlType={urlBarProps.isWebSocketMode ? "websocket" : "http"}
          isConnected={urlBarProps.wsState?.isConnected}
          connectionStatus={urlBarProps.wsState?.connectionStatus}
          isLoading={urlBarProps.isLoading}
          isValidUrl={true}
          url={urlBarProps.url}
          onConnect={urlBarProps.onConnect}
          onDisconnect={urlBarProps.onDisconnect}
          onWebSocketAction={
            urlBarProps.wsState?.isConnected
              ? () => urlBarProps.onDisconnect?.()
              : () => urlBarProps.onConnect?.()
          }
          onSendRequest={urlBarProps.onSendRequest}
        />
      </div>
    </div>
  );
}
