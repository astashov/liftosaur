import React from "react";
import { LogsContent } from "./logsContent";
import { renderAdminHtml, AdminHtml } from "./adminHtml";

interface IProps {
  logs: ILogPayloads;
  apiKey: string;
}

export interface ILog {
  action: string;
  count: number;
  timestamp: number;
  affiliates?: Partial<Record<string, number>>;
  platforms?: { name: string; version?: string }[];
  subscriptions?: ("apple" | "google")[];
}

export interface ILogPayload {
  logs: ILog[];
  email?: string;
}

export type ILogPayloads = Partial<Record<string, ILogPayload>>;

export function renderLogsHtml(data: IProps): string {
  return renderAdminHtml(
    <AdminHtml apiKey={data.apiKey} props={data}>
      <LogsContent {...data} />
    </AdminHtml>
  );
}
