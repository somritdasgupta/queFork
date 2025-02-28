import { cn } from "@/lib/utils";
import { PanelResizeButton } from "./panel-resize-button";
import { PanelState } from "@/types/panel";

interface PanelCollapseButtonProps {
  panelState?: PanelState;
  onPanelStateChange?: () => void;
  isCollapsed: boolean;
  floating?: boolean;
}

export const PanelCollapseButton = ({
  panelState,
  onPanelStateChange,
  isCollapsed,
  floating,
}: PanelCollapseButtonProps) => {
  if (!onPanelStateChange) return null;

  return (
    <PanelResizeButton
      panelState={panelState}
      onClick={onPanelStateChange}
      className={cn(
        floating && "absolute top-2 right-2 z-50 backdrop-blur-sm",
        floating && "bg-slate-800/90"
      )}
    />
  );
};
