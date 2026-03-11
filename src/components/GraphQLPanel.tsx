import React, { useState, useMemo } from "react";
import type { RequestConfig } from "@/types/api";
import { CodeEditor } from "@/components/CodeEditor";
import { Wand2, ChevronRight, Eye, EyeOff } from "lucide-react";

interface Props {
  request: RequestConfig;
  onChange: (req: RequestConfig) => void;
}

type GqlTab = "query" | "variables" | "headers";

export function GraphQLPanel({ request, onChange }: Props) {
  const [activeTab, setActiveTab] = useState<GqlTab>("query");
  const [schema, setSchema] = useState<string>("");
  const [showSchema, setShowSchema] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [schemaFilter, setSchemaFilter] = useState("");

  const parsedSchema = useMemo(() => {
    if (!schema) return null;
    try {
      const parsed = JSON.parse(schema);
      return parsed.types ? parsed : null;
    } catch {
      return null;
    }
  }, [schema]);

  const toggleType = (name: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const resolveTypeRef = (t: any): string => {
    if (!t) return "Unknown";
    if (t.kind === "NON_NULL") return `${resolveTypeRef(t.ofType)}!`;
    if (t.kind === "LIST") return `[${resolveTypeRef(t.ofType)}]`;
    return t.name || "Unknown";
  };

  const updateGraphql = (field: "query" | "variables", value: string) => {
    onChange({
      ...request,
      body: {
        ...request.body,
        type: "graphql",
        graphql: { ...request.body.graphql, [field]: value },
      },
    });
  };

  const fetchSchema = async () => {
    if (!request.url) return;
    try {
      const introspectionQuery = JSON.stringify({
        query: `query IntrospectionQuery {
  __schema {
    queryType { name }
    mutationType { name }
    subscriptionType { name }
    types {
      kind
      name
      description
      fields(includeDeprecated: true) {
        name
        description
        args {
          name
          description
          type { ...TypeRef }
          defaultValue
        }
        type { ...TypeRef }
        isDeprecated
        deprecationReason
      }
      inputFields {
        name
        description
        type { ...TypeRef }
        defaultValue
      }
      interfaces { ...TypeRef }
      enumValues(includeDeprecated: true) {
        name
        description
        isDeprecated
        deprecationReason
      }
      possibleTypes { ...TypeRef }
    }
    directives {
      name
      description
      locations
      args {
        name
        description
        type { ...TypeRef }
        defaultValue
      }
    }
  }
}

fragment TypeRef on __Type {
  kind
  name
  ofType {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
              }
            }
          }
        }
      }
    }
  }
}`,
      });
      const res = await fetch(request.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: introspectionQuery,
      });
      const json = await res.json();
      const formatted = JSON.stringify(json.data?.__schema || json, null, 2);
      setSchema(formatted);
      setShowSchema(true);
    } catch {
      setSchema("Failed to fetch schema. Check the endpoint.");
      setShowSchema(true);
    }
  };

  const tabs: { key: GqlTab; label: string; dot?: boolean }[] = [
    { key: "query", label: "Query", dot: !!request.body.graphql.query.trim() },
    {
      key: "variables",
      label: "Variables",
      dot:
        request.body.graphql.variables.trim() !== "{}" &&
        !!request.body.graphql.variables.trim(),
    },
    { key: "headers", label: "Headers", dot: request.headers.length > 0 },
  ];

  const operations = useMemo(() => {
    const re = /(?:query|mutation|subscription)\s+(\w+)/g;
    const names: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(request.body.graphql.query))) {
      names.push(m[1]);
    }
    return names;
  }, [request.body.graphql.query]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* Tab bar + schema controls */}
      <div className="flex border-b border-border shrink-0">
        <div className="flex flex-1 items-center">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-2 text-[12px] font-bold border-b-2 transition-colors ${
                activeTab === t.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {t.dot && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-primary inline-block" />
              )}
            </button>
          ))}
          {operations.length > 1 && (
            <select
              value={request.body.graphql.operationName || ""}
              onChange={(e) =>
                onChange({
                  ...request,
                  body: {
                    ...request.body,
                    graphql: {
                      ...request.body.graphql,
                      operationName: e.target.value || undefined,
                    },
                  },
                })
              }
              className="ml-2 h-6 px-1.5 text-[10px] font-mono bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              title="Select operation to execute"
            >
              <option value="">All operations</option>
              {operations.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-0 border-l border-border">
          <button
            onClick={() => {
              if (schema) {
                setShowSchema(!showSchema);
              } else {
                fetchSchema();
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold transition-colors ${
              showSchema
                ? "text-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={
              schema
                ? showSchema
                  ? "Hide Schema"
                  : "Show Schema"
                : "Fetch Schema"
            }
          >
            {schema ? (
              showSchema ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )
            ) : (
              <Wand2 className="h-3.5 w-3.5" />
            )}
            <span className="text-[10px]">
              {schema ? (showSchema ? "Hide" : "Schema") : "Fetch"}
            </span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Main editor area — flex-1 to fill available space */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {activeTab === "query" && (
            <div className="flex flex-col flex-1 overflow-hidden min-h-0 bg-surface-sunken">
              <CodeEditor
                value={request.body.graphql.query}
                onChange={(v) => updateGraphql("query", v)}
                placeholder={`query {\n  user(id: 1) {\n    name\n    email\n  }\n}`}
                language="graphql"
                minHeight="80px"
              />
            </div>
          )}
          {activeTab === "variables" && (
            <div className="flex flex-col flex-1 overflow-hidden min-h-0 bg-surface-sunken">
              <CodeEditor
                value={request.body.graphql.variables}
                onChange={(v) => updateGraphql("variables", v)}
                placeholder='{ "id": 1 }'
                language="json"
                minHeight="80px"
              />
            </div>
          )}
          {activeTab === "headers" && (
            <div className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="px-3 py-1.5 border-b border-border bg-surface-sunken shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Headers
                </span>
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Schema
              </span>
              <button
                onClick={() => setShowSchema(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <span className="text-[11px] font-bold">×</span>
              </button>
            </div>
            {parsedSchema && (
              <div className="px-2 py-1 border-b border-border shrink-0">
                <input
                  value={schemaFilter}
                  onChange={(e) => setSchemaFilter(e.target.value)}
                  placeholder="Filter types…"
                  className="w-full h-6 px-2 text-[10px] font-mono bg-background border border-border focus:outline-none placeholder:text-muted-foreground/40"
                />
              </div>
            )}
            <div className="flex-1 overflow-auto min-h-0">
              {!schema && (
                <div className="flex flex-col items-center justify-center py-8 gap-1.5 text-center">
                  <p className="text-[11px] text-muted-foreground/60 font-medium">
                    Connect to a GraphQL endpoint to introspect its schema
                  </p>
                  <p className="text-[9px] text-muted-foreground/30">
                    Use the wand icon or send a request first
                  </p>
                </div>
              )}
              {schema && !parsedSchema && (
                <pre className="p-3 font-mono text-[11px] leading-[1.6] text-foreground whitespace-pre">
                  {schema}
                </pre>
              )}
              {parsedSchema && (
                <div className="py-1">
                  {(parsedSchema.types as any[])
                    .filter((t: any) => !t.name?.startsWith("__"))
                    .filter(
                      (t: any) =>
                        !schemaFilter ||
                        t.name
                          ?.toLowerCase()
                          .includes(schemaFilter.toLowerCase()),
                    )
                    .map((type: any) => {
                      const isExpanded = expandedTypes.has(type.name);
                      const kindBadge =
                        type.kind === "OBJECT"
                          ? "OBJ"
                          : type.kind === "INPUT_OBJECT"
                            ? "IN"
                            : type.kind === "ENUM"
                              ? "ENUM"
                              : type.kind === "SCALAR"
                                ? "SCL"
                                : type.kind === "INTERFACE"
                                  ? "IF"
                                  : type.kind === "UNION"
                                    ? "UN"
                                    : type.kind;
                      return (
                        <div key={type.name}>
                          <button
                            onClick={() => toggleType(type.name)}
                            className="w-full flex items-center gap-1 px-2 py-0.5 text-left hover:bg-accent/40 transition-colors"
                          >
                            <ChevronRight
                              className={`h-3 w-3 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                            />
                            <span className="text-[9px] font-bold px-1 rounded bg-primary/10 text-primary shrink-0">
                              {kindBadge}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-foreground truncate">
                              {type.name}
                            </span>
                          </button>
                          {isExpanded && (
                            <div className="pl-6 pr-2 pb-1">
                              {type.description && (
                                <p className="text-[10px] text-muted-foreground italic mb-1">
                                  {type.description}
                                </p>
                              )}
                              {type.fields?.map((f: any) => (
                                <div
                                  key={f.name}
                                  className="flex items-baseline gap-1 py-px"
                                >
                                  <span className="text-[10px] font-mono text-foreground">
                                    {f.name}
                                  </span>
                                  {f.args?.length > 0 && (
                                    <span className="text-[9px] text-muted-foreground">
                                      (
                                      {f.args
                                        .map(
                                          (a: any) =>
                                            `${a.name}: ${resolveTypeRef(a.type)}`,
                                        )
                                        .join(", ")}
                                      )
                                    </span>
                                  )}
                                  <span className="text-[10px] text-primary font-mono">
                                    : {resolveTypeRef(f.type)}
                                  </span>
                                  {f.isDeprecated && (
                                    <span className="text-[9px] text-amber-500 font-bold">
                                      DEPRECATED
                                    </span>
                                  )}
                                </div>
                              ))}
                              {type.inputFields?.map((f: any) => (
                                <div
                                  key={f.name}
                                  className="flex items-baseline gap-1 py-px"
                                >
                                  <span className="text-[10px] font-mono text-foreground">
                                    {f.name}
                                  </span>
                                  <span className="text-[10px] text-primary font-mono">
                                    : {resolveTypeRef(f.type)}
                                  </span>
                                </div>
                              ))}
                              {type.enumValues?.map((v: any) => (
                                <div
                                  key={v.name}
                                  className="flex items-baseline gap-1 py-px"
                                >
                                  <span className="text-[10px] font-mono text-foreground">
                                    {v.name}
                                  </span>
                                  {v.isDeprecated && (
                                    <span className="text-[9px] text-amber-500 font-bold">
                                      DEPRECATED
                                    </span>
                                  )}
                                </div>
                              ))}
                              {type.possibleTypes?.length > 0 && (
                                <div className="text-[10px] text-muted-foreground">
                                  Implements:{" "}
                                  {type.possibleTypes
                                    .map((t: any) => t.name)
                                    .join(", ")}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
