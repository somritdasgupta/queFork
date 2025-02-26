import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const methodBadgeVariants = {
  initial: { opacity: 0, y: -10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30,
    },
  },
  exit: { opacity: 0, y: 10 },
};

interface ProtocolBadgeProps {
  protocol: string;
}

export function ProtocolBadge({ protocol }: ProtocolBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex items-center justify-center bg-slate-900 border border-slate-800 rounded-lg px-2 h-8"
    >
      <motion.div
        variants={methodBadgeVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="flex items-center"
      >
        <Badge
          variant="outline"
          className={cn(
            "font-mono text-xs border-none flex items-center",
            protocol === "io"
              ? "bg-blue-500/10 text-blue-400"
              : "bg-purple-500/10 text-purple-400"
          )}
        >
          {protocol.toUpperCase()}
        </Badge>
      </motion.div>
    </motion.div>
  );
}
