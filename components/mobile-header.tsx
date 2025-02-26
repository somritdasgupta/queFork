import React, { useState, useEffect } from "react";
import { EnvironmentSelector } from "@/components/environment-selector";
import { Button } from "@/components/ui/button";
import { Layers } from "lucide-react";
import SidePanel from "./side-panel";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Environment, SidePanelProps } from "@/types";
import { UrlBar } from "./url-bar";
import { MethodSelector } from "./url-bar/method-selector";
import { ActionButton } from "./url-bar/action-button";

type PanelType = "tabs" | "collections" | "history" | "environments";

interface MobileHeaderProps {
  hasExtension: boolean;
  interceptorEnabled: boolean;
  toggleInterceptor: () => void;
  environments: Environment[];
  currentEnvironment: Environment | null;
  onEnvironmentChange: (environmentId: string) => void;
  urlBarProps: any;
  mobileNavProps: SidePanelProps;
}

export function MobileHeader({
  hasExtension,
  interceptorEnabled,
  toggleInterceptor,
  environments,
  currentEnvironment,
  onEnvironmentChange,
  urlBarProps,
  mobileNavProps,
}: MobileHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPanel, setCurrentPanel] = useState<PanelType>("tabs");

  useEffect(() => {
    const handleSaveRequest = (e: CustomEvent) => {
      if (e.detail.openSheet && e.detail.isMobile) {
        setIsOpen(true);
        setCurrentPanel("collections");
      }
    };

    window.addEventListener(
      "saveAndShowRequest",
      handleSaveRequest as EventListener
    );
    return () => {
      window.removeEventListener(
        "saveAndShowRequest",
        handleSaveRequest as EventListener
      );
    };
  }, []);

  const handleOpenPanel = () => {
    setIsOpen(true);
  };

  return (
    <>
      <div className="w-full flex flex-col items-stretch gap-2 px-4 py-2">
        {/* First Row: URL Bar + Action Button */}
        <div className="w-full flex items-center gap-2">
          <div className="flex-1">
            <UrlBar
              {...urlBarProps}
              isMobile={true}
              hideMethodSelector={true}
              onStateUpdate={(updates) => {
                // Handle WebSocket mode updates
                if (updates.isWebSocketMode !== undefined) {
                  urlBarProps.onWebSocketToggle();
                }
              }}
            />
          </div>
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

        {/* Second Row: Method, Environment, Layers */}
        <div className="flex items-center gap-2">
          <MethodSelector
            method={urlBarProps.method}
            onMethodChange={urlBarProps.onMethodChange}
            isMobile={true}
            isWebSocketMode={urlBarProps.isWebSocketMode}
          />
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
          <Button
            variant="default"
            size="icon"
            onClick={handleOpenPanel}
            className="w-16 h-8 border-2 border-slate-800 bg-slate-900 hover:bg-slate-800 
              transition-colors rounded-lg flex items-center justify-center"
          >
            <Layers
              className="h-4 w-4"
              strokeWidth={1}
              style={{
                stroke: "white",
                fill: "yellow",
                fillOpacity: 0.25,
              }}
            />
          </Button>
        </div>
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          position="bottom"
          className="w-[100vw] p-0 h-[80vh] rounded-t-2xl bg-slate-950
            backdrop-blur-xl
            border-t-2 border-slate-800/60
            shadow-[0_-15px_50px_-15px_rgba(0,0,0,0.45)]
            animate-in slide-in-from-bottom duration-300
            overflow-hidden"
        >
          <SheetTitle className="sr-only">Navigation Panel</SheetTitle>
          <SidePanel
            {...mobileNavProps}
            isMobile={true}
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            defaultPanel={currentPanel}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
