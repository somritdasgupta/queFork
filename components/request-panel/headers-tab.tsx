import { KeyValuePair, Environment, RequestBody } from "@/types";
import { useEffect, useCallback, useMemo } from "react";
import { KeyValueEditor } from "../key-value-editor";

const commonHeaders = [
  "Accept",
  "Content-Type",
  "Authorization",
  "User-Agent",
  "Accept-Language",
  "Cache-Control",
];

interface HeadersTabProps {
  headers: KeyValuePair[];
  onHeadersChange: (headers: KeyValuePair[]) => void;
  environments?: Environment[];
  currentEnvironment?: Environment | null;
  onEnvironmentChange?: (environmentId: string) => void;
  onEnvironmentsUpdate?: (environments: Environment[]) => void;
  onAddToEnvironment?: (key: string, value: string) => void;
  auth?: {
    type: "none" | "bearer" | "basic" | "apiKey";
    token?: string;
    username?: string;
    password?: string;
    key?: string;
    headerName?: string;
  };
  body?: RequestBody;
  onSourceRedirect?: (source: { tab: string; type?: string }) => void;
}

export function HeadersTab({
  headers,
  onHeadersChange,
  environments,
  currentEnvironment,
  onEnvironmentChange,
  onEnvironmentsUpdate,
  onAddToEnvironment,
  auth,
  body,
  onSourceRedirect,
}: HeadersTabProps) {
  const updateHeaders = useCallback(
    (currentHeaders: KeyValuePair[]) => {
      let updatedHeaders = [...currentHeaders];

      // Remove only invalid managed headers
      updatedHeaders = updatedHeaders.filter((h) => {
        if (!h.source) return true;
        if (h.source.tab === "auth" && (!auth || auth.type === "none"))
          return false;
        if (h.source.tab === "body" && (!body || body.type === "none"))
          return false;
        return true;
      });

      const upsertManagedHeader = (
        key: string,
        value: string,
        source: { tab: "auth" | "body"; type?: string }
      ) => {
        const lowerKey = key.toLowerCase();
        const existingHeader = updatedHeaders.find(
          (h) =>
            h.key.toLowerCase() === lowerKey && h.source?.tab === source.tab
        );

        const header: KeyValuePair = {
          key,
          value,
          enabled: true,
          type: "text",
          showSecrets: false,
          source,
        };

        if (existingHeader) {
          // Only update if value has changed
          if (existingHeader.value !== value) {
            Object.assign(existingHeader, header);
          }
        } else {
          updatedHeaders.push(header);
        }
      };

      // Handle auth headers
      if (auth?.type === "bearer" && auth.token) {
        upsertManagedHeader("Authorization", `Bearer ${auth.token}`, {
          tab: "auth",
          type: "bearer",
        });
      } else if (auth?.type === "basic" && auth.username) {
        const credentials = btoa(`${auth.username}:${auth.password || ""}`);
        upsertManagedHeader("Authorization", `Basic ${credentials}`, {
          tab: "auth",
          type: "basic",
        });
      } else if (auth?.type === "apiKey" && auth.key && auth.headerName) {
        upsertManagedHeader(auth.headerName, auth.key, {
          tab: "auth",
          type: "apiKey",
        });
      }

      // Handle content-type header
      if (body?.type && body.type !== "none") {
        upsertManagedHeader("Content-Type", body.type, { tab: "body" });
      }

      // Only update if there are actual changes
      if (JSON.stringify(currentHeaders) !== JSON.stringify(updatedHeaders)) {
        return updatedHeaders;
      }

      return currentHeaders;
    },
    [auth, body]
  );

  // Memoize headers to prevent unnecessary updates
  const managedHeaders = useMemo(
    () => updateHeaders(headers),
    [headers, updateHeaders]
  );

  useEffect(() => {
    if (managedHeaders !== headers) {
      onHeadersChange(managedHeaders);
    }
  }, [managedHeaders, headers, onHeadersChange]);

  return (
    <div className="bg-slate-900">
      <KeyValueEditor
        pairs={managedHeaders}
        onChange={onHeadersChange}
        addButtonText="Add Header"
        presetKeys={commonHeaders}
        environments={environments}
        currentEnvironment={currentEnvironment}
        onEnvironmentChange={onEnvironmentChange}
        onEnvironmentsUpdate={onEnvironmentsUpdate}
        onAddToEnvironment={onAddToEnvironment}
        onSourceRedirect={onSourceRedirect}
      />
    </div>
  );
}
