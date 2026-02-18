import "./localePolyfill";
import { h } from "preact";
import { RecordContent } from "./pages/record/recordContent";
import { IRecordResponse } from "./api/service";
import { HydrateUtils } from "./utils/hydrate";
import { PageWrapper } from "./components/pageWrapper";

function main(): void {
  HydrateUtils.hydratePage<IRecordResponse>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <RecordContent data={data} />
    </PageWrapper>
  ));
}

main();
