"use client";

import * as React from "react";
import * as ResizablePrimitive from "react-resizable-panels";
import { FaDraftingCompass } from "react-icons/fa";
import { RequestResponse } from "@/types";

interface ResponsePanelProps {
  response: RequestResponse | null;
}

const ResizablePanel = React.forwardRef<
  ResizablePrimitive.ImperativePanelHandle,
  React.ComponentProps<typeof ResizablePrimitive.Panel> & ResponsePanelProps
>(({ response, className, ...props }, ref) => (
  <ResizablePrimitive.Panel
    className={`${className} ${response?.error ? 'max-h-[30vh]' : ''}`}
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
}) => (
  <ResizablePrimitive.PanelResizeHandle
    className={`rounded-lg relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 after:rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full ${className}`}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-8 w-8 shadow-inner items-center justify-center rounded-lg">
        <FaDraftingCompass className="h-6 w-6 text-blue-400 stroke-3" />
      </div>
    )}
  </ResizablePrimitive.PanelResizeHandle>
);

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
  <ResizablePrimitive.PanelGroup
    className={`flex h-full w-full bg-slate-50 rounded-lg data-[panel-group-direction=vertical]:flex-col ${className}`}
    {...props}
  />
);

export { ResizablePanel, ResizableHandle, ResizablePanelGroup };
