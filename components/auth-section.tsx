'use client'

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { EyeIcon, EyeOffIcon } from 'lucide-react'

interface AuthSectionProps {
  auth: {
    type: 'none' | 'bearer' | 'basic' | 'apiKey'
    token?: string
    username?: string
    password?: string
    key?: string
  }
  onChange: (auth: any) => void
}

export function AuthSection({ auth, onChange }: AuthSectionProps) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="space-y-6">
      <RadioGroup
        value={auth.type}
        onValueChange={(value: 'none' | 'bearer' | 'basic' | 'apiKey') =>
          onChange({ type: value })
        }
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        <Label
          htmlFor="r-none"
          className="relative flex cursor-pointer rounded-lg border-2 p-3 hover:border-primary transition-colors
          [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
        >
          <RadioGroupItem value="none" id="r-none" className="absolute right-3" />
          <div className="w-full">
        <div className="text-sm md:text-base font-medium">No Auth</div>
        <p className="text-xs md:text-sm text-muted-foreground">No authentication required</p>
          </div>
        </Label>
        <Label
          htmlFor="r-bearer"
          className="relative flex cursor-pointer rounded-lg border-2 p-3 hover:border-primary transition-colors
          [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
        >
          <RadioGroupItem value="bearer" id="r-bearer" className="absolute right-3" />
          <div className="w-full">
        <div className="text-sm md:text-base font-medium">Bearer Token</div>
        <p className="text-xs md:text-sm text-muted-foreground">Authenticate using JWT or token</p>
          </div>
        </Label>
        <Label
          htmlFor="r-basic"
          className="relative flex cursor-pointer rounded-lg border-2 p-3 hover:border-primary transition-colors
          [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
        >
          <RadioGroupItem value="basic" id="r-basic" className="absolute right-3" />
          <div className="w-full">
        <div className="text-sm md:text-base font-medium">Basic Auth</div>
        <p className="text-xs md:text-sm text-muted-foreground">Username and password authentication</p>
          </div>
        </Label>
        <Label
          htmlFor="r-apiKey"
          className="relative flex cursor-pointer rounded-lg border-2 p-3 hover:border-primary transition-colors
          [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
        >
          <RadioGroupItem value="apiKey" id="r-apiKey" className="absolute right-3" />
          <div className="w-full">
        <div className="text-sm md:text-base font-medium">API Key</div>
        <p className="text-xs md:text-sm text-muted-foreground">Authenticate using an API key</p>
          </div>
        </Label>
      </RadioGroup>

      {auth.type === 'bearer' && (
        <div className="space-y-2">
          <Label htmlFor="token">Token</Label>
          <Input
            id="token"
            value={auth.token || ''}
            onChange={(e) => onChange({ ...auth, token: e.target.value })}
            placeholder="Enter token"
            className="border-gray-300"
          />
        </div>
      )}

      {auth.type === 'basic' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={auth.username || ''}
              onChange={(e) => onChange({ ...auth, username: e.target.value })}
              placeholder="Enter username"
              className="border-gray-300"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
          id="password"
          type={showPassword ? "text" : "password"}
          value={auth.password || ''}
          onChange={(e) => onChange({ ...auth, password: e.target.value })}
          placeholder="Enter password"
          className="border-gray-300 pr-10 font-mono"
              />
              <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
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

      {auth.type === 'apiKey' && (
        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key</Label>
          <Input
            id="apiKey"
            value={auth.key || ''}
            onChange={(e) => onChange({ ...auth, key: e.target.value })}
            placeholder="Enter API key"
            className="border-gray-300 font-mono"
          />
        </div>
      )}
    </div>
  )
}

