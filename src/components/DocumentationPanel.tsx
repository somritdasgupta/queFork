import React, { useState } from 'react';
import { ChevronDown, ChevronRight, BookOpen, Terminal, Zap, Link2, GitBranch, Shield, Workflow, Download, CheckCircle2, ArrowRight, Globe, Cpu, Play, AlertTriangle, Chrome, FolderOpen, Settings, ToggleLeft, PanelRight, Send, Clock, MessageSquare, Search, Variable, List, Repeat, ShieldCheck, Braces, Filter, Layers, ShieldAlert, FolderPlus, Code, FileCode, FlaskConical, Hash, StickyNote, Power, Copy, ChevronUp, Trash2, RotateCcw } from 'lucide-react';
import { SyntaxHighlighter } from './SyntaxHighlighter';

function Section({ title, icon, children, defaultOpen }: { title: string; icon?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen || false);
  return (
    <div className="border-b border-border">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2.5 px-5 py-3 text-left hover:bg-accent/30 transition-colors">
        {open ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
        {icon}
        <span className="text-[12px] font-bold text-foreground">{title}</span>
      </button>
      {open && <div className="px-5 pb-4 text-[11px] leading-relaxed text-muted-foreground space-y-3">{children}</div>}
    </div>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 mt-2">
      <h4 className="text-[11px] font-bold text-foreground border-b border-border/50 pb-1">{title}</h4>
      {children}
    </div>
  );
}

function Tag({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'method' }) {
  const colors = {
    default: 'bg-accent text-foreground',
    success: 'bg-status-success/10 text-status-success',
    warning: 'bg-method-put/10 text-method-put',
    method: 'bg-primary/10 text-primary',
  };
  return <code className={`font-mono text-[10px] px-1.5 py-0.5 ${colors[variant]} font-bold`}>{children}</code>;
}

function Tip({ children, type = 'info' }: { children: React.ReactNode; type?: 'info' | 'warning' | 'success' }) {
  const styles = {
    info: 'bg-primary/5 border-primary/20 text-primary',
    warning: 'bg-method-put/5 border-method-put/20 text-method-put',
    success: 'bg-status-success/5 border-status-success/20 text-status-success',
  };
  return (
    <div className={`border p-2.5 ${styles[type]} text-[10px]`}>
      {children}
    </div>
  );
}

export function DocumentationPanel() {
  return (
    <div className="flex flex-col h-full overflow-y-auto w-full">
      <div className="px-5 py-4 border-b border-border bg-surface-elevated">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h2 className="text-[14px] font-black text-foreground">Documentation</h2>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5 font-bold">Complete reference for queFork — API testing, scripting, and workflow automation.</p>
      </div>

      <div className="w-full">
        {/* ─── GETTING STARTED ─────────────────────────────────────── */}
        <Section title="Getting Started">
          <p><strong className="text-foreground">queFork</strong> is a fast, zero-reload API testing platform supporting REST, GraphQL, SOAP, WebSocket, SSE, and Socket.IO. Everything runs client-side with no backend required.</p>
          <p>Enter a URL, select your method, and hit <Tag>⌘ Enter</Tag> to send. Use <Tag>⌘ K</Tag> to open the command palette for quick navigation.</p>
          <Subsection title="Supported Protocols">
            <div className="grid grid-cols-3 gap-2">
              {[
                { name: 'REST', desc: 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD' },
                { name: 'GraphQL', desc: 'Queries, mutations, variables, introspection' },
                { name: 'WebSocket', desc: 'Bidirectional real-time communication' },
                { name: 'SSE', desc: 'Server-Sent Events stream listener' },
                { name: 'Socket.IO', desc: 'Event-based real-time messaging' },
                { name: 'SOAP', desc: 'XML envelope-based web services' },
              ].map(p => (
                <div key={p.name} className="bg-surface-sunken border border-border p-2">
                  <span className="text-[10px] font-bold text-foreground">{p.name}</span>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{p.desc}</p>
                </div>
              ))}
            </div>
          </Subsection>
          <Subsection title="Keyboard Shortcuts">
            <div className="grid grid-cols-2 gap-1">
              {[
                { keys: '⌘ Enter', action: 'Send request' },
                { keys: '⌘ K', action: 'Command palette' },
                { keys: '⌘ S', action: 'Save to collection' },
                { keys: '⌘ N', action: 'New tab' },
                { keys: '⌘ W', action: 'Close tab' },
                { keys: '⌘ E', action: 'Toggle environment' },
                { keys: '⌘ L', action: 'Clear response' },
                { keys: '⌘ I', action: 'Import cURL' },
              ].map(s => (
                <div key={s.keys} className="flex items-center gap-2 px-2 py-1 bg-surface-sunken border border-border">
                  <Tag>{s.keys}</Tag>
                  <span className="text-[9px] text-muted-foreground">{s.action}</span>
                </div>
              ))}
            </div>
          </Subsection>
        </Section>

        {/* ─── REQUEST CONFIGURATION ──────────────────────────────── */}
        <Section title="Request Configuration" icon={<Terminal className="h-3 w-3 text-primary" />}>
          <Subsection title="Query Parameters">
            <p>Appended to the URL automatically. Toggle individual pairs on/off with the checkbox. Use <Tag variant="method">{`{{variable}}`}</Tag> syntax for dynamic values from the active environment.</p>
            <p>Parameters already in the URL are parsed and displayed in the table. Editing either the URL or the table keeps them in sync.</p>
          </Subsection>
          <Subsection title="Headers">
            <p>Custom HTTP headers with toggle on/off per header. Common headers like <Tag>Content-Type</Tag> and <Tag>Authorization</Tag> are auto-set based on body type and auth config — but you can override them.</p>
            <Tip type="info">Headers set manually always take precedence over auto-generated ones. If you set <code className="font-mono text-[10px]">Content-Type</code> manually, the auto-detection won't override it.</Tip>
          </Subsection>
          <Subsection title="Body Types">
            <div className="space-y-1.5">
              {[
                { name: 'JSON', desc: 'Sends with Content-Type: application/json. Syntax-highlighted editor with validation.', auto: 'application/json' },
                { name: 'Form Data', desc: 'Multipart form data. Key-value pairs with toggle. Browser sets Content-Type with boundary automatically.', auto: 'multipart/form-data' },
                { name: 'URL-encoded', desc: 'application/x-www-form-urlencoded. Key-value pairs encoded as query string in the body.', auto: 'application/x-www-form-urlencoded' },
                { name: 'Raw', desc: 'Plain text body. No Content-Type auto-set — add your own header.', auto: 'none' },
                { name: 'XML', desc: 'Sends with Content-Type: application/xml. XML syntax highlighting in editor.', auto: 'application/xml' },
                { name: 'GraphQL', desc: 'Query + Variables fields. Sent as JSON { query, variables } with Content-Type: application/json.', auto: 'application/json' },
              ].map(t => (
                <div key={t.name} className="bg-surface-sunken border border-border p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-foreground">{t.name}</span>
                    {t.auto !== 'none' && <Tag variant="success">{t.auto}</Tag>}
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{t.desc}</p>
                </div>
              ))}
            </div>
          </Subsection>
          <Subsection title="Authentication">
            <div className="space-y-2">
              <div className="bg-surface-sunken border border-border p-2.5">
                <p className="text-[10px] font-bold text-foreground">Bearer Token</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">Adds <code className="font-mono text-[10px]">Authorization: Bearer &lt;token&gt;</code> header. Enter the token without "Bearer " prefix.</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">Supports <Tag variant="method">{`{{envVar}}`}</Tag> — e.g., <code className="font-mono text-[10px]">{`{{authToken}}`}</code></p>
              </div>
              <div className="bg-surface-sunken border border-border p-2.5">
                <p className="text-[10px] font-bold text-foreground">Basic Auth</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">Encodes username:password as Base64 and sets <code className="font-mono text-[10px]">Authorization: Basic &lt;encoded&gt;</code>.</p>
              </div>
              <div className="bg-surface-sunken border border-border p-2.5">
                <p className="text-[10px] font-bold text-foreground">API Key</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">Add a key-value pair to either a <strong>header</strong> or <strong>query parameter</strong>. Choose the location with the "Add to" dropdown.</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">Example: <code className="font-mono text-[10px]">X-API-Key: sk_live_xxx</code> (header) or <code className="font-mono text-[10px]">?api_key=sk_live_xxx</code> (query)</p>
              </div>
              <div className="bg-surface-sunken border border-border p-2.5">
                <p className="text-[10px] font-bold text-foreground">OAuth 2.0</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">Supports Client Credentials, Authorization Code, and Password grant types. Fill in Token URL, Client ID, Client Secret, and optionally Scope.</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">Click <Tag variant="success">Get Token</Tag> to fetch the access token automatically. The token is stored and sent as <code className="font-mono text-[10px]">Authorization: Bearer &lt;token&gt;</code>.</p>
              </div>
            </div>
            <Tip type="info">Auth headers are only auto-set if you haven't manually added an <code className="font-mono text-[10px]">Authorization</code> header. Manual headers always win.</Tip>
          </Subsection>
        </Section>

        {/* ─── ENVIRONMENTS & VARIABLES ───────────────────────────── */}
        <Section title="Environments & Variables" icon={<Zap className="h-3 w-3 text-primary" />}>
          <p>Create multiple environments (Development, Staging, Production). Set one as <Tag variant="success">Active</Tag> using the dropdown in the sidebar.</p>
          <Subsection title="Variable Syntax">
            <p>Use double-brace syntax anywhere — URLs, headers, body, query params, and scripts:</p>
            <SyntaxHighlighter code={`{{baseUrl}}/api/users\nAuthorization: Bearer {{apiKey}}\n{"token": "{{authToken}}"}`} language="shell" maxHeight="80px" />
            <p>Variables resolve just before each request is sent. Unresolved variables show as <code className="font-mono text-[10px]">{`{{varName}}`}</code> in the response.</p>
          </Subsection>
          <Subsection title="Autocomplete">
            <p>When typing <code className="font-mono text-[10px]">{`{{`}</code> in URL, header, or body fields, an autocomplete dropdown appears showing all available variables from the active environment.</p>
          </Subsection>
          <Subsection title="Script-controlled Variables">
            <p>Scripts can read, write, and clear environment variables at runtime:</p>
            <SyntaxHighlighter code={`// Read
const url = qf.environment.get('baseUrl');

// Write (chainable)
qf.environment.set('token', 'abc123')
  .set('userId', '42');

// Remove
qf.environment.remove('oldKey');

// List all active variables
const vars = qf.environment.list();

// Clear everything
qf.environment.clear();`} language="javascript" maxHeight="180px" />
          </Subsection>
          <Subsection title="Environment Inheritance in Flows">
            <p>When a flow runs, all active environment variables are pre-loaded into the flow's <code className="font-mono text-[10px]">vars</code> object. Flow-level variables (defined in Flow Variables panel) override environment variables with the same name.</p>
            <p>Scripts running inside flow nodes can also read/write flow variables using <code className="font-mono text-[10px]">qf.variables.set()</code> — these persist across all steps in the flow.</p>
          </Subsection>
        </Section>

        {/* ─── COLLECTIONS ────────────────────────────────────────── */}
        <Section title="Collections" icon={<Link2 className="h-3 w-3 text-primary" />}>
          <p>Group related requests into named collections. Useful for organizing by API, project, or workflow.</p>
          <Subsection title="Managing Collections">
            <div className="space-y-1">
              <p>• <strong className="text-foreground">Create</strong> — Click "Save to Collection" or use <Tag>⌘ S</Tag>. Choose an existing collection or create a new one.</p>
              <p>• <strong className="text-foreground">Rename</strong> — Double-click the collection name in the sidebar.</p>
              <p>• <strong className="text-foreground">Delete</strong> — Click the trash icon next to the collection name.</p>
              <p>• <strong className="text-foreground">Open Request</strong> — Click any request in a collection to open it in a new tab.</p>
            </div>
          </Subsection>
          <Subsection title="Collections in Flows">
            <p>Flow Request nodes can reference any request from your collections. The dropdown shows all open tabs and all collection requests grouped by collection name.</p>
          </Subsection>
        </Section>

        {/* ─── SCRIPTING API ──────────────────────────────────────── */}
        <Section title="Scripting API (qf.*)" icon={<Terminal className="h-3 w-3 text-primary" />}>
          <p><strong className="text-foreground">Pre-request</strong> and <strong className="text-foreground">Post-response</strong> scripts run JavaScript in a sandboxed environment with the <Tag variant="method">qf</Tag> namespace. Dangerous globals (localStorage, document, cookies, WebSocket, etc.) are blocked to prevent malicious scripts from exfiltrating data.</p>

          <Subsection title="qf.environment — Read/Write Environment Variables">
            <SyntaxHighlighter code={`// Set (chainable — returns 'this')
qf.environment.set('baseUrl', 'https://api.prod.com')
  .set('apiKey', 'sk_live_xxx')
  .set('version', 'v2');

// Get a single value (returns undefined if not found)
const url = qf.environment.get('baseUrl');

// Remove a variable
qf.environment.remove('oldKey');

// List all enabled variables as [{key, value}]
const allVars = qf.environment.list();

// Clear ALL environment variables (destructive!)
qf.environment.clear();`} language="javascript" maxHeight="220px" />
            <Tip type="warning">Changes made via <code className="font-mono text-[10px]">qf.environment.set()</code> mutate the active environment directly. They persist across requests until manually changed.</Tip>
          </Subsection>

          <Subsection title="qf.variables — Runtime Variables">
            <p>Temporary key-value store. In standalone requests, these reset between executions. In flows, they persist across all steps.</p>
            <SyntaxHighlighter code={`// Set (chainable)
qf.variables.set('startTime', Date.now())
  .set('requestId', 'req-' + Math.random().toString(36).slice(2, 10));

// Get
const elapsed = Date.now() - qf.variables.get('startTime');

// Remove
qf.variables.remove('tempKey');

// List all as {key: value} object
const all = qf.variables.list();`} language="javascript" maxHeight="180px" />
            <Tip type="success">In flow context, <code className="font-mono text-[10px]">qf.variables</code> directly reads and writes the flow's shared variable store. This means a pre-script can set a variable that a later Extract or Transform node can access via <code className="font-mono text-[10px]">vars.yourKey</code>.</Tip>
          </Subsection>

          <Subsection title="qf.response — Response Data (Post-script / Tests)">
            <SyntaxHighlighter code={`// Available in post-scripts and test scripts
qf.response.status       // 200
qf.response.statusText   // 'OK'
qf.response.body         // raw body string
qf.response.json()       // parsed JSON (null if invalid)
qf.response.headers      // { 'content-type': 'application/json', ... }
qf.response.time         // response time in ms`} language="javascript" maxHeight="120px" />
          </Subsection>

          <Subsection title="qf.request — Request Metadata (Pre-script)">
            <SyntaxHighlighter code={`qf.request.method   // 'POST'
qf.request.url      // 'https://api.example.com/users'
qf.request.headers  // { 'Content-Type': 'application/json', 'Authorization': 'Bearer ...' }
qf.request.params   // { page: '1', limit: '20' }`} language="javascript" maxHeight="80px" />
          </Subsection>

          <Subsection title="qf.sendRequest() — Make Sub-Requests">
            <p>Send additional HTTP requests from within scripts. Useful for fetching tokens, chaining calls, or pre-loading data.</p>
            <SyntaxHighlighter code={`const res = await qf.sendRequest({
  method: 'POST',
  url: 'https://auth.api.com/token',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_id: qf.environment.get('clientId'),
    client_secret: qf.environment.get('clientSecret'),
    grant_type: 'client_credentials'
  })
});

// Response object:
res.status          // HTTP status code
res.body            // raw body string
res.json()          // parsed JSON (null if invalid)
res.headers         // response headers object`} language="javascript" maxHeight="250px" />
            <Tip type="warning"><code className="font-mono text-[10px]">qf.sendRequest()</code> makes direct fetch calls without CORS proxy. Use it for APIs that support CORS or same-origin requests.</Tip>
          </Subsection>

          <Subsection title="qf.log() — Console Output">
            <SyntaxHighlighter code={`// Log to browser console with [qf] prefix
qf.log('Token acquired:', token.slice(0, 10) + '...');
qf.log('Response size:', qf.response.body.length, 'bytes');

// In flow context, qf.log() also outputs to the execution log panel`} language="javascript" maxHeight="80px" />
          </Subsection>

          <Subsection title="Backward Compatibility (pm.*)">
            <p>The legacy <code className="font-mono text-[10px]">pm</code> namespace is still available as an alias. <code className="font-mono text-[10px]">pm.response</code> maps to the same object as <code className="font-mono text-[10px]">qf.response</code>.</p>
            <SyntaxHighlighter code={`// These are equivalent:
qf.response.status  ===  pm.response.status
qf.response.json()  ===  pm.response.json()`} language="javascript" maxHeight="60px" />
          </Subsection>

          <Subsection title="Security Sandbox">
            <p>Scripts execute inside a sandboxed <code className="font-mono text-[10px]">new Function()</code> with the following globals blocked:</p>
            <div className="grid grid-cols-4 gap-1">
              {['localStorage', 'sessionStorage', 'indexedDB', 'document', 'cookie', 'XMLHttpRequest', 'WebSocket', 'navigator', 'location', 'top', 'parent', 'opener', 'frames', 'self', 'globalThis'].map(g => (
                <span key={g} className="font-mono text-[9px] bg-destructive/10 text-destructive px-1.5 py-0.5 text-center">{g}</span>
              ))}
            </div>
            <p className="mt-1">This prevents malicious imported collections from stealing your stored data. Only the explicitly provided <code className="font-mono text-[10px]">qf</code> and <code className="font-mono text-[10px]">console</code> objects are accessible.</p>
          </Subsection>
        </Section>

        {/* ─── TESTS ──────────────────────────────────────────────── */}
        <Section title="Tests" icon={<Shield className="h-3 w-3 text-primary" />}>
          <p>Write tests in the Tests tab of any request. Tests run automatically after each send. Results appear inline with pass/fail indicators.</p>
          
          <Subsection title="Writing Tests">
            <SyntaxHighlighter code={`test('Status is 200', () => {
  expect(qf.response.status).toBe(200);
});

test('Response has user data', () => {
  const json = qf.response.json();
  expect(json).toHaveProperty('id');
  expect(json).toHaveProperty('email');
  expect(json.email).toContain('@');
});

test('Response time under 500ms', () => {
  expect(qf.response.time).toBeLessThan(500);
});

test('Array has items', () => {
  const items = qf.response.json().data;
  expect(items.length).toBeGreaterThan(0);
});

test('Exact structure', () => {
  const json = qf.response.json();
  expect(json).toEqual({ id: 1, name: 'Test' });
});`} language="javascript" maxHeight="300px" />
          </Subsection>

          <Subsection title="All Assertion Methods">
            <div className="space-y-1">
              {[
                { method: '.toBe(expected)', desc: 'Strict equality (===). Use for primitives: numbers, strings, booleans.', example: 'expect(status).toBe(200)' },
                { method: '.toEqual(expected)', desc: 'Deep equality (JSON comparison). Use for objects and arrays.', example: 'expect(json).toEqual({id: 1})' },
                { method: '.toContain(substring)', desc: 'Checks if string includes the substring.', example: 'expect(body).toContain("success")' },
                { method: '.toBeTruthy()', desc: 'Passes if value is truthy (not null, undefined, 0, false, "").', example: 'expect(json.token).toBeTruthy()' },
                { method: '.toBeFalsy()', desc: 'Passes if value is falsy.', example: 'expect(json.error).toBeFalsy()' },
                { method: '.toBeGreaterThan(n)', desc: 'Value must be > n.', example: 'expect(json.count).toBeGreaterThan(0)' },
                { method: '.toBeLessThan(n)', desc: 'Value must be < n.', example: 'expect(time).toBeLessThan(1000)' },
                { method: '.toHaveProperty(prop)', desc: 'Object must have the named property (uses "in" operator).', example: 'expect(json).toHaveProperty("id")' },
                { method: '.toHaveLength(n)', desc: 'Array or string must have exactly n length.', example: 'expect(items).toHaveLength(10)' },
              ].map(a => (
                <div key={a.method} className="bg-surface-sunken border border-border p-2">
                  <code className="font-mono text-[10px] text-primary font-bold">{a.method}</code>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{a.desc}</p>
                  <code className="font-mono text-[9px] text-foreground/60 mt-0.5 block">{a.example}</code>
                </div>
              ))}
            </div>
          </Subsection>

          <Subsection title="Tests in Flows">
            <p>Flow Request nodes have a dedicated <Tag variant="method">Tests</Tag> script tab. These tests run after the request completes and their results are displayed inline on the node card during execution.</p>
            <p>Tests can access flow variables via <code className="font-mono text-[10px]">qf.variables.get('key')</code> and the response via <code className="font-mono text-[10px]">qf.response</code>.</p>
            <SyntaxHighlighter code={`// Flow test example — access flow vars
test('Created resource has expected title', () => {
  const json = qf.response.json();
  expect(json.title).toBe('Created by queFork Flow');
});

test('Response time acceptable', () => {
  expect(qf.response.time).toBeLessThan(3000);
});`} language="javascript" maxHeight="120px" />
          </Subsection>
        </Section>

        {/* ─── FLOW AUTOMATION ENGINE (EXHAUSTIVE) ────────────────── */}
        <Section title="Flow Automation Engine" icon={<Workflow className="h-3 w-3 text-primary" />}>
          <p className="text-foreground font-bold text-[12px]">Chain API requests, logic, transforms, and assertions into automated pipelines that execute top-to-bottom with full visual feedback.</p>
          <p>Flows are the most powerful feature in queFork. They let you build complex API testing scenarios — authentication chains, CRUD lifecycles, data validation pipelines, retry/resilience patterns — all without writing a single line of backend code.</p>

          <Subsection title="How Flows Work">
            <div className="space-y-1.5">
              <p>1. <strong className="text-foreground">Create a flow</strong> — Each workspace can have multiple flows. Click "+" to create a new one.</p>
              <p>2. <strong className="text-foreground">Add steps (nodes)</strong> — Click "Add Step" to choose from 14 node types organized by category.</p>
              <p>3. <strong className="text-foreground">Configure each node</strong> — Expand a node to set its properties (URL, conditions, expressions, etc.).</p>
              <p>4. <strong className="text-foreground">Run the flow</strong> — Click "Run". Nodes execute top-to-bottom. Each node auto-expands during execution with a 5-second buffer between steps so you can see results.</p>
              <p>5. <strong className="text-foreground">Review results</strong> — Each node shows pass/fail status, test results, output data, and error messages inline.</p>
            </div>
          </Subsection>

          <Subsection title="Visual Execution Feedback">
            <p>During flow execution, the UI provides real-time feedback:</p>
            <div className="space-y-1">
              <p>• <strong className="text-foreground">Auto-expand</strong> — The currently executing node auto-expands so you can see its configuration and scripts.</p>
              <p>• <strong className="text-foreground">Auto-scroll</strong> — The view scrolls to keep the active node centered on screen.</p>
              <p>• <strong className="text-foreground">Script visibility</strong> — For request nodes with scripts, the pre/post/test script panels auto-open during execution.</p>
              <p>• <strong className="text-foreground">Ring highlight</strong> — The active node gets a blue ring border to distinguish it from others.</p>
              <p>• <strong className="text-foreground">Status indicators</strong> — Spinner while running, green check on success, red X on failure, skip icon when skipped.</p>
              <p>• <strong className="text-foreground">Buffer delay</strong> — A 5-second pause between steps lets you observe results before the next step begins.</p>
              <p>• <strong className="text-foreground">Execution log</strong> — A live log at the bottom shows timestamped entries for every operation, including script output from <code className="font-mono text-[10px]">qf.log()</code>.</p>
            </div>
          </Subsection>

          <Subsection title="Flow Variables">
            <p>Each flow has its own variable store, accessible via the <Tag variant="method">Variables</Tag> button (Variable icon) in the flow header.</p>
            <div className="space-y-1">
              <p>• <strong className="text-foreground">Pre-defined variables</strong> — Set key-value pairs before the flow runs. These override environment variables with the same name.</p>
              <p>• <strong className="text-foreground">Runtime variables</strong> — Set Variable, Extract, Transform, and ForEach nodes write to <code className="font-mono text-[10px]">vars</code> during execution.</p>
              <p>• <strong className="text-foreground">Script access</strong> — Pre/post scripts use <code className="font-mono text-[10px]">qf.variables.set('key', value)</code> and <code className="font-mono text-[10px]">qf.variables.get('key')</code> to read/write the same store.</p>
              <p>• <strong className="text-foreground">Interpolation</strong> — Use <Tag variant="method">{`{{varName}}`}</Tag> in URLs, headers, log messages, and body content. Unresolved vars pass through as-is.</p>
            </div>
          </Subsection>

          <Subsection title="Flow Management">
            <div className="space-y-1">
              <p>• <strong className="text-foreground">Multiple flows</strong> — Create as many flows as needed. Switch between them with the tab bar at the top.</p>
              <p>• <strong className="text-foreground">Duplicate flow</strong> — Copy icon clones the entire flow including all nodes and variables.</p>
              <p>• <strong className="text-foreground">Export/Import</strong> — Download flows as JSON files. Share them with your team or import them on another machine.</p>
              <p>• <strong className="text-foreground">Templates</strong> — Click the Sparkles icon to load pre-built flow templates (Auth chain, CRUD suite, etc.).</p>
              <p>• <strong className="text-foreground">History</strong> — Click the Clock icon to see past run results with pass/fail counts and timestamps.</p>
            </div>
          </Subsection>
        </Section>

        {/* ─── ALL 14 NODE TYPES ──────────────────────────────────── */}
        <Section title="Flow Node Types — Complete Reference" icon={<Send className="h-3 w-3 text-primary" />}>
          
          {/* Request Node */}
          <Subsection title="1. Request Node">
            <div className="flex items-center gap-2 mb-2">
              <Send className="h-4 w-4 text-primary" />
              <span className="text-[11px] font-bold text-foreground">Execute an HTTP request</span>
              <Tag variant="method">Category: Execute</Tag>
            </div>
            <p>The core node type. Sends an HTTP request and stores the response for subsequent nodes.</p>
            
            <p className="font-bold text-foreground mt-2">Two request modes:</p>
            <div className="space-y-1.5">
              <div className="bg-surface-sunken border border-border p-2">
                <p className="text-[10px] font-bold text-foreground">Tab/Collection Reference</p>
                <p className="text-[9px] text-muted-foreground">Select from the dropdown — shows all open tabs and collection requests. Supports all protocols (REST, GraphQL, SOAP, WebSocket, SSE, Socket.IO). The request uses all config from the referenced tab: URL, method, headers, body, auth, etc.</p>
              </div>
              <div className="bg-surface-sunken border border-border p-2">
                <p className="text-[10px] font-bold text-foreground">Inline URL</p>
                <p className="text-[9px] text-muted-foreground">Type a URL directly. Choose method (GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD). Set body type and body content. Supports <code className="font-mono text-[10px]">{`{{vars}}`}</code> for dynamic URLs. Used by templates for self-contained flows.</p>
              </div>
            </div>
            
            <p className="font-bold text-foreground mt-2">Inline Headers:</p>
            <p>When using inline URL mode, set headers as a JSON object in the Headers field:</p>
            <SyntaxHighlighter code={`{
  "Authorization": "Bearer {{authToken}}",
  "Content-Type": "application/json",
  "X-Request-ID": "{{requestId}}"
}`} language="json" maxHeight="80px" />
            
            <p className="font-bold text-foreground mt-2">Options:</p>
            <div className="space-y-1">
              <p>• <strong className="text-foreground">Continue on error</strong> — If checked, the flow continues even if this request fails or returns an error status.</p>
              <p>• <strong className="text-foreground">Retry count</strong> — Number of retry attempts on failure (0-10). Each retry waits the configured delay.</p>
              <p>• <strong className="text-foreground">Retry delay</strong> — Milliseconds between retry attempts (default: 1000ms).</p>
            </div>

            <p className="font-bold text-foreground mt-2">Node Scripts (Pre/Post/Tests):</p>
            <p>Click the <Code className="inline h-3 w-3" /> icon to reveal three script editors on each request node:</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2 bg-surface-sunken border border-border p-1.5">
                <FileCode className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-bold text-foreground">Pre-script</span>
                <span className="text-[9px] text-muted-foreground">— Runs before the request is sent. Set variables, generate tokens, log context.</span>
              </div>
              <div className="flex items-center gap-2 bg-surface-sunken border border-border p-1.5">
                <Code className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-bold text-foreground">Post-script</span>
                <span className="text-[9px] text-muted-foreground">— Runs after the response is received. Extract data, compute stats, set flow vars.</span>
              </div>
              <div className="flex items-center gap-2 bg-surface-sunken border border-border p-1.5">
                <FlaskConical className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-bold text-foreground">Tests</span>
                <span className="text-[9px] text-muted-foreground">— Assertion tests using test() + expect(). Results shown inline on the node card.</span>
              </div>
            </div>
            <SyntaxHighlighter code={`// Pre-script example:
qf.variables.set('requestId', 'req-' + Math.random().toString(36).slice(2, 10));
qf.log('Pre-script: requestId =', qf.variables.get('requestId'));

// Post-script example:
const json = qf.response.json();
qf.variables.set('createdId', json.id);
qf.variables.set('responseSize', qf.response.body.length);
qf.log('Post-script: created resource', json.id);

// Test script example:
test('Status is 200', () => { expect(qf.response.status).toBe(200); });
test('Has valid ID', () => { expect(qf.response.json().id).toBeTruthy(); });
test('Response fast', () => { expect(qf.response.time).toBeLessThan(3000); });`} language="javascript" maxHeight="200px" />
          </Subsection>

          {/* Condition Node */}
          <Subsection title="2. Condition Node">
            <div className="flex items-center gap-2 mb-2">
              <GitBranch className="h-4 w-4 text-method-put" />
              <span className="text-[11px] font-bold text-foreground">Branch on JS expression</span>
              <Tag variant="method">Category: Logic</Tag>
            </div>
            <p>Evaluates a JavaScript expression. If it returns <code className="font-mono text-[10px]">true</code>, the flow continues. If <code className="font-mono text-[10px]">false</code>, the flow stops (unless "Continue on false" is checked).</p>
            <p className="font-bold text-foreground mt-1">Available context:</p>
            <div className="space-y-0.5">
              <p>• <code className="font-mono text-[10px] text-primary">response</code> — Last HTTP response object (status, body, headers)</p>
              <p>• <code className="font-mono text-[10px] text-primary">vars</code> — All flow variables</p>
              <p>• <code className="font-mono text-[10px] text-primary">h.*</code> — Transform helper functions</p>
            </div>
            <SyntaxHighlighter code={`// Examples:
response.status === 200
response.status >= 200 && response.status < 300
vars.createdId !== undefined
h.size(vars.allPosts) > 50
vars.stats.uniqueUsers === 10`} language="javascript" maxHeight="100px" />
            <p className="mt-1">• <strong className="text-foreground">Continue on false</strong> — If checked, the flow continues even when the condition evaluates to false. The node is marked as "failed" but subsequent nodes still execute.</p>
          </Subsection>

          {/* Response Match Node */}
          <Subsection title="3. Response Match Node">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="h-4 w-4 text-method-post" />
              <span className="text-[11px] font-bold text-foreground">Pattern match response</span>
              <Tag variant="method">Category: Logic</Tag>
            </div>
            <p>A declarative alternative to Condition nodes. Define match rules without writing JavaScript.</p>
            
            <p className="font-bold text-foreground mt-1">Match Modes:</p>
            <p>• <Tag variant="success">ALL</Tag> — Every rule must match (AND logic)</p>
            <p>• <Tag variant="success">ANY</Tag> — At least one rule must match (OR logic)</p>
            
            <p className="font-bold text-foreground mt-1">Rule Types:</p>
            <div className="space-y-1">
              {[
                { type: 'Status', desc: 'Match HTTP status code', example: 'Status equals 200' },
                { type: 'Keyword', desc: 'Check if response body contains a string', example: 'Body contains "success"' },
                { type: 'Key:Value', desc: 'Match a specific JSON path against a value', example: 'userId equals 1' },
                { type: 'Regex', desc: 'Test response body against a regular expression', example: 'Body matches /^\\{.*\\}$/' },
                { type: 'Header', desc: 'Match a response header value', example: 'content-type contains json' },
              ].map(r => (
                <div key={r.type} className="bg-surface-sunken border border-border p-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-foreground">{r.type}</span>
                    <span className="text-[9px] text-muted-foreground">{r.desc}</span>
                  </div>
                  <code className="text-[9px] font-mono text-foreground/60">{r.example}</code>
                </div>
              ))}
            </div>
            
            <p className="font-bold text-foreground mt-1">Operators:</p>
            <div className="grid grid-cols-4 gap-1">
              {['equals', 'contains', 'matches (regex)', 'exists', 'not_exists', '> (gt)', '< (lt)'].map(op => (
                <span key={op} className="font-mono text-[9px] bg-surface-sunken border border-border px-1.5 py-0.5 text-foreground text-center">{op}</span>
              ))}
            </div>
          </Subsection>

          {/* Assert Node */}
          <Subsection title="4. Assert Node">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-status-success" />
              <span className="text-[11px] font-bold text-foreground">Validate a condition</span>
              <Tag variant="method">Category: Logic</Tag>
            </div>
            <p>Like Condition, but specifically for validation. Evaluates a JS expression and fails the flow if it returns false. Shows a custom error message on failure.</p>
            <SyntaxHighlighter code={`// Expression:
vars.stats.totalPosts === 100 && vars.stats.uniqueUsers === 10

// Error message:
"Expected 100 posts from 10 users"

// More examples:
vars.createdId !== undefined && vars.createdId !== null
Array.isArray(vars.postReport) && vars.postReport.length > 0
h.size(vars.commentEmails) > 0`} language="javascript" maxHeight="120px" />
            <p className="mt-1">• <strong className="text-foreground">Continue flow on assertion failure</strong> — If checked, the node is marked failed but execution continues.</p>
          </Subsection>

          {/* Set Variable Node */}
          <Subsection title="5. Set Variable Node">
            <div className="flex items-center gap-2 mb-2">
              <Variable className="h-4 w-4 text-status-success" />
              <span className="text-[11px] font-bold text-foreground">Set a runtime variable</span>
              <Tag variant="method">Category: Data</Tag>
            </div>
            <p>Assigns a value to a flow variable. The value can be a static string, a <code className="font-mono text-[10px]">{`{{var}}`}</code> reference, or a JavaScript expression.</p>
            <SyntaxHighlighter code={`// Static string:
variableName: apiUrl
variableValue: https://jsonplaceholder.typicode.com

// Expression (evaluated as JS):
variableName: authToken
variableValue: h.base64(JSON.stringify({ user: 'demo', iat: h.timestamp() }))

// Reference response data:
variableName: lastStatus
variableValue: response.status

// Build complex values:
variableName: finalReport
variableValue: h.toStr({ total: vars.stats.totalPosts, users: vars.stats.uniqueUsers })`} language="javascript" maxHeight="180px" />
            <Tip type="info">If the value looks like a JS expression, it's evaluated with <code className="font-mono text-[10px]">response</code>, <code className="font-mono text-[10px]">vars</code>, and <code className="font-mono text-[10px]">h.*</code> in scope. If evaluation fails, the raw string is stored.</Tip>
          </Subsection>

          {/* Extract Node */}
          <Subsection title="6. Extract Node">
            <div className="flex items-center gap-2 mb-2">
              <Search className="h-4 w-4 text-method-post" />
              <span className="text-[11px] font-bold text-foreground">Extract from response</span>
              <Tag variant="method">Category: Data</Tag>
            </div>
            <p>Pulls data from the last HTTP response and stores it in a flow variable. The expression has access to the parsed response body.</p>
            <SyntaxHighlighter code={`// Extract entire parsed body:
expression: body
target: allPosts

// Extract a nested field:
expression: body.id
target: createdId

// Extract with helpers:
expression: h.unique(h.pluck(body, 'email'))
target: emailList

// Filter + extract:
expression: h.where(body, 'userId', 1).slice(0, 5)
target: user1Posts

// Access response metadata:
expression: response.headers['content-type']
target: contentType`} language="javascript" maxHeight="200px" />
            <p className="font-bold text-foreground mt-1">Available context:</p>
            <p>• <code className="font-mono text-[10px] text-primary">response</code> — Full response (status, body, headers)</p>
            <p>• <code className="font-mono text-[10px] text-primary">body</code> — Auto-parsed JSON (or raw string if not JSON)</p>
            <p>• <code className="font-mono text-[10px] text-primary">vars</code> — All flow variables</p>
            <p>• <code className="font-mono text-[10px] text-primary">h.*</code> — Transform helpers</p>
          </Subsection>

          {/* Transform Node */}
          <Subsection title="7. Transform Node">
            <div className="flex items-center gap-2 mb-2">
              <Braces className="h-4 w-4 text-method-put" />
              <span className="text-[11px] font-bold text-foreground">Transform data with JS</span>
              <Tag variant="method">Category: Data</Tag>
            </div>
            <p>Apply complex data transformations using JavaScript expressions and the <code className="font-mono text-[10px]">h.*</code> helper library. Store the result in a flow variable.</p>
            <SyntaxHighlighter code={`// Group array by key:
expression: h.groupBy(vars.allPosts, 'userId')
target: postsByUser

// Compute statistics:
expression: ({
  totalPosts: h.size(vars.allPosts),
  uniqueUsers: h.size(h.keys(vars.postsByUser)),
  avgPostsPerUser: Math.round(h.size(vars.allPosts) / h.size(h.keys(vars.postsByUser)))
})
target: stats

// Map + transform:
expression: vars.user1Posts.map(p => ({
  id: p.id,
  titleLen: h.size(p.title),
  preview: p.title.slice(0, 30) + '...',
  wordCount: h.split(p.body, ' ').length
}))
target: postReport

// Extract unique domains from emails:
expression: h.unique(vars.commentEmails.map(e => e.split('@')[1])).sort()
target: emailDomains`} language="javascript" maxHeight="300px" />
            
            <p className="font-bold text-foreground mt-1">Quick Insert Presets:</p>
            <p>The Transform node has quick-insert buttons for common operations: pick, omit, pluck, groupBy, sortBy, unique, flatten, merge, filter, base64, jsonPath.</p>
          </Subsection>

          {/* ForEach Node */}
          <Subsection title="8. ForEach Node">
            <div className="flex items-center gap-2 mb-2">
              <List className="h-4 w-4 text-method-patch" />
              <span className="text-[11px] font-bold text-foreground">Iterate over array data</span>
              <Tag variant="method">Category: Loop</Tag>
            </div>
            <p>Evaluates an expression that returns an array, then stores the array and metadata in flow variables.</p>
            <SyntaxHighlighter code={`// Expression:
h.where(vars.allPosts, 'userId', 1).slice(0, 5)

// Target variable: user1Posts
// This creates three flow variables:
//   vars.user1Posts        → the full array
//   vars.user1Posts_length → array length (e.g., 5)
//   vars.user1Posts_current → first element`} language="javascript" maxHeight="120px" />
            <Tip type="info">ForEach extracts the array into variables. Combine it with a <strong>Loop</strong> node to actually iterate over items. The Loop node increments the index and updates <code className="font-mono text-[10px]">_current</code>.</Tip>
          </Subsection>

          {/* Loop Node */}
          <Subsection title="9. Loop Node">
            <div className="flex items-center gap-2 mb-2">
              <Repeat className="h-4 w-4 text-method-patch" />
              <span className="text-[11px] font-bold text-foreground">Repeat N times</span>
              <Tag variant="method">Category: Loop</Tag>
            </div>
            <p>Marks a loop boundary. Set the iteration count (1-N). During execution, <code className="font-mono text-[10px]">vars.loopIndex</code> is available.</p>
            <SyntaxHighlighter code={`// Repeat 5 times:
iterations: 5

// Access in subsequent nodes:
// vars.loopIndex → current iteration (0-based)`} language="javascript" maxHeight="60px" />
          </Subsection>

          {/* Delay Node */}
          <Subsection title="10. Delay Node">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-method-patch" />
              <span className="text-[11px] font-bold text-foreground">Wait before next step</span>
              <Tag variant="method">Category: Control</Tag>
            </div>
            <p>Pauses execution for the specified number of milliseconds. Useful for rate-limiting, waiting for server processing, or adding visual spacing between operations.</p>
            <SyntaxHighlighter code={`// Wait 300ms between requests:
delayMs: 300

// Wait 2 seconds for server processing:
delayMs: 2000`} language="javascript" maxHeight="60px" />
          </Subsection>

          {/* Log Node */}
          <Subsection title="11. Log Node">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-[11px] font-bold text-foreground">Log a message</span>
              <Tag variant="method">Category: Control</Tag>
            </div>
            <p>Outputs a message to both the browser console and the flow execution log panel. Supports variable interpolation.</p>
            <SyntaxHighlighter code={`// Simple message:
🚀 Starting advanced queFork Flow demo...

// With variable interpolation:
Created post with ID: {{createdId}}
Stats: {{stats}}
Final Report: {{finalReport}}
✅ Flow complete — all verified!`} language="text" maxHeight="100px" />
          </Subsection>

          {/* Try/Catch Node */}
          <Subsection title="12. Try/Catch Node">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              <span className="text-[11px] font-bold text-foreground">Handle errors gracefully</span>
              <Tag variant="method">Category: Structure</Tag>
            </div>
            <p>Wraps subsequent steps in an error boundary. If any step after this node throws an error, the error is caught instead of stopping the flow.</p>
            
            <p className="font-bold text-foreground mt-1">On catch actions:</p>
            <div className="space-y-1">
              <p>• <Tag variant="success">Log error</Tag> — Logs the error message to the execution log</p>
              <p>• <Tag variant="success">Skip to next</Tag> — Silently continues past the failed step</p>
              <p>• <Tag variant="success">Set variable</Tag> — Stores the error message in a flow variable (e.g., <code className="font-mono text-[10px]">deleteError</code>) for later condition/assert checks</p>
            </div>
            
            <SyntaxHighlighter code={`// Pattern: Try/Catch → Request → Condition
// Step 20: Try/Catch (catchAction: set_variable, catchVariable: deleteError)
// Step 21: DELETE /posts/1 (may fail)
// Step 22: Condition: response.status === 200 (continueOnError: true)
// If step 21 fails, error is stored in vars.deleteError, flow continues`} language="text" maxHeight="80px" />
          </Subsection>

          {/* Save Collection Node */}
          <Subsection title="13. Save Collection Node">
            <div className="flex items-center gap-2 mb-2">
              <FolderPlus className="h-4 w-4 text-status-success" />
              <span className="text-[11px] font-bold text-foreground">Save results to collection</span>
              <Tag variant="method">Category: Output</Tag>
            </div>
            <p>Creates a new collection from all request nodes that were executed during this flow run. Useful for capturing a sequence of API calls for replay or sharing.</p>
            <div className="space-y-1">
              <p>• <strong className="text-foreground">Collection name</strong> — Supports <code className="font-mono text-[10px]">{`{{vars}}`}</code> (e.g., <code className="font-mono text-[10px]">Flow Results - {`{{isoDate}}`}</code>)</p>
              <p>• <strong className="text-foreground">Save condition</strong> — Optional JS expression. If false, the save is skipped. Example: <code className="font-mono text-[10px]">response.status === 200</code></p>
            </div>
          </Subsection>

          {/* Group Node */}
          <Subsection title="14. Group Node">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-4 w-4 text-primary" />
              <span className="text-[11px] font-bold text-foreground">Group steps together</span>
              <Tag variant="method">Category: Structure</Tag>
            </div>
            <p>A purely visual node for organizing related steps. Has no effect on execution — just provides a labeled separator in the flow.</p>
          </Subsection>
        </Section>

        {/* ─── TRANSFORM HELPERS (h.*) ────────────────────────────── */}
        <Section title="Transform Helpers (h.*) — Full Reference" icon={<Braces className="h-3 w-3 text-primary" />}>
          <p>The <code className="font-mono text-[10px]">h</code> alias provides 40+ utility functions available in Transform, Extract, Condition, Assert, Set Variable, and ForEach expressions.</p>

          <Subsection title="Object Operations">
            <SyntaxHighlighter code={`h.pick(obj, 'id', 'name', 'email')  // Keep only specified keys
h.omit(obj, 'password', 'secret')   // Remove specified keys
h.merge(objA, objB)                 // Shallow merge (objB overrides)
h.deepMerge(objA, objB)             // Recursive deep merge
h.keys(obj)                         // ['id', 'name', 'email']
h.values(obj)                       // [1, 'John', 'john@mail.com']
h.entries(obj)                      // [['id', 1], ['name', 'John']]
h.fromEntries(entries)              // Reverse of entries`} language="javascript" maxHeight="140px" />
          </Subsection>

          <Subsection title="Array Operations">
            <SyntaxHighlighter code={`h.pluck(arr, 'email')               // Extract field from each item → ['a@b.com', ...]
h.where(arr, 'active', true)        // Filter items where key === value
h.groupBy(arr, 'category')          // Group into { category1: [...], category2: [...] }
h.sortBy(arr, 'date')               // Sort ascending by key
h.sortBy(arr, 'date', true)         // Sort descending (pass true as 3rd arg)
h.unique(arr)                       // Remove duplicates (Set-based)
h.flatten(arr)                      // Flatten nested arrays: [[1,2],[3]] → [1,2,3]
h.compact(arr)                      // Remove null/undefined/false values
h.chunk(arr, 5)                     // Split into chunks of 5: [[1..5],[6..10],...]
h.diff(arrA, arrB)                  // Items in A but not in B
h.intersect(arrA, arrB)             // Items in both A and B
h.zip(arrA, arrB)                   // Pair items: [[a1,b1],[a2,b2],...]
h.toArray(val)                      // Wrap non-array in array: 'x' → ['x']`} language="javascript" maxHeight="200px" />
          </Subsection>

          <Subsection title="Aggregation">
            <SyntaxHighlighter code={`h.sum([10, 20, 30])                 // 60
h.avg([10, 20, 30])                 // 20
h.min([10, 20, 30])                 // 10
h.max([10, 20, 30])                 // 30
h.count(arr, item => item.active)   // Count matching items
h.size(val)                         // Array: .length, Object: key count, String: .length`} language="javascript" maxHeight="100px" />
          </Subsection>

          <Subsection title="String Operations">
            <SyntaxHighlighter code={`h.upper('hello')                    // 'HELLO'
h.lower('Hello')                    // 'hello'
h.trim('  hello  ')                 // 'hello'
h.split('a,b,c', ',')              // ['a', 'b', 'c']
h.join(['a', 'b'], '-')            // 'a-b'
h.replace('hello world', 'world', 'qf')  // 'hello qf' (global replace)
h.pad('42', 5, '0')                // '00042' (padStart)`} language="javascript" maxHeight="120px" />
          </Subsection>

          <Subsection title="Encoding & Conversion">
            <SyntaxHighlighter code={`h.base64('hello')                   // 'aGVsbG8='
h.base64Decode('aGVsbG8=')          // 'hello'
h.toNum('42')                       // 42
h.toStr({ key: 'val' })            // '{"key":"val"}' (JSON.stringify)
h.toBool(1)                        // true
h.type(val)                        // 'string', 'number', 'array', 'object', 'null'`} language="javascript" maxHeight="100px" />
          </Subsection>

          <Subsection title="Deep Access & Templating">
            <SyntaxHighlighter code={`// Navigate nested objects with dot notation + array indexing:
h.jsonPath(obj, 'data.users[0].email')     // 'john@example.com'
h.jsonPath(obj, 'meta.pagination.total')   // 100

// Template string interpolation:
h.template('Hello {{name}}, you have {{count}} items', { name: 'John', count: 42 })
// → 'Hello John, you have 42 items'`} language="javascript" maxHeight="100px" />
          </Subsection>

          <Subsection title="Date & Utility">
            <SyntaxHighlighter code={`h.timestamp()                       // 1709900000000 (ms since epoch)
h.isoDate()                         // '2024-03-08T12:00:00.000Z'
h.formatDate(ts, 'en-US')          // '3/8/2024, 12:00:00 PM'
h.range(0, 5)                      // [0, 1, 2, 3, 4]`} language="javascript" maxHeight="80px" />
          </Subsection>
        </Section>

        {/* ─── NODE MANAGEMENT ────────────────────────────────────── */}
        <Section title="Node Management & UI Controls" icon={<Settings className="h-3 w-3 text-primary" />}>
          <Subsection title="Node Actions">
            <div className="space-y-1">
              {[
                { icon: '▸/▾', action: 'Expand/Collapse', desc: 'Toggle the node body to show/hide configuration fields' },
                { icon: '⏻', action: 'Enable/Disable', desc: 'Disabled nodes are skipped during execution (shown with reduced opacity)' },
                { icon: '↑↓', action: 'Reorder', desc: 'Move a node up or down in the execution sequence' },
                { icon: '⎘', action: 'Duplicate', desc: 'Clone the node with all its configuration' },
                { icon: '🗑', action: 'Delete', desc: 'Remove the node from the flow' },
                { icon: '</>', action: 'Scripts', desc: 'Toggle pre/post/test script editors (request nodes only)' },
                { icon: '📝', action: 'Notes', desc: 'Add freeform notes to any node — useful for documentation' },
              ].map(a => (
                <div key={a.action} className="flex items-center gap-2 bg-surface-sunken border border-border p-1.5">
                  <span className="text-[10px] font-mono w-6 text-center shrink-0">{a.icon}</span>
                  <span className="text-[10px] font-bold text-foreground">{a.action}</span>
                  <span className="text-[9px] text-muted-foreground">{a.desc}</span>
                </div>
              ))}
            </div>
          </Subsection>

          <Subsection title="Collapsed Summary">
            <p>When a node is collapsed, it shows a one-line summary of its configuration:</p>
            <div className="space-y-0.5">
              <p>• <strong className="text-foreground">Request</strong>: Shows protocol + method + URL (e.g., <code className="font-mono text-[10px]">REST GET https://api.example.com</code>)</p>
              <p>• <strong className="text-foreground">Condition</strong>: Shows the expression (e.g., <code className="font-mono text-[10px]">response.status === 200</code>)</p>
              <p>• <strong className="text-foreground">Transform</strong>: Shows the first 30 chars of expression + target variable</p>
              <p>• <strong className="text-foreground">Extract</strong>: Shows expression → target</p>
              <p>• <strong className="text-foreground">Set Variable</strong>: Shows name = value</p>
              <p>• <strong className="text-foreground">Response Match</strong>: Shows rule count and mode (e.g., "3 rules (all)")</p>
            </div>
          </Subsection>

          <Subsection title="Result Display">
            <p>After execution, each node card shows:</p>
            <div className="space-y-1">
              <p>• <strong className="text-foreground">Status icon</strong> — Green check (success), red X (failed), skip icon (skipped), spinner (running)</p>
              <p>• <strong className="text-foreground">Output preview</strong> — For Extract, Transform, Set Variable, ForEach: shows the first 100 chars of the output value</p>
              <p>• <strong className="text-foreground">Error message</strong> — Red text showing the error that occurred</p>
              <p>• <strong className="text-foreground">Test results</strong> — For request nodes with tests: shows each test name with pass/fail icon and failure reason</p>
            </div>
          </Subsection>
        </Section>

        {/* ─── FLOW TEMPLATES ─────────────────────────────────────── */}
        <Section title="Flow Templates" icon={<Zap className="h-3 w-3 text-primary" />}>
          <p>Pre-built flow templates to get started quickly. Click the <Tag variant="method">✦ Templates</Tag> button in the flow toolbar.</p>
          <div className="space-y-1.5 mt-1">
            {[
              { name: 'Auth → API → Validate', desc: 'Authenticate, extract token, call protected endpoint, validate response. Demonstrates the most common API testing pattern.' },
              { name: 'CRUD Test Suite', desc: 'Full Create-Read-Update-Delete lifecycle with assertions at each step. Tests resource creation, retrieval, modification, and deletion.' },
              { name: 'Response Chain', desc: 'Pass data from one response to the next request. Demonstrates variable extraction and interpolation across requests.' },
              { name: 'Data Validation Pipeline', desc: 'Fetch data, validate schema with assertions, iterate over items, compute statistics with transforms. Shows data processing capabilities.' },
              { name: 'Retry & Resilience', desc: 'Primary request with retry on failure, automatic fallback to secondary endpoint, comprehensive error logging. Demonstrates error handling patterns.' },
              { name: 'Try Example (JSONPlaceholder)', desc: 'Complete 30-step demo using the public JSONPlaceholder API. Covers: GET/POST/PUT/DELETE, pre-scripts, post-scripts, test assertions, variable extraction, data transforms (groupBy, compute stats), array iteration, response pattern matching, try/catch error handling, chained API calls, and final summary generation. This is the best way to learn all flow features.' },
            ].map(t => (
              <div key={t.name} className="bg-surface-sunken border border-border p-2.5">
                <span className="text-[10px] font-bold text-foreground">{t.name}</span>
                <p className="text-[9px] text-muted-foreground mt-0.5">{t.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ─── EXECUTION HISTORY ──────────────────────────────────── */}
        <Section title="Execution History" icon={<Clock className="h-3 w-3 text-primary" />}>
          <p>Every flow run is automatically saved to history (up to 50 runs). Click the <Tag variant="method">🕒 Clock</Tag> icon in the flow toolbar.</p>
          <div className="space-y-1">
            <p>Each history entry shows:</p>
            <p>• <strong className="text-foreground">Flow name</strong> — Which flow was executed</p>
            <p>• <strong className="text-foreground">Pass/Fail/Skip counts</strong> — Color-coded step results</p>
            <p>• <strong className="text-foreground">Total duration</strong> — Total execution time in milliseconds</p>
            <p>• <strong className="text-foreground">Timestamp</strong> — When the run occurred</p>
          </div>
          <p className="mt-1">History is stored in <code className="font-mono text-[10px]">localStorage</code> and persists across sessions. Click "Clear All" to remove all history.</p>
        </Section>

        {/* ─── IMPORT / EXPORT ────────────────────────────────────── */}
        <Section title="Import / Export" icon={<Download className="h-3 w-3 text-primary" />}>
          <Subsection title="Import">
            <p><Tag variant="success">cURL Import</Tag> — Paste any cURL command (single or multi-line). Parses method, URL, headers, auth, body, and query params automatically.</p>
            <p><Tag variant="success">File Drop</Tag> — Drag and drop <code className="font-mono text-[10px]">.txt</code>, <code className="font-mono text-[10px]">.sh</code>, <code className="font-mono text-[10px]">.curl</code>, or <code className="font-mono text-[10px]">.json</code> files anywhere on the app to import.</p>
          </Subsection>
          <Subsection title="Export">
            <p>Generate code from any request in 14+ languages:</p>
            <div className="grid grid-cols-4 gap-1">
              {['cURL', 'JavaScript (Fetch)', 'Python (Requests)', 'Node.js (Axios)', 'Go', 'Ruby', 'PHP', 'Java', 'C#', 'Swift', 'Kotlin', 'Rust', 'PowerShell', 'HTTPie'].map(l => (
                <span key={l} className="text-[9px] font-bold bg-surface-sunken border border-border px-1.5 py-0.5 text-foreground text-center">{l}</span>
              ))}
            </div>
          </Subsection>
          <Subsection title="Flow Export/Import">
            <p>Flows can be exported as JSON files (↓ icon) and imported on another machine (↑ icon). The JSON includes all nodes, edges, variables, and configuration.</p>
          </Subsection>
        </Section>

        {/* ─── CORS & PROXY ───────────────────────────────────────── */}
        <Section title="CORS & Proxy" icon={<Globe className="h-3 w-3 text-primary" />}>
          <p>Browser CORS policies block many API calls. queFork provides a multi-layered proxy cascade:</p>
          
          <Subsection title="Proxy Strategy (in order)">
            <div className="space-y-1">
              {[
                { step: '1', name: 'Direct fetch', desc: 'Try the request without any proxy. Works if the API has CORS headers.' },
                { step: '2', name: 'queFork Agent', desc: 'Local proxy on your machine (port 9119). Bypasses ALL CORS restrictions.' },
                { step: '3', name: 'Custom proxy', desc: 'Your own Vercel/Edge Function proxy. Configure in settings.' },
                { step: '4', name: 'Built-in proxies', desc: 'Cascades through 7 free CORS proxy services (corsproxy.io, allorigins, codetabs, cors.sh, thingproxy, corsproxy.org, cors-anywhere).' },
              ].map(s => (
                <div key={s.step} className="flex items-start gap-2 bg-surface-sunken border border-border p-2">
                  <div className="flex items-center justify-center w-5 h-5 bg-primary text-primary-foreground text-[10px] font-black shrink-0">{s.step}</div>
                  <div>
                    <span className="text-[10px] font-bold text-foreground">{s.name}</span>
                    <p className="text-[9px] text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Subsection>
          
          <Subsection title="Security Note">
            <Tip type="warning">
              <p className="font-bold text-foreground">Auth headers are stripped when using third-party CORS proxies</p>
              <p className="mt-1 text-muted-foreground">Authorization, API keys, and custom headers are removed before routing through free proxy services to prevent credential leakage. Only Content-Type, Accept, and Accept-Language headers pass through.</p>
              <p className="mt-1 text-muted-foreground">To preserve all headers, use the <strong className="text-foreground">queFork Agent</strong> or a <strong className="text-foreground">custom proxy</strong>.</p>
            </Tip>
          </Subsection>

          <Subsection title="Toggle Proxy">
            <p>Click the shield icon (🛡) in the URL bar to toggle the CORS proxy on/off. When off, requests go direct — useful for localhost or APIs that already allow CORS.</p>
          </Subsection>
        </Section>

        {/* ─── QUEFORK AGENT ──────────────────────────────────────── */}
        <Section title="queFork Agent — Setup Guide" icon={<Cpu className="h-3 w-3 text-primary" />}>
          <div className="bg-primary/5 border border-primary/20 p-3 mb-3">
            <p className="text-foreground font-bold text-[11px]">What is the Agent?</p>
            <p className="mt-1">A lightweight local proxy that runs on your machine. It forwards requests from queFork without CORS restrictions — enabling access to localhost, private networks, and APIs that block browser requests.</p>
          </div>

          <Subsection title="Prerequisites">
            <div className="space-y-1.5">
              {[
                { label: 'Node.js 18+', desc: 'Download from nodejs.org' },
                { label: 'npm or npx', desc: 'Comes bundled with Node.js' },
              ].map(r => (
                <div key={r.label} className="flex items-center gap-2 py-1 px-2 bg-surface-sunken border border-border">
                  <CheckCircle2 className="h-3 w-3 text-status-success shrink-0" />
                  <span className="text-[10px] font-bold text-foreground">{r.label}</span>
                  <span className="text-[9px] text-muted-foreground ml-auto">{r.desc}</span>
                </div>
              ))}
            </div>
          </Subsection>

          <Subsection title="Step 1 — Install">
            <SyntaxHighlighter code={`npm install -g quefork-agent\n\n# Or run without installing:\nnpx quefork-agent`} language="shell" maxHeight="60px" />
          </Subsection>

          <Subsection title="Step 2 — Start">
            <SyntaxHighlighter code={`quefork-agent\n\n# Custom port:\nquefork-agent --port 9119\n\n# Verbose logging:\nquefork-agent --verbose`} language="shell" maxHeight="80px" />
            <div className="bg-status-success/10 border border-status-success/20 p-2 mt-2 flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-status-success shrink-0" />
              <span className="text-[10px] text-foreground font-bold">You should see: "queFork Agent running on http://localhost:9119"</span>
            </div>
          </Subsection>

          <Subsection title="Step 3 — Verify">
            <p>Check the bottom-left footer. The agent status indicator shows:</p>
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {[
                { color: 'bg-status-success', label: 'Active', desc: 'Connected' },
                { color: 'bg-method-put', label: 'Idle', desc: 'Not running' },
                { color: 'bg-status-error', label: 'Error', desc: 'Failed' },
              ].map(s => (
                <div key={s.label} className="bg-surface-sunken border border-border p-2 text-center">
                  <div className={`w-2 h-2 rounded-full ${s.color} mx-auto mb-1`} />
                  <span className={`text-[9px] font-bold ${s.color.replace('bg-', 'text-')}`}>{s.label}</span>
                  <p className="text-[8px] text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
              ))}
            </div>
          </Subsection>

          <Subsection title="What it Bypasses">
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: 'CORS Restrictions', desc: 'All cross-origin blocks' },
                { label: 'Mixed Content', desc: 'HTTP from HTTPS pages' },
                { label: 'Localhost APIs', desc: 'localhost, 127.0.0.1, LAN IPs' },
                { label: 'Financial APIs', desc: 'Banking, trading platforms' },
                { label: 'Internal APIs', desc: 'Corporate/VPN-only endpoints' },
                { label: 'Custom Certs', desc: 'Self-signed SSL certificates' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 py-1.5 px-2 bg-surface-sunken border border-border">
                  <CheckCircle2 className="h-3 w-3 text-status-success shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold text-foreground block">{item.label}</span>
                    <span className="text-[8px] text-muted-foreground">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </Subsection>

          <Subsection title="Troubleshooting">
            <div className="space-y-2">
              <div className="bg-method-put/5 border border-method-put/20 p-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="h-3 w-3 text-method-put" />
                  <span className="text-[10px] font-bold text-foreground">Agent not detected?</span>
                </div>
                <ul className="text-[9px] space-y-0.5 ml-4 list-disc">
                  <li>Check that the agent terminal is still running</li>
                  <li>Ensure port 9119 isn't blocked by firewall</li>
                  <li>Try restarting: <code className="font-mono bg-surface-sunken px-1">Ctrl+C</code> then <code className="font-mono bg-surface-sunken px-1">quefork-agent</code></li>
                </ul>
              </div>
              <div className="bg-method-put/5 border border-method-put/20 p-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="h-3 w-3 text-method-put" />
                  <span className="text-[10px] font-bold text-foreground">Permission errors?</span>
                </div>
                <SyntaxHighlighter code={`# macOS / Linux:\nsudo npm install -g quefork-agent\n\n# Windows (run as Administrator):\nnpm install -g quefork-agent`} language="shell" maxHeight="60px" />
              </div>
            </div>
          </Subsection>
        </Section>

        {/* ─── CHROME EXTENSION ───────────────────────────────────── */}
        <Section title="Chrome Extension" icon={<Chrome className="h-3 w-3 text-primary" />}>
          <div className="bg-primary/5 border border-primary/20 p-3 mb-3">
            <p className="text-foreground font-bold text-[11px]">Side Panel API Tester</p>
            <p className="mt-1">A lightweight API tester directly inside Chrome's side panel. Requests are proxied through Chrome's background service worker — zero CORS restrictions.</p>
          </div>

          <Subsection title="Setup">
            <div className="space-y-1">
              <p>1. Clone/download the <Tag>chrome-extension/</Tag> folder from the queFork repo</p>
              <p>2. Go to <code className="font-mono text-[10px]">chrome://extensions</code></p>
              <p>3. Enable "Developer mode" (top-right toggle)</p>
              <p>4. Click "Load unpacked" → select the <code className="font-mono text-[10px]">chrome-extension/</code> folder</p>
              <p>5. Click the queFork icon in the toolbar to open the side panel</p>
            </div>
          </Subsection>

          <Subsection title="Features">
            <div className="space-y-1">
              <p>• All HTTP methods (GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD)</p>
              <p>• Custom headers with key-value editor</p>
              <p>• JSON, Form Data, and raw body types</p>
              <p>• Response viewer with headers, body, status, timing</p>
              <p>• History of recent requests</p>
              <p>• No CORS restrictions (uses Chrome's native fetch API)</p>
            </div>
          </Subsection>
        </Section>

        {/* ─── DATA STORAGE ───────────────────────────────────────── */}
        <Section title="Data Storage & Security" icon={<Shield className="h-3 w-3 text-primary" />}>
          <Subsection title="Local Storage">
            <p>All data is stored in the browser's <code className="font-mono text-[10px]">localStorage</code> with <code className="font-mono text-[10px]">qf_</code> prefix:</p>
            <div className="grid grid-cols-2 gap-1">
              {[
                { key: 'qf_workspaces', desc: 'Collections, environments, requests' },
                { key: 'qf_history', desc: 'Request history (up to 50 entries)' },
                { key: 'qf_flow_history', desc: 'Flow run history (up to 50 runs)' },
                { key: 'qf_flows', desc: 'All flow definitions' },
              ].map(s => (
                <div key={s.key} className="bg-surface-sunken border border-border p-1.5">
                  <code className="font-mono text-[9px] text-primary">{s.key}</code>
                  <p className="text-[8px] text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
              ))}
            </div>
          </Subsection>
          <Subsection title="Encryption">
            <p>Sensitive data (API keys, tokens in environment variables) can be encrypted using the built-in <code className="font-mono text-[10px]">secure-storage</code> module. This uses AES encryption to protect data at rest in localStorage.</p>
          </Subsection>
          <Subsection title="No Backend">
            <p>queFork runs entirely in your browser. No data is sent to any server (except to the API you're testing). No analytics, no telemetry, no tracking.</p>
          </Subsection>
        </Section>

        {/* ─── PWA ────────────────────────────────────────────────── */}
        <Section title="Progressive Web App (PWA)" icon={<Globe className="h-3 w-3 text-primary" />}>
          <p>queFork can be installed as a standalone app on your desktop or mobile device:</p>
          <div className="space-y-1">
            <p>1. Visit queFork in Chrome/Edge</p>
            <p>2. Click the install icon in the address bar (or "Add to Home Screen" on mobile)</p>
            <p>3. The app opens in its own window with offline support</p>
          </div>
          <p className="mt-1">Offline mode: The app shell, UI, and all local data work without an internet connection. Only sending actual API requests requires connectivity.</p>
        </Section>

        {/* Footer */}
        <div className="px-5 py-4 text-center">
          <p className="text-[9px] text-muted-foreground/40 font-bold">
            queFork — Built for developers who test APIs.
          </p>
          <p className="text-[9px] text-muted-foreground/30 mt-0.5">
            <code className="font-mono text-primary/40">github.com/somritdasgupta/queFork</code>
          </p>
        </div>
      </div>
    </div>
  );
}
