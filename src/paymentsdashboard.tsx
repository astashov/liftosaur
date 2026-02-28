import { h } from "preact";
import { PageWrapper } from "./components/pageWrapper";
import {
  IPaymentsDashboardContentProps,
  PaymentsDashboardContent,
} from "./pages/paymentsDashboard/paymentsDashboardContent";
import { HydrateUtils_hydratePage } from "./utils/hydrate";

function main(): void {
  HydrateUtils_hydratePage<IPaymentsDashboardContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <PaymentsDashboardContent {...data} client={window.fetch.bind(window)} />
    </PageWrapper>
  ));
}

main();
