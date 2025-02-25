import React, { useState, useEffect } from "react";
import { EnvironmentSelector } from "@/components/environment-selector";
import { UrlBar } from "@/components/url-bar";
import { Environment, SidePanelProps } from "@/types";
import { Button } from "@/components/ui/button";
import { Layers } from "lucide-react";
import SidePanel from "./side-panel";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

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
        setCurrentPanel("collections"); // Set the active panel to collections
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
        <div className="flex gap-2">
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
                  className={`w-6 h-6 transition-all flex items-center justify-center ${
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
            <Button
              variant="default"
              size="icon"
              onClick={handleOpenPanel}
              className="w-8 h-8 border-2 border-slate-800 bg-slate-900 hover:bg-slate-800 transition-colors rounded-lg flex items-center justify-center"
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
        <div className="w-full flex gap-2">
          <UrlBar {...urlBarProps} />
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
