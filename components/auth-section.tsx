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
    <div className="space-y-4">
      <RadioGroup
        value={auth.type}
        onValueChange={(value: "none" | "bearer" | "basic" | "apiKey") =>
          onChange({ type: value })
        }
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        <Label
          htmlFor="r-none"
          className="relative flex cursor-pointer rounded-lg border-2 border-slate-200 p-3 hover:bg-slate-50 transition-colors
          [&:has([data-state=checked])]:border-slate-900 [&:has([data-state=checked])]:bg-slate-900/5"
        >
          <RadioGroupItem
            value="none"
            id="r-none"
            className="absolute right-3 border-2 border-slate-300 text-slate-900"
          />
          <div className="w-full">
            <div className="font-medium text-slate-700">No Auth</div>
            <p className="text-xs text-slate-500">
              No authentication required
            </p>
          </div>
        </Label>
        <Label
          htmlFor="r-bearer"
          className="relative flex cursor-pointer rounded-lg border-2 border-slate-200 p-3 hover:bg-slate-50 transition-colors
          [&:has([data-state=checked])]:border-slate-900 [&:has([data-state=checked])]:bg-slate-900/5"
        >
          <RadioGroupItem
            value="bearer"
            id="r-bearer"
            className="absolute right-3 border-2 border-slate-300 text-slate-900"
          />
          <div className="w-full">
            <div className="font-medium text-slate-700">Bearer Token</div>
            <p className="text-xs text-slate-500">
              Authenticate using JWT or token
            </p>
          </div>
        </Label>
        <Label
          htmlFor="r-basic"
          className="relative flex cursor-pointer rounded-lg border-2 border-slate-200 p-3 hover:bg-slate-50 transition-colors
          [&:has([data-state=checked])]:border-slate-900 [&:has([data-state=checked])]:bg-slate-900/5"
        >
          <RadioGroupItem
            value="basic"
            id="r-basic"
            className="absolute right-3 border-2 border-slate-300 text-slate-900"
          />
          <div className="w-full">
            <div className="font-medium text-slate-700">Basic Auth</div>
            <p className="text-xs text-slate-500">
              Username and password authentication
            </p>
          </div>
        </Label>
        <Label
          htmlFor="r-apiKey"
          className="relative flex cursor-pointer rounded-lg border-2 border-slate-200 p-3 hover:bg-slate-50 transition-colors
          [&:has([data-state=checked])]:border-slate-900 [&:has([data-state=checked])]:bg-slate-900/5"
        >
          <RadioGroupItem
            value="apiKey"
            id="r-apiKey"
            className="absolute right-3 border-2 border-slate-300 text-slate-900"
          />
          <div className="w-full">
            <div className="font-medium text-slate-700">API Key</div>
            <p className="text-xs text-slate-500">
              Authenticate using an API key
            </p>
          </div>
        </Label>
      </RadioGroup>

      {auth.type === "none" && (
        <div className="rounded-lg border-2 border-slate-200 border-dashed p-4 text-center bg-slate-50">
          <div className="text-sm text-slate-500 font-medium">
            This endpoint doesn't require authentication
          </div>
        </div>
      )}

      {auth.type === "bearer" && (
        <div className="space-y-2">
          <Label htmlFor="token" className="text-sm font-medium text-slate-700">Token</Label>
          <div className="relative">
            <Input
              id="token"
              value={auth.token || ""}
              onChange={(e) => onChange({ ...auth, token: e.target.value })}
              placeholder="Enter bearer token"
              className="pl-9 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-mono transition-colors focus:border-slate-900 focus:ring-slate-900"
            />
            <KeyRound className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          </div>
        </div>
      )}

      {auth.type === "basic" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium text-slate-700">Username</Label>
            <div className="relative">
              <Input
                id="username"
                value={auth.username || ""}
                onChange={(e) => onChange({ ...auth, username: e.target.value })}
                placeholder="Enter username"
                className="pl-9 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm transition-colors focus:border-slate-900 focus:ring-slate-900"
              />
              <User className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={auth.password || ""}
                onChange={(e) => onChange({ ...auth, password: e.target.value })}
                placeholder="Enter password"
                className="pl-9 pr-9 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-mono transition-colors focus:border-slate-900 focus:ring-slate-900"
              />
              <LockIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
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
          <Label htmlFor="apiKey" className="text-sm font-medium text-slate-700">API Key</Label>
          <div className="relative">
            <Input
              id="apiKey"
              value={auth.key || ""}
              onChange={(e) => onChange({ ...auth, key: e.target.value })}
              placeholder="Enter API key"
              className="pl-9 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-mono transition-colors focus:border-slate-900 focus:ring-slate-900"
            />
            <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          </div>
        </div>
      )}
    </div>
  );
}
