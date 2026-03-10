import React, { useState, useEffect } from 'react';
import type { RequestConfig, BodyType } from '@/types/api';
import { KeyValueEditor } from './KeyValueEditor';
import { CodeEditor } from './CodeEditor';
import { AuthEditor } from './AuthEditor';
import { fetchOAuth2Token } from '@/lib/api-client';
import { safeNewFunction, createSafeConsole } from '@/lib/safe-eval';
import { toast } from 'sonner';
import { ChevronDown, Sparkles, Play, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface Props {
  request: RequestConfig;
  onChange: (request: RequestConfig) => void;
}

type TabKey = 'params' | 'headers' | 'body' | 'auth' | 'pre-script' | 'post-script' | 'tests';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'params', label: 'Params' },
  { key: 'headers', label: 'Headers' },
  { key: 'body', label: 'Body' },
  { key: 'auth', label: 'Auth' },
  { key: 'pre-script', label: 'Pre-script' },
  { key: 'post-script', label: 'Post-script' },
  { key: 'tests', label: 'Tests' },
];

const bodyTypes: { value: BodyType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'json', label: 'JSON' },
  { value: 'form-data', label: 'Form Data' },
  { value: 'x-www-form-urlencoded', label: 'URL Encoded' },
  { value: 'raw', label: 'Raw' },
  { value: 'xml', label: 'XML' },
  { value: 'graphql', label: 'GraphQL' },
];

// ── Script snippet templates ──────────────────────────────────────────
const SCRIPT_SNIPPETS = {
  'pre-script': [
    { label: 'Set timestamp', code: `qf.environment.set('timestamp', Date.now().toString());` },
    { label: 'Log request', code: `qf.log('Sending:', qf.request.method, qf.request.url);` },
    { label: 'Generate UUID', code: `qf.environment.set('uuid', crypto.randomUUID());` },
    { label: 'Set auth token', code: `const token = qf.environment.get('token');\nif (!token) qf.log('Warning: No token set');` },
  ],
  'post-script': [
    { label: 'Save token', code: `const json = qf.response.json();\nqf.environment.set('token', json.access_token || json.token);` },
    { label: 'Log status', code: `qf.log('Status:', qf.response.status, qf.response.statusText);` },
    { label: 'Chain request', code: `const data = qf.response.json();\nconst res = await qf.sendRequest({ url: 'https://api.example.com/next', method: 'GET' });\nqf.log('Chained:', res.status);` },
    { label: 'Save response ID', code: `const json = qf.response.json();\nqf.environment.set('lastId', json.id || json.data?.id);` },
  ],
  'tests': [
    { label: 'Status 200', code: `test('Status is 200', () => {\n  expect(qf.response.status).toBe(200);\n});` },
    { label: 'Has JSON body', code: `test('Response is JSON', () => {\n  const json = qf.response.json();\n  expect(json).toBeTruthy();\n});` },
    { label: 'Response time', code: `test('Response time < 500ms', () => {\n  expect(qf.response.time).toBeLessThan(500);\n});` },
    { label: 'Has property', code: `test('Has data property', () => {\n  const json = qf.response.json();\n  expect(json).toHaveProperty('data');\n});` },
    { label: 'Array length', code: `test('Returns array', () => {\n  const json = qf.response.json();\n  expect(Array.isArray(json)).toBe(true);\n});` },
    { label: 'Not empty', code: `test('Body is not empty', () => {\n  expect(qf.response.body.length).toBeGreaterThan(0);\n});` },
  ],
};

type ScriptResult = {
  status: 'idle' | 'running' | 'success' | 'error';
  output: string[];
  errors: string[];
  duration?: number;
};

function validateScript(code: string): { valid: boolean; errors: string[] } {
  if (!code.trim()) return { valid: true, errors: [] };
  const errors: string[] = [];
  try {
    // Use Function constructor to check syntax without executing
    new Function(code);
  } catch (e: any) {
    const msg = e.message || 'Syntax error';
    errors.push(msg);
  }
  return { valid: errors.length === 0, errors };
}

