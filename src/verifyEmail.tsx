import { IVerifyEmailContentProps, VerifyEmailContent } from "./pages/verifyEmail/verifyEmailContent";
import { HydrateUtils_hydratePage } from "./utils/hydrate";

function main(): void {
  HydrateUtils_hydratePage<IVerifyEmailContentProps>((pageWrapperProps, data) => (
    <VerifyEmailContent {...data} client={window.fetch.bind(window)} />
  ));
}

main();
