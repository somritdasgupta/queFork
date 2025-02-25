import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  KeyRound,
  Key,
  UserRound,
  Lock,
  ShieldCheck,
  Info,
  HelpCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "../ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@radix-ui/react-dropdown-menu";

const AUTH_TYPES = [
  {
    value: "none",
    label: "No Auth",
    icon: Lock,
    color: "slate",
  },
  {
    value: "bearer",
    label: "Bearer Token",
    icon: ShieldCheck,
    color: "blue",
  },
  {
    value: "basic",
    label: "Basic Auth",
    icon: KeyRound,
    color: "green",
  },
  {
    value: "apiKey",
    label: "API Key",
    icon: Key,
    color: "purple",
  },
] as const;

interface AuthTabProps {
  auth: {
    type: "none" | "bearer" | "basic" | "apiKey";
    token?: string;
    username?: string;
    password?: string;
    key?: string;
    headerName?: string; // Add this line
  };
  onAuthChange: (auth: any) => void;
}

const formatAuthPreview = (
  auth: AuthTabProps["auth"]
): { label: string; value: string } | null => {
  switch (auth.type) {
    case "basic":
      if (auth.username || auth.password) {
        const credentials = `${auth.username || ""}:${auth.password || ""}`;
        return {
          label: "Authorization",
          value: `Basic ${btoa(credentials)}`,
        };
      }
      break;
    case "bearer":
      if (auth.token) {
        return {
          label: "Authorization",
          value: `Bearer ${auth.token}`,
        };
      }
      break;
    case "apiKey":
      if (auth.headerName && auth.key) {
        return {
          label: auth.headerName,
          value: auth.key,
        };
      }
      break;
    default:
      return null;
  }
  return null;
};

