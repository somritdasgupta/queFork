import React, { useState } from 'react';
import type { AuthConfig, AuthType } from '@/types/api';
import { Key, User, Lock, Globe, ChevronDown } from 'lucide-react';

interface Props {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
  onFetchToken?: () => void;
}

const authTypes: { value: AuthType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'bearer', label: 'Bearer' },
  { value: 'basic', label: 'Basic' },
  { value: 'api-key', label: 'API Key' },
  { value: 'oauth2', label: 'OAuth 2.0' },
];

const GRANT_TYPES = [
  { value: 'client_credentials', label: 'Client Credentials' },
  { value: 'authorization_code', label: 'Authorization Code' },
  { value: 'password', label: 'Password' },
];

function GrantTypeDropdown({ value, onChange, scope, onScopeChange, inputClass, labelClass }: {
  value: string; onChange: (v: string) => void; scope: string; onScopeChange: (v: string) => void; inputClass: string; labelClass: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = GRANT_TYPES.find(g => g.value === value) || GRANT_TYPES[0];

  return (
    <>
      <div className="grid grid-cols-2 border-b border-border bg-surface-sunken">
        <div className={`${labelClass} border-r border-border`}>Grant Type</div>
        <div className={labelClass}>Scope</div>
      </div>
      <div className="grid grid-cols-2 border-b border-border">
        <div className="relative flex items-center border-r border-border h-8">
          <div className="w-8 shrink-0 flex items-center justify-center">
            <Globe className="h-3 w-3 text-muted-foreground/40" />
          </div>
          <button
            onClick={() => setOpen(!open)}
            className="flex-1 flex items-center justify-between h-full px-3 text-[11px] font-bold text-foreground hover:bg-accent/30 transition-colors"
          >
            <span>{selected.label}</span>
            <ChevronDown className={`h-3 w-3 text-muted-foreground/40 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-0 z-50 bg-card border border-border shadow-2xl py-0.5 animate-fade-in">
                {GRANT_TYPES.map(g => (
                  <button
                    key={g.value}
                    onClick={() => { onChange(g.value); setOpen(false); }}
                    className={`w-full px-3 py-1.5 text-[11px] font-bold text-left transition-colors ${g.value === value ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-accent'}`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="flex items-center">
          <input
            value={scope}
            onChange={(e) => onScopeChange(e.target.value)}
            placeholder="read write"
            className={inputClass}
          />
        </div>
      </div>
    </>
  );
}

export function AuthEditor({ auth, onChange, onFetchToken }: Props) {
  const inputClass = "w-full h-8 px-3 text-[11px] font-mono bg-transparent focus:outline-none focus:bg-accent/30 placeholder:text-muted-foreground/20 text-foreground transition-colors";
  const labelClass = "text-[9px] font-bold uppercase tracking-wider text-muted-foreground/40 px-3 py-1.5";
  const rowClass = "flex items-center border-b border-border";

  return (
    <div className="flex flex-col">
      {/* Auth type tab strip */}
      <div className="flex gap-0 border-b border-border">
        {authTypes.map(t => (
          <button
            key={t.value}
            onClick={() => onChange({ ...auth, type: t.value })}
            className={`px-2.5 py-1.5 text-[10px] font-bold transition-colors ${
              auth.type === t.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {auth.type === 'none' && (
        <div className="flex items-center justify-center py-6 text-[10px] text-muted-foreground/40 font-bold">
          No authentication configured.
        </div>
      )}

      {auth.type === 'bearer' && (
        <div className="flex flex-col">
          <div className={labelClass}>Bearer Token</div>
          <div className={rowClass}>
            <div className="w-8 shrink-0 flex items-center justify-center">
              <Key className="h-3 w-3 text-muted-foreground/40" />
            </div>
            <input
              value={auth.bearer?.token || ''}
              onChange={(e) => onChange({ ...auth, bearer: { token: e.target.value } })}
              placeholder="Enter bearer token"
              className={inputClass}
            />
          </div>
        </div>
      )}

      {auth.type === 'basic' && (
        <div className="flex flex-col">
          <div className="grid grid-cols-2 border-b border-border bg-surface-sunken">
            <div className={`${labelClass} border-r border-border`}>Username</div>
            <div className={labelClass}>Password</div>
          </div>
          <div className="grid grid-cols-2 border-b border-border">
            <div className="flex items-center border-r border-border">
              <div className="w-8 shrink-0 flex items-center justify-center">
                <User className="h-3 w-3 text-muted-foreground/40" />
              </div>
              <input
                value={auth.basic?.username || ''}
                onChange={(e) => onChange({ ...auth, basic: { username: e.target.value, password: auth.basic?.password || '' } })}
                placeholder="Username"
                className={inputClass}
              />
            </div>
            <div className="flex items-center">
              <div className="w-8 shrink-0 flex items-center justify-center">
                <Lock className="h-3 w-3 text-muted-foreground/40" />
              </div>
              <input
                type="password"
                value={auth.basic?.password || ''}
                onChange={(e) => onChange({ ...auth, basic: { username: auth.basic?.username || '', password: e.target.value } })}
                placeholder="Password"
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      {auth.type === 'api-key' && (
        <div className="flex flex-col">
          <div className="grid grid-cols-[1fr_1fr_80px] border-b border-border bg-surface-sunken">
            <div className={`${labelClass} border-r border-border`}>Key</div>
            <div className={`${labelClass} border-r border-border`}>Value</div>
            <div className={`${labelClass} text-center`}>Add To</div>
          </div>
          <div className="grid grid-cols-[1fr_1fr_80px] border-b border-border">
            <div className="flex items-center border-r border-border">
              <div className="w-8 shrink-0 flex items-center justify-center">
                <Key className="h-3 w-3 text-muted-foreground/40" />
              </div>
              <input
                value={auth.apiKey?.key || ''}
                onChange={(e) => onChange({ ...auth, apiKey: { key: e.target.value, value: auth.apiKey?.value || '', addTo: auth.apiKey?.addTo || 'header' } })}
                placeholder="X-API-Key"
                className={inputClass}
              />
            </div>
            <div className="flex items-center border-r border-border">
              <input
                value={auth.apiKey?.value || ''}
                onChange={(e) => onChange({ ...auth, apiKey: { key: auth.apiKey?.key || '', value: e.target.value, addTo: auth.apiKey?.addTo || 'header' } })}
                placeholder="api-key-value"
                className={inputClass}
              />
            </div>
            <div className="flex items-center justify-center">
              <select
                value={auth.apiKey?.addTo || 'header'}
                onChange={(e) => onChange({ ...auth, apiKey: { ...auth.apiKey!, addTo: e.target.value as any } })}
                className="appearance-none bg-transparent text-[10px] font-bold text-foreground focus:outline-none cursor-pointer text-center"
              >
                <option value="header">Header</option>
                <option value="query">Query</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {auth.type === 'oauth2' && (
        <div className="flex flex-col">
          <GrantTypeDropdown
            value={auth.oauth2?.grantType || 'client_credentials'}
            onChange={(v) => onChange({ ...auth, oauth2: { ...auth.oauth2!, grantType: v as any } })}
            scope={auth.oauth2?.scope || ''}
            onScopeChange={(v) => onChange({ ...auth, oauth2: { ...auth.oauth2!, scope: v } })}
            inputClass={inputClass}
            labelClass={labelClass}
          />

          {/* Token URL & Auth URL */}
          <div className="grid grid-cols-2 border-b border-border bg-surface-sunken">
            <div className={`${labelClass} border-r border-border`}>Token URL</div>
            <div className={labelClass}>Auth URL</div>
          </div>
          <div className="grid grid-cols-2 border-b border-border">
            <div className="flex items-center border-r border-border">
              <input
                value={auth.oauth2?.tokenUrl || ''}
                onChange={(e) => onChange({ ...auth, oauth2: { ...auth.oauth2!, tokenUrl: e.target.value } })}
                placeholder="https://..."
                className={inputClass}
              />
            </div>
            <div className="flex items-center">
              <input
                value={auth.oauth2?.authUrl || ''}
                onChange={(e) => onChange({ ...auth, oauth2: { ...auth.oauth2!, authUrl: e.target.value } })}
                placeholder="https://..."
                className={inputClass}
              />
            </div>
          </div>

          {/* Client ID & Secret */}
          <div className="grid grid-cols-2 border-b border-border bg-surface-sunken">
            <div className={`${labelClass} border-r border-border`}>Client ID</div>
            <div className={labelClass}>Client Secret</div>
          </div>
          <div className="grid grid-cols-2 border-b border-border">
            <div className="flex items-center border-r border-border">
              <div className="w-8 shrink-0 flex items-center justify-center">
                <Lock className="h-3 w-3 text-muted-foreground/40" />
              </div>
              <input
                value={auth.oauth2?.clientId || ''}
                onChange={(e) => onChange({ ...auth, oauth2: { ...auth.oauth2!, clientId: e.target.value } })}
                placeholder="client-id"
                className={inputClass}
              />
            </div>
            <div className="flex items-center">
              <input
                type="password"
                value={auth.oauth2?.clientSecret || ''}
                onChange={(e) => onChange({ ...auth, oauth2: { ...auth.oauth2!, clientSecret: e.target.value } })}
                placeholder="client-secret"
                className={inputClass}
              />
            </div>
          </div>

          {/* Access Token (if fetched) */}
          {auth.oauth2?.accessToken && (
            <>
              <div className="border-b border-border bg-surface-sunken">
                <div className={labelClass}>Access Token</div>
              </div>
              <div className="flex items-center border-b border-border">
                <input value={auth.oauth2.accessToken} readOnly className={`${inputClass} opacity-40`} />
              </div>
            </>
          )}

          {/* Get Token button — full width */}
          <button onClick={onFetchToken}
            className="flex items-center justify-center gap-1.5 w-full py-2 text-[10px] font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors border-t border-border">
            <Key className="h-3 w-3" /> Get Token
          </button>
        </div>
      )}
    </div>
  );
}
