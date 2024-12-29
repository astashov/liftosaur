import React from "react";
import { UsersContent, IProcessedUser } from "./usersContent";
import { AdminHtml, renderAdminHtml } from "./adminHtml";

interface IProps {
  users: IProcessedUser[];
  apiKey: string;
}

export function renderUsersHtml(data: IProps): string {
  return renderAdminHtml(
    <AdminHtml apiKey={data.apiKey} props={data}>
      <UsersContent {...data} />
    </AdminHtml>
  );
}
