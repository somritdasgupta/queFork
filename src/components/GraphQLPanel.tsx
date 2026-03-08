import React, { useState } from 'react';
import type { RequestConfig } from '@/types/api';
import { CodeEditor } from '@/components/CodeEditor';
import { Wand2, Filter } from 'lucide-react';

interface Props {
  request: RequestConfig;
  onChange: (req: RequestConfig) => void;
}

type GqlTab = 'query' | 'variables' | 'headers';

export function GraphQLPanel({ request, onChange }: Props) {
  const [activeTab, setActiveTab] = useState<GqlTab>('query');
  const [schema, setSchema] = useState<string>('');
  const [showSchema, setShowSchema] = useState(false);

  const updateGraphql = (field: 'query' | 'variables', value: string) => {
    onChange({
      ...request,
      body: {
        ...request.body,
        type: 'graphql',
        graphql: { ...request.body.graphql, [field]: value },
      },
    });
  };

  const fetchSchema = async () => {
    if (!request.url) return;
    try {
      const introspectionQuery = `{"query":"{ __schema { types { name kind fields { name type { name kind ofType { name kind } } } } } }"}`;
      const res = await fetch(request.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: introspectionQuery,
      });
      const json = await res.json();
      const formatted = JSON.stringify(json.data?.__schema || json, null, 2);
      setSchema(formatted);
      setShowSchema(true);
    } catch {
      setSchema('Failed to fetch schema. Check the endpoint.');
      setShowSchema(true);
    }
  };

  const tabs: { key: GqlTab; label: string; dot?: boolean }[] = [
    { key: 'query', label: 'Query', dot: !!request.body.graphql.query.trim() },
    { key: 'variables', label: 'Variables', dot: request.body.graphql.variables.trim() !== '{}' && !!request.body.graphql.variables.trim() },
    { key: 'headers', label: 'Headers', dot: request.headers.length > 0 },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* Tab bar + schema controls */}
      <div className="flex border-b border-border shrink-0">
        <div className="flex flex-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-2 text-[12px] font-bold border-b-2 transition-colors ${
                activeTab === t.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
              {t.dot && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-primary inline-block" />}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0 border-l border-border">
          <button onClick={fetchSchema} className="flex items-center gap-1 px-3 py-2 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors" title="Fetch Schema">
            <Wand2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setShowSchema(!showSchema)}
            className={`flex items-center gap-1 px-3 py-2 text-[11px] font-bold transition-colors ${showSchema ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            title="Toggle Schema">
            <Filter className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Main editor area — flex-1 to fill available space */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {activeTab === 'query' && (
            <div className="flex flex-col flex-1 overflow-hidden min-h-0 bg-surface-sunken">
              <CodeEditor
                value={request.body.graphql.query}
                onChange={(v) => updateGraphql('query', v)}
                placeholder={`query {\n  user(id: 1) {\n    name\n    email\n  }\n}`}
                language="graphql"
                minHeight="80px"
              />
            </div>
          )}
          {activeTab === 'variables' && (
            <div className="flex flex-col flex-1 overflow-hidden min-h-0 bg-surface-sunken">
              <CodeEditor
                value={request.body.graphql.variables}
                onChange={(v) => updateGraphql('variables', v)}
                placeholder='{ "id": 1 }'
                language="json"
                minHeight="80px"
              />
            </div>
          )}
          {activeTab === 'headers' && (
            <div className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="px-3 py-1.5 border-b border-border bg-surface-sunken shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Headers</span>
              </div>
              <div className="p-3 text-[12px] text-muted-foreground font-bold">
                Headers are shared with the main request headers tab.
              </div>
            </div>
          )}
        </div>

        {/* Schema panel */}
        {showSchema && (
          <div className="w-[300px] border-l border-border flex flex-col overflow-hidden bg-surface-sunken">
            <div className="px-3 py-1.5 border-b border-border flex items-center justify-between shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Schema</span>
              <button onClick={() => setShowSchema(false)} className="text-muted-foreground hover:text-foreground">
                <span className="text-[11px] font-bold">×</span>
              </button>
            </div>
            <div className="flex-1 overflow-auto min-h-0">
              <pre className="p-3 font-mono text-[11px] leading-[1.6] text-foreground whitespace-pre">
                {schema || 'Click the wand icon to fetch schema.'}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
