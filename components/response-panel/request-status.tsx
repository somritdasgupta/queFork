import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface RequestStatusProps {
  method: string;
  status?: number;
  isIntercepted?: boolean;
}

export const RequestStatus = ({ method, status, isIntercepted }: RequestStatusProps) => (
  <div className="flex items-center gap-2">
    <Badge className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-blue-400 border-blue-500/30 px-2 py-1 rounded-lg">
      {isIntercepted && (
        <div className="mr-1.5 w-2 h-2 rounded-full bg-green-400" title="local" />
      )}
      {method}
    </Badge>

    <div
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-lg border",
        (status || 0) >= 200 && (status || 0) < 300
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          : "bg-red-500/10 text-red-400 border-red-500/20"
      )}
    >
      {(status || 0) >= 200 && (status || 0) < 300 ? (
        <CheckCircle className="h-3.5 w-3.5" />
      ) : (
        <XCircle className="h-3.5 w-3.5" />
      )}
      <span className="text-xs font-medium">{status || "---"}</span>
    </div>
  </div>
);
