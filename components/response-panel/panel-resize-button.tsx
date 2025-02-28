import { motion } from "framer-motion";
import { Maximize2, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { PanelState } from "@/types/panel";

interface PanelResizeButtonProps {
  panelState?: PanelState;
  onClick: () => void;
  className?: string;
}

export const PanelResizeButton = ({ panelState, onClick, className }: PanelResizeButtonProps) => (
  <motion.button
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 px-2 py-1",
      "bg-slate-700/50 hover:bg-slate-700",
      "border border-slate-600/50",
      "rounded-lg",
      "transition-all duration-200",
      "group",
      className
    )}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <motion.div
      animate={{
        rotate: panelState === "collapsed" ? 0 : 180,
        scale: panelState === "fullscreen" ? 1 : 1,
      }}
      className="text-slate-400 group-hover:text-slate-200"
    >
      {panelState === "expanded" ? (
        <Maximize2 className="h-3.5 w-3.5" />
      ) : panelState === "fullscreen" ? (
        <ChevronUp className="h-3.5 w-3.5" />
      ) : (
        <Maximize2 className="h-3.5 w-3.5" />
      )}
    </motion.div>
  </motion.button>
);
