'use client'

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

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
  return (
    <div className="space-y-6">
      <RadioGroup
        value={auth.type}
        onValueChange={(value: 'none' | 'bearer' | 'basic' | 'apiKey') =>
          onChange({ type: value })
        }
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="none" id="none" />
          <Label htmlFor="none">No Auth</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="bearer" id="bearer" />
          <Label htmlFor="bearer">Bearer Token</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="basic" id="basic" />
          <Label htmlFor="basic">Basic Auth</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="apiKey" id="apiKey" />
          <Label htmlFor="apiKey">API Key</Label>
        </div>
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
            <Input
              id="password"
              type="password"
              value={auth.password || ''}
              onChange={(e) => onChange({ ...auth, password: e.target.value })}
              placeholder="Enter password"
              className="border-gray-300"
            />
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
            className="border-gray-300"
          />
        </div>
      )}
    </div>
  )
}

