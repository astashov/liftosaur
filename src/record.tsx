import { h, render } from "preact";
import RB from "rollbar";

declare let Rollbar: RB;
declare let __ENV__: string;
Rollbar.configure({ payload: { environment: __ENV__ } });

import { EntryView } from "./record/record";

function main(): void {
  const client = window.fetch.bind(window);
  render(<EntryView client={client} />, document.getElementById("app")!);
}

main();
