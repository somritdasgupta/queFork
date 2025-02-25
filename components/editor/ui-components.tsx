import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STYLES } from "./constants";
import type { ActionButtonProps } from "./types";

export const ActionButton = React.memo(function ActionButton({
  onClick,
  icon: Icon,
  title,
  variant = "default",
  className,
  disabled,
}: ActionButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        STYLES.button.base,
        STYLES.button.hover,
        variant === "clear" && STYLES.button.clear,
        variant === "delete" && STYLES.button.delete,
        className
      )}
      title={title}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
});

export const VirtualItem = React.memo(function VirtualItem({
  id,
  size,
  start,
  children,
}: {
  id: string;
  size: number;
  start: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: `${size}px`,
        transform: `translateY(${start}px)`,
      }}
    >
      {children}
    </div>
  );
});
