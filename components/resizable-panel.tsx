"use client";

import * as React from "react";
import * as ResizablePrimitive from "react-resizable-panels";
import { RequestResponse } from "@/types";

interface ResponsePanelProps {
  response: RequestResponse | null;
}

const ResizablePanel = React.forwardRef<
  ResizablePrimitive.ImperativePanelHandle,
  React.ComponentProps<typeof ResizablePrimitive.Panel> & ResponsePanelProps
>(({ response, className, ...props }, ref) => (
  <ResizablePrimitive.Panel
    className={`
      flex flex-col overflow-hidden
      bg-gradient-to-b from-white/60 via-slate-50/50 to-white/60
      backdrop-blur-[0px] backdrop-saturate-150
      shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]
      supports-[backdrop-filter]:bg-white/40
      motion-reduce:transition-none
      transition-[flex-basis] duration-100 ease-[cubic-bezier(0.25,0.1,0.25,1)]
      ${response?.error ? "max-h-auto" : ""}
      ${className}
    `}
    minSize={1}
    style={{ contain: "paint" }}
    {...props}
    ref={ref}
  />
));
ResizablePanel.displayName = "ResizablePanel";

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean;
}) => {
  return (
    <ResizablePrimitive.PanelResizeHandle
      className={`
        group relative flex items-center justify-center
        data-[panel-group-direction=vertical]:h-1
        data-[panel-group-direction=vertical]:w-full
        data-[panel-group-direction=horizontal]:w-1.5
        data-[panel-group-direction=horizontal]:h-full
        data-[panel-group-direction=horizontal]:bg-transparent
        hover:bg-transparent
        active:bg-transparent
        bg-transparent
        transition-opacity duration-50
        cursor-row-resize
        select-none
        touch-pan-y
        will-change-transform
        ${className}
      `}
      style={{
        contain: "strict",
        touchAction: "none",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        WebkitTouchCallout: "none",
      }}
      {...props}
    >
      {withHandle && (
        <div className="relative w-12 h-0.5 bg-transparent before:absolute before:inset-0 before:bg-slate-600 before:w-full before:h-full before:backdrop-blur-sm transition-all duration-150" />
      )}
    </ResizablePrimitive.PanelResizeHandle>
  );
};

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
  <ResizablePrimitive.PanelGroup
    className={`
      flex h-full w-full 
      data-[panel-group-direction=vertical]:flex-col
      bg-transparent
      will-change-[height]
      motion-reduce:transition-none
      ${className}
    `}
    autoSaveId="panel-group-layout"
    style={{
      contain: "strict",
      touchAction: "none",
    }}
    {...props}
  />
);

export { ResizablePanel, ResizableHandle, ResizablePanelGroup };
