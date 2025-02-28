import { Clock, Database } from "lucide-react";

interface ResponseMetaProps {
  time?: string;
  size?: string;
}

export const ResponseMeta = ({ time, size }: ResponseMetaProps) => (
  <div className="flex items-center gap-2">
    {time && (
      <div className="flex items-center">
        <div className="flex items-center px-2 py-1 rounded-lg border border-slate-700/50 bg-slate-800/50">
          <Clock className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
          <span className="text-xs font-medium text-slate-300">{time}</span>
        </div>
      </div>
    )}
    {size && (
      <div className="flex items-center px-2 py-1 rounded-lg border border-slate-700/50 bg-slate-800/50">
        <Database className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
        <span className="text-xs font-medium text-slate-300">{size}</span>
      </div>
    )}
  </div>
);
