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
      border border-slate-200/30
      bg-gradient-to-b from-white/60 via-slate-50/50 to-white/60
      backdrop-blur-[8px] backdrop-saturate-150
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
        data-[panel-group-direction=vertical]:h-1.5
        data-[panel-group-direction=vertical]:w-full
        data-[panel-group-direction=horizontal]:w-1.5
        data-[panel-group-direction=horizontal]:h-full
        bg-transparent
        hover:bg-slate-200/30
        active:bg-slate-200/50
        transition-colors duration-75
        cursor-row-resize
        touch-none
        select-none
        motion-reduce:transition-none
        ${className}
      `}
      // Add these props for smoother dragging
      style={{ contain: "strict" }}
      {...props}
    >
      {withHandle && (
        <div className="h-0.5 w-full transition-all duration-100 bg-blue-500 opacity-100 animate-pulse" />
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
      bg-gradient-to-br from-white/30 via-slate-50/30 to-white/30
      backdrop-blur-xl backdrop-saturate-150
      supports-[backdrop-filter]:bg-white/30
      motion-reduce:transition-none
      ${className}
    `}
    // Add these props for better performance
    autoSaveId="panel-group-layout"
    style={{ contain: "paint" }}
    {...props}
  />
);

export { ResizablePanel, ResizableHandle, ResizablePanelGroup };
