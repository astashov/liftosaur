import { h, hydrate } from "preact";
import { UsersContent, IUsersContentProps } from "./components/admin/usersContent";

function main(): void {
  const escapedRawData = document.querySelector("#data")?.innerHTML || "{}";
  const parser = new DOMParser();
  const unescapedRawData = parser.parseFromString(escapedRawData, "text/html").documentElement.textContent || "{}";
  const data = JSON.parse(unescapedRawData) as IUsersContentProps;
  hydrate(<UsersContent {...data} />, document.getElementById("app")!);
}

main();
