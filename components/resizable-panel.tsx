'use client';

import * as React from 'react';
import { DragHandleDots2Icon } from '@radix-ui/react-icons';
import * as ResizablePrimitive from 'react-resizable-panels';

const ResizablePanel = ResizablePrimitive.Panel;
const ResizableHandle = ({

  withHandle,
  className,
  ...props
  }: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean
}) => (
  <ResizablePrimitive.PanelResizeHandle
    className={`relative flex w-px items-center justify-center rounded-lg after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 after:rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full ${className}`}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-lg border-2 bg-border">
        <DragHandleDots2Icon className="h-2.5 w-2.5" />
      </div>
    )}
  </ResizablePrimitive.PanelResizeHandle>
)

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
  <ResizablePrimitive.PanelGroup
    className={`flex h-full w-full rounded-lg data-[panel-group-direction=vertical]:flex-col ${className}`}
    {...props}
  />
)
export { ResizablePanel, ResizableHandle, ResizablePanelGroup };