function runScriptSandbox(code: string, tab: 'pre-script' | 'post-script' | 'tests'): ScriptResult {
  if (!code.trim()) return { status: 'success', output: ['(empty script)'], errors: [], duration: 0 };
  
  const start = performance.now();
  const output: string[] = [];
  const errors: string[] = [];

  // First validate syntax
  const validation = validateScript(code);
  if (!validation.valid) {
    return { status: 'error', output: [], errors: validation.errors, duration: 0 };
  }

  try {
    // Create a sandboxed environment
    const logs: string[] = [];
    const testResults: { name: string; passed: boolean; error?: string }[] = [];

    const mockEnv: Record<string, string> = {};
    const qf = {
      log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
      environment: {
        get: (key: string) => mockEnv[key] || '',
        set: (key: string, val: string) => { mockEnv[key] = val; logs.push(`✓ Set env.${key} = "${val}"`); },
      },
      request: { method: 'GET', url: 'https://example.com', headers: {} },
      sendRequest: async () => ({ status: 200, body: '{}' }),
      response: {
        status: 200,
        statusText: 'OK',
        body: '{"data": "mock"}',
        time: 42,
        json: () => ({ data: 'mock' }),
        headers: { 'content-type': 'application/json' },
      },
    };

    // Backward compat alias
    const pm = { response: qf.response };

    const testFn = (name: string, fn: () => void) => {
      try {
        fn();
        testResults.push({ name, passed: true });
      } catch (e: any) {
        testResults.push({ name, passed: false, error: e.message });
      }
    };

    const expect = (val: any) => ({
      toBe: (expected: any) => { if (val !== expected) throw new Error(`Expected ${expected}, got ${val}`); },
      toBeTruthy: () => { if (!val) throw new Error(`Expected truthy, got ${val}`); },
      toBeFalsy: () => { if (val) throw new Error(`Expected falsy, got ${val}`); },
      toHaveProperty: (prop: string) => { if (!(prop in val)) throw new Error(`Missing property: ${prop}`); },
      toBeLessThan: (n: number) => { if (val >= n) throw new Error(`Expected ${val} < ${n}`); },
      toBeGreaterThan: (n: number) => { if (val <= n) throw new Error(`Expected ${val} > ${n}`); },
      toEqual: (expected: any) => { if (JSON.stringify(val) !== JSON.stringify(expected)) throw new Error(`Values not equal`); },
    });

    // Execute in a sandboxed function
    const fn = safeNewFunction(['qf', 'pm', 'test', 'expect', 'console'], code);
    fn(qf, pm, testFn, expect, createSafeConsole(qf.log));

    // Collect output
    if (logs.length > 0) output.push(...logs);
    if (testResults.length > 0) {
      const passed = testResults.filter(t => t.passed).length;
      const failed = testResults.filter(t => !t.passed).length;
      output.push(`─── Tests: ${passed} passed, ${failed} failed ───`);
      testResults.forEach(t => {
        if (t.passed) output.push(`  ✓ ${t.name}`);
        else { output.push(`  ✗ ${t.name}: ${t.error}`); errors.push(`Test failed: ${t.name}`); }
      });
    }
    if (output.length === 0) output.push('✓ Script executed successfully');

    const duration = Math.round(performance.now() - start);
    return { status: errors.length > 0 ? 'error' : 'success', output, errors, duration };
  } catch (e: any) {
    const duration = Math.round(performance.now() - start);
    errors.push(e.message || 'Runtime error');
    return { status: 'error', output, errors, duration };
  }
}

