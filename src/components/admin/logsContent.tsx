import { h, JSX } from "preact";
import { ILogPayloads } from "../../../server/src/models/log";
import { DateUtils } from "../../utils/date";
import { CollectionUtils } from "../../utils/collection";

export interface ILogsContentProps {
  logs: ILogPayloads;
  apiKey: string;
}

export function LogsContent(props: ILogsContentProps): JSX.Element {
  const lastWeek = Object.keys(props.logs).filter((k) => {
    const payload = props.logs[k]!;
    return payload.logs.some((l) => {
      const weekAgo = Date.now() - 1000 * 60 * 60 * 24 * 7;
      return l.timestamp > weekAgo;
    });
  });

  const sortedLogs = CollectionUtils.sort(Object.keys(props.logs), (a, b) => {
    const al = props.logs[a]!;
    const bl = props.logs[b]!;

    const ats = CollectionUtils.sort(
      al.logs.map((l) => l.timestamp),
      (x, y) => y - x
    );

    const bts = CollectionUtils.sort(
      bl.logs.map((l) => l.timestamp),
      (x, y) => y - x
    );

    return (bts[0] || 0) - (ats[0] || 0);
  });

  return (
    <div>
      <h1>
        Logs ({Object.keys(props.logs).length}, {lastWeek.length})
      </h1>
      <table className="logs">
        <tr>
          <th>Name</th>
          <th>Actions</th>
        </tr>
        {sortedLogs.map((key) => {
          const payload = props.logs[key]!;
          return (
            <tr>
              <td className="logs-key">
                {payload.email ? <a href={`/?admin=Dy8oxgtn,Nkew&userid=${key}`}>{key}</a> : key}{" "}
                {payload.email ? <span className="logs-key-email">({payload.email})</span> : ""}
              </td>
              <td className="logs-actions">
                {CollectionUtils.sort(payload.logs, (a, b) => (b.count || 0) - (a.count || 0)).map((log) => {
                  return (
                    <div className="logs-action">
                      <span className="logs-action-name">{log.action.replace(/^ls-/, "")}</span> -{" "}
                      <span className="logs-action-count">{log.count}</span>
                      <span className="logs-action-date">{DateUtils.formatYYYYMMDD(log.timestamp)}</span>
                    </div>
                  );
                })}
              </td>
            </tr>
          );
        })}
      </table>
    </div>
  );
}
