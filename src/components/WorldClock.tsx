import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Plus, X, ChevronDown } from 'lucide-react';
import { lsGet, lsSet } from '@/lib/secure-storage';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { toast } from 'sonner';

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC', short: 'UTC' },
  { value: 'Asia/Kolkata', label: 'India Standard Time', short: 'IST' },
  { value: 'America/New_York', label: 'Eastern Time', short: 'ET' },
  { value: 'America/Chicago', label: 'Central Time', short: 'CT' },
  { value: 'America/Denver', label: 'Mountain Time', short: 'MT' },
  { value: 'America/Los_Angeles', label: 'Pacific Time', short: 'PT' },
  { value: 'Europe/London', label: 'London', short: 'GMT' },
  { value: 'Europe/Paris', label: 'Central European', short: 'CET' },
  { value: 'Europe/Berlin', label: 'Berlin', short: 'CET' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time', short: 'JST' },
  { value: 'Asia/Shanghai', label: 'China Standard Time', short: 'CST' },
  { value: 'Asia/Singapore', label: 'Singapore', short: 'SGT' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time', short: 'GST' },
  { value: 'Australia/Sydney', label: 'Aus Eastern', short: 'AEST' },
  { value: 'Pacific/Auckland', label: 'New Zealand', short: 'NZST' },
  { value: 'America/Sao_Paulo', label: 'Brasília', short: 'BRT' },
  { value: 'Africa/Lagos', label: 'West Africa', short: 'WAT' },
  { value: 'Asia/Seoul', label: 'Korea Standard Time', short: 'KST' },
] as const;

const LS_KEY = 'qf_world_clocks';
const LS_FORMAT_KEY = 'qf_clock_24h';
const MAX_CLOCKS = 2;

function formatTime(date: Date, tz: string, use24h: boolean): string {
  try {
    return date.toLocaleString('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: !use24h,
    });
  } catch {
    return '--:--:--';
  }
}

export function WorldClock() {
  const [selectedZones, setSelectedZones] = useState<string[]>(() =>
    lsGet<string[]>(LS_KEY, ['UTC', 'Asia/Kolkata'])
  );
  const [now, setNow] = useState(Date.now());
  const [use24h, setUse24h] = useState(() => lsGet<boolean>(LS_FORMAT_KEY, true));
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Update every second
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { lsSet(LS_KEY, selectedZones); }, [selectedZones]);
  useEffect(() => { lsSet(LS_FORMAT_KEY, use24h); }, [use24h]);

  const addZone = useCallback((tz: string) => {
    setSelectedZones(prev => {
      if (prev.includes(tz)) return prev;
      if (prev.length >= MAX_CLOCKS) {
        toast.info(`Maximum ${MAX_CLOCKS} clocks allowed`);
        return prev;
      }
      return [...prev, tz];
    });
  }, []);

  const removeZone = useCallback((tz: string) => {
    setSelectedZones(prev => prev.filter(z => z !== tz));
  }, []);

  const date = new Date(now);
  const getShort = (tz: string) => TIMEZONE_OPTIONS.find(o => o.value === tz)?.short || tz.split('/').pop()?.replace('_', ' ') || tz;

  if (selectedZones.length === 0) {
    return (
      <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1 px-1.5 py-0.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors rounded-sm" title="Add world clocks">
            <Clock className="h-3 w-3" />
            <Plus className="h-2.5 w-2.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="center">
          <ClockSettings selectedZones={selectedZones} addZone={addZone} removeZone={removeZone} use24h={use24h} setUse24h={setUse24h} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2.5 px-2 py-0.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors rounded-sm cursor-pointer" title="World Clock — click to configure">
          <Clock className="h-3 w-3 opacity-50 shrink-0" />
          {selectedZones.map(tz => (
            <span key={tz} className="flex items-center gap-1 font-mono text-[10px] leading-none whitespace-nowrap">
              <span className="font-bold text-foreground/70">{getShort(tz)}</span>
              <span className="text-muted-foreground">{formatTime(date, tz, use24h)}</span>
            </span>
          ))}
          <ChevronDown className="h-2.5 w-2.5 opacity-40 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="center">
        <div className="px-3 py-1.5 border-b border-border flex items-center justify-between">
          <p className="text-[8px] font-extrabold uppercase tracking-widest text-muted-foreground/40">World Clock</p>
          <button
            onClick={() => setUse24h(p => !p)}
            className="text-[9px] font-bold text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded-sm hover:bg-accent"
            title="Toggle 12/24h format"
          >
            {use24h ? '24h' : '12h'}
          </button>
        </div>
        {/* Live display */}
        <div className="px-3 py-2 space-y-1 border-b border-border">
          {selectedZones.map(tz => (
            <div key={tz} className="flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-foreground/80 w-10">{getShort(tz)}</span>
                <span className="font-mono text-[11px] text-foreground tabular-nums">{formatTime(date, tz, use24h)}</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); removeZone(tz); }} className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-all" title="Remove">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        {/* Add more */}
        <ClockSettings selectedZones={selectedZones} addZone={addZone} removeZone={removeZone} use24h={use24h} setUse24h={setUse24h} />
      </PopoverContent>
    </Popover>
  );
}

function ClockSettings({ selectedZones, addZone, removeZone, use24h, setUse24h }: {
  selectedZones: string[]; addZone: (tz: string) => void; removeZone: (tz: string) => void;
  use24h: boolean; setUse24h: (v: boolean | ((p: boolean) => boolean)) => void;
}) {
  const [search, setSearch] = useState('');
  const available = TIMEZONE_OPTIONS.filter(o =>
    !selectedZones.includes(o.value) &&
    (o.label.toLowerCase().includes(search.toLowerCase()) || o.short.toLowerCase().includes(search.toLowerCase()) || o.value.toLowerCase().includes(search.toLowerCase()))
  );
  const isFull = selectedZones.length >= MAX_CLOCKS;

  return (
    <div className="p-2">
      {isFull && (
        <p className="text-[9px] text-muted-foreground/60 text-center py-1 mb-1">Max {MAX_CLOCKS} clocks. Remove one to add another.</p>
      )}
      {!isFull && (
        <>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search timezones..."
            className="w-full px-2 py-1 text-[11px] bg-surface-sunken border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-ring mb-1.5"
          />
          <div className="max-h-32 overflow-y-auto space-y-0.5">
            {available.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-2">No timezones found</p>}
            {available.map(opt => (
              <button
                key={opt.value}
                onClick={() => addZone(opt.value)}
                className="w-full flex items-center justify-between px-2 py-1 text-[10px] hover:bg-accent rounded-sm transition-colors text-left"
              >
                <span className="font-medium text-foreground">{opt.label}</span>
                <span className="text-muted-foreground font-bold">{opt.short}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