export function RequestTabs({ request, onChange }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('params');
  const [showSnippets, setShowSnippets] = useState(false);
  const [scriptResult, setScriptResult] = useState<ScriptResult>({ status: 'idle', output: [], errors: [] });

  // Listen for keyboard shortcut tab switching
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail as TabKey;
      if (tabs.find(t => t.key === tab)) setActiveTab(tab);
    };
    document.addEventListener('qf:set-request-tab', handler);
    return () => document.removeEventListener('qf:set-request-tab', handler);
  }, []);

  // Reset script result when switching tabs or changing code
  useEffect(() => {
    setScriptResult({ status: 'idle', output: [], errors: [] });
  }, [activeTab]);

  const badge = (key: TabKey) => {
    if (key === 'params') return request.params.filter(p => p.enabled && p.key).length;
    if (key === 'headers') return request.headers.filter(h => h.enabled && h.key).length;
    return 0;
  };

  const handleFetchToken = async () => {
    try {
      const token = await fetchOAuth2Token(request.auth.oauth2);
      onChange({ ...request, auth: { ...request.auth, oauth2: { ...request.auth.oauth2!, accessToken: token } } });
      toast.success('Token acquired');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const insertSnippet = (code: string) => {
    if (activeTab === 'pre-script') {
      const current = request.preScript;
      onChange({ ...request, preScript: current ? `${current}\n\n${code}` : code });
    } else if (activeTab === 'post-script') {
      const current = request.postScript;
      onChange({ ...request, postScript: current ? `${current}\n\n${code}` : code });
    } else if (activeTab === 'tests') {
      const current = request.tests;
      onChange({ ...request, tests: current ? `${current}\n\n${code}` : code });
    }
    setShowSnippets(false);
    toast.success('Snippet inserted');
  };

  const getScriptCode = () => {
    if (activeTab === 'pre-script') return request.preScript;
    if (activeTab === 'post-script') return request.postScript;
    if (activeTab === 'tests') return request.tests;
    return '';
  };

  const handleValidate = () => {
    const code = getScriptCode();
    const result = validateScript(code);
    if (result.valid) {
      setScriptResult({ status: 'success', output: ['✓ Syntax is valid'], errors: [], duration: 0 });
      toast.success('Script syntax is valid');
    } else {
      setScriptResult({ status: 'error', output: [], errors: result.errors });
      toast.error('Syntax error found');
    }
  };

  const handleRunScript = () => {
    const code = getScriptCode();
    setScriptResult({ status: 'running', output: [], errors: [] });
    // Use setTimeout to show loading state briefly
    setTimeout(() => {
      const result = runScriptSandbox(code, activeTab as any);
      setScriptResult(result);
      if (result.status === 'success') toast.success(`Script ran in ${result.duration}ms`);
      else toast.error(`Script failed: ${result.errors[0]}`);
    }, 100);
  };

  const currentSnippets = SCRIPT_SNIPPETS[activeTab as keyof typeof SCRIPT_SNIPPETS] || [];
  const isScriptTab = activeTab === 'pre-script' || activeTab === 'post-script' || activeTab === 'tests';

  return (
    <div className="flex flex-col h-full">
      {/* Tab strip */}
      <div className="flex border-b border-border overflow-x-auto shrink-0 h-[37px]">
        {tabs.map(tab => {
          const count = badge(tab.key);
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 h-full text-[10px] font-bold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className="ml-1 px-1 py-0.5 text-[9px] font-extrabold bg-primary/10 text-primary">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-auto min-h-0">
        {activeTab === 'params' && (
          <KeyValueEditor pairs={request.params} onChange={(params) => onChange({ ...request, params })} />
        )}
        {activeTab === 'headers' && (
          <KeyValueEditor pairs={request.headers} onChange={(headers) => onChange({ ...request, headers })} />
        )}
        {activeTab === 'body' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex gap-0 border-b border-border shrink-0">
              {bodyTypes.map(bt => (
                <button
                  key={bt.value}
                  onClick={() => onChange({ ...request, body: { ...request.body, type: bt.value } })}
                  className={`px-2.5 py-1.5 text-[10px] font-bold transition-colors ${
                    request.body.type === bt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {bt.label}
                </button>
              ))}
            </div>
            {(request.body.type === 'json' || request.body.type === 'raw' || request.body.type === 'xml') && (
              <CodeEditor
                value={request.body.raw}
                onChange={(raw) => onChange({ ...request, body: { ...request.body, raw } })}
                placeholder={request.body.type === 'json' ? '{\n  "key": "value"\n}' : 'Enter request body'}
                language={request.body.type === 'json' ? 'json' : request.body.type === 'xml' ? 'xml' : 'text'}
                minHeight="80px"
              />
            )}
            {(request.body.type === 'form-data' || request.body.type === 'x-www-form-urlencoded') && (
              <KeyValueEditor
                pairs={request.body.formData}
                onChange={(formData) => onChange({ ...request, body: { ...request.body, formData } })}
              />
            )}
            {request.body.type === 'graphql' && (
              <div className="flex flex-col flex-1 min-h-0">
                <CodeEditor
                  value={request.body.graphql.query}
                  onChange={(query) => onChange({ ...request, body: { ...request.body, graphql: { ...request.body.graphql, query } } })}
                  placeholder="query {\n  users {\n    id\n    name\n  }\n}"
                  language="graphql"
                  minHeight="80px"
                />
                <div className="border-t border-border shrink-0">
                  <div className="px-2 py-1 bg-surface-elevated">
                    <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-wider">Variables</span>
                  </div>
                  <CodeEditor
                    value={request.body.graphql.variables}
                    onChange={(variables) => onChange({ ...request, body: { ...request.body, graphql: { ...request.body.graphql, variables } } })}
                    placeholder='{"key": "value"}'
                    language="json"
                    minHeight="50px"
                  />
                </div>
              </div>
            )}
            {request.body.type === 'none' && (
              <p className="text-[10px] text-muted-foreground/40 font-bold py-6 text-center">This request does not have a body.</p>
            )}
          </div>
        )}
        {activeTab === 'auth' && (
          <AuthEditor auth={request.auth} onChange={(auth) => onChange({ ...request, auth })} onFetchToken={handleFetchToken} />
        )}

        {/* Script tabs with snippet support + run/validate */}
        {isScriptTab && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between px-3 py-1 bg-surface-elevated border-b border-border shrink-0">
              <p className="text-[9px] text-muted-foreground/40 font-bold">
                {activeTab === 'pre-script' && <>Runs before request · <code className="font-mono bg-accent/50 px-0.5">qf.environment.get(key)</code></>}
                {activeTab === 'post-script' && <>Runs after response · <code className="font-mono bg-accent/50 px-0.5">qf.sendRequest()</code></>}
                {activeTab === 'tests' && <><code className="font-mono bg-accent/50 px-0.5">test(name, fn)</code> · <code className="font-mono bg-accent/50 px-0.5">expect(val)</code></>}
              </p>
              <div className="flex items-center gap-0.5">
                {/* Validate button */}
                <button
                  onClick={handleValidate}
                  disabled={!getScriptCode().trim()}
                  className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-20 disabled:pointer-events-none"
                  title="Validate syntax"
                >
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Validate
                </button>
                {/* Run button */}
                <button
                  onClick={handleRunScript}
                  disabled={scriptResult.status === 'running' || !getScriptCode().trim()}
                  className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold text-primary hover:bg-primary/10 transition-colors disabled:opacity-20 disabled:pointer-events-none"
                  title="Run script (dry run with mock data)"
                >
                  {scriptResult.status === 'running' ? (
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  ) : (
                    <Play className="h-2.5 w-2.5" />
                  )}
                  Run
                </button>
                {/* Snippets */}
                <div className="relative">
                  <button
                    onClick={() => setShowSnippets(!showSnippets)}
                    className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    Snippets
                    <ChevronDown className="h-2 w-2" />
                  </button>
                  {showSnippets && currentSnippets.length > 0 && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowSnippets(false)} />
                      <div className="absolute top-full right-0 mt-1 z-50 bg-card border border-border shadow-2xl min-w-[180px] py-1 animate-fade-in">
                        <div className="px-3 py-1 border-b border-border">
                          <p className="text-[8px] font-extrabold uppercase tracking-widest text-muted-foreground/30">Insert Snippet</p>
                        </div>
                        {currentSnippets.map((s, i) => (
                          <button key={i} onClick={() => insertSnippet(s.code)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-left hover:bg-accent transition-colors text-foreground">
                            <Sparkles className="h-2.5 w-2.5 text-primary shrink-0" />
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <CodeEditor
              value={activeTab === 'pre-script' ? request.preScript : activeTab === 'post-script' ? request.postScript : request.tests}
              onChange={(val) => {
                if (activeTab === 'pre-script') onChange({ ...request, preScript: val });
                else if (activeTab === 'post-script') onChange({ ...request, postScript: val });
                else onChange({ ...request, tests: val });
              }}
              placeholder={
                activeTab === 'pre-script'
                  ? "// Pre-request script\nqf.log('Sending request...');\nqf.environment.set('timestamp', Date.now().toString());"
                  : activeTab === 'post-script'
                  ? "// Post-response script\nqf.log(qf.response.status);\nqf.environment.set('token', qf.response.body);"
                  : `test('Status is 200', () => {\n  expect(qf.response.status).toBe(200);\n});\n\ntest('Has data', () => {\n  const json = qf.response.json();\n  expect(json).toBeTruthy();\n});`
              }
              minHeight="100px"
            />

            {/* Script output panel */}
            {scriptResult.status !== 'idle' && (
              <div className="border-t border-border bg-surface-sunken shrink-0 max-h-[200px] overflow-auto">
                <div className="flex items-center gap-2 px-3 py-1 border-b border-border bg-surface-elevated">
                  {scriptResult.status === 'running' && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                  {scriptResult.status === 'success' && <CheckCircle2 className="h-3 w-3 text-status-success" />}
                  {scriptResult.status === 'error' && <XCircle className="h-3 w-3 text-destructive" />}
                  <span className="text-[9px] font-bold text-muted-foreground">
                    {scriptResult.status === 'running' && 'Running...'}
                    {scriptResult.status === 'success' && `Passed${scriptResult.duration !== undefined ? ` · ${scriptResult.duration}ms` : ''}`}
                    {scriptResult.status === 'error' && `Failed${scriptResult.duration !== undefined ? ` · ${scriptResult.duration}ms` : ''}`}
                  </span>
                  <button
                    onClick={() => setScriptResult({ status: 'idle', output: [], errors: [] })}
                    className="ml-auto text-[9px] font-bold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="px-3 py-1.5 font-mono text-[10px] leading-[1.6] space-y-0.5">
                  {scriptResult.output.map((line, i) => (
                    <div key={`o-${i}`} className={`${line.startsWith('  ✓') ? 'text-status-success' : line.startsWith('  ✗') ? 'text-destructive' : line.startsWith('✓') ? 'text-status-success' : 'text-foreground'}`}>
                      {line}
                    </div>
                  ))}
                  {scriptResult.errors.map((err, i) => (
                    <div key={`e-${i}`} className="text-destructive flex items-start gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                      {err}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
