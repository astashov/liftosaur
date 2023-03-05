import { h, JSX } from "preact";

export interface IUsersDashboardContentProps {
  client: Window["fetch"];
  usersData: unknown[];
}

export function UsersDashboardContent(props: IUsersDashboardContentProps): JSX.Element {
  return (
    <section className="py-16">
      <h2 className="mb-4 text-xl">Users</h2>
    </section>
  );
}
