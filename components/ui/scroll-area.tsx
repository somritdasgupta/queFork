"use client";

import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils";

interface ScrollAreaProps
  extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {
  direction?: "vertical" | "horizontal" | "both";
}

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(({ className, children, direction = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport
      className="h-full w-full rounded-[inherit]"
      style={
        {
          WebkitOverflowScrolling: "touch",
          touchAction:
            direction === "horizontal"
              ? "pan-x"
              : direction === "vertical"
                ? "pan-y"
                : "pan-x pan-y",
          overscrollBehavior: "contain",
          overflowY: direction === "horizontal" ? "hidden" : "auto",
          overflowX: direction === "vertical" ? "hidden" : "auto",
          userSelect: "text",
          scrollBehavior: "smooth",
        } as React.CSSProperties
      }
    >
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

export { ScrollArea };
