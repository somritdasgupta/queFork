import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
  EyeIcon,
  EyeOffIcon,
  Key,
  KeyRound,
  User,
  LockIcon,
  BanIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  const authTypes = ["none", "bearer", "basic", "apiKey"];
  const handleTypeChange = (value: "none" | "bearer" | "basic" | "apiKey") => {
    onChange({ type: value });
  };
  const getAuthIcon = (type: string) => {
    switch (type) {
      case "none":
        return <BanIcon className="h-4 w-4 text-slate-500/70" />;
      case "bearer":
        return <KeyRound className="h-4 w-4 text-slate-500/70" />;
      case "basic":
        return <User className="h-4 w-4 text-slate-500/70" />;
      case "apiKey":
        return <Key className="h-4 w-4 text-slate-500/70" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 space-y-6">
      <RadioGroup
        value={auth.type}
        onValueChange={handleTypeChange}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {authTypes.map((type) => (
          <div key={type} className="relative">
            <RadioGroupItem value={type} id={type} className="peer sr-only" />
            <Label
              htmlFor={type}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-xs border",
                "cursor-pointer transition-all duration-200 capitalize shadow-sm",
                "border-slate-700/50 bg-slate-800/50 hover:bg-slate-700/50 hover:border-slate-600",
                "peer-data-[state=checked]:border-blue-500/70 peer-data-[state=checked]:text-blue-400",
                "peer-data-[state=checked]:bg-blue-500/10 peer-data-[state=checked]:shadow-[0_0_10px_rgba(59,130,246,0.1)]"
              )}
            >
              {getAuthIcon(type)}
              <span>{type}</span>
            </Label>
          </div>
        ))}
      </RadioGroup>

      {auth.type === "none" && (
        <div className="rounded-lg border border-slate-700/50 border-dashed p-6 text-center bg-slate-800/20 backdrop-blur-sm">
          <BanIcon className="h-5 w-5 text-slate-400 mx-auto mb-2 opacity-50" />
          <div className="text-sm text-slate-400 font-medium">
            No authentication required for this endpoint
          </div>
        </div>
      )}

      <div className="transition-all duration-200 space-y-4">
        {auth.type === "bearer" && (
          <div className="space-y-2">
            <Label
              htmlFor="token"
              className="text-sm font-medium text-slate-200 flex items-center gap-2"
            >
              <KeyRound className="h-4 w-4 text-slate-400" />
              Bearer Token
            </Label>
            <div className="relative group">
              <Input
                id="token"
                value={auth.token || ""}
                onChange={(e) => onChange({ ...auth, token: e.target.value })}
                placeholder="Enter bearer token"
                className="bg-slate-950/50 border border-slate-700/50 rounded-lg text-sm font-mono text-slate-300 
                  placeholder:text-slate-500/50 transition-all duration-200
                  focus:border-blue-500/50 focus:ring-blue-500/20 focus:bg-slate-900
                  group-hover:border-slate-600/50 group-hover:bg-slate-900/50"
              />
            </div>
          </div>
        )}

        {auth.type === "basic" && (
          <div className="space-y-4 rounded-lg border border-slate-700/30 p-4 bg-slate-800/10">
            <div className="space-y-2">
              <Label
                htmlFor="username"
                className="text-sm font-medium text-slate-200 flex items-center gap-2"
              >
                <User className="h-4 w-4 text-slate-400" />
                Username
              </Label>
              <div className="relative group">
                <Input
                  id="username"
                  value={auth.username || ""}
                  onChange={(e) =>
                    onChange({ ...auth, username: e.target.value })
                  }
                  placeholder="Enter username"
                  className="bg-slate-950/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 
                    placeholder:text-slate-500/50 transition-all duration-200
                    focus:border-blue-500/50 focus:ring-blue-500/20 focus:bg-slate-900
                    group-hover:border-slate-600/50 group-hover:bg-slate-900/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-slate-200 flex items-center gap-2"
              >
                <LockIcon className="h-4 w-4 text-slate-400" />
                Password
              </Label>
              <div className="relative group">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={auth.password || ""}
                  onChange={(e) =>
                    onChange({ ...auth, password: e.target.value })
                  }
                  placeholder="Enter password"
                  className="pr-9 bg-slate-950/50 border border-slate-700/50 rounded-lg text-sm font-mono text-slate-300 
                    placeholder:text-slate-500/50 transition-all duration-200
                    focus:border-blue-500/50 focus:ring-blue-500/20 focus:bg-slate-900
                    group-hover:border-slate-600/50 group-hover:bg-slate-900/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500/70 hover:text-slate-300 transition-colors flex items-center justify-center"
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
            <Label
              htmlFor="apiKey"
              className="text-sm font-medium text-slate-200 flex items-center gap-2"
            >
              <Key className="h-4 w-4 text-slate-400" />
              API Key
            </Label>
            <div className="relative group">
              <Input
                id="apiKey"
                value={auth.key || ""}
                onChange={(e) => onChange({ ...auth, key: e.target.value })}
                placeholder="Enter API key"
                className="bg-slate-950/50 border border-slate-700/50 rounded-lg text-sm font-mono text-slate-300 
                  placeholder:text-slate-500/50 transition-all duration-200
                  focus:border-blue-500/50 focus:ring-blue-500/20 focus:bg-slate-900
                  group-hover:border-slate-600/50 group-hover:bg-slate-900/50"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
