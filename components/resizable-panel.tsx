'use client';

import * as React from "react";
import * as ResizablePrimitive from "react-resizable-panels";
import { cn } from "@/lib/utils";
import { RequestResponse } from "@/types";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PANEL_SIZING, type PanelState } from "@/lib/constants";

interface ResponsePanelProps {
  response: RequestResponse | null;
  minSize?: number;
  maxSize?: number;
}

const ResizablePanel = React.forwardRef<
  ResizablePrimitive.ImperativePanelHandle,
  React.ComponentProps<typeof ResizablePrimitive.Panel> & ResponsePanelProps
>(({ response, className, ...props }, ref) => {
  const panelRef = React.useRef<ResizablePrimitive.ImperativePanelHandle>(null);
  const [isResizing, setIsResizing] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useImperativeHandle(ref, () => ({
    ...panelRef.current!,
    resize: (size: number) => {
      if (!isResizing && panelRef.current) {
        setIsResizing(true);
        panelRef.current.resize(size);
        setTimeout(() => setIsResizing(false), 300);
      }
    },
  }));

  // Only try to resize after component is mounted
  React.useEffect(() => {
    if (isMounted && panelRef.current && 'response' in props) {
      panelRef.current.resize(PANEL_SIZING.DEFAULT);
    }
  }, [isMounted, response, props]);

  // Don't render the response panel if there's no response
  if ('response' in props && !response) {
    return null;
  }

  return (
    <ResizablePrimitive.Panel
      ref={panelRef}
      className={cn(
        "relative flex flex-col overflow-hidden select-none",
        "bg-slate-800",
        "transition-all duration-300 ease-out",
        !response && "opacity-75",
        className
      )}
      defaultSize={PANEL_SIZING.DEFAULT}
      {...props}
    />
  );
});

ResizablePanel.displayName = "ResizablePanel";

interface ResizeHandleProps {
  withHandle?: boolean;
  className?: string;
  props?: Omit<React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle>, 
    'onDoubleClick' | 'onDrag' | 'draggable'
  >;
}

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: ResizeHandleProps) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  const togglePanel = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isTransitioning) return;
    
    const panel = e.currentTarget.closest(".resizable-panel-group")
      ?.querySelector("[data-panel]") as HTMLElement;
    
    if (!panel) return;

    setIsTransitioning(true);
    const newSize = isExpanded ? PANEL_SIZING.COLLAPSED : PANEL_SIZING.EXPANDED;
    
    panel.style.transition = 'all 300ms ease-out';
    panel.style.flexBasis = `${newSize}%`;
    
    setIsExpanded(!isExpanded);

    setTimeout(() => {
      panel.style.transition = '';
      setIsTransitioning(false);
    }, 300);
  }, [isExpanded, isTransitioning]);

  return (
    <div 
      className={cn(
        "group relative flex items-center justify-center",
        "h-1 w-full cursor-pointer select-none",
        "bg-slate-800 border-y border-slate-700",
        isTransitioning && "pointer-events-none",
        className
      )}
      onClick={togglePanel}
      data-expanded={isExpanded}
    >
      <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-1/2">
        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-1 transition-colors">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={isExpanded ? "expanded" : "collapsed"}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
  <ResizablePrimitive.PanelGroup
    className={cn(
      "resizable-panel-group",
      "flex h-full w-full",
      "data-[panel-group-direction=vertical]:flex-col",
      "bg-slate-800",
      className
    )}
    autoSaveId="panel-group-layout"
    {...props}
  />
);

export { ResizablePanel, ResizableHandle, ResizablePanelGroup };
