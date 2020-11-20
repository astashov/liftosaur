import { h, JSX } from "preact";
import { IHistoryRecord } from "../../models/history";
import { ISettings } from "../../models/settings";
import { HistoryRecordView } from "../historyRecord";

export interface IUsersContentProps {
  users: IProcessedUser[];
  apiKey: string;
}

export interface IProcessedUser {
  id: string;
  email: string;
  history: IHistoryRecord[];
  totalHistory: number;
  settings: ISettings;
  programs: string[];
}

export function UsersContent(props: IUsersContentProps): JSX.Element {
  return (
    <div>
      <h1>Users</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="w-32 px-2">Name</th>
            <th className="px-2" style={{ width: "240px" }}>
              Email
            </th>
            <th className="px-2" style={{ width: "200px" }}>
              Programs
            </th>
            <th className="w-12 px-2">History Records</th>
            <th className="px-2">Last History</th>
          </tr>
        </thead>
        <tbody>
          {props.users.map((user, i) => {
            return (
              <tr className={i % 2 === 0 ? `bg-gray-100` : ""}>
                <td className="px-2 align-top">
                  <a
                    className="text-blue-700 underline"
                    target="_blank"
                    href={`/?admin=${props.apiKey}&userid=${user.id}`}
                  >
                    {user.id}
                  </a>
                </td>
                <td className="px-2 align-top">{user.email}</td>
                <td className="px-2 align-top">{user.programs.join(", ")}</td>
                <td className="px-2 align-top">{user.totalHistory}</td>
                <td className="px-2 align-top">
                  {user.history.map((record) => (
                    <HistoryRecordView historyRecord={record} settings={user.settings} dispatch={() => undefined} />
                  ))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
