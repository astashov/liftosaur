import { h } from "preact";
import { LogsContent } from "./logsContent";
import { ILogPayloads } from "../../../server/src/models/log";
import { renderAdminHtml, AdminHtml } from "./adminHtml";

interface IProps {
  logs: ILogPayloads;
  apiKey: string;
}

export function renderLogsHtml(data: IProps): string {
  return renderAdminHtml(
    <AdminHtml apiKey={data.apiKey} props={data}>
      <LogsContent {...data} />
    </AdminHtml>
  );
}
