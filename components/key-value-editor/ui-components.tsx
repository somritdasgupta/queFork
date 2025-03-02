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
