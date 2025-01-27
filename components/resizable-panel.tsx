"use client";

import * as React from "react";
import * as ResizablePrimitive from "react-resizable-panels";
import { cn } from "@/lib/utils";
import { RequestResponse } from "@/types";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ResponsePanelProps {
  response: RequestResponse | null;
  minSize?: number;
  maxSize?: number;
}

const PANEL_STATES = {
  COLLAPSED: 10, // Reduced to 10% for better collapsed state
  EXPANDED: 90, // Changed to 90% for better expansion
};

const ResizablePanel = React.forwardRef<
  ResizablePrimitive.ImperativePanelHandle,
  React.ComponentProps<typeof ResizablePrimitive.Panel> & ResponsePanelProps
>(({ response, className, ...props }, ref) => {
  const panelRef = React.useRef<ResizablePrimitive.ImperativePanelHandle>(null);
  const [isResizing, setIsResizing] = React.useState(false);

  React.useImperativeHandle(ref, () => ({
    ...panelRef.current!,
    resize: (size: number) => {
      if (!isResizing) {
        setIsResizing(true);
        panelRef.current?.resize(size);
        setTimeout(() => setIsResizing(false), 300);
      }
    },
  }));

  // Force collapse on mount
  React.useEffect(() => {
    if (panelRef.current) {
      panelRef.current.resize(PANEL_STATES.COLLAPSED);
    }
  }, []); // Only on mount

  // Handle response changes
  React.useEffect(() => {
    if (panelRef.current && (!response || Object.keys(response).length === 0)) {
      panelRef.current.resize(PANEL_STATES.COLLAPSED);
    }
  }, [response]);

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
      minSize={5} // Allow more collapse
      maxSize={95} // Allow almost full expansion
      defaultSize={PANEL_STATES.COLLAPSED}
      data-state={!response ? "collapsed" : "expanded"}
      {...props}
    />
  );
});

ResizablePanel.displayName = "ResizablePanel";

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: Omit<React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle>, 'onDoubleClick' | 'onDrag' | 'draggable'> & {
  withHandle?: boolean;
}) => {
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
    const newSize = isExpanded ? PANEL_STATES.COLLAPSED : PANEL_STATES.EXPANDED;
    
    panel.style.transition = 'all 300ms easeOut';
    panel.style.flexBasis = `${newSize}%`;
    panel.dataset.state = isExpanded ? 'collapsed' : 'expanded';
    
    panel.style.maxHeight = 'none';
    
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
        "h-0 w-full cursor-pointer select-none",
        "bg-slate-800",
        "transition-colors duration-200",
        isTransitioning && "pointer-events-none",
        className
      )}
      onClick={togglePanel}
      data-expanded={isExpanded}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={isExpanded ? "expanded" : "collapsed"}
          initial={{ opacity: 0, y: isExpanded ? -10 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: isExpanded ? 10 : -10 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2 px-3 py-1"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
          <span className="text-xs text-slate-400 font-medium">
            {isExpanded ? "Collapse" : "Expand"}
          </span>
        </motion.div>
      </AnimatePresence>
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
