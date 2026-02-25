import { h } from "preact";
import { RecordContent } from "./pages/record/recordContent";
import { IRecordResponse } from "./api/service";
import { HydrateUtils_hydratePage } from "./utils/hydrate";
import { PageWrapper } from "./components/pageWrapper";

function main(): void {
  HydrateUtils_hydratePage<IRecordResponse>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <RecordContent data={data} />
    </PageWrapper>
  ));
}

main();
