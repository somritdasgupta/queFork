import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { EyeIcon, EyeOffIcon, Key, KeyRound, User, LockIcon } from "lucide-react";

interface AuthSectionProps {
  auth: {
    type: "none" | "bearer" | "basic" | "apiKey";
    token?: string;
    username?: string;
    password?: string;
    key?: string;
  };
  onChange: (auth: any) => void;
}

export function AuthSection({ auth, onChange }: AuthSectionProps) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="space-y-4 p-4 bg-slate-800">
      <RadioGroup
        value={auth.type}
        onValueChange={(value: "none" | "bearer" | "basic" | "apiKey") =>
          onChange({ type: value })
        }
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        <Label
          htmlFor="r-none"
          className="relative flex cursor-pointer rounded-lg border border-slate-700 p-3 hover:bg-slate-800/50 transition-colors
          [&:has([data-state=checked])]:border-blue-500 [&:has([data-state=checked])]:bg-slate-800/50"
        >
          <RadioGroupItem
            value="none"
            id="r-none"
            className="absolute right-3 border-2 border-slate-600 text-blue-500"
          />
          <div className="w-full">
            <div className="font-medium text-slate-200">No Auth</div>
            <p className="text-xs text-slate-400">No authentication required</p>
          </div>
        </Label>
        <Label
          htmlFor="r-bearer"
          className="relative flex cursor-pointer rounded-lg border border-slate-700 p-3 hover:bg-slate-800/50 transition-colors
          [&:has([data-state=checked])]:border-blue-500 [&:has([data-state=checked])]:bg-slate-800/50"
        >
          <RadioGroupItem
            value="bearer"
            id="r-bearer"
            className="absolute right-3 border-2 border-slate-600 text-blue-500"
          />
          <div className="w-full">
            <div className="font-medium text-slate-200">Bearer Token</div>
            <p className="text-xs text-slate-400">
              Authenticate using JWT or token
            </p>
          </div>
        </Label>
        <Label
          htmlFor="r-basic"
          className="relative flex cursor-pointer rounded-lg border border-slate-700 p-3 hover:bg-slate-800/50 transition-colors
          [&:has([data-state=checked])]:border-blue-500 [&:has([data-state=checked])]:bg-slate-800/50"
        >
          <RadioGroupItem
            value="basic"
            id="r-basic"
            className="absolute right-3 border-2 border-slate-600 text-blue-500"
          />
          <div className="w-full">
            <div className="font-medium text-slate-200">Basic Auth</div>
            <p className="text-xs text-slate-400">
              Username and password authentication
            </p>
          </div>
        </Label>
        <Label
          htmlFor="r-apiKey"
          className="relative flex cursor-pointer rounded-lg border border-slate-700 p-3 hover:bg-slate-800/50 transition-colors
          [&:has([data-state=checked])]:border-blue-500 [&:has([data-state=checked])]:bg-slate-800/50"
        >
          <RadioGroupItem
            value="apiKey"
            id="r-apiKey"
            className="absolute right-3 border-2 border-slate-600 text-blue-500"
          />
          <div className="w-full">
            <div className="font-medium text-slate-200">API Key</div>
            <p className="text-xs text-slate-400">
              Authenticate using an API key
            </p>
          </div>
        </Label>
      </RadioGroup>

      {auth.type === "none" && (
        <div className="rounded-lg border border-slate-700 border-dashed p-4 text-center bg-slate-800/30">
          <div className="text-sm text-slate-400 font-medium">
            This endpoint doesn't require authentication
          </div>
        </div>
      )}

      {auth.type === "bearer" && (
        <div className="space-y-2">
          <Label htmlFor="token" className="text-sm font-medium text-slate-200">Token</Label>
          <div className="relative">
            <Input
              id="token"
              value={auth.token || ""}
              onChange={(e) => onChange({ ...auth, token: e.target.value })}
              placeholder="Enter bearer token"
              className="pl-9 bg-slate-950 border border-slate-700 rounded-lg text-sm font-mono text-slate-300 
                placeholder:text-slate-500/50 transition-colors focus:border-blue-500/50 focus:ring-blue-500/20"
            />
            <KeyRound className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500/70" />
          </div>
        </div>
      )}

      {auth.type === "basic" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium text-slate-200">Username</Label>
            <div className="relative">
              <Input
                id="username"
                value={auth.username || ""}
                onChange={(e) => onChange({ ...auth, username: e.target.value })}
                placeholder="Enter username"
                className="pl-9 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-300 
                  placeholder:text-slate-500/50 transition-colors focus:border-blue-500/50 focus:ring-blue-500/20"
              />
              <User className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500/70" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-slate-200">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={auth.password || ""}
                onChange={(e) => onChange({ ...auth, password: e.target.value })}
                placeholder="Enter password"
                className="pl-9 pr-9 bg-slate-950 border border-slate-700 rounded-lg text-sm font-mono text-slate-300 
                  placeholder:text-slate-500/50 transition-colors focus:border-blue-500/50 focus:ring-blue-500/20"
              />
              <LockIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500/70" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-slate-500/70 hover:text-slate-300 transition-colors"
              >
                {showPassword ? (
                  <EyeOffIcon className="h-4 w-4" />
                ) : (
                  <EyeIcon className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {auth.type === "apiKey" && (
        <div className="space-y-2">
          <Label htmlFor="apiKey" className="text-sm font-medium text-slate-200">API Key</Label>
          <div className="relative">
            <Input
              id="apiKey"
              value={auth.key || ""}
              onChange={(e) => onChange({ ...auth, key: e.target.value })}
              placeholder="Enter API key"
              className="pl-9 bg-slate-950 border border-slate-700 rounded-lg text-sm font-mono text-slate-300 
                placeholder:text-slate-500/50 transition-colors focus:border-blue-500/50 focus:ring-blue-500/20"
            />
            <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500/70" />
          </div>
        </div>
      )}
    </div>
  );
}
