import { h } from "preact";
import { HydrateUtils } from "./utils/hydrate";
import { UserContent } from "./pages/user/userContent";
import { IStorage } from "./types";

function main(): void {
  HydrateUtils.hydratePage<IStorage>((data) => <UserContent data={data} />);
}

main();
