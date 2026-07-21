import { IResetPasswordContentProps, ResetPasswordContent } from "./pages/resetPassword/resetPasswordContent";
import { HydrateUtils_hydratePage } from "./utils/hydrate";

function main(): void {
  HydrateUtils_hydratePage<IResetPasswordContentProps>((pageWrapperProps, data) => (
    <ResetPasswordContent {...data} client={window.fetch.bind(window)} />
  ));
}

main();
