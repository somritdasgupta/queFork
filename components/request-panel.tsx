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
      <Tabs defaultValue="params" className="flex-1 px-2 mt-2">
        <TabsList className="grid grid-cols-4 overflow-x-auto whitespace-nowrap h-auto min-h-[3rem] items-center rounded-lg border-2 border-blue-100 bg-blue-50 px-1 text-gray-700 shadow-inner w-full">
          <TabsTrigger
            value="params"
            className="flex-1 inline-flex items-center justify-center gap-0.5 sm:gap-1 rounded-md px-1 sm:px-2 py-2 text-[12px] xs:text-xs sm:text-sm font-medium transition-all hover:bg-gray-100 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
          >
            Parameters
          </TabsTrigger>
          <TabsTrigger
            value="headers"
            className="flex-1 inline-flex items-center justify-center gap-0.5 sm:gap-1 rounded-md px-1 sm:px-2 py-2 text-[12px] xs:text-xs sm:text-sm font-medium transition-all hover:bg-gray-100 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
          >
            Headers
          </TabsTrigger>
          <TabsTrigger
            value="body"
            className="flex-1 inline-flex items-center justify-center gap-0.5 sm:gap-1 rounded-md px-1 sm:px-2 py-2 text-[12px] xs:text-xs sm:text-sm font-medium transition-all hover:bg-gray-100 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
          >
            Body
          </TabsTrigger>
          <TabsTrigger
            value="auth"
            className="flex-1 inline-flex items-center justify-center gap-0.5 sm:gap-1 rounded-md px-1 sm:px-2 py-2 text-[12px] xs:text-xs sm:text-sm font-medium transition-all hover:bg-gray-100 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
          >
            Auth
          </TabsTrigger>
        </TabsList>

        <TabsContent value="params" className="mt-2">
          <Card>
            <CardContent className="p-4">
              <ScrollArea className="h-[calc(100vh-280px)]">
                <KeyValueEditor pairs={params} onChange={onParamsChange} />
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="headers" className="mt-2">
          <Card>
            <CardContent className="p-4">
              <ScrollArea className="h-[calc(100vh-280px)]">
                <KeyValueEditor pairs={headers} onChange={onHeadersChange} />
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="body" className="mt-2">
          <RequestBodyEditor body={body} onChange={onBodyChange} />
        </TabsContent>

        <TabsContent value="auth" className="mt-2">
          <AuthSection auth={auth} onChange={onAuthChange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
