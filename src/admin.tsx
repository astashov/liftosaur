import React from "react";
import { hydrateRoot } from "react-dom/client";
import { UsersContent } from "./components/admin/usersContent";
import { LogsContent } from "./components/admin/logsContent";

function main(): void {
  const escapedRawData = document.querySelector("#data")?.innerHTML || "{}";
  const parser = new DOMParser();
  const unescapedRawData = parser.parseFromString(escapedRawData, "text/html").documentElement.textContent || "{}";
  const data = JSON.parse(unescapedRawData);
  const url = document.location.pathname;
  if (url.indexOf("users") !== -1) {
    hydrateRoot(document.getElementById("app")!, <UsersContent {...data} />);
  } else if (url.indexOf("logs") !== -1) {
    hydrateRoot(document.getElementById("app")!, <LogsContent {...data} />);
  }
}

main();