export function AuthTab({ auth, onAuthChange }: AuthTabProps) {
  const handleAuthTypeChange = (value: string) => {
    // Remove default header name initialization
    onAuthChange({ type: value });
  };

  const renderAuthInfo = (type: string) => {
    const infos = {
      bearer: "Bearer tokens are typically used for OAuth 2.0 authentication",
      basic: "Basic auth uses username and password encoded in base64",
      apiKey: "API keys are unique identifiers used to authenticate requests",
      none: "No authentication will be sent with requests",
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2.5 px-4 py-3 mt-4 bg-slate-900/40 rounded-lg border border-slate-800/60 shadow-sm"
      >
        <Info className="h-4 w-4 text-blue-400/80" />
        <span className="text-xs text-slate-400/90">
          {infos[type as keyof typeof infos]}
        </span>
      </motion.div>
    );
  };

  const renderHeaderPreview = (
    preview: { label: string; value: string } | null
  ) => {
    if (!preview) return null;

    return (
      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="px-1.5 py-0.5 bg-slate-800/50 rounded text-slate-400">
            {preview.label}
          </span>
          <span>header will be set automatically</span>
        </div>
        <div className="p-2 rounded bg-slate-900/50 border border-slate-800/60 font-mono text-xs text-slate-500 break-all">
          {preview.value}
        </div>
      </div>
    );
  };

  const renderAuthFields = () => {
    const preview = formatAuthPreview(auth);

    switch (auth.type) {
      case "bearer":
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3" // Reduced from space-y-5
          >
            <div className="relative bg-slate-900/20 p-4 rounded-lg border border-slate-800/60">
              {" "}
              {/* Reduced padding and border radius */}
              <div className="absolute -top-2.5 left-3 px-2 py-0.5 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded border border-blue-400/20">
                {" "}
                {/* Smaller label */}
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-[11px] font-medium text-blue-400">
                    Bearer Token
                  </span>
                </div>
              </div>
              <div className="mt-3">
                {" "}
                {/* Reduced top margin */}
                <div className="relative">
                  <div className="absolute left-3 top-2.5 text-slate-400">
                    <KeyRound className="h-3.5 w-3.5" />
                  </div>
                  <Input
                    type="text"
                    value={auth.token || ""}
                    onChange={(e) =>
                      onAuthChange({ ...auth, token: e.target.value })
                    }
                    placeholder="Enter bearer token"
                    className="h-8 pl-8 text-xs bg-slate-950 border-slate-800"
                  />
                </div>
                {renderHeaderPreview(preview)}
              </div>
            </div>
            {renderAuthInfo("bearer")}
          </motion.div>
        );

      case "basic":
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="relative bg-slate-900/20 p-4 rounded-lg border border-slate-800/60">
              <div className="absolute -top-2.5 left-3 px-2 py-0.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded border border-green-400/20">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-green-400" />
                  <span className="text-[11px] font-medium text-green-400">
                    Basic Auth
                  </span>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {" "}
                {/* Reduced spacing */}
                <div>
                  <div className="relative">
                    <div className="absolute left-3 top-2.5 text-slate-400">
                      <UserRound className="h-3.5 w-3.5" />
                    </div>
                    <Input
                      type="text"
                      value={auth.username || ""}
                      onChange={(e) =>
                        onAuthChange({ ...auth, username: e.target.value })
                      }
                      placeholder="Username"
                      className="h-8 pl-8 text-xs bg-slate-950 border-slate-800"
                    />
                  </div>
                </div>
                <div>
                  <div className="relative">
                    <div className="absolute left-3 top-2.5 text-slate-400">
                      <Lock className="h-3.5 w-3.5" />
                    </div>
                    <Input
                      type="password"
                      value={auth.password || ""}
                      onChange={(e) =>
                        onAuthChange({ ...auth, password: e.target.value })
                      }
                      placeholder="Password"
                      className="h-8 pl-8 text-xs bg-slate-950 border-slate-800"
                    />
                  </div>
                </div>
                {renderHeaderPreview(preview)}
              </div>
            </div>
            {renderAuthInfo("basic")}
          </motion.div>
        );

      case "apiKey":
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="relative bg-slate-900/20 p-4 rounded-lg border border-slate-800/60">
              <div className="absolute -top-2.5 left-3 px-2 py-0.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded border border-purple-400/20">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
                  <span className="text-[11px] font-medium text-purple-400">
                    API Key
                  </span>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div>
                  <div className="relative">
                    <div className="absolute left-3 top-2.5 text-slate-400">
                      <Key className="h-3.5 w-3.5" />
                    </div>
                    <Input
                      type="text"
                      value={auth.headerName || ""}
                      onChange={(e) =>
                        onAuthChange({ ...auth, headerName: e.target.value })
                      }
                      placeholder="Header name (e.g. X-API-Key)"
                      className="h-8 pl-8 text-xs bg-slate-950 border-slate-800"
                    />
                  </div>
                </div>
                <div>
                  <div className="relative">
                    <div className="absolute left-3 top-2.5 text-slate-400">
                      <Key className="h-3.5 w-3.5" />
                    </div>
                    <Input
                      type="text"
                      value={auth.key || ""}
                      onChange={(e) =>
                        onAuthChange({ ...auth, key: e.target.value })
                      }
                      placeholder="API key value"
                      className="h-8 pl-8 text-xs bg-slate-950 border-slate-800"
                    />
                  </div>
                </div>
                {renderHeaderPreview(preview)}
              </div>
            </div>
            {renderAuthInfo("apiKey")}
          </motion.div>
        );

      default:
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-8 text-center space-y-4" // Reduced padding and spacing
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center justify-center p-6 rounded-xl bg-gradient-to-b from-slate-800/50 to-slate-900/50 border border-slate-800/40"
            >
              <Lock className="h-8 w-8 text-slate-500" />
            </motion.div>
            <div className="space-y-1">
              <p className="text-sm text-slate-400">
                No authentication required
              </p>
              <p className="text-xs text-slate-500">
                Select an authentication type to configure
              </p>
            </div>
            {renderAuthInfo("none")}
          </motion.div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <div className="sticky top-0 z-20 bg-slate-950 border-b border-slate-800/60">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex w-full items-center py-1.5 px-2
              bg-slate-900 border border-slate-800 hover:border-slate-700
              text-slate-300 hover:text-slate-200
              transition-all duration-200 group"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 flex items-center justify-center">
                    {React.createElement(
                      AUTH_TYPES.find((t) => t.value === auth.type)?.icon ||
                        Lock,
                      {
                        className: cn(
                          "w-3.5 h-3.5",
                          `text-${AUTH_TYPES.find((t) => t.value === auth.type)?.color}-400`
                        ),
                      }
                    )}
                  </div>
                  <span className="font-medium text-xs">
                    {AUTH_TYPES.find((t) => t.value === auth.type)?.label ||
                      "Select type"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5",
                      auth.type === "none"
                        ? "bg-slate-800/80 text-slate-400"
                        : "bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-400"
                    )}
                  >
                    <ShieldCheck className="h-3 w-3" />
                    {auth.type === "none" ? "No Security" : "Security Active"}
                  </span>
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="bottom"
            className="w-screen sm:w-[75vw] bg-slate-900 border-2 border-slate-700/70 shadow-lg rounded-none overflow-hidden z-50"
          >
            <div className="p-1 flex flex-wrap gap-1">
              {AUTH_TYPES.map((type) => (
                <DropdownMenuItem
                  key={type.value}
                  onClick={() => handleAuthTypeChange(type.value)}
                  className={cn(
                    "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs flex-1",
                    type.value === auth.type
                      ? `bg-${type.color}-500/10 text-${type.color}-400`
                      : "text-slate-300 hover:bg-slate-800"
                  )}
                >
                  <div className="w-3.5 h-3.5">
                    {React.createElement(type.icon, {
                      className: `h-3.5 w-3.5 text-${type.color}-400`,
                    })}
                  </div>
                  <span className="font-medium">{type.label}</span>
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content Section */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700">
        <div className="p-4">{renderAuthFields()}</div>
      </div>
    </div>
  );
}
