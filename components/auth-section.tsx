import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  KeyRound, 
  Key, 
  UserRound, 
  Lock,
  ShieldCheck,
  Info,
  HelpCircle
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface AuthProps {
  auth: {
    type: "none" | "bearer" | "basic" | "apiKey";
    token?: string;
    username?: string;
    password?: string;
    key?: string;
  };
  onChange: (auth: any) => void;
}

export function AuthSection({ auth, onChange }: AuthProps) {
  const handleAuthTypeChange = (value: string) => {
    onChange({ type: value });
  };

  const renderAuthInfo = (type: string) => {
    const infos = {
      bearer: "Bearer tokens are typically used for OAuth 2.0 authentication",
      basic: "Basic auth uses username and password encoded in base64",
      apiKey: "API keys are unique identifiers used to authenticate requests",
      none: "No authentication will be sent with requests"
    };

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2.5 px-4 py-3 mt-4 bg-slate-900/40 rounded-lg border border-slate-800/60 shadow-sm"
      >
        <Info className="h-4 w-4 text-blue-400/80" />
        <span className="text-xs text-slate-400/90">{infos[type as keyof typeof infos]}</span>
      </motion.div>
    );
  };

  const renderAuthFields = () => {
    switch (auth.type) {
      case "bearer":
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-5"
          >
            <div className="relative group bg-slate-900/20 p-6 rounded-xl border border-slate-800/60 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="absolute -top-3.5 left-4 px-3 py-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-md border border-blue-400/20">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-400" />
                  <span className="text-xs font-medium text-blue-400">Bearer Authentication</span>
                </div>
              </div>
              <div className="relative group mt-4">
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-xs font-medium text-slate-400">Bearer Token</Label>
                  <TooltipProvider>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger className="hover:bg-slate-800/60 p-1 rounded-md transition-colors">
                        <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-slate-900 border-slate-800">
                        <p className="text-xs">Token will be sent as: Bearer your-token-here</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-3 text-slate-400 group-hover:text-blue-400 transition-colors">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <Input
                    type="text"
                    value={auth.token || ""}
                    onChange={(e) => onChange({ ...auth, token: e.target.value })}
                    placeholder="Enter bearer token"
                    className="h-10 pl-9 bg-slate-950 border-slate-800 hover:border-slate-700 focus:border-blue-600 text-slate-300 placeholder:text-slate-600 rounded-md transition-all duration-200"
                  />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="inline-block px-2 py-1 bg-slate-800 rounded text-slate-400">Authorization</span>
                    <span>header will be set automatically</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/50 border border-slate-800/60 font-mono group-hover:border-slate-700 transition-colors">
                    Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...
                  </div>
                </div>
              </div>
            </div>
            {renderAuthInfo("bearer")}
          </motion.div>
        );

      case "basic":
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-5"
          >
            <div className="relative group bg-slate-900/20 p-6 rounded-xl border border-slate-800/60 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="absolute -top-3.5 left-4 px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-md border border-green-400/20">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-green-400" />
                  <span className="text-xs font-medium text-green-400">Basic Authentication</span>
                </div>
              </div>
              <div className="mt-4 space-y-4">
                <div className="relative group">
                  <Label className="text-xs font-medium text-slate-500 mb-2 block">Username</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-3 text-slate-400 group-hover:text-blue-400 transition-colors">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <Input
                      type="text"
                      value={auth.username || ""}
                      onChange={(e) => onChange({ ...auth, username: e.target.value })}
                      placeholder="Enter username"
                      className="h-10 pl-9 bg-slate-950 border-slate-800 hover:border-slate-700 focus:border-blue-600 text-slate-300 placeholder:text-slate-600 rounded-md transition-all duration-200"
                    />
                  </div>
                </div>
                <div className="relative group">
                  <Label className="text-xs font-medium text-slate-500 mb-2 block">Password</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-3 text-slate-400 group-hover:text-blue-400 transition-colors">
                      <Lock className="h-4 w-4" />
                    </div>
                    <Input
                      type="password"
                      value={auth.password || ""}
                      onChange={(e) => onChange({ ...auth, password: e.target.value })}
                      placeholder="Enter password"
                      className="h-10 pl-9 bg-slate-950 border-slate-800 hover:border-slate-700 focus:border-blue-600 text-slate-300 placeholder:text-slate-600 rounded-md transition-all duration-200"
                    />
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/60 group-hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-400">Base64 Encoded Credentials</span>
                    <span className="text-xs text-slate-500">Automatically generated</span>
                  </div>
                  <div className="font-mono text-xs text-slate-500 break-all">
                    {auth.username && auth.password 
                      ? btoa(`${auth.username}:${auth.password}`)
                      : 'dXNlcm5hbWU6cGFzc3dvcmQ='}
                  </div>
                </div>
              </div>
            </div>
            {renderAuthInfo("basic")}
          </motion.div>
        );

      case "apiKey":
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-5"
          >
            <div className="relative group bg-slate-900/20 p-6 rounded-xl border border-slate-800/60 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="absolute -top-3.5 left-4 px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-md border border-purple-400/20">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-medium text-purple-400">API Key Authentication</span>
                </div>
              </div>
              <div className="relative group">
                <Label className="text-xs font-medium text-slate-500 mb-2 block">API Key</Label>
                <div className="relative">
                  <div className="absolute left-3 top-3 text-slate-400 group-hover:text-blue-400 transition-colors">
                    <Key className="h-4 w-4" />
                  </div>
                  <Input
                    type="text"
                    value={auth.key || ""}
                    onChange={(e) => onChange({ ...auth, key: e.target.value })}
                    placeholder="Enter API key"
                    className="h-10 pl-9 bg-slate-950 border-slate-800 hover:border-slate-700 focus:border-blue-600 text-slate-300 placeholder:text-slate-600 rounded-md transition-all duration-200"
                  />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="inline-block px-2 py-1 bg-slate-800 rounded text-slate-400">X-API-Key</span>
                  <span>header will be set automatically</span>
                </div>
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
            exit={{ opacity: 0 }}
            className="py-16 text-center space-y-6"
          >
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center justify-center p-8 rounded-2xl bg-gradient-to-b from-slate-800/50 to-slate-900/50 shadow-lg border border-slate-800/40"
            >
              <Lock className="h-10 w-10 text-slate-500" />
            </motion.div>
            <div className="space-y-2">
              <p className="text-sm text-slate-400">No authentication required</p>
              <p className="text-xs text-slate-500">Select an authentication type to configure</p>
            </div>
            {renderAuthInfo("none")}
          </motion.div>
        );
    }
  };

  return (
    <AnimatePresence mode="wait">
      <div className="p-4 space-y-12 bg-slate-900">
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <Label className="text-xs font-medium text-slate-400">Authentication Type</Label>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-xs"
            >
              <span className={cn(
                "px-2 py-1 rounded-full font-medium inline-flex items-center gap-1.5",
                auth.type === "none" 
                  ? "bg-slate-800/80 text-slate-400" 
                  : "bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-400"
              )}>
                <ShieldCheck className="h-3.5 w-3.5" />
                {auth.type === "none" ? "No Security" : "Security Active"}
              </span>
            </motion.div>
          </div>
          <Select value={auth.type} onValueChange={handleAuthTypeChange}>
            <SelectTrigger className="w-full h-11 bg-slate-950 border-slate-800 hover:border-slate-700 focus:border-blue-600 text-slate-300 [&>span]:text-slate-400 transition-all duration-200">
              <SelectValue placeholder="Select authentication type" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="none" className="text-slate-300 hover:text-slate-200 focus:text-slate-200">No Auth</SelectItem>
              <SelectItem value="bearer" className="text-slate-300 hover:text-slate-200 focus:text-slate-200">Bearer Token</SelectItem>
              <SelectItem value="basic" className="text-slate-300 hover:text-slate-200 focus:text-slate-200">Basic Auth</SelectItem>
              <SelectItem value="apiKey" className="text-slate-300 hover:text-slate-200 focus:text-slate-200">API Key</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {renderAuthFields()}
      </div>
    </AnimatePresence>
  );
}
