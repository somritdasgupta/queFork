"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { KeyValueEditor } from "./key-value-editor";
import { RequestBodyEditor } from "./request-body-editor";
import { AuthSection } from "./auth-section";
import { KeyValuePair, RequestBody } from "@/types";

interface RequestPanelProps {
  headers: KeyValuePair[];
  params: KeyValuePair[];
  body: RequestBody;
  auth: {
    type: "none" | "bearer" | "basic" | "apiKey";
    token?: string;
    username?: string;
    password?: string;
    key?: string;
  };
  onHeadersChange: (headers: KeyValuePair[]) => void;
  onParamsChange: (params: KeyValuePair[]) => void;
  onBodyChange: (body: RequestBody) => void;
  onAuthChange: (auth: any) => void;
}

export function RequestPanel({
  headers,
  params,
  body,
  auth,
  onHeadersChange,
  onParamsChange,
  onBodyChange,
  onAuthChange,
}: RequestPanelProps) {
  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="params" className="flex-1 px-2 py-2 rounded-md">
        <div className="rounded-md border-2 border-gray-200 bg-blue-100">
          <TabsList className="w-full justify-center items-center rounded-md border-b border-transparent bg-transparent p-0 overflow-x-auto flex-nowrap">
            <TabsTrigger
              value="params"
              className="w-full rounded-md border-2 border-transparent px-4 py-2 font-medium text-gray-500 hover:text-gray-700 data-[state=active]:bg-slate-900 data-[state=active]:border-violet-600 data-[state=active]:text-white whitespace-nowrap"
            >
              Query Parameters
            </TabsTrigger>
            <TabsTrigger
              value="headers"
              className="w-full rounded-md border-2 border-transparent px-4 py-2 font-medium text-gray-500 hover:text-gray-700 data-[state=active]:bg-slate-900 data-[state=active]:border-violet-600 data-[state=active]:text-white whitespace-nowrap"
            >
              Headers
            </TabsTrigger>
            <TabsTrigger
              value="body"
              className="w-full rounded-md border-2 border-transparent px-4 py-2 font-medium text-gray-500 hover:text-gray-700 data-[state=active]:bg-slate-900 data-[state=active]:border-violet-600 data-[state=active]:text-white whitespace-nowrap"
            >
              Body
            </TabsTrigger>
            <TabsTrigger
              value="auth"
              className="w-full rounded-md border-2 border-transparent px-4 py-2 font-medium text-gray-500 hover:text-gray-700 data-[state=active]:bg-slate-900 data-[state=active]:border-violet-600 data-[state=active]:text-white whitespace-nowrap"
            >
              Auth
            </TabsTrigger>
          </TabsList>
        </div>
        <ScrollArea className="flex-1">
          <div className="py-4">
            <TabsContent value="params" className="m-0 min-h-0">
              <Card className="min-h-0">
                <CardContent className="p-4 space-y-2">
                  <KeyValueEditor
                    pairs={params}
                    onChange={onParamsChange}
                    addButtonText="Add Query Parameter"
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="headers" className="m-0 min-h-0">
              <Card className="min-h-0">
                <CardContent className="p-4 space-y-2">
                  <KeyValueEditor
                    pairs={headers}
                    onChange={onHeadersChange}
                    addButtonText="Add Header"
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="body" className="m-0 min-h-0">
              <Card className="min-h-0">
                <CardContent className="p-4 space-y-2">
                  <RequestBodyEditor body={body} onChange={onBodyChange} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="auth" className="m-0 min-h-0">
              <Card className="min-h-0">
                <CardContent className="p-4 space-y-2">
                  <AuthSection auth={auth} onChange={onAuthChange} />
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
