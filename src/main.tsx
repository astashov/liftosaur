import { h } from "preact";
import { IMainContentProps, MainContent } from "./pages/main/mainContent";
import { HydrateUtils_hydratePage } from "./utils/hydrate";
import { Platform_isiOS, Platform_isAndroid } from "./utils/platform";

function main(): void {
  HydrateUtils_hydratePage<IMainContentProps>((pageWrapperProps, data) => {
    const ua = window.navigator.userAgent;
    const deviceType = Platform_isiOS(ua) ? "ios" : Platform_isAndroid(ua) ? "android" : "desktop";
    return (
      <MainContent
        {...data}
        deviceType={deviceType}
        isLoggedIn={pageWrapperProps.isLoggedIn}
        client={window.fetch.bind(window)}
      />
    );
  });
}

main();
