import { h } from "preact";
import { ILoginContentProps, LoginContent } from "./pages/login/loginContent";
import { HydrateUtils_hydratePage } from "./utils/hydrate";

function main(): void {
  HydrateUtils_hydratePage<ILoginContentProps>((pageWrapperProps, data) => (
    <LoginContent {...data} client={window.fetch.bind(window)} />
  ));
}

main();
