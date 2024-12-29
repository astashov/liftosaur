import React from "react";
import { ILoginContentProps, LoginContent } from "./pages/login/loginContent";
import { HydrateUtils } from "./utils/hydrate";

function main(): void {
  HydrateUtils.hydratePage<ILoginContentProps>((pageWrapperProps, data) => (
    <LoginContent {...data} client={window.fetch.bind(window)} />
  ));
}

main();
