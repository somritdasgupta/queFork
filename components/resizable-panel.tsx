"use client";

import * as React from "react";
import * as ResizablePrimitive from "react-resizable-panels";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PANEL_SIZING } from "@/lib/constants";

interface CustomPanelProps {
  onPanelStateChange?: () => void;
  panelState?: "expanded" | "collapsed" | "fullscreen";
  showContentOnly?: boolean;
  isOverlay?: boolean;
  preserveStatusBar?: boolean;
  response?: any;
}

// Add this interface to type the children props
interface ResizablePanelChildProps {
  onPanelStateChange?: () => void;
  panelState?: "expanded" | "collapsed" | "fullscreen";
  showContentOnly?: boolean;
  isOverlay?: boolean;
  preserveStatusBar?: boolean;
}
type ComponentWithPanelProps = React.ComponentType<ResizablePanelChildProps>;

const PanelContent = ({
  children,
  ...props
}: ResizablePanelChildProps & { children: React.ReactNode }) => {
  return (
    <>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;

        // Check if the component can accept our props
        const childType = child.type as ComponentWithPanelProps;
        if (typeof childType === "function" || typeof childType === "object") {
          return React.cloneElement(child, {
            ...props,
            ...child.props,
          });
        }

        // If not a compatible component, return as is
        return child;
      })}
    </>
  );
};

const ResizablePanel = React.forwardRef<
  ResizablePrimitive.ImperativePanelHandle,
  React.ComponentProps<typeof ResizablePrimitive.Panel> & CustomPanelProps
>((props, ref) => {
  const {
    response,
    className,
    onPanelStateChange,
    panelState: externalPanelState,
    showContentOnly,
    isOverlay,
    preserveStatusBar,
    children,
    ...restProps
  } = props;

  const [] = React.useState(false);
  const [] = React.useState(false);
  const [internalPanelState, setInternalPanelState] = React.useState<
    "expanded" | "collapsed" | "fullscreen"
  >("expanded");

  // Use the external state if provided, otherwise use internal state
  const currentPanelState = externalPanelState || internalPanelState;

  // Update overlay styles to preserve status bar height in collapsed state
  const overlayStyles = response
    ? cn(
        "absolute left-0 right-0 z-50",
        "transition-all duration-300 ease-out",
        {
          "top-0 h-[100dvh] max-h-[100dvh]": currentPanelState === "fullscreen",
          "bottom-0 h-[50dvh] max-h-[50dvh]": currentPanelState === "expanded",
          "bottom-0 h-[40px]": currentPanelState === "collapsed",
        },
        "response-panel-overlay"
      )
    : "";

  const handlePanelStateChange = React.useCallback(
    (e?: React.MouseEvent) => {
      // If event exists, prevent default behavior
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      const nextState = (() => {
        switch (currentPanelState) {
          case "expanded":
            return "fullscreen";
          case "fullscreen":
            return "collapsed";
          case "collapsed":
            return "expanded";
          default:
            return "expanded";
        }
      })();

      if (onPanelStateChange) {
        // Wrap in requestAnimationFrame to avoid React event pool issues
        requestAnimationFrame(() => {
          onPanelStateChange();
        });
      } else {
        setInternalPanelState(nextState);
      }
    },
    [currentPanelState, onPanelStateChange]
  );

  return (
    <ResizablePrimitive.Panel
      ref={ref} // Add ref here
      className={cn(
        "relative flex flex-col overflow-hidden select-none",
        "bg-slate-900",
        !response && "opacity-75",
        overlayStyles,
        "touch-none", // Add touch-none to fix iOS touch handling
        className
      )}
      defaultSize={PANEL_SIZING.DEFAULT}
      {...restProps}
    >
      <PanelContent
        onPanelStateChange={handlePanelStateChange}
        panelState={currentPanelState}
        showContentOnly={showContentOnly}
        isOverlay={isOverlay}
        preserveStatusBar={preserveStatusBar}
      >
        {children}
      </PanelContent>
    </ResizablePrimitive.Panel>
  );
});

ResizablePanel.displayName = "ResizablePanel";

interface ResizeHandleProps {
  withHandle?: boolean;
  className?: string;
  props?: Omit<
    React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle>,
    "onDoubleClick" | "onDrag" | "draggable"
  >;
}

const ResizableHandle = ({ className }: ResizeHandleProps) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  const togglePanel = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isTransitioning) return;

      const panel = e.currentTarget
        .closest(".resizable-panel-group")
        ?.querySelector("[data-panel]") as HTMLElement;

      if (!panel) return;

      setIsTransitioning(true);
      const newSize = isExpanded
        ? PANEL_SIZING.COLLAPSED
        : PANEL_SIZING.EXPANDED;

      panel.style.transition = "all 300ms ease-out";
      panel.style.flexBasis = `${newSize}%`;

      setIsExpanded(!isExpanded);

      setTimeout(() => {
        panel.style.transition = "";
        setIsTransitioning(false);
      }, 300);
    },
    [isExpanded, isTransitioning]
  );

  return (
    <div
      className={cn(
        "group relative flex items-center justify-center",
        "h-1 w-full cursor-pointer select-none",
        "bg-slate-900 border-y border-slate-700",
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
      "resizable-panel-group relative",
      "flex h-[100dvh] w-full", // Update height to use dvh
      "data-[panel-group-direction=vertical]:flex-col",
      "bg-slate-900",
      "touch-none", // Add touch-none
      className
    )}
    autoSaveId="panel-group-layout"
    {...props}
  />
);

export { ResizablePanel, ResizableHandle, ResizablePanelGroup };
